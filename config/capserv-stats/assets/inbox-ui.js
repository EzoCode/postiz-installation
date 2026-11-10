'use strict';
// SPDX-License-Identifier: MIT
const inbox = { data: null, loading: false, error: '', all: false, platform: '', kind: '', status: '', query: '', selected: '', message: '', busy: false, confirm: false, context: '', drafts: new Map(), generation: 0 };
const inboxUrl = (accountId, suffix = '') => '/api/analytics/' + encodeURIComponent(accountId) + '/capserv/inbox' + suffix;
const inboxStatus = { ok: 'Accessible', unsupported: 'Non disponible', permissions: 'Autorisation requise', reconnect: 'À reconnecter', unavailable: 'Indisponible', network: 'Réseau indisponible', rate_limit: 'Limite temporaire' };
function inboxContext() { return id + ':' + (state.navigation?.currentGroup || '') + ':' + inbox.all; }
async function loadInbox(force = false) {
  if (!state || explorer.view !== 'inbox') return;
  const context = inboxContext();
  if (!force && (inbox.loading && inbox.context === context || inbox.context === context && inbox.data)) return;
  const generation = ++inbox.generation; inbox.context = context; inbox.loading = true; inbox.error = '';
  try {
    const response = await fetch(inboxUrl(id) + '?all=' + Number(inbox.all) + '&refresh=' + Number(force), { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw Error(response.status === 401 || response.status === 403 ? 'Connecte-toi à Postiz pour ouvrir la messagerie.' : 'La messagerie est temporairement indisponible.');
    const data = await response.json(); data.accounts.sort((a,b)=>a.account.brand.localeCompare(b.account.brand,'fr') || ['instagram-standalone','instagram','facebook','youtube','tiktok'].indexOf(a.account.provider)-['instagram-standalone','instagram','facebook','youtube','tiktok'].indexOf(b.account.provider)); if (generation === inbox.generation) inbox.data = data;
  } catch (e) { if (generation === inbox.generation) inbox.error = e.message; }
  finally { if (generation === inbox.generation) { inbox.loading = false; if (explorer.view === 'inbox') render(); } }
}
function inboxThreads() {
  return (inbox.data?.accounts || []).flatMap(a => a.threads.map(t => ({ ...t, account: a.account }))).sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0));
}
function inboxFiltered() {
  const q = inbox.query.toLocaleLowerCase('fr');
  return inboxThreads().filter(t => (!inbox.platform || t.account.provider === inbox.platform) && (!inbox.kind || t.kind === inbox.kind) && (!inbox.status || t.status === inbox.status) && (!q || [t.title, t.account.brand, ...t.messages.map(m => m.author + ' ' + m.text)].join(' ').toLocaleLowerCase('fr').includes(q)));
}
function inboxTime(at) { const d = new Date(at); return Number.isFinite(+d) ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(d) : ''; }
function inboxChannel(label, channel) { return '<span class="inbox-capability ' + (channel.status === 'ok' ? 'ready' : '') + '">' + label + ' : ' + esc(inboxStatus[channel.status] || 'Indisponible') + (channel.staleSince ? ', données anciennes' : '') + '</span>'; }
function inboxConnections() {
  return '<details class="inbox-connections"' + (!inboxThreads().length ? ' open' : '') + '><summary>Connexions et autorisations (' + (inbox.data?.accounts.length || 0) + ')</summary><div class="inbox-connection-grid">' + (inbox.data?.accounts || []).map(a => '<article><strong>' + esc(a.account.brand) + '</strong><span>' + esc(platform(a.account.provider) + ' · ' + a.account.name) + '</span>' + inboxChannel('Commentaires', a.comments) + inboxChannel('Messages', a.messages) + (['instagram', 'instagram-standalone', 'facebook', 'youtube'].includes(a.account.provider) ? '<button data-inbox-auth="' + esc(a.account.id) + '">Autorisations du compte</button>' : '<p>La connexion TikTok actuelle sert à publier et lire les compteurs. Elle ne donne pas accès à la messagerie ni aux commentaires.</p>') + '</article>').join('') + '</div><p>Les accès de publication et de messagerie sont distincts. Meta peut demander une validation de l’application avant de donner accès aux conversations du public.</p></details>';
}
function inboxConversation(t) {
  if (!t) return '<div class="inbox-conversation inbox-empty">Sélectionne une conversation.</div>';
  return '<section class="inbox-conversation"><header><div><h2>' + esc(t.title) + '</h2><p>' + esc(t.account.brand + ' · ' + platform(t.account.provider) + ' · ' + t.account.name) + '</p></div><a href="' + safeLink(t.url) + '" target="_blank" rel="noopener noreferrer">Ouvrir sur le réseau</a></header>' + (t.stale ? '<p class="notice">Derniers messages conservés, la connexion doit être rétablie.</p>' : '') + '<div class="inbox-messages">' + t.messages.map(m => '<article class="inbox-bubble ' + (m.self ? 'self' : '') + '"><div><strong>' + esc(m.author) + '</strong><time>' + esc(inboxTime(m.at)) + '</time></div><p>' + esc(m.text) + '</p></article>').join('') + (t.partial ? '<p class="inbox-note">Fil partiel. Ouvre le réseau pour consulter toutes les réponses et pièces jointes.</p>' : '') + '</div><footer><button id="inbox-resolve">' + (t.status === 'done' ? 'Remettre à traiter' : 'Marquer comme traité') + '</button><form id="inbox-reply"><label for="inbox-draft">Répondre avec ' + esc(t.account.name) + '</label><textarea id="inbox-draft" name="text" maxlength="1000" rows="3" placeholder="Ta réponse…"' + (inbox.busy || t.stale ? ' disabled' : '') + '>' + esc(inbox.drafts.get(t.key) || '') + '</textarea>' + (inbox.confirm ? '<div class="inbox-confirm"><p>' + (t.kind === 'comment' ? 'Cette réponse sera publique sous le commentaire.' : 'Ce message sera envoyé dans cette conversation.') + '</p><button type="button" id="inbox-confirm-send"' + (inbox.busy ? ' disabled' : '') + '>' + (inbox.busy ? 'Envoi…' : 'Confirmer l’envoi') + '</button><button type="button" id="inbox-cancel-send"' + (inbox.busy ? ' disabled' : '') + '>Annuler</button></div>' : '<button type="submit"' + (inbox.busy || t.stale ? ' disabled' : '') + '>Préparer l’envoi</button>') + '</form><p class="inbox-note">Les réponses nécessitent les droits du réseau. Messages privés Meta : fenêtre de réponse de 24 heures.</p></footer></section>';
}
function renderInbox() {
  if (!inbox.data || inbox.context !== inboxContext()) return '<section class="section"><h2>Messagerie</h2><p>' + esc(inbox.error || 'Chargement des conversations des comptes connectés…') + '</p>' + (inbox.error ? '<button id="inbox-refresh">Réessayer</button>' : '') + '</section>';
  const threads = inboxFiltered(), selected = threads.find(t => t.key === inbox.selected), providers = [...new Set(inbox.data.accounts.map(a => a.account.provider))];
  return '<section class="section inbox-workspace"><div class="section-head"><div><h1>Messagerie</h1><p class="sub">' + threads.length + ' fils récupérés · collecte toutes les 5 minutes</p></div><button id="inbox-refresh"' + (inbox.loading ? ' disabled' : '') + '>' + (inbox.loading ? 'Actualisation…' : 'Actualiser') + '</button></div><form id="inbox-filter" class="inbox-filters"><label class="inbox-all"><input name="all" type="checkbox"' + (inbox.all ? ' checked' : '') + '> Toutes les marques</label><label>Réseau<select name="platform"><option value="">Tous les réseaux</option>' + providers.map(p => '<option value="' + esc(p) + '"' + (inbox.platform === p ? ' selected' : '') + '>' + esc(platform(p)) + '</option>').join('') + '</select></label><label>Type<select name="kind"><option value="">Tout</option><option value="comment"' + (inbox.kind === 'comment' ? ' selected' : '') + '>Commentaires</option><option value="message"' + (inbox.kind === 'message' ? ' selected' : '') + '>Messages privés</option></select></label><label>État<select name="status"><option value="">Tous</option>' + [['todo', 'À traiter'], ['answered', 'Répondu'], ['done', 'Traité']].map(([v, s]) => '<option value="' + v + '"' + (inbox.status === v ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></label><label>Rechercher<input name="query" value="' + esc(inbox.query) + '" placeholder="Nom, texte, marque"></label><button>Filtrer</button></form>' + (inbox.error || inbox.message ? '<p role="status" class="notice">' + esc(inbox.error || inbox.message) + '</p>' : '') + inboxConnections() + '<div class="inbox-layout"><nav class="inbox-thread-list" aria-label="Conversations">' + (threads.length ? threads.map(t => '<button data-inbox-thread="' + t.key + '" class="' + (selected?.key === t.key ? 'selected' : '') + '"><span class="inbox-thread-meta">' + esc(t.account.brand + ' · ' + platform(t.account.provider)) + '</span><strong>' + esc(t.title) + '</strong><span>' + esc((t.messages.at(-1)?.text || '').slice(0, 100)) + '</span><small>' + esc(inboxTime(t.updatedAt)) + ' · ' + (t.status === 'done' ? 'Traité' : t.status === 'answered' ? 'Répondu' : 'À traiter') + '</small></button>').join('') : '<p class="inbox-empty">Aucun fil dans cette sélection. Vérifie les autorisations ci-dessus si un réseau est inaccessible.</p>') + '</nav>' + inboxConversation(selected) + '</div><details class="inbox-coverage"><summary>Couverture et dernières collectes</summary>' + inbox.data.accounts.map(a => '<p><strong>' + esc(a.account.brand + ' · ' + platform(a.account.provider)) + '</strong> · ' + esc(inboxTime(a.updatedAt)) + '<br>' + esc(a.coverage.join(' ')) + '</p>').join('') + '<p>« À traiter » est un état local à Postiz, indépendant de la lecture dans l’application du réseau. Un nouveau message remet un fil traité dans la liste.</p></details></section>';
}
async function inboxMutation(t, suffix, body) {
  const response = await fetch(inboxUrl(t.accountId, suffix), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json(); if (!response.ok) throw Error(typeof data.message === 'string' ? data.message : 'Action impossible'); return data;
}
async function inboxSend(t) {
  if (inbox.busy) return; const text = inbox.drafts.get(t.key) || ''; inbox.busy = true; inbox.message = ''; render();
  try { await inboxMutation(t, '/reply', { key: t.key, text, requestId: crypto.randomUUID() }); inbox.drafts.delete(t.key); inbox.confirm = false; inbox.message = 'Réponse confirmée par le réseau.'; await loadInbox(true); }
  catch (e) { inbox.message = e.message; inbox.confirm = false; }
  finally { inbox.busy = false; render(); }
}
async function inboxConnect(accountId) {
  const a = inbox.data.accounts.find(a => a.account.id === accountId)?.account; if (!a || inbox.busy) return;
  inbox.busy = true; inbox.message = 'Ouverture des autorisations…'; render();
  try {
    const response = await fetch('/api/integrations/social/' + encodeURIComponent(a.provider), { credentials: 'same-origin', cache: 'no-store' });
    const data = await response.json(); if (!response.ok || !data.url) throw Error('Le parcours de connexion est indisponible. Ouvre les connexions de Postiz.');
    const url = new URL(data.url);
    if (!['www.facebook.com', 'facebook.com', 'www.instagram.com', 'instagram.com', 'accounts.google.com'].includes(url.hostname) || url.protocol !== 'https:') throw Error('Adresse de connexion inattendue.');
    const added = a.provider === 'youtube' ? ['https://www.googleapis.com/auth/youtube.force-ssl'] : a.provider === 'facebook' ? ['pages_read_user_content', 'pages_manage_engagement', 'pages_messaging'] : a.provider === 'instagram-standalone' ? ['instagram_business_manage_comments', 'instagram_business_manage_messages'] : ['instagram_manage_comments', 'instagram_manage_messages', 'pages_manage_metadata'];
    const scopes = new Set((url.searchParams.get('scope') || '').split(/[ ,]+/).filter(Boolean)); added.forEach(s => scopes.add(s)); url.searchParams.set('scope', [...scopes].join(a.provider === 'youtube' ? ' ' : ','));
    if (a.provider === 'facebook') url.searchParams.set('auth_type', 'rerequest');
    if (a.provider === 'youtube') { url.searchParams.set('prompt', 'consent'); url.searchParams.set('access_type', 'offline'); }
    window.top.location.href = url.href;
  } catch (e) { inbox.message = e.message; inbox.busy = false; render(); }
}
function bindInbox() {
  app.classList.toggle('inbox-open', explorer.view === 'inbox');
  if (explorer.view !== 'inbox') return;
  if (inbox.context !== inboxContext()) { inbox.data = null; inbox.selected = ''; inbox.confirm = false; }
  loadInbox();
  const refresh = document.getElementById('inbox-refresh'); if (refresh) refresh.onclick = () => loadInbox(true);
  const form = document.getElementById('inbox-filter'); if (form) {
    form.onsubmit = e => { e.preventDefault(); inbox.query = form.elements.query.value; inbox.confirm = false; render(); };
    for (const k of ['platform', 'kind', 'status']) form.elements[k].onchange = () => { inbox[k] = form.elements[k].value; inbox.confirm = false; render(); };
    form.elements.all.onchange = () => { inbox.all = form.elements.all.checked; inbox.data = null; inbox.selected = ''; inbox.confirm = false; render(); };
  }
  document.querySelectorAll('[data-inbox-thread]').forEach(b => b.onclick = () => { if (inbox.busy) return; inbox.selected = b.dataset.inboxThread; inbox.confirm = false; inbox.message = ''; render(); });
  document.querySelectorAll('[data-inbox-auth]').forEach(b => { b.disabled = inbox.busy; b.onclick = () => inboxConnect(b.dataset.inboxAuth); });
  const t = inboxFiltered().find(t => t.key === inbox.selected); if (!t) return;
  const draft = document.getElementById('inbox-draft'); if (draft) draft.oninput = () => { inbox.drafts.set(t.key, draft.value); };
  const reply = document.getElementById('inbox-reply'); if (reply) reply.onsubmit = e => { e.preventDefault(); if (!inbox.drafts.get(t.key)?.trim()) return; inbox.confirm = true; render(); };
  const send = document.getElementById('inbox-confirm-send'); if (send) send.onclick = () => inboxSend(t);
  const cancel = document.getElementById('inbox-cancel-send'); if (cancel) cancel.onclick = () => { inbox.confirm = false; render(); };
  const resolve = document.getElementById('inbox-resolve'); if (resolve) { resolve.disabled = inbox.busy; resolve.onclick = async () => {
    if (inbox.busy) return; inbox.busy = true;
    try { await inboxMutation(t, '/state', { key: t.key, status: t.status === 'done' ? 'todo' : 'done' }); await loadInbox(true); } catch (e) { inbox.message = e.message; } finally { inbox.busy = false; render(); }
  }; }
}
setInterval(() => { if (!document.hidden && explorer.view === 'inbox' && !inbox.busy && !inbox.loading && !inbox.confirm && document.activeElement?.tagName !== 'TEXTAREA') loadInbox(true); }, 60000);
