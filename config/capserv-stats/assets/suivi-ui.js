'use strict';
// Onglet Suivi : l'état de chaque contenu par chaîne (route GET /api/analytics/:integration/capserv/suivi).
const suivi={data:null,loading:false,error:'',brand:'all',timer:null};
const SUIVI_ETATS=[['valider','Attend ta validation'],['pret','Prêt, pas publié'],['programme','Programmé'],['cours','En cours'],['prepa','En préparation'],['attente','En attente'],['rejete','Rejeté, à refaire'],['verifier','À vérifier'],['echec','Échec'],['publie','Publié'],['retire','Retiré']];
const SUIVI_PLATEFORME={publie:'publié',programme:'programmé',verifier:'à vérifier',echec:'échec',cours:'brouillon'};
const suiviUrl=()=>'/api/analytics/'+encodeURIComponent(id)+'/capserv/suivi';
function suiviDate(v,heure){if(!v)return '';const d=new Date(String(v).length===10?v+'T12:00:00Z':v);if(!Number.isFinite(+d))return '';return new Intl.DateTimeFormat('fr-FR',heure?{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'America/New_York'}:{day:'numeric',month:'short',timeZone:'America/New_York'}).format(d);}
async function loadSuivi(){if(suivi.loading)return;suivi.loading=true;try{const r=await fetch(suiviUrl(),{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error(r.status===401?'Session Postiz expirée, reconnecte-toi.':'Suivi indisponible');suivi.data=await r.json();suivi.error='';}catch(e){suivi.error=e.message;}finally{suivi.loading=false;if(explorer.view==='suivi')render();}}
function suiviQuand(row){const d=row.date;if(!d)return '';if(row.state==='publie')return 'publié le '+suiviDate(d);if(row.state==='programme')return 'prévu le '+suiviDate(d);return 'au '+suiviDate(d);}
function suiviPlateformes(row){if(!row.platforms.length)return '';return '<ul class="suivi-platforms">'+row.platforms.map(p=>{const label=esc(p.provider)+' · '+esc(SUIVI_PLATEFORME[p.status]||p.status)+(p.status==='programme'&&p.date?' '+esc(suiviDate(p.date,true)):'');return '<li class="suivi-p suivi-p-'+esc(p.status)+'">'+(p.url?'<a href="'+safeLink(p.url)+'" target="_blank" rel="noopener">'+label+'</a>':'<span>'+label+'</span>')+(p.note?'<small>'+esc(p.note)+'</small>':'')+'</li>';}).join('')+'</ul>';}
function suiviLigne(row){return '<article class="suivi-row"><div class="suivi-row-head"><h4>'+esc((row.code&&!row.title.startsWith(row.code)?row.code+' · ':'')+row.title)+'</h4><span class="suivi-when">'+esc(suiviQuand(row))+'</span></div>'+suiviPlateformes(row)+(row.detail?'<details class="suivi-registry"><summary>Détail de la source</summary><p class="suivi-detail">'+esc(row.detail)+'</p></details>':'')+row.notes.map(n=>'<p class="suivi-note">'+esc(n)+'</p>').join('')+'<p class="suivi-source">'+esc((row.source||'')+(row.sourceModifiedAt?' · source modifiée le '+suiviDate(row.sourceModifiedAt,true):''))+'</p></article>';}
function suiviMarque(b){const enCours=SUIVI_ETATS.filter(([s])=>s!=='publie').reduce((n,[s])=>n+b.counts[s],0);
 return '<section class="suivi-brand"><div class="suivi-brand-head"><h3>'+esc(b.name)+'</h3><p class="sub">'+SUIVI_ETATS.filter(([s])=>b.counts[s]).map(([s,l])=>'<span class="suivi-count suivi-s-'+s+'">'+esc(l)+' : '+b.counts[s]+'</span>').join(' ')+'</p></div>'+
 (!b.rows.length?'<p class="sub">Aucun contenu connu.</p>':'')+
 SUIVI_ETATS.map(([s,l])=>{const rows=b.rows.filter(r=>r.state===s);if(!rows.length)return '';
  if(s==='publie'){const first=rows.slice(0,enCours?3:6),rest=rows.slice(first.length);return '<div class="suivi-group"><h5 class="suivi-s-'+s+'">'+esc(l)+' ('+rows.length+')</h5>'+first.map(suiviLigne).join('')+(rest.length?'<details><summary>Voir les '+rest.length+' autres publiés</summary>'+rest.map(suiviLigne).join('')+'</details>':'')+'</div>';}
  return '<div class="suivi-group"><h5 class="suivi-s-'+s+'">'+esc(l)+' ('+rows.length+')</h5>'+rows.map(suiviLigne).join('')+'</div>';}).join('')+'</section>';}
function suiviEntete(d){const parts=['Postiz lu le '+suiviDate(d.checkedAt,true)];const m=d.mac,q=d.marc;
 if(m)parts.push(m.receivedAt?'état du Mac au '+suiviDate(m.collectedAt||m.receivedAt,true):'aucun envoi du Mac');
 if(q)parts.push(q.collectedAt?'file de Marc copiée le '+suiviDate(q.collectedAt,true):'file de Marc absente');
 let alert='';
 if(m&&m.status==='ancien')alert+='<p class="notice suivi-alert">Le Mac n’a rien envoyé depuis '+esc(m.ageMinutes>=120?Math.round(m.ageMinutes/60)+' h':m.ageMinutes+' min')+' (éteint, en veille ou hors ligne). Les états « prêt », « en cours » et « attend ta validation » sont ceux du '+esc(suiviDate(m.collectedAt||m.receivedAt,true))+'. Postiz continue d’être lu sur le serveur.</p>';
 if(m&&(m.status==='absent'||m.status==='erreur'))alert+='<p class="notice suivi-alert">'+esc(m.message||'État du Mac indisponible.')+' Seuls les contenus déjà dans Postiz et la file de Marc sont affichés.</p>';
 if(q&&q.status!=='frais')alert+='<p class="notice suivi-alert">File de Marc : '+esc(q.message||'indisponible')+'</p>';
 const bad=(m?.sources||[]).filter(s=>s.error);
 if(bad.length)alert+='<details class="suivi-sources"><summary>Sources du Mac : '+bad.length+' à surveiller</summary><ul>'+bad.map(s=>'<li><strong>'+esc(s.label)+'</strong> · '+esc(s.error)+(s.lastSuccessAt?' · dernière lecture réussie : '+esc(suiviDate(s.lastSuccessAt,true)):'')+'</li>').join('')+'</ul></details>';
 if(q?.lastRun)alert+='<p class="sub suivi-run">Dernier passage de la file de Marc : '+esc(suiviDate(String(q.lastRun.derniere_execution||'')+'Z',true))+(q.lastRun.exit_code===0?' (réussi)':' (échec, code '+esc(q.lastRun.exit_code)+')')+'.</p>';
 return '<p class="sub">'+esc(parts.join(' · '))+'</p>'+alert;}
function renderSuivi(){const d=suivi.data;
 if(!d)return '<section class="section suivi"><div class="section-head"><h2>Suivi des contenus</h2></div><p class="suivi-pad">'+esc(suivi.error||'Chargement…')+'</p><button id="suivi-refresh">Réessayer</button></section>';
 const brands=d.brands.filter(b=>suivi.brand==='all'||b.id===suivi.brand);
 return '<section class="section suivi"><div class="section-head"><div><h2>Suivi des contenus</h2>'+suiviEntete(d)+'</div><button id="suivi-refresh" '+(suivi.loading?'disabled':'')+'>Actualiser</button></div>'+(suivi.error?'<p class="notice suivi-alert">'+esc(suivi.error)+' Affichage de la dernière lecture.</p>':'')+
 '<nav class="suivi-filter" aria-label="Chaînes"><button data-suivi-brand="all" aria-pressed="'+(suivi.brand==='all')+'" class="'+(suivi.brand==='all'?'active':'')+'">Toutes</button>'+d.brands.map(b=>'<button data-suivi-brand="'+esc(b.id)+'" aria-pressed="'+(suivi.brand===b.id)+'" class="'+(suivi.brand===b.id?'active':'')+'">'+esc(b.name)+'</button>').join('')+'</nav>'+
 '<div class="suivi-pad">'+brands.map(suiviMarque).join('')+'<details class="suivi-method"><summary>D’où viennent ces états</summary><p>Publié et programmé : Postiz, lu à chaque ouverture, et la file de Marc sur capServ (copiée toutes les 5 minutes, publiée à 11 h et 18 h UTC). Une erreur YouTube de miniature ou un TikTok resté en file s’affiche publié quand le reçu de publication prouve la mise en ligne, avec la mention. Prêt, en cours et attend ta validation : registres et dossiers de montage du Mac, envoyés toutes les 10 minutes quand il est allumé. Ces états sont lus dans le texte des registres : un registre pas à jour donne un état pas à jour.</p></details></div></section>';}
function bindSuivi(){
 if(explorer.view!=='suivi'){if(suivi.timer){clearInterval(suivi.timer);suivi.timer=null;}return;}
 if(!suivi.data&&!suivi.loading&&!suivi.error)loadSuivi();
 if(!suivi.timer)suivi.timer=setInterval(()=>{if(explorer.view==='suivi'&&document.visibilityState==='visible')loadSuivi();},120000);
 const r=document.getElementById('suivi-refresh');if(r)r.onclick=()=>{suivi.error='';loadSuivi();render();};
 document.querySelectorAll('[data-suivi-brand]').forEach(b=>b.onclick=()=>{suivi.brand=b.dataset.suiviBrand;render();});
}
