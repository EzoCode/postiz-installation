'use strict';
const app = document.getElementById('app'), fiche = document.getElementById('fiche');
const integration = new URLSearchParams(location.search).get('integration');
const api = '/api/analytics/' + encodeURIComponent(integration || '') + '/capserv/creation';
const MEDIA = '/capserv-stats/media/';
const TZ = 'America/New_York';
const COLS = [['life', 'Life'], ['notes', 'Notes'], ['news', 'News'], ['french-lines', 'French Lines'], ['business', 'Business'], ['claudette', 'Claudette'], ['cristal', 'Cristal Memoria'], ['marc', 'Marc']];
const ATTENDUES = {life: ['ig', 'tt', 'yt', 'fb'], notes: ['ig', 'tt', 'yt', 'fb'], news: ['ig', 'yt', 'fb', 'tt'], 'french-lines': ['ig', 'yt', 'fb', 'tt'], business: ['ig', 'tt', 'yt', 'fb'], claudette: ['ig', 'fb', 'tt', 'yt'], cristal: ['ig', 'fb', 'tt', 'yt'], marc: ['ig', 'yt']};
// Logos officiels (Simple Icons 13.0.0, CC0), dessinés en blanc sur la pastille de couleur de la plateforme.
const LOGO = {ig: ['M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077', 'Instagram'], tt: ['M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z', 'TikTok'], fb: ['M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z', 'Facebook'], yt: ['M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z', 'YouTube']};
const ico = k => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + LOGO[k][0] + '"/></svg>';
const ETAT = {publie: 'Publié', programme: 'Programmé', verifier: 'À vérifier', valider: 'À valider', cours: 'En création', prepa: 'En préparation', pret: 'À terminer', attente: 'En attente', rejete: 'Rejeté, à refaire', retire: 'Retiré'};
const PSTAT = {publie: 'publié', programme: 'programmé', verifier: 'à vérifier', echec: 'échec', cours: 'brouillon'};
const JOURS = 14;
const ui = {data: null, passe: false, error: ''};
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmtJour = new Intl.DateTimeFormat('en-CA', {timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'});
const nyDay = v => { if (!v) return null; const s = typeof v === 'number' ? v : String(v); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; const d = new Date(s); return Number.isFinite(+d) ? fmtJour.format(d) : null; };
const ajouter = (jour, n) => { const d = new Date(jour + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const libelle = jour => new Intl.DateTimeFormat('fr-FR', {weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC'}).format(new Date(jour + 'T12:00:00Z'));
const heure = v => { const d = new Date(v); return Number.isFinite(+d) ? new Intl.DateTimeFormat('fr-FR', {hour: '2-digit', minute: '2-digit', timeZone: TZ}).format(d) : ''; };
const plat = p => { const n = String(p || '').toLowerCase(); return /insta/.test(n) ? 'ig' : /tik/.test(n) ? 'tt' : /face/.test(n) ? 'fb' : /you/.test(n) ? 'yt' : null; };

function colonne(r, brandId) {
  if (brandId === 'marceau' && (r.chaine === 'news' || /^NEWS\d/i.test(r.code || '') || /^NEWS\d{3}\b/i.test(r.title || ''))) return 'news';
  if (brandId === 'marceau' && (r.chaine === 'french-lines' || /^FL\d/i.test(r.code || '') || /^FL\d{3}\b/i.test(r.title || ''))) return 'french-lines';
  if (brandId === 'marceau' && (r.chaine === 'notes' || /^MN\d/i.test(r.code || '') || /^MN\d{3}\b/i.test(r.title || ''))) return 'notes';
  if (brandId === 'marceau') return r.chaine === 'business' || /^PMBA\b/i.test(r.code || '') ? 'business' : 'life';
  return brandId;
}
function titreCourt(r) {
  let t = String(r.title || r.code || '').trim();
  if (r.code && t.startsWith(r.code)) t = t.slice(r.code.length).trim();
  return t.length > 38 ? t.slice(0, 37).replace(/\s+\S*$/, '') + '…' : t;
}
const VIVANTS = ['programme', 'publie', 'verifier', 'echec'];
function collecte(d) {
  const lignes = [];
  for (const b of d.brands) for (const r of b.rows) lignes.push({r, col: colonne(r, b.id)});
  const plan = Array.isArray(d.plan) ? d.plan : [];
  const premier = new Map(); // col|code -> date de la première case de plan qui porte cet épisode
  for (const e of plan.slice().sort((a, b) => a.date.localeCompare(b.date))) {
    if (/^trou\b/i.test(e.texte) || !e.codes.length) continue;
    const k = e.col + '|' + e.codes[0];
    if (!premier.has(k)) premier.set(k, e.date);
  }
  const places = new Map(); // jour|col -> pastilles
  const avenir = new Map();
  const poser = (jour, col, p) => { const k = jour + '|' + col; if (!places.has(k)) places.set(k, []); places.get(k).push(p); };
  const prises = new Set(); // col|code|date : case de plan déjà occupée par l'épisode
  for (const {r, col} of lignes) {
    if (r.state === 'retire') continue;
    const vivantes = (r.platforms || []).map(p => ({...p, jour: nyDay(p.date)})).filter(p => p.jour && VIVANTS.includes(p.status));
    if (vivantes.length) {
      // une seule pastille par épisode, au jour de sa première sortie ; un renvoi tardif n'ajoute qu'un logo
      const toutes = r.platforms || [];
      const premierJour = vivantes.map(p => p.jour).sort()[0];
      const jour = r.jour || premierJour;
      poser(jour, col, {r, col, plateformes: toutes, jour, vivant: true, ps: vivantes});
      prises.add(col + '|' + (r.code || '') + '|' + jour);
      // Rattrapage : un envoi plus tard que la première sortie (YouTube oublié, Facebook renvoyé) a aussi sa carte ce jour-là, marquée comme telle.
      const tard = new Map();
      for (const p of vivantes) if (p.jour > jour) tard.set(p.jour, [...(tard.get(p.jour) || []), p]);
      for (const [j, ps] of tard) poser(j, col, {r, col, plateformes: toutes.filter(x => nyDay(x.date) === j), jour: j, vivant: true, ps, rattrapage: jour});
      continue;
    }
    const jour = r.jour || (r.code ? premier.get(col + '|' + r.code) : null);
    if (jour && !['publie'].includes(r.state)) { poser(jour, col, {r, col, plateformes: [], jour, vivant: false, ps: []}); prises.add(col + '|' + r.code + '|' + jour); continue; }
    if (r.state === 'publie') continue;
    if (!avenir.has(col)) avenir.set(col, []);
    avenir.get(col).push({r, col, plateformes: [], jour: null, vivant: false, ps: []});
  }
  return {places, avenir, plan, prises};
}
function logos(p) {
  const par = new Map();
  for (const x of p.plateformes) { const k = plat(x.provider); if (k) par.set(k, [...(par.get(k) || []), x]); }
  const vivants = new Map();
  for (const x of p.ps) { const k = plat(x.provider); if (k) vivants.set(k, x); }
  if (!p.vivant) {
    const cible = p.r.cible || [];
    return cible.length ? '<div class="logos">' + cible.map(n => { const k = plat(n); return k ? '<span class="lg gris ' + k + '" title="' + LOGO[k][1] + ' : prévu">' + ico(k) + '</span>' : ''; }).join('') + '</div>' : '';
  }
  const ordre = p.rattrapage ? [...par.keys()] : [...new Set([...(ATTENDUES[p.col] || []), ...par.keys()])];
  return '<div class="logos">' + ordre.map(k => {
    const x = vivants.get(k) || (par.get(k) || [])[0];
    const nom = LOGO[k][1];
    if (!x) return '<span class="lg gris ' + k + '" title="' + nom + ' : rien de programmé">' + ico(k) + '</span>';
    return '<span class="lg ' + k + ' s-' + esc(x.status) + '" title="' + nom + ' : ' + esc(PSTAT[x.status] || x.status) + (x.date ? ' · ' + esc(heure(x.date)) : '') + '">' + ico(k) + '</span>';
  }).join('') + '</div>';
}
function pastille(p, i) {
  const r = p.r;
  const img = r.thumb ? '<img src="' + MEDIA + encodeURIComponent(r.thumb) + '" alt="" loading="lazy">' : '<span class="ph" title="' + esc(r.noThumb || '') + '">' + esc((r.noThumb || 'Pas d’image').slice(0, 34)) + '</span>';
  if (p.rattrapage) {
    // Carte d'un envoi tardif : on dit que c'est un ancien épisode, lequel, et sur quoi il ressort.
    const noms = [...new Set(p.ps.map(x => plat(x.provider)).filter(Boolean))].map(k => LOGO[k][1]).join(', ');
    const st = p.ps.some(x => x.status === 'echec') ? 'echec' : p.ps.some(x => x.status === 'verifier') ? 'verifier' : p.ps.some(x => x.status === 'programme') ? 'programme' : 'publie';
    return '<button type="button" class="pas rat e-' + st + '" data-i="' + i + '">' + img + '<div class="tx"><div class="code">' + esc(r.code || 'Sans code') + ' <span class="badge">Rattrapage</span></div><div class="ti">' + esc(titreCourt(r)) + '</div><div class="av">Sorti le ' + esc(libelle(p.rattrapage).split(' ').slice(1).join(' ')) + ' · ' + esc(noms) + ' <span class="t-' + st + '">' + esc(PSTAT[st]) + '</span></div>' + logos(p) + '</div></button>';
  }
  const av = r.detail ? '<div class="av t-' + r.state + '">' + esc(r.detail.length > 90 ? r.detail.slice(0, 89) + '…' : r.detail) + '</div>' : '<div class="av t-' + r.state + '">' + esc(ETAT[r.state] || r.state) + '</div>';
  const code = r.code ? esc(r.code) : r.orphan ? '<span class="badge hs" title="Post Postiz qu’aucun épisode du suivi ne réclame">Hors suivi</span>' : esc(titreCourt(r));
  return '<button type="button" class="pas e-' + esc(r.state) + ((p.vivant || ['programme', 'publie'].includes(r.state)) ? '' : ' dash') + '" data-i="' + i + '">' + img + '<div class="tx"><div class="code">' + code + ' <small class="t-' + r.state + '">' + esc(ETAT[r.state] || '') + '</small></div>' + (r.code || r.orphan ? '<div class="ti">' + esc(titreCourt(r)) + '</div>' : '') + (r.orphan && !r.detail ? '' : av) + logos(p) + '</div></button>';
}
function planTexte(plan, jour, col, prises) {
  return plan.filter(e => e.date === jour && e.col === col).map(e => {
    const trou = /^trou\b/i.test(e.texte);
    if (!trou && e.codes.length && prises.has(col + '|' + e.codes[0] + '|' + jour)) return '';
    return '<div class="plan' + (trou ? ' trou' : '') + '" title="Prévu au plan de publication">' + esc(e.texte) + '</div>';
  }).join('');
}
const liste = [];
function cellule(jour, col, c) {
  const ps = c.places.get(jour + '|' + col) || [];
  const plan = planTexte(c.plan, jour, col, c.prises);
  if (!ps.length && !plan) return '<td class="vide" title="Rien de programmé ni de prévu ce jour">Rien de prévu</td>';
  return '<td>' + ps.map(p => { liste.push(p); return pastille(p, liste.length - 1); }).join('') + plan + '</td>';
}
function rendu() {
  const d = ui.data;
  liste.length = 0;
  const c = collecte(d);
  const auj = nyDay(Date.now());
  const debut = ui.passe ? ajouter(auj, -7) : auj;
  const fin = ajouter(auj, JOURS - 1);
  const jours = [];
  for (let j = debut; j <= fin; j = ajouter(j, 1)) jours.push(j);
  const m = d.mac, alertes = [];
  if (!m || m.status !== 'frais') alertes.push('Les registres du Mac ne sont plus à jour' + (m?.ageMinutes != null ? ' (dernier envoi il y a ' + m.ageMinutes + ' min)' : '') + '. L’avancement affiché peut être en retard.');
  for (const x of (d.connexions || [])) alertes.push('<b>' + esc(x.plateforme) + ' · ' + esc(x.compte) + '</b> : ' + esc(x.probleme));
  for (const s of (m?.sources || [])) if (!s.ok || s.error) alertes.push(esc(s.label) + ' : ' + esc(s.error || 'source en erreur'));
  const entete = '<thead><tr><th class="jour">Jour</th>' + COLS.map(([, n]) => '<th>' + n + '</th>').join('') + '</tr></thead>';
  const lignes = jours.map(j => '<tr' + (j === auj ? ' class="auj"' : '') + '><th class="jour"><b>' + (j === auj ? 'Aujourd’hui' : esc(libelle(j).split(' ').slice(0, 1).join(''))) + '</b><span>' + esc(j === auj ? libelle(j) : libelle(j).split(' ').slice(1).join(' ')) + '</span></th>' + COLS.map(([k]) => cellule(j, k, c)).join('') + '</tr>').join('');
  const av = '<tr class="avenir"><th class="jour"><b>À venir</b><span>sans jour</span></th>' + COLS.map(([k]) => '<td>' + (c.avenir.get(k) || []).map(p => { liste.push(p); return pastille(p, liste.length - 1); }).join('') + '</td>').join('') + '</tr>';
  app.innerHTML = '<div class="top"><h1>Calendrier</h1><small>Heure de New York · mis à jour ' + esc(heure(d.checkedAt)) + '</small><span class="sp"></span><button id="passe" type="button">' + (ui.passe ? 'Masquer' : 'Voir') + ' les 7 jours passés</button><button id="maj" type="button">Actualiser</button><a href="/launches?ancien=1" target="_top">Ancien calendrier Postiz</a></div>' +
    alertes.map(a => '<div class="alert">' + a + '</div>').join('') +
    '<p class="legend"><span><i style="background:var(--ok)"></i>publié</span><span><i style="background:var(--prog)"></i>programmé</span><span><i style="background:var(--warn)"></i>à valider ou à vérifier</span><span><i style="background:var(--make)"></i>en création</span><span><i style="background:var(--bad)"></i>rejeté ou échec</span><span><i style="background:var(--wait)"></i>en attente</span><span>Pointillé : prévu au plan, pas encore programmé</span></p>' +
    '<div class="scroll"><table>' + entete + '<tbody>' + lignes + av + '</tbody></table></div>';
}
function ouvrir(i) {
  const p = liste[i];
  if (!p) return;
  const r = p.r;
  const media = r.preview ? '<video controls playsinline preload="metadata" poster="' + (r.thumb ? MEDIA + encodeURIComponent(r.thumb) : '') + '" src="' + MEDIA + encodeURIComponent(r.preview) + '"></video>' : r.thumb ? '<img class="big" src="' + MEDIA + encodeURIComponent(r.thumb) + '" alt="">' : '<p class="muted">' + esc(r.noThumb || 'Aucune image.') + '</p>';
  const ps = (r.platforms || []).map(x => { const k = plat(x.provider); const u = x.url && /^https:\/\//.test(x.url) ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">voir</a>' : ''; return '<li><b>' + esc(k ? LOGO[k][1] : x.provider) + '</b> · ' + esc(PSTAT[x.status] || x.status) + (x.date ? ' · ' + esc(nyDay(x.date)) + ' ' + esc(heure(x.date)) : '') + ' ' + u + (x.note ? '<br><small>' + esc(x.note) + '</small>' : '') + '</li>'; }).join('');
  fiche.innerHTML = '<button class="close" type="button">Fermer</button>' + media + '<h2>' + esc(r.title) + '</h2><p class="t-' + esc(r.state) + '">' + esc(ETAT[r.state] || r.state) + '</p>' + (r.detail ? '<p>' + esc(r.detail) + '</p>' : '') + (r.previewNote ? '<p class="muted">' + esc(r.previewNote) + '</p>' : '') + (ps ? '<ul>' + ps + '</ul>' : '') + ((r.notes || []).map(n => '<p class="muted">' + esc(n) + '</p>').join(''));
  fiche.showModal();
}
async function charger() {
  try {
    const rep = await fetch(api, {credentials: 'same-origin', cache: 'no-store'});
    if (!rep.ok) throw new Error('Le serveur répond ' + rep.status);
    ui.data = await rep.json();
    ui.error = '';
    rendu();
  } catch (e) {
    if (!ui.data) app.innerHTML = '<div class="empty">Le calendrier ne s’est pas chargé : ' + esc(e.message) + '. <button id="maj" type="button">Réessayer</button></div>';
  }
}
document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('.pas')) return ouvrir(+t.closest('.pas').dataset.i);
  if (t.closest('#passe')) { ui.passe = !ui.passe; return rendu(); }
  if (t.closest('#maj')) return charger();
  if (t.closest('.close') || t === fiche) fiche.close();
});
charger();
setInterval(() => { if (!document.hidden && !fiche.open) charger(); }, 60000);
