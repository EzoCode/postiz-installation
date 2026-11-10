'use strict';
// SPDX-License-Identifier: MIT
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = process.env.CAPSERV_INBOX_DIR || '/config/capserv-stats/inbox-data';
const inflight = new Map(), locks = new Map();
const supported = new Set(['instagram', 'instagram-standalone', 'facebook', 'youtube']);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const stamp = () => new Date().toISOString();
const txt = (v, max = 12000) => typeof v === 'string' ? v.slice(0, max) : '';
function fail(status, message) { const e = new Error(message); e.status = status; throw e; }
function file(org, id, type) { return path.join(ROOT, hash(org + '\0' + id) + '.' + type + '.json'); }
function read(p, fallback = {}) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; return fallback; } }
function save(p, data) {
  fs.mkdirSync(ROOT, { recursive: true, mode: 0o700 });
  const temp = p + '.' + crypto.randomUUID();
  fs.writeFileSync(temp, JSON.stringify(data), { mode: 0o600 }); fs.renameSync(temp, p);
}
async function serial(key, action) {
  const prior = locks.get(key) || Promise.resolve();
  const next = prior.catch(() => {}).then(action); locks.set(key, next);
  try { return await next; } finally { if (locks.get(key) === next) locks.delete(key); }
}
function base(i) { return i.providerIdentifier === 'youtube' ? 'https://www.googleapis.com/youtube/v3/' : i.providerIdentifier === 'instagram-standalone' ? 'https://graph.instagram.com/v25.0/' : 'https://graph.facebook.com/v25.0/'; }
async function request(i, endpoint, query = {}, body) {
  if (!/^[a-zA-Z0-9_./-]+$/.test(endpoint) || endpoint.includes('..')) fail(400, 'Identifiant réseau invalide');
  const u = new URL(endpoint, base(i)); u.search = new URLSearchParams(query);
  const token = i.providerIdentifier === 'youtube' ? i.token : i.token.split('___')[0];
  let response, data;
  try {
    response = await fetch(u, { method: body ? 'POST' : 'GET', redirect: 'error', headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(18000) });
    const reader = response.body.getReader(); let bytes = 0; const chunks = [];
    for (;;) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; if (bytes > 4 * 1024 * 1024) { await reader.cancel(); throw Error(); } chunks.push(Buffer.from(value)); }
    data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { const e = new Error('Réseau temporairement inaccessible'); e.kind = body ? 'uncertain' : 'network'; throw e; }
  if (!response.ok || data.error) {
    const code = data.error?.code, reason = data.error?.errors?.[0]?.reason;
    const e = new Error('Demande refusée par le réseau');
    e.kind = response.status === 401 || code === 190 ? 'reconnect' : response.status === 403 || [10, 200].includes(code) || reason === 'insufficientPermissions' ? 'permissions' : response.status === 429 || [4, 17, 32, 613].includes(code) ? 'rate_limit' : 'unavailable';
    e.code = code || response.status; throw e;
  }
  return data;
}
function issue(error) { const names = { reconnect: 'Connexion expirée', permissions: 'Autorisation supplémentaire requise', rate_limit: 'Limite du réseau atteinte, réessaie plus tard', unavailable: 'Lecture refusée par le réseau', network: 'Réseau temporairement inaccessible' }; return { status: error.kind || 'unavailable', message: names[error.kind] || names.unavailable }; }
function message(id, author, text, at, self = false) { return { id: txt(String(id), 300), author: txt(author || 'Compte du réseau', 160), text: txt(text), at: txt(at, 40), self: !!self }; }
function thread(i, kind, remoteId, title, url, messages, partial = false) {
  messages.sort((a, b) => (Date.parse(a.at) - Date.parse(b.at)) || a.id.localeCompare(b.id));
  return { key: hash(i.id + '\0' + kind + '\0' + remoteId), accountId: i.id, kind, remoteId, title: txt(title, 180), url, messages, partial, updatedAt: messages.at(-1)?.at || '', fingerprint: hash(JSON.stringify(messages.map(m => [m.id, m.text, m.at]))) };
}
function normalizeMeta(i, posts) {
  const ig = i.providerIdentifier.startsWith('instagram'), result = [];
  for (const post of posts) for (const c of post.comments?.data || []) {
    const map = m => message(m.id, ig ? m.username || m.from?.username : m.from?.name, ig ? m.text : m.message, ig ? m.timestamp : m.created_time, String(m.from?.id || '') === String(i.internalId) || !!i._username && m.username === i._username);
    const replies = ig ? c.replies : c.comments;
    result.push(thread(i, 'comment', c.id, post.caption || post.message || 'Commentaire', post.permalink || post.permalink_url || (ig ? 'https://www.instagram.com/' : 'https://www.facebook.com/' + encodeURIComponent(post.id)), [map(c), ...(replies?.data || []).map(map)], !!replies?.paging?.next || Number(c.comment_count) > (replies?.data || []).length));
  }
  return result;
}
function normalizeYoutube(i, items) {
  return items.filter(t => t.snippet?.channelId === i.internalId).map(t => {
    const root = t.snippet.topLevelComment, map = c => { const s = c.snippet; return message(c.id, s.authorDisplayName, s.textOriginal || s.textDisplay, s.updatedAt || s.publishedAt, s.authorChannelId?.value === i.internalId); };
    const replies = t.replies?.comments || [];
    return thread(i, 'comment', root.id, root.snippet.textOriginal || root.snippet.textDisplay || 'Commentaire YouTube', 'https://www.youtube.com/watch?v=' + encodeURIComponent(t.snippet.videoId) + '&lc=' + encodeURIComponent(root.id), [map(root), ...replies.map(map)], t.snippet.totalReplyCount > replies.length);
  });
}
function normalizeConversations(i, items) {
  return items.map(c => {
    const messages = (c.messages?.data || []).map(m => message(m.id, m.from?.name || m.from?.username, m.message || '[Pièce jointe, ouvrir sur le réseau]', m.created_time, String(m.from?.id) === String(i.internalId)));
    const other = c.participants?.data?.find(p => String(p.id) !== String(i.internalId));
    const t = thread(i, 'message', c.id, other?.name || other?.username || messages.find(m => !m.self)?.author || 'Conversation', i.providerIdentifier === 'facebook' ? 'https://business.facebook.com/latest/inbox/all' : 'https://www.instagram.com/direct/inbox/', messages, !!c.messages?.paging?.next);
    t.recipient = other?.id || (c.messages?.data || []).find(m => String(m.from?.id) !== String(i.internalId))?.from?.id || null;
    return t;
  });
}
async function collect(i, api = request) {
  const result = { updatedAt: stamp(), threads: [], comments: { status: 'unsupported', message: 'Connecteur de commentaires non disponible' }, messages: { status: 'unsupported', message: 'Connecteur de messages non disponible' }, coverage: [] };
  if (!supported.has(i.providerIdentifier)) return result;
  try {
    if (i.providerIdentifier === 'youtube') {
      const data = await api(i, 'commentThreads', { part: 'snippet,replies', allThreadsRelatedToChannelId: i.internalId, maxResults: '100', order: 'time', textFormat: 'plainText' });
      result.threads.push(...normalizeYoutube(i, data.items || [])); result.comments = { status: 'ok' };
      result.coverage.push('Jusqu’à 100 fils YouTube récents, commentaires publiés. Les réponses peuvent être partielles.');
      result.messages = { status: 'unsupported', message: 'Aucun connecteur de messages privés YouTube' };
    } else {
      const ig = i.providerIdentifier.startsWith('instagram');
      if (ig) { try { const profile = await api(i, i.internalId, {fields:'username'}); i = {...i, _username:profile.username}; } catch {} }
      const fields = ig ? 'id,caption,permalink,comments.limit(25){id,text,username,timestamp,replies.limit(10){id,text,username,timestamp}}' : 'id,message,permalink_url,comments.limit(25).filter(toplevel){id,message,created_time,from,comment_count,comments.limit(10){id,message,created_time,from}}';
      const data = await api(i, i.internalId + (ig ? '/media' : '/posts'), { fields, limit: '30' });
      result.threads.push(...normalizeMeta(i, data.data || [])); result.comments = { status: 'ok' };
      result.coverage.push('30 publications récentes au maximum, 25 commentaires et 10 réponses par fil.');
    }
  } catch (e) { result.comments = issue(e); }
  if (i.providerIdentifier !== 'youtube') {
    try {
      const data = await api(i, i.internalId + '/conversations', { fields: 'id,updated_time,participants,messages.limit(25){id,message,from,to,created_time}', limit: '30', ...(i.providerIdentifier !== 'facebook' ? { platform: 'instagram' } : {}) });
      result.threads.push(...normalizeConversations(i, data.data || [])); result.messages = { status: 'ok' };
      result.coverage.push('30 conversations récentes au maximum, 25 messages par conversation. La visibilité dépend des droits Meta et de son App Review.');
    } catch (e) { result.messages = issue(e); }
  }
  return result;
}
async function account(service, org, id, force = false) {
  let i = await service.getIntegrationById(org.id, id);
  if (!i || i.deletedAt || i.disabled) fail(404, 'Compte introuvable');
  const p = file(org.id, id, 'cache'); const previous = read(p);
  if (previous.updatedAt && Date.now() - Date.parse(previous.updatedAt) < (force ? 60000 : 300000)) return previous;
  if (inflight.has(p)) return inflight.get(p);
  const promise = (async () => {
    if (supported.has(i.providerIdentifier) && i.providerIdentifier !== 'facebook' && i.tokenExpiration && Date.parse(i.tokenExpiration) < Date.now()) {
      try { const r = await service._refreshIntegrationService.refresh(i); if (r?.accessToken) i = { ...i, token: r.accessToken }; } catch {}
    }
    const data = await collect(i);
    // Preserve a previously successful channel when a later collection is refused.
    for (const kind of ['comments', 'messages']) if (data[kind].status !== 'ok') {
      const old = (previous.threads || []).filter(t => t.kind === (kind === 'comments' ? 'comment' : 'message'));
      if (old.length) { data.threads.push(...old); data[kind].staleSince = previous[kind].staleSince || previous.updatedAt; }
    }
    data.account = { id: i.id, name: i.name, provider: i.providerIdentifier, brandId: i.customerId || i.id };
    save(p, data); return data;
  })().finally(() => inflight.delete(p)); inflight.set(p, promise); return promise;
}
async function targets(service, org, id, all) {
  const db = service._integrationRepository._posts.model;
  const integrations = await db.integration.findMany({ where: { organizationId: org.id, deletedAt: null, disabled: false }, select: { id: true, customerId: true, customer: { select: { id: true, name: true, deletedAt: true } } } });
  const selected = integrations.find(a => a.id === id); if (!selected) fail(404, 'Compte introuvable');
  const brand = a => a.customer && !a.customer.deletedAt ? a.customer.id : a.id;
  return integrations.filter(a => all || brand(a) === brand(selected));
}
async function dashboard(service, org, id, all = false, force = false) {
  const selected = await targets(service, org, id, all); const accounts = [];
  // Sequential requests bound memory and API pressure across brands.
  for (const a of selected) {
    const data = await account(service, org, a.id, force); const states = read(file(org.id, a.id, 'state'));
    accounts.push({ ...data, account: { ...data.account, brand: a.customer?.deletedAt ? data.account.name : a.customer?.name || data.account.name }, threads: data.threads.map(t => {
      const mark = states[t.key]; const last = t.messages.at(-1);
      return { ...t, recipient: undefined, remoteId: undefined, status: mark?.fingerprint === t.fingerprint ? mark.status : last?.self ? 'answered' : 'todo', stale: !!data[t.kind === 'comment' ? 'comments' : 'messages'].staleSince };
    }) });
  }
  return { accounts, updatedAt: stamp(), allBrands: all };
}
async function changeState(service, org, id, body) {
  await targets(service, org, id, false);
  if (!body || !/^[a-f0-9]{64}$/.test(body.key || '') || !['done', 'todo'].includes(body.status)) fail(400, 'État invalide');
  const cache = read(file(org.id, id, 'cache')); const t = cache.threads?.find(t => t.key === body.key); if (!t) fail(404, 'Conversation introuvable');
  return serial(file(org.id, id, 'state'), async () => { const p = file(org.id, id, 'state'), states = read(p); states[t.key] = { fingerprint: t.fingerprint, status: body.status, at: stamp() }; save(p, states); return { ok: true }; });
}
async function reply(service, org, id, body, user, api = request) {
  const membership = user?.id && await service._integrationRepository._posts.model.userOrganization.findFirst({where:{organizationId:org.id,userId:user.id,disabled:false,role:{in:['SUPERADMIN','ADMIN']}},select:{id:true}});
  if (!membership) fail(403, 'Les réponses sont réservées au propriétaire et aux administrateurs.');
  await targets(service, org, id, false);
  if (!body || !/^[a-f0-9]{64}$/.test(body.key || '') || !/^[a-f0-9-]{36}$/.test(body.requestId || '') || typeof body.text !== 'string' || !body.text.trim() || body.text.length > 1000) fail(400, 'Réponse invalide, 1 000 caractères maximum');
  const i = await service.getIntegrationById(org.id, id); if (!i || i.deletedAt || i.disabled) fail(404, 'Compte introuvable');
  return serial(file(org.id, id, 'sent'), async () => {
    const p = file(org.id, id, 'sent'), receipts = read(p), digest = hash(body.key + '\0' + body.text.trim());
    if (receipts[body.requestId]) {
      if (receipts[body.requestId].digest !== digest) fail(409, 'Identifiant de réponse déjà utilisé');
      if (receipts[body.requestId].status === 'sent') return { ok: true, duplicate: true };
      fail(409, 'Envoi précédent à vérifier sur le réseau avant de réessayer');
    }
    if (Object.values(receipts).some(r => r.digest === digest && (['pending', 'uncertain'].includes(r.status) || r.status === 'sent' && Date.now() - Date.parse(r.at) < 86400000))) fail(409, 'Cette réponse a déjà été envoyée ou doit être vérifiée sur le réseau');
    const cache = read(file(org.id, id, 'cache')), t = cache.threads?.find(t => t.key === body.key);
    if (!t) fail(404, 'Conversation introuvable');
    const channel = cache[t.kind === 'comment' ? 'comments' : 'messages'];
    if (channel?.status !== 'ok' || channel.staleSince || Date.now() - Date.parse(cache.updatedAt) > 3600000) fail(409, 'Reconnecte le compte et actualise avant de répondre');
    let endpoint, query = {}, payload;
    if (t.kind === 'message') {
      const incoming = t.messages.filter(m => !m.self).at(-1);
      if (!t.recipient || !incoming || !Number.isFinite(Date.parse(incoming.at)) || Date.now() - Date.parse(incoming.at) > 86400000) fail(409, 'Fenêtre de réponse API de 24 heures dépassée, ouvre le réseau');
      endpoint = i.internalId + '/messages'; payload = { recipient: { id: t.recipient }, message: { text: body.text.trim() }, ...(i.providerIdentifier === 'facebook' ? { messaging_type: 'RESPONSE' } : {}) };
    } else if (i.providerIdentifier === 'youtube') { endpoint = 'comments'; query = { part: 'snippet' }; payload = { snippet: { parentId: t.remoteId, textOriginal: body.text.trim() } }; }
    else if (i.providerIdentifier.startsWith('instagram')) { endpoint = t.remoteId + '/replies'; payload = { message: body.text.trim() }; }
    else if (i.providerIdentifier === 'facebook') { endpoint = t.remoteId + '/comments'; payload = { message: body.text.trim() }; }
    else fail(400, 'Réponse non prise en charge');
    const record = { digest, status: 'pending', at: stamp() }; receipts[body.requestId] = record;
    for (const [k, v] of Object.entries(receipts)) if (v.status !== 'uncertain' && v.status !== 'pending' && Date.now() - Date.parse(v.at) > 30 * 86400000) delete receipts[k];
    save(p, receipts);
    try {
      const result = await api(i, endpoint, query, payload); const remoteId = result.id || result.message_id;
      if (!remoteId) { record.status = 'uncertain'; save(p, receipts); fail(409, 'Le réseau ne confirme pas l’envoi. Vérifie la conversation avant de réessayer.'); }
      record.status = 'sent'; record.remoteId = String(remoteId); save(p, receipts);
      // Optimistic local receipt with a real remote ID, never report a guessed success.
      t.messages.push(message(remoteId, i.name, body.text.trim(), stamp(), true)); t.updatedAt = stamp(); t.fingerprint = hash(JSON.stringify(t.messages.map(m => [m.id, m.text, m.at]))); cache.updatedAt = new Date(Date.now() - 300001).toISOString(); save(file(org.id, id, 'cache'), cache);
      return { ok: true };
    } catch (e) {
      if (e.status === 409) throw e;
      record.status = e.kind === 'uncertain' || !e.kind ? 'uncertain' : 'rejected'; save(p, receipts);
      fail(record.status === 'uncertain' ? 409 : 403, record.status === 'uncertain' ? 'Envoi non confirmé. Vérifie sur le réseau avant de réessayer.' : issue(e).message + '. Ouvre les autorisations du compte.');
    }
  });
}
module.exports = { file, save, read, dashboard, changeState, reply, collect, normalizeMeta, normalizeYoutube, normalizeConversations, thread, issue, targets, request };
