'use strict';
const app = document.getElementById('app');
const integration = new URLSearchParams(location.search).get('integration');
const api = '/api/analytics/' + encodeURIComponent(integration || '') + '/capserv/creation';
const ui = {data:null,brand:'all',filter:'active',q:'',view:'board',selected:null,dirty:false,loading:false,error:'',saving:false};
ui.view=matchMedia('(max-width:650px)').matches?'list':'board';
try { const saved=localStorage.getItem('creation-view');if(['list','board'].includes(saved))ui.view=saved; } catch {}
const labels={idee:'Idée',script:'Script',production:'Production',montage:'Montage',validation:'À valider',pret:'Prêt',programme:'Programmé',verifier:'À vérifier',publie:'Publié',attente:'En attente',rejete:'Rejeté, à refaire',retire:'Retiré'};
const AUTO=['publie','programme','verifier','attente','rejete','retire'];
const MEDIA='/capserv-stats/media/';
const icons={arrow:'<path d="M7 17 17 7M7 7h10v10"/>',back:'<path d="m14 6-6 6 6 6"/>',plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="m5 12 4 4L19 6"/>',box:'<path d="M4 7h16v13H4zM3 3h18v4H3zM9 11h6"/>',chat:'<path d="M4 4h16v12H9l-5 4z"/>',refresh:'<path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1"/>'};
const icon=k=>'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">'+icons[k]+'</svg>';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=(v,full=false)=>{const d=new Date(v);return !v||!Number.isFinite(+d)?'Date inconnue':new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',...(full?{hour:'2-digit',minute:'2-digit'}:{}),timeZone:'America/New_York'}).format(d);};

function sources(){const c=ui.data.creation,m=ui.data.mac,q=ui.data.marc;const warnings=(m?.sources||[]).filter(s=>s.error);const sourceNote='<p>Registres du Mac : '+esc(date(m?.collectedAt,true))+(m?.status!=='frais'?' · dernière copie conservée, Mac non actualisé':'')+'. File Marc : '+esc(date(q?.collectedAt,true))+(q?.status!=='frais'?' · copie ancienne ou indisponible':'')+'.</p>'+warnings.map(s=>'<p>'+esc(s.label)+' : '+esc(s.error)+'</p>').join('');return '<details class="sources"><summary>'+icon('refresh')+' Sources actualisées le '+esc(date(c.sessionsAt,true))+(warnings.length?' · '+warnings.length+' sources à surveiller':'')+'</summary>'+sourceNote+'<p>Contenus : registres du Mac et publications Postiz. Sessions : titres, dossiers et références d’épisodes. Un rapprochement automatique peut être retiré dans la fiche.</p><ul>'+c.sources.map(s=>{const age=Date.now()-Date.parse(s.date),fresh=s.status==='ok'&&age<30*60e3;return '<li>'+esc(s.name)+' : '+esc(date(s.date,true))+(fresh?'':' · lecture ancienne ou partielle')+'</li>';}).join('')+'</ul><p>Les liens Codex et Claude ouvrent les applications installées sur ton Mac. Sur un autre appareil, utilise la commande de reprise sur la machine indiquée.</p></details>';}

function platforms(r){return r.platforms.map(p=>{const href=p.url&&/^https:\/\//.test(p.url)?p.url:null;const title=esc(p.provider)+' · '+esc(({publie:'publié',programme:'programmé',verifier:'à vérifier',echec:'échec',cours:'brouillon'})[p.status]||p.status);return '<div class="publication"><strong>'+(href?'<a href="'+esc(href)+'" target="_blank" rel="noopener">'+title+icon('arrow')+'</a>':title)+'</strong>'+(p.date?'<small>'+esc(date(p.date,true))+'</small>':'')+(p.note?'<p>'+esc(p.note)+'</p>':'')+'</div>';}).join('');}
function task(t){return '<div class="task"><input type="checkbox" aria-label="Tâche terminée" '+(t.done?'checked':'')+'><input type="text" maxlength="200" aria-label="Nom de la tâche" value="'+esc(t.text)+'"><button type="button" class="remove-task" aria-label="Retirer la tâche">×</button></div>';}
function detail(r){return '<button id="back" class="back">'+icon('back')+' Toutes les créations</button><header class="detail-head"><div><p>'+esc(r.brandName)+(r.code?' · '+esc(r.code):'')+'</p><h1>'+esc(r.title)+'</h1></div><span class="badge '+r.stage+'">'+esc(labels[r.stage])+'</span></header><div class="detail-grid"><section>'+detailVisual(r)+'<form id="edit"><label>Titre<input name="title" maxlength="180" required value="'+esc(r.title)+'"></label><div class="two"><label>Étape de création<select name="stage">'+[['auto','Automatique, d’après les sources'],...Object.entries(labels).filter(([k])=>!AUTO.includes(k))].map(([k,l])=>'<option value="'+k+'" '+(r.plan.stage===k?'selected':'')+'>'+l+'</option>').join('')+'</select></label><label>Échéance<input type="date" name="due" value="'+esc(r.plan.due)+'"></label></div><label>Prochaine étape<textarea name="next" maxlength="500" rows="2" placeholder="'+esc(r.next)+'">'+esc(r.plan.next)+'</textarea></label><div class="checklist"><h2>À faire</h2><div id="tasks">'+r.plan.tasks.map(task).join('')+'</div><button type="button" id="add-task">'+icon('plus')+' Ajouter une tâche</button></div><label>Notes<textarea name="notes" maxlength="5000" rows="5" placeholder="Angle, décisions, retours…">'+esc(r.plan.notes)+'</textarea></label><div class="savebar"><span id="dirty-state" role="status">Enregistré</span><button type="submit" class="primary">'+icon('check')+' Enregistrer</button></div></form><details class="history"><summary>Historique de la fiche</summary>'+r.plan.history.map(h=>'<p>'+esc(date(h.date,true))+' · '+esc(h.label)+'</p>').join('')+(!r.plan.history.length?'<p>Aucune modification manuelle.</p>':'')+'</details><button class="quiet" id="archive">'+icon('box')+' '+(r.plan.archived?'Restaurer ce contenu':'Archiver ce contenu')+'</button></section><aside><section class="side-section"><h2>Sessions associées</h2><div class="session-list">'+r.sessions.map(s=>session(s,true)).join('')+'</div>'+(!r.sessions.length?'<p class="muted">Aucune session liée avec assez de précision. Les sessions générales sont disponibles dans la vue de la chaîne.</p>':'')+'</section><section class="side-section"><h2>Publication</h2>'+platforms(r)+(!r.platforms.length?'<p class="muted">Aucune publication reliée dans Postiz.</p>':'')+r.notes.map(n=>'<p class="muted">'+esc(n)+'</p>').join('')+'</section><details class="side-section"><summary>État dans les sources</summary><p>'+esc(r.detail||r.source)+'</p><small>'+esc(r.source)+(r.sourceModifiedAt?' · '+esc(date(r.sourceModifiedAt,true)):'')+'</small></details></aside></div>';}

function detailVisual(r){
 if(r.preview)return '<div class="visual drawer-visual"><video controls playsinline preload="metadata" poster="'+(r.thumb?MEDIA+encodeURIComponent(r.thumb):'')+'" src="'+MEDIA+encodeURIComponent(r.preview)+'"></video></div>'+(r.detail&&r.orch?'<p class="where">'+esc(r.detail)+'</p>':'');
 return (r.thumb?'<div class="visual drawer-visual"><img src="'+MEDIA+encodeURIComponent(r.thumb)+'" alt="Image de '+esc(r.title)+'"></div>':'<div class="visual none"><span>'+esc(r.noThumb||'Aucune image fournie par ce registre.')+'</span></div>')+(r.detail&&r.orch?'<p class="where">'+esc(r.detail)+'</p>':'');
}
function newIdea(){const d=document.createElement('dialog');d.innerHTML='<form id="idea-form"><h2>Nouveau contenu</h2><label>Chaîne<select name="brand">'+ui.data.brands.map(b=>'<option value="'+b.id+'" '+(b.id===ui.brand?'selected':'')+'>'+esc(b.name)+'</option>').join('')+'</select></label><label>Titre<input name="title" maxlength="180" required autofocus placeholder="Ton idée de contenu"></label><div class="actions"><button type="button" id="cancel">Annuler</button><button class="primary">Créer la fiche</button></div></form>';document.body.appendChild(d);d.showModal();d.querySelector('#cancel').onclick=()=>d.close();d.onclose=()=>d.remove();d.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('.primary');b.disabled=true;const result=await save({action:'create',brand:f.elements.brand.value,title:f.elements.title.value});if(result){d.close();await load();navigate(result.key);}else b.disabled=false;};}
Object.assign(icons, {
 play:'<path d="M8 5v14l11-7z"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 board:'<rect x="3" y="4" width="7" height="16" rx="2"/><rect x="14" y="4" width="7" height="11" rx="2"/>',
 list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>'
});
const stages = [
 {id:'ideas',title:'À préparer',stages:['idee','script','attente','rejete'],tone:'blue'},
 {id:'making',title:'En création',stages:['production','montage'],tone:'violet'},
 {id:'review',title:'À valider',stages:['validation','verifier'],tone:'amber'},
 {id:'ready',title:'À diffuser',stages:['pret','programme'],tone:'green'}
];
function all(){return (ui.data?.brands||[]).flatMap(b=>b.rows.map(r=>({...r,brand:b.id,brandName:b.name})));}
function selected(){return all().find(r=>r.key===ui.selected);}
function notify(message,error=false){const modal=document.querySelector('dialog[open]');if(modal){let notice=modal.querySelector('.form-feedback');if(!notice){notice=document.createElement('div');notice.className='form-feedback';notice.setAttribute('role','status');modal.prepend(notice);}notice.textContent=message;notice.classList.toggle('error',error);}const e=document.getElementById('feedback');e.textContent=message;e.className=error?'error':'success';clearTimeout(notify.timer);notify.timer=setTimeout(()=>e.textContent='',5000);}
function resize(){} // The independent workspace owns its scrolling.
function creationScroll(){}
function syncHash(){history.replaceState(null,'',ui.selected?'#content='+encodeURIComponent(ui.selected):location.pathname+location.search);parent.postMessage({type:'creation-selection',key:ui.selected},location.origin);}
function dirty(value){ui.dirty=value;parent.postMessage({type:'capserv-creation-dirty',dirty:value},location.origin);}
function navigate(key){if(ui.dirty&&!confirm('Quitter cette fiche sans enregistrer tes changements ?'))return;dirty(false);ui.selected=key;syncHash();renderDrawer();}
async function load(){
 if(ui.loading||ui.dirty||ui.saving)return;
 ui.loading=true;
 try{
  const r=await fetch(api,{credentials:'same-origin',cache:'no-store'});
  if(!r.ok)throw Error(r.status===401?'Connecte-toi à Postiz pour retrouver tes créations.':r.status===404?'Cet espace n’est pas disponible pour ce compte.':'Les créations sont momentanément indisponibles.');
  ui.data=await r.json();ui.error='';
 }catch(e){ui.error=e.message;}
 finally{ui.loading=false;render();}
}
async function save(payload){
 if(ui.saving)return null;
 ui.saving=true;
 try{
  const r=await fetch(api,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await r.json();
  if(!r.ok)throw Error(r.status===409?'Cette fiche a changé ailleurs. Copie tes modifications, puis recharge la page avant de réessayer.':data.message||'Enregistrement impossible.');
  dirty(false);notify('Enregistré');return data;
 }catch(e){notify(e.message,true);return null;}
 finally{ui.saving=false;}
}
function normal(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function overdue(r){return r.plan.due&&r.plan.due<new Date().toLocaleDateString('en-CA')&&!['publie','programme'].includes(r.stage);}
function byPriority(a,b){return Number(!!overdue(b))-Number(!!overdue(a))||(a.plan.due||'9999').localeCompare(b.plan.due||'9999')||String(b.sourceModifiedAt||'').localeCompare(String(a.sourceModifiedAt||''));}
function scoped(){return all().filter(r=>ui.brand==='all'||r.brand===ui.brand);}
function matches(r){
 if(ui.filter==='archive')return r.plan.archived||r.stage==='retire';
 if(r.plan.archived||r.stage==='retire')return false;
 if(ui.filter==='active')return !['publie','programme'].includes(r.stage);
 if(ui.filter==='late')return overdue(r);
 if(ui.filter==='review')return ['validation','verifier'].includes(r.stage);
 return r.stage===ui.filter;
}
function rows(){return scoped().filter(matches).filter(r=>normal([r.title,r.code,r.next,r.brandName].join(' ')).includes(normal(ui.q))).sort(byPriority);}
function primarySessions(r){const found=new Set();return [...r.sessions].sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).filter(s=>{if(found.has(s.agent))return false;found.add(s.agent);return true;}).slice(0,2);}
function sessionLink(s,small=false){return s.url?'<a class="resume '+(small?'compact':'')+'" href="'+esc(s.url)+'" target="_top" title="'+esc(s.title)+'">'+icon('chat')+esc(s.agent)+icon('arrow')+'</a>':'<button class="resume" data-copy="'+esc(s.command)+'" title="Copier la commande pour reprendre '+esc(s.title)+'">'+icon('copy')+esc(s.agent)+'</button>';}
function session(s,removable=false){return '<article class="session"><div class="session-heading"><span class="session-kind">'+esc(s.agent)+' · '+esc(s.host)+'</span><small>'+esc(date(s.updatedAt))+'</small></div><h3>'+esc(s.title)+'</h3><div class="session-actions">'+sessionLink(s)+(s.url?'<button class="icon-button" data-copy="'+esc(s.command)+'" aria-label="Copier la commande de reprise" title="Copier la commande de reprise">'+icon('copy')+'</button>':'')+(removable?'<button class="quiet" data-exclude="'+esc(s.id)+'" title="Retirer une association incorrecte">Retirer le lien</button>':'')+'</div></article>';}
function visual(r){
 if(r.thumb){
  const img='<img loading="lazy" decoding="async" src="'+MEDIA+encodeURIComponent(r.thumb)+'" alt="Image de '+esc(r.title)+'">';
  return '<div class="visual">'+(r.preview?'<button type="button" class="play" data-preview="'+esc(r.preview)+'" aria-label="Voir l’aperçu vidéo de '+esc(r.title)+'">'+img+'<span>'+icon('play')+' Aperçu</span></button>':img)+(r.previewNote?'<small>'+esc(r.previewNote)+'</small>':'')+'</div>';
 }
 return '<div class="visual none"><span>'+esc(r.noThumb||'Aucune image fournie par ce registre.')+'</span></div>';
}
function card(r){
 const tasks=r.plan.tasks,done=tasks.filter(t=>t.done).length;
 const next=r.plan.next||(r.orch&&r.detail)||r.next||'Définir la prochaine action';
 const locked=AUTO.includes(r.stage);
 return '<article class="content-card '+r.stage+'" data-key="'+esc(r.key)+'">'+visual(r)+'<div class="card-meta"><span class="brand-dot brand-'+r.brand+'"></span><span>'+esc(r.brandName)+'</span><span class="content-code">'+esc(r.code)+'</span>'+(['rejete','retire','attente'].includes(r.stage)?'<span class="state-badge '+r.stage+'">'+esc(labels[r.stage])+'</span>':'')+'</div><button class="card-open" data-content="'+esc(r.key)+'"><h3>'+esc(r.title)+'</h3><p>'+esc(next)+'</p></button><div class="card-progress">'+(r.orch&&r.sourceModifiedAt?'<small class="updated" title="Dernière mise à jour écrite par la production">Mis à jour '+esc(date(r.sourceModifiedAt,true))+'</small>':'')+''+(tasks.length?'<span title="Tâches terminées">'+icon('check')+' '+done+'/'+tasks.length+'</span>':'')+(r.plan.due?'<span class="deadline '+(overdue(r)?'late':'')+'">'+icon('clock')+esc(date(r.plan.due))+'</span>':'')+'</div><footer><label class="stage-control '+r.stage+'"><span class="sr">Étape de '+esc(r.title)+'</span><select data-stage="'+esc(r.key)+'" '+(locked?'disabled':'')+'>'+Object.entries(labels).filter(([k])=>!AUTO.includes(k)||k===r.stage).map(([k,v])=>'<option value="'+k+'" '+(k===r.stage?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label><div class="quick-sessions">'+primarySessions(r).map(s=>sessionLink(s,true)).join('')+'</div></footer></article>';
}
function boardContent(){
 const list=rows();
 if(!list.length)return '<div class="empty">'+icon('board')+'<h2>Aucun contenu dans cette vue</h2><p>Change les filtres ou ajoute une idée.</p><button data-new class="primary">'+icon('plus')+' Nouveau contenu</button></div>';
 if(ui.view==='list'||['publie','archive','programme'].includes(ui.filter))return '<div class="content-list">'+list.map(card).join('')+'</div>';
 return '<div class="kanban">'+stages.map(col=>{const items=list.filter(r=>col.stages.includes(r.stage));return '<section class="column '+col.tone+'"><header><h2><i></i>'+col.title+'</h2><span>'+items.length+'</span></header><div class="column-items">'+items.map(card).join('')+(!items.length?(col.id==='ideas'?'<button class="column-empty add-idea" data-new>'+icon('plus')+' Ajouter une idée</button>':'<div class="column-empty">Aucun contenu</div>'):'')+'</div></section>';}).join('')+'</div>';
}
function brandContext(){if(ui.brand==='all')return '';const b=ui.data.brands.find(b=>b.id===ui.brand);if(!b)return '';return '<details class="channel-context"><summary>'+icon('chat')+' Sessions et projets de '+esc(b.name)+'</summary><div class="context-inner">'+(b.projects||[]).map(p=>'<a class="project-link" href="#/p/'+esc(p.slug)+'" target="_blank" rel="noopener">'+esc(p.name)+icon('arrow')+'</a>').join('')+'<div class="session-list">'+b.sessions.map(s=>session(s)).join('')+'</div></div></details>';}
function board(){
 const base=scoped().filter(r=>!r.plan.archived&&r.stage!=='retire');
 const tabs=[['active','En cours',base.filter(r=>!['publie','programme'].includes(r.stage)).length],['review','À valider',base.filter(r=>['validation','verifier'].includes(r.stage)).length],['late','En retard',base.filter(overdue).length],['programme','Programmés',base.filter(r=>r.stage==='programme').length],['publie','Publiés',base.filter(r=>r.stage==='publie').length],['archive','Archives et retirés',scoped().filter(r=>r.plan.archived||r.stage==='retire').length]];
 return '<header class="workspace-head"><div><span class="eyebrow">ATELIER</span><h1>Tableau de production</h1></div><button data-new class="primary">'+icon('plus')+' Nouveau contenu</button></header><nav class="brands" aria-label="Marques"><button data-brand="all" aria-pressed="'+(ui.brand==='all')+'">Toutes les marques</button>'+ui.data.brands.map(b=>'<button data-brand="'+b.id+'" aria-pressed="'+(ui.brand===b.id)+'"><span class="brand-dot brand-'+b.id+'"></span>'+esc(b.name)+'</button>').join('')+'</nav><div class="toolbar"><nav class="views" aria-label="État des contenus">'+tabs.map(([key,name,count])=>'<button data-filter="'+key+'" aria-pressed="'+(ui.filter===key)+'">'+name+'<span>'+count+'</span></button>').join('')+'</nav><div class="tools"><label class="search">'+icon('search')+'<span class="sr">Rechercher</span><input id="search" type="search" placeholder="Rechercher…" value="'+esc(ui.q)+'"><kbd>/</kbd></label><div class="view-switch" aria-label="Présentation"><button data-view="board" aria-label="Vue tableau" title="Vue tableau" aria-pressed="'+(ui.view==='board')+'">'+icon('board')+'</button><button data-view="list" aria-label="Vue liste" title="Vue liste" aria-pressed="'+(ui.view==='list')+'">'+icon('list')+'</button></div><button id="refresh" class="icon-button" title="Actualiser" aria-label="Actualiser">'+icon('refresh')+'</button></div></div><div id="contents">'+boardContent()+'</div>'+brandContext()+sources();
}
function alerts(){
 const m=ui.data.mac,q=ui.data.marc,out=[];
 if(!m||m.status!=='frais')out.push('Les registres du Mac ne sont plus actualisés'+(m?.collectedAt?' depuis '+date(m.collectedAt,true):'')+' : l’état affiché peut être faux.');
 for(const s of (m?.sources||[]).filter(s=>!s.ok||s.error))out.push(s.label+' : '+(s.error||'source illisible')+(s.ok?'':' · dernière lecture conservée'));
 if(q&&q.status!=='frais')out.push('La file de Marc n’est plus actualisée.');
 return out.length?'<div class="alert-banner" role="alert"><strong>Sources à surveiller</strong>'+out.map(t=>'<p>'+esc(t)+'</p>').join('')+'</div>':'';
}
function render(){
 if(ui.dirty)return;
 const scroll=document.scrollingElement.scrollTop;
 if(!ui.data){app.innerHTML='<div class="empty"><h1>Création</h1><p>'+esc(ui.error||'Chargement de ton atelier…')+'</p>'+(ui.error?'<button id="retry">Réessayer</button>':'')+'</div>';document.getElementById('retry')?.addEventListener('click',load);return;}
 app.innerHTML=(ui.error?'<p class="error-banner">'+esc(ui.error)+' Dernières données conservées.</p>':'')+alerts()+board();
 bindBoard();renderDrawer();document.scrollingElement.scrollTop=scroll;
}
function bindCopy(root){root.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);notify('Commande copiée');}catch{prompt('Commande de reprise',b.dataset.copy);}});}
function bindCards(){
 document.querySelectorAll('[data-content]').forEach(b=>b.onclick=()=>navigate(b.dataset.content));
 document.querySelectorAll('[data-new]').forEach(b=>b.onclick=newIdea);
 bindCopy(app);
 document.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>{const v=document.createElement('video');v.controls=true;v.autoplay=true;v.playsInline=true;v.preload='metadata';v.src=MEDIA+encodeURIComponent(b.dataset.preview);v.className='preview-video';b.replaceWith(v);});
 document.querySelectorAll('[data-stage]').forEach(select=>select.onchange=async()=>{
  const r=all().find(r=>r.key===select.dataset.stage);if(!r||ui.saving)return;
  select.disabled=true;
  const result=await save({action:'save',key:r.key,revision:r.plan.revision,title:r.plan.title||r.title,stage:select.value,next:r.plan.next,notes:r.plan.notes,due:r.plan.due,tasks:r.plan.tasks});
  if(result)await load();else{select.value=r.stage;select.disabled=false;}
 });
}
function bindBoard(){
 bindCards();
 document.querySelectorAll('[data-brand]').forEach(b=>b.onclick=()=>{ui.brand=b.dataset.brand;render();});
 document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{ui.filter=b.dataset.filter;render();});
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{ui.view=b.dataset.view;try{localStorage.setItem('creation-view',ui.view);}catch{}render();});
 document.getElementById('refresh').onclick=load;
 document.getElementById('search').oninput=e=>{ui.q=e.target.value;document.getElementById('contents').innerHTML=boardContent();bindCards();};
}
function renderDrawer(){
 const drawer=document.getElementById('drawer'),r=selected();
 if(!r){if(drawer.open)drawer.close();return;}
 const scroll=drawer.scrollTop;
 drawer.innerHTML='<div class="drawer-toolbar"><span>'+esc(r.brandName)+(r.code?' / '+esc(r.code):'')+'</span><button id="close-detail" class="icon-button" aria-label="Fermer la fiche">'+icon('close')+'</button></div>'+detail(r);
 // Keep frequent actions at the top; secondary information stays collapsed.
 const aside=drawer.querySelector('aside');
 const sessions=aside.querySelector('.side-section');
 if(r.sessions.length>2){const entries=[...sessions.querySelectorAll('.session')];const more=document.createElement('details');more.className='more-sessions';more.innerHTML='<summary>'+ (entries.length-2)+' autres sessions associées</summary>';entries.slice(2).forEach(e=>more.appendChild(e));sessions.querySelector('.session-list').appendChild(more);}
 drawer.querySelector('#back').remove();
 const form=drawer.querySelector('#edit');
 const notes=form.elements.notes.closest('label');const notesWrap=document.createElement('details');notesWrap.className='notes-section';notesWrap.innerHTML='<summary>Notes et décisions'+(r.plan.notes?' · renseignées':'')+'</summary>';notes.before(notesWrap);notesWrap.appendChild(notes);
 document.getElementById('close-detail').onclick=()=>navigate(null);
 bindDetail(r,drawer,form);
 if(!drawer.open){drawer.showModal();drawer.scrollTop=0;document.getElementById('close-detail').focus();}else drawer.scrollTop=scroll;
}
function markDirty(){dirty(true);document.getElementById('dirty-state').textContent='Modifications à enregistrer';}
function bindDetail(r,drawer,form){
 bindCopy(drawer);
 drawer.querySelectorAll('[data-exclude]').forEach(b=>b.onclick=async()=>{if(ui.dirty){notify('Enregistre la fiche avant de retirer un lien.',true);return;}if(await save({action:'excludeSession',key:r.key,revision:r.plan.revision,sessionId:b.dataset.exclude}))await load();});
 form.oninput=markDirty;form.onchange=markDirty;
 form.onsubmit=async e=>{e.preventDefault();const payload={action:'save',key:r.key,revision:r.plan.revision};for(const key of ['title','stage','next','notes','due'])payload[key]=form.elements[key].value;payload.tasks=[...form.querySelectorAll('.task')].map(el=>({text:el.querySelector('input[type=text]').value,done:el.querySelector('input[type=checkbox]').checked}));const button=form.querySelector('[type=submit]');button.disabled=true;if(await save(payload))await load();else button.disabled=false;};
 const bindRemove=()=>form.querySelectorAll('.remove-task').forEach(b=>b.onclick=()=>{b.parentElement.remove();markDirty();});bindRemove();
 document.getElementById('add-task').onclick=()=>{if(form.querySelectorAll('.task').length>=30){notify('30 tâches maximum',true);return;}document.getElementById('tasks').insertAdjacentHTML('beforeend',task({text:'',done:false}));bindRemove();markDirty();form.querySelector('.task:last-child input[type=text]').focus();};
 document.getElementById('archive').onclick=async()=>{if(ui.dirty){notify('Enregistre les modifications avant de continuer.',true);return;}if(await save({action:'archive',key:r.key,revision:r.plan.revision,archived:!r.plan.archived})){ui.selected=null;syncHash();await load();}};
}
const drawer=document.getElementById('drawer');
drawer.addEventListener('cancel',e=>{e.preventDefault();navigate(null);});
drawer.addEventListener('click',e=>{if(e.target===drawer){const r=drawer.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right)navigate(null);}});
window.addEventListener('beforeunload',e=>{if(ui.dirty){e.preventDefault();e.returnValue='';}});
window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='s'&&drawer.open){e.preventDefault();document.getElementById('edit').requestSubmit();}if(e.key==='/'&&!drawer.open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();document.getElementById('search')?.focus();}});
window.addEventListener('hashchange',()=>{const key=new URLSearchParams(location.hash.slice(1)).get('content');if(key!==ui.selected)navigate(key);});
ui.selected=new URLSearchParams(location.hash.slice(1)).get('content');
setInterval(()=>{if(document.visibilityState==='visible')load();},120000);
load();
