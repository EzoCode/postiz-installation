'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const ROOT=process.env.POSTIZ_SUIVI_DIR||'/config/capserv-stats/suivi-data';
const OWNER='91864f0c-4a9f-4f13-8960-3f3c9190c8ad';
const BRANDS=['marceau','cristal','claudette','marc'];
const STAGES=['auto','idee','script','production','montage','validation','pret'];
const FORCED=['rejete','retire','attente'];
const DEFAULT={valider:'validation',pret:'pret',cours:'production',prepa:'idee',attente:'attente',rejete:'rejete',retire:'retire',programme:'programme',publie:'publie',echec:'verifier',verifier:'verifier'};
const NEXT={attente:'En attente d’un feu vert avant de démarrer',rejete:'Rejeté, à refaire',retire:'Retiré, ne plus diffuser',idee:'Préciser l’angle du contenu',script:'Finaliser le script',production:'Terminer la production',montage:'Vérifier le montage',validation:'Relire et valider le contenu',pret:'Préparer la publication dans Postiz',programme:'Vérifier la mise en ligne à la date prévue',publie:'Consulter les publications',verifier:'Vérifier la publication avant tout nouvel envoi'};
let client;const database=()=>client||=new(require('/app/node_modules/@prisma/client').PrismaClient)();
// suivi.cjs est relu quand son fichier change : les mises à jour de la fusion n'exigent plus de redémarrage.
const seen={};function fresh(name){const f=path.join(__dirname,name),m=fs.statSync(f).mtimeMs;if(seen[name]!==m){delete require.cache[require.resolve(f)];seen[name]=m;}return require(f);}
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
function read(name,fallback){try{return JSON.parse(fs.readFileSync(path.join(ROOT,name),'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;fail(503,'Les données de création sont illisibles.');}}
function state(){return read('creation-state.json',{revision:0,items:{}});}
function cleanSession(s){
 if(!s||!['Claude','Codex'].includes(s.agent)||!['Mac','capServ'].includes(s.host)||! /^[a-f0-9-]{36}$/.test(s.cliId||''))return null;
 const out={id:s.id,agent:s.agent,host:s.host,title:String(s.title||'Session').slice(0,180),updatedAt:s.updatedAt};
 if(s.agent==='Codex'&&s.host==='Mac')out.url='codex://threads/'+s.cliId;
 if(s.agent==='Claude'&&s.host==='Mac'&&/^local_[a-f0-9-]{36}$/.test(s.nativeId||''))out.url='claude://code/continue?session='+s.nativeId;
 out.command=(s.host==='capServ'?'ssh -t cap-server '+JSON.stringify('claude --resume '+s.cliId):s.agent.toLowerCase()+(s.agent==='Claude'?' --resume ':' resume ')+s.cliId);
 return out;
}
async function dashboard(org,integration,model,now=Date.now()){
 if(org!==OWNER)fail(404,'Espace de création introuvable');
 const d=await fresh('suivi.cjs').dashboard(org,integration,model||database(),now),saved=state(),catalog=read('creation-sessions.json',{sessions:[],sources:[],projects:[]});
 const sessions=catalog.sessions||[];
 for(const brand of d.brands){
  const ideas=Object.entries(saved.items).filter(([key,v])=>key.startsWith('idea:')&&v.brand===brand.id).map(([key,v])=>({key,title:v.title,code:null,state:'cours',source:'Créé dans Postiz',date:v.createdAt,platforms:[],notes:[]}));
  brand.rows.push(...ideas);
  for(const row of brand.rows){
   const v=saved.items[row.key]||{};
   row.plan={revision:v.revision||0,title:v.title||'',stage:v.stage||'auto',next:v.next||'',notes:v.notes||'',due:v.due||'',tasks:v.tasks||[],archived:!!v.archived,history:v.history||[]};
   row.title=v.title||row.title;
   row.stage=['publie','programme','verifier','echec'].includes(row.state)?DEFAULT[row.state]:FORCED.includes(row.state)?row.state:(v.stage&&v.stage!=='auto'?v.stage:row.key.startsWith('idea:')?'idee':DEFAULT[row.state]||'production');
   row.next=v.next||NEXT[row.stage];
   row.sessions=sessions.filter(s=>(s.keys||[]).includes(row.key)&&!(v.excludedSessions||[]).includes(s.id)).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,12).map(cleanSession).filter(Boolean);
  }
  brand.sessions=sessions.filter(s=>(s.brands||[]).includes(brand.id)&&!(s.keys||[]).length).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,8).map(cleanSession).filter(Boolean);
  brand.projects=(catalog.projects||[]).filter(p=>p.brand===brand.id);
 }
 d.creation={revision:saved.revision,stages:STAGES,sessionsAt:catalog.collectedAt||null,sources:catalog.sources||[]};return d;
}
function text(v,max){if(typeof v!=='string'||v.length>max)fail(400,'Champ invalide ou trop long');return v.trim();}
async function change(org,integration,body,model){
 if(org!==OWNER)fail(404,'Espace de création introuvable');
 if(!body||typeof body!=='object'||Array.isArray(body))fail(400,'Modification invalide');
 const d=await dashboard(org,integration,model);
 const isNew=body.action==='create';
 let key=isNew?'idea:'+randomUUID():text(body.key,200);
 const row=d.brands.flatMap(b=>b.rows).find(r=>r.key===key);
 if(!isNew&&!row)fail(404,'Contenu introuvable');
 // Read again after asynchronous database calls, then commit synchronously.
 const s=state(),old=s.items[key]||{revision:0,history:[]};
 if(!isNew&&body.revision!==(old.revision||0))fail(409,'Cette fiche a changé. Recharge-la avant d’enregistrer.');
 let v={...old};
 if(isNew){if(!BRANDS.includes(body.brand))fail(400,'Chaîne invalide');v.brand=body.brand;v.createdAt=new Date().toISOString();v.stage='idee';v.title=text(body.title,180);if(!v.title)fail(400,'Donne un titre au contenu');}
 else if(body.action==='save'){
  if(!STAGES.includes(body.stage))fail(400,'Étape invalide');
  v.title=text(body.title,180);if(!v.title)fail(400,'Donne un titre au contenu');
  v.stage=body.stage;v.next=text(body.next,500);v.notes=text(body.notes,5000);v.due=text(body.due,10);
  if(v.due&&!/^\d{4}-\d{2}-\d{2}$/.test(v.due))fail(400,'Date invalide');
  if(!Array.isArray(body.tasks)||body.tasks.length>30)fail(400,'30 tâches maximum');
  v.tasks=body.tasks.map(t=>({text:text(t.text,200),done:!!t.done})).filter(t=>t.text);
 }else if(body.action==='archive')v.archived=!!body.archived;
 else if(body.action==='excludeSession'){
  if(!row.sessions.some(s=>s.id===body.sessionId))fail(400,'Session inconnue');
  v.excludedSessions=[...new Set([...(old.excludedSessions||[]),body.sessionId])].slice(-50);
 }else if(!isNew)fail(400,'Action inconnue');
 const now=new Date().toISOString();v.revision=(old.revision||0)+1;v.updatedAt=now;
 const label=isNew?'Contenu créé':body.action==='archive'?(v.archived?'Contenu archivé':'Contenu restauré'):body.action==='excludeSession'?'Association de session retirée':'Fiche mise à jour';
 v.history=[{date:now,label},...(old.history||[])].slice(0,40);
 s.items[key]=v;s.revision++;fs.mkdirSync(ROOT,{recursive:true,mode:0o700});
 const dest=path.join(ROOT,'creation-state.json'),tmp=dest+'.'+process.pid+'.tmp';
 fs.writeFileSync(tmp,JSON.stringify(s),{mode:0o600});fs.renameSync(tmp,dest);
 return {ok:true,key,revision:v.revision};
}
module.exports={dashboard,change,cleanSession};
