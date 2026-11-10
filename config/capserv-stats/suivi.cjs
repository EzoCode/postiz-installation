'use strict';
// Onglet Suivi d'Analytics : l'état de chaque contenu, par chaîne.
// Fait foi pour « publié » et « programmé » : Postiz (lu en direct) et la file de Marc (copiée par postiz-suivi.timer).
// Fait foi pour « prêt », « en cours », « attend ta validation » : l'envoi du Mac (suivi-recevoir.py), affiché avec son heure.
// Les reçus de publier-instagram corrigent les faux échecs : miniature YouTube refusée, TikTok autotok resté en file.
const fs=require('node:fs'),path=require('node:path');
const ROOT=process.env.POSTIZ_SUIVI_DIR||'/config/capserv-stats/suivi-data';
const OWNER_ORG='91864f0c-4a9f-4f13-8960-3f3c9190c8ad';
const {canonical}=require('./content-grouping.cjs');
const MAC_STALE_MS=30*60e3;
let client;const database=()=>client||=new(require('/app/node_modules/@prisma/client').PrismaClient)();
function fail(status,message){throw Object.assign(new Error(message),{status});}
const norm=s=>String(s||'').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const has=(hay,token)=>!!token&&(' '+hay+' ').includes(' '+token+' ');
const BRANDS=[['marceau','Marceau Mause'],['cristal','Cristal Memoria'],['claudette','House Mascot Claudette'],['marc','Marc Ranjon']];
const ORDER=['valider','pret','programme','cours','prepa','attente','rejete','verifier','echec','publie','retire'];
const WAITING=['prepa','attente','rejete','retire','cours','valider','pret'];
const PROVIDERS={instagram:'Instagram','instagram-standalone':'Instagram',facebook:'Facebook',youtube:'YouTube',tiktok:'TikTok'};
function brandOf(name){const n=norm(name);return /cristal/.test(n)?'cristal':/claudette|mascot/.test(n)?'claudette':/marceau/.test(n)?'marceau':null;}
function readJson(name){const file=path.join(ROOT,name);try{return {data:JSON.parse(fs.readFileSync(file,'utf8')),mtime:fs.statSync(file).mtime.toISOString()};}catch(e){return e.code==='ENOENT'?null:{error:'Fichier illisible'};}}
function mediaId(p){try{const m=JSON.parse(p.image||'[]');return Array.isArray(m)&&m.length===1&&m[0]&&m[0].id&&/\.(mp4|mov|m4v|webm)(\?|$)/i.test(m[0].path||'')?String(m[0].id):null;}catch{return null;}}
function firstLine(s){const l=String(s||'').replace(/<[^>]+>/g,' ').split('\n').map(x=>x.trim()).find(Boolean)||'';return l.length>90?l.slice(0,90).replace(/\s+\S*$/,'')+'…':l;}
function settingTitle(p){try{const s=JSON.parse(p.settings||'{}');return typeof s.title==='string'&&s.title.trim()?s.title.trim():null;}catch{return null;}}
function shortError(e){let t=String(e||'');try{const j=JSON.parse(t);t=j?.cause?.failure?.message||j?.message||t;}catch{}t=t.replace(/\s+/g,' ').trim();return t.length>160?t.slice(0,160)+'…':t||'Erreur sans détail';}
function safeUrl(u){try{const x=new URL(u);return x.protocol==='https:'?x.href:null;}catch{return null;}}

function platformStatus(p,receipt,now){
 const base={provider:PROVIDERS[p.provider]||p.provider,postId:p.id,date:p.publishDate,url:safeUrl(p.releaseURL)};
 const proof=receipt&&receipt.state==='PUBLISHED'&&canonical(receipt.url)?.startsWith((p.provider==='instagram-standalone'?'instagram':p.provider)+':')&&safeUrl(receipt.url);
 if(p.state==='PUBLISHED')return {...base,status:'publie'};
 if(p.state==='QUEUE'){
  if(proof)return {...base,status:'publie',url:proof,note:'Postiz attend encore la confirmation ; la vidéo est en ligne d’après le reçu de publication.'};
  if(+new Date(p.publishDate)>now)return {...base,status:'programme'};
  if(p.provider==='tiktok')return {...base,status:'verifier',note:receipt?.state==='ACCEPTED'?'Accepté par autotok, Postiz reste en file : souvent déjà en ligne, à vérifier sur le profil.':'TikTok (autotok) reste souvent en file alors que la vidéo est en ligne : à vérifier sur le profil.'};
  return {...base,status:'verifier',note:'Encore en file après la date prévue, envoi non confirmé.'};
 }
 if(p.state==='ERROR'){
  const thumb=/we have uploaded your video.*(?:thumbnail|miniature)|could not set the thumbnail/i.test(p.error||'');
  if(proof)return {...base,status:'publie',url:proof,note:thumb?'Postiz affiche une erreur : seule la miniature a été refusée, la vidéo est publique d’après le reçu.':'Postiz affiche une erreur, mais le reçu de publication confirme la mise en ligne.'};
  if(p.provider==='youtube'&&thumb)return {...base,status:'verifier',note:'Miniature refusée par YouTube : la vidéo est probablement publique, aucun reçu pour le confirmer.'};
  if(p.provider==='tiktok'&&/Could not confirm the post status|Envoi non confirm|uncertain/i.test(p.error||''))return {...base,status:'verifier',note:'TikTok : confirmation absente, vérifier la mise en ligne avant tout nouvel envoi.'};
  return {...base,status:'echec',note:shortError(p.error)};
 }
 if(p.state==='DRAFT')return {...base,status:'cours',note:'Brouillon dans Postiz.'};
 return {...base,status:'verifier'};
}
function rowState(platforms,itemState){
 if(platforms.some(x=>x.status==='publie'))return 'publie';
 if(platforms.some(x=>x.status==='programme'))return 'programme';

 if(platforms.some(x=>x.status==='verifier'))return 'verifier';
 if(platforms.length&&platforms.every(x=>x.status==='echec'))return 'echec';
 return itemState||'cours';
}
function rowDate(row){
 const status=row.state==='publie'?'publie':row.state==='programme'?'programme':null;
 const dates=row.platforms.filter(p=>p.status===status&&p.date&&Number.isFinite(Date.parse(p.date))).map(p=>p.date).sort((a,b)=>Date.parse(a)-Date.parse(b));
 return dates[0]||row.date||null;
}
function marcDate(value){
 const s=String(value||'');
 if(/^\d{4}-\d{2}-\d{2}(?:$| supervise)/i.test(s))return s.slice(0,10);
 const date=/[zZ]$|[+-]\d\d:\d\d$/.test(s)?s:s+'Z';
 return Number.isFinite(Date.parse(date))?date:null;
}
function cleanItem(i){
 const s=v=>typeof v==='string'?v.slice(0,600):null;
 return {key:s(i.key),code:s(i.code),title:s(i.title)||s(i.code)||'Contenu',state:ORDER.includes(i.state)?i.state:'cours',detail:s(i.detail),source:s(i.source),date:s(i.date),sourceModifiedAt:s(i.sourceModifiedAt),brand:s(i.brand),
  thumb:/^[a-f0-9]{20}\.jpg$/.test(i.thumb||'')?i.thumb:null,preview:/^[a-f0-9]{20}\.(mp4|mov|m4v|webm)$/.test(i.preview||'')?i.preview:null,noThumb:s(i.noThumb),previewNote:s(i.previewNote),chaine:s(i.chaine),jour:/^\d{4}-\d{2}-\d{2}$/.test(i.jour||'')?i.jour:null,cible:(Array.isArray(i.cible)?i.cible:[]).filter(c=>['Instagram','TikTok','Facebook','YouTube'].includes(c)),orch:i.orch===true,
  match:(Array.isArray(i.match)?i.match:[]).map(norm).filter(t=>t.length>=3).slice(0,12),files:(Array.isArray(i.files)?i.files:[]).filter(f=>typeof f==='string').slice(0,40)};
}

// Postiz + reçus + registres du Mac, pour les trois marques Postiz.
function buildPostiz(posts,accounts,mac,now){
 const accountMap=new Map(accounts.map(a=>[a.id,a]));
 const receipts=Array.isArray(mac?.receipts)?mac.receipts:[];
 const byMedia=new Map(),byPost=new Map();
 for(const r of receipts){if(r&&r.mediaId)byMedia.set(String(r.mediaId),r);for(const p of r?.posts||[])if(p&&p.postId)byPost.set(String(p.postId),{...p,group:r});}
 const groups=new Map();
 for(const p of posts){
  const a=accountMap.get(p.integrationId);if(!a)continue;
  const brand=brandOf(a.customer?.name||a.name);if(!brand)continue;
  const media=mediaId(p),key=media?brand+':media:'+media:'post:'+p.id;
  let g=groups.get(key);if(!g){g={key,brand,media,posts:[],receipt:media&&byMedia.get(media)||null,titles:[]};groups.set(key,g);}
  g.receipt=g.receipt||byPost.get(p.id)?.group||null;
  g.posts.push({...p,provider:a.providerIdentifier,accountName:a.name});
  const t=settingTitle(p);if(t)g.titles.push(t);
 }
 // Reçus préparés sans aucun post Postiz : légende et couverture prêtes, rien d'envoyé.
 for(const r of receipts){if(!r?.mediaId||groups.has(r.brand+':media:'+r.mediaId)||!BRANDS.some(([id])=>id===r.brand)||r.brand==='marc')continue;if(!r.video&&!r.prepared)continue;groups.set(r.brand+':media:'+r.mediaId,{key:r.brand+':media:'+r.mediaId,brand:r.brand,media:r.mediaId,posts:[],receipt:r,titles:[]});}
 const items=(Array.isArray(mac?.items)?mac.items:[]).map(cleanItem).filter(i=>i.brand&&i.brand!=='marc');
 const rows=new Map(items.map(i=>[i.key,{...i,platforms:[],notes:[],fromMac:true}]));
 const orphans=new Map(); // marque|code ou marque|première ligne -> une seule carte pour une vidéo envoyée sur plusieurs plateformes
 const lineOf=g=>g.brand+'|'+norm(firstLine(g.posts[0]?.content)).slice(0,80);
 const dayOf=g=>{const m=g.brand==='marceau'&&/\|\s*day\s+(\d{1,2})\b/i.exec(g.titles.join(' '));return m?'D'+m[1].padStart(2,'0'):null;};
 const lineDay=new Map();for(const g of groups.values()){const d=dayOf(g);if(d&&g.posts.length&&lineOf(g).length>g.brand.length+5)lineDay.set(lineOf(g),d);} // l'Instagram de la même légende suit le YouTube « Day N »
 for(const g of groups.values()){
  const video=norm(g.receipt?.video||''),text=norm([...g.titles,...g.posts.map(p=>p.content)].join(' '));
  let best=null,score=0;
  for(const i of items){if(i.brand!==g.brand)continue;if(i.code?.endsWith('_FR')&&!has(video,'fr')&&!has(video,'francais'))continue;for(const t of i.match){const s=has(video,t)?t.length+100:(t.length>=8&&has(text,t)?t.length:0);if(s>score){score=s;best=i;}}}
  // Titre « … | Day 3 » des rattrapages YouTube de Life : c'est l'épisode D03, même sans mots « match ».
  const dayCode=dayOf(g)||(g.posts.length?lineDay.get(lineOf(g)):null)||null;
  if(dayCode){const i=items.find(x=>x.brand==='marceau'&&x.code===dayCode);if(i)best=i;}
  const platforms=g.posts.map(p=>platformStatus(p,byPost.get(p.id),now));
  let row=best&&rows.get(best.key);
  if(!row){
   const p0=g.posts[0],line=norm(firstLine(p0?.content)).slice(0,80),ok=g.brand+'|'+(dayCode||line||g.key);
   row=orphans.get(ok);
   if(!row){row={key:g.key,code:dayCode,chaine:dayCode?'life':null,title:g.titles[0]||firstLine(p0?.content)||g.receipt?.video||'Contenu',state:null,detail:null,source:'Postiz',date:null,brand:g.brand,platforms:[],notes:[],orphan:!dayCode};
    if(!dayCode)row.notes.push('Post Postiz qu’aucun épisode du suivi ne réclame : ajouter des mots « match » dans le JSON de sa chaîne.');
    rows.set(g.key,row);orphans.set(ok,row);}
  }
  row.platforms.push(...platforms);
  if(!row.fromMac&&!g.posts.length&&g.receipt?.prepared==='CHECKED'){row.fromMac=true;row.state='pret';row.source='Reçu de préparation';}
  if(g.receipt?.video&&!row.files)row.files=[g.receipt.video];
  if(g.receipt&&!g.posts.length&&!/withdrawn/i.test(String(g.receipt.prepared||'')))row.notes.push(g.receipt.prepared==='CHECKED'?'Légende et couverture préparées pour la publication, rien d’envoyé.':'Envoi préparé dans publier-instagram ('+String(g.receipt.prepared||'en cours').toLowerCase()+'), pas encore visible dans Postiz.');
 }
 // TikTok passe par Buffer depuis le 23/10 : un envoi Buffer « sent » (suivi-data/buffer-tiktok.json, écrit par le Mac) remplace les anciens TikTok autotok en erreur ou à vérifier du même épisode.
 const BUF=(readJson('buffer-tiktok.json')?.data?.envois)||[];
 for(const row of rows.values()){
  const bf=row.code&&BUF.find(e=>e&&e.code===row.code&&e.brand===row.brand&&safeUrl(e.url));
  if(bf){row.platforms=row.platforms.filter(p=>!(p.provider==='TikTok'&&['verifier','echec'].includes(p.status)));if(!row.platforms.some(p=>p.provider==='TikTok'&&p.status==='publie'))row.platforms.push({provider:'TikTok',postId:null,date:bf.sentAt,url:safeUrl(bf.url),status:'publie',note:'Publié par Buffer.'});}
 }
 // TikTok via Buffer : tant que le quota API est épuisé (remise à zéro vers 16 h 30 NY), l'envoi du jour attend. C'est une attente prévue, pas une erreur : la production l'écrit dans « ou ».
 for(const row of rows.values()){
  if(row.orch&&row.state==='programme'&&/buffer/i.test(row.detail||'')&&/quota/i.test(row.detail||'')&&!row.platforms.some(p=>p.provider==='TikTok'))row.platforms.push({provider:'TikTok',postId:null,date:null,url:null,status:'programme',note:'En attente du quota Buffer (remise à zéro vers 16 h 30 NY) : envoi automatique ensuite, pas une erreur.'});
 }
 // Une fois qu'un post Postiz ou un envoi existe, la note « préparé, pas encore visible » est fausse.
 for(const row of rows.values())if(row.platforms.length)row.notes=row.notes.filter(n=>!/^Envoi préparé dans publier-instagram/.test(n));
 for(const row of rows.values()){
  const fromRegistry=row.fromMac&&row.state;
  if(fromRegistry==='publie'&&!row.platforms.some(p=>p.status==='publie'))row.notes.push('Publié d’après le registre ; lien introuvable dans Postiz.');
  if(row.orch){
   // L'état écrit par la production fait foi tant que Postiz ne prouve ni publication ni programmation ; les vieux posts en erreur ou à vérifier ne le recouvrent pas.
   const live=row.platforms.filter(p=>['publie','programme'].includes(p.status));
   if(fromRegistry==='programme'&&!live.length){row.notes.push('Annoncé programmé par la production, introuvable dans Postiz.');row.state='verifier';row.date=rowDate(row);continue;}
   if(fromRegistry==='publie'&&!live.length)row.notes.push('Annoncé publié par la production ; lien introuvable dans Postiz.');
   if(WAITING.includes(fromRegistry)){row.notes=row.notes.filter(n=>!/^Envoi préparé dans publier-instagram/.test(n));row.state=rowState(live,fromRegistry);row.date=rowDate(row);continue;}
  }
  row.state=rowState(row.platforms,fromRegistry==='publie'?(row.platforms.length?null:'publie'):fromRegistry||null);
  row.date=rowDate(row);
 }
 return [...rows.values()];
}

// File de Marc (Reel Instagram + Short YouTube, publiée par cron sur capServ) et ses dossiers de montage sur le Mac.
function buildMarc(marc,mac,now){
 const rows=[],entries=Array.isArray(marc?.entries)?marc.entries:[];
 const today=new Date(now).toISOString().slice(0,10);
 const items=(Array.isArray(mac?.items)?mac.items:[]).map(cleanItem).filter(i=>i.brand==='marc');
 const used=new Set();
 for(const e of entries){
  const file=String(e.file||''),nfile=norm(file);
  const item=items.find(i=>!i.orch&&!used.has(i.key)&&i.files.some(f=>path.basename(f)===path.basename(file)))||items.find(i=>!i.orch&&!used.has(i.key)&&i.match.some(t=>!/^ep ?\d+$/.test(t)&&t.split(' ').every(w=>w.length>=5&&has(nfile,w))));
  if(item)used.add(item.key);
  const platforms=[];
  if(e.status==='published'){
   platforms.push({provider:'Instagram',status:e.ig_media_id?'publie':'verifier',date:marcDate(e.published_at),url:safeUrl(e.permalink)||null,note:e.permalink?null:'Lien direct non fourni par la file.'});
   platforms.push(e.yt_video_id?{provider:'YouTube',status:'publie',date:marcDate(e.published_at),url:'https://www.youtube.com/shorts/'+encodeURIComponent(e.yt_video_id)}:{provider:'YouTube',status:'verifier',note:'Pas d’identifiant YouTube dans la file (nouvel essai au prochain passage).'});
  }else if(e.status==='pending'){
   const late=String(e.publish_date)<today||(String(e.publish_date)===today&&now>Date.parse(today+'T18:30:00Z'));
   for(const provider of ['Instagram','YouTube'])platforms.push({provider,status:late?'verifier':'programme',date:String(e.publish_date)+(String(e.publish_date)===today&&now>Date.parse(today+'T11:00:00Z')?'T18:00:00Z':'T11:00:00Z'),note:late?'Date passée, toujours en attente dans la file.':null});
  }
  rows.push({key:'marc:'+e.n,code:'#'+e.n,title:String(e.title_raw||firstLine(e.caption)||file).slice(0,200),state:null,detail:(e.status==='pending'?'Publié automatiquement au premier passage du '+String(e.publish_date)+' (11 h ou 18 h UTC). ':'')+'Fichier : '+file+(item?' · Dossier : '+item.title+(item.detail?' ('+item.detail+')':''):''),source:'File Marc (capServ)',date:null,brand:'marc',platforms,notes:[]});
 }
 for(const i of items)if(!used.has(i.key))rows.push({...i,platforms:[],notes:[],fromMac:true});
 for(const r of rows){r.state=rowState(r.platforms,r.fromMac?r.state:null);r.date=rowDate(r);}
 return rows;
}

function summarizeMac(mac,now){
 if(!mac)return {status:'absent',message:'Aucun envoi du Mac reçu pour l’instant.'};
 if(mac.error)return {status:'erreur',message:mac.error};
 const d=mac.data,received=d.receivedAt||mac.mtime,age=now-Date.parse(d.collectedAt||received);
 return {status:!Number.isFinite(age)||age>MAC_STALE_MS?'ancien':'frais',collectedAt:d.collectedAt||null,receivedAt:received,ageMinutes:Number.isFinite(age)?Math.round(age/60e3):null,
  sources:(Array.isArray(d.sources)?d.sources:[]).slice(0,20).map(s=>({label:String(s.label||s.id||'').slice(0,120),ok:!!s.ok,error:s.error?String(s.error).slice(0,300):null,modifiedAt:s.modifiedAt||null,lastSuccessAt:s.lastSuccessAt||null,items:Number(s.items)||0}))};
}
function summarizeMarc(marc,now=Date.now()){
 if(!marc)return {status:'absent',message:'File de Marc pas encore copiée.'};
 if(marc.error)return {status:'erreur',message:marc.error};
 const d=marc.data;return {status:d.error?'erreur':(!Number.isFinite(Date.parse(d.collectedAt))||now-Date.parse(d.collectedAt)>15*60e3?'ancien':'frais'),message:d.error||(now-Date.parse(d.collectedAt)>15*60e3?'La copie de la file a plus de 15 minutes.':null),collectedAt:d.collectedAt||null,queueModifiedAt:d.queueModifiedAt||null,lastRun:d.lastRun||null,count:Array.isArray(d.entries)?d.entries.length:0};
}

async function dashboard(org,integration,model=database(),now=Date.now()){
 const account=await model.integration.findFirst({where:{id:integration,organizationId:org,deletedAt:null},select:{id:true}});
 if(!account)fail(404,'Compte introuvable');
 const [accounts,customers]=await Promise.all([
  model.integration.findMany({where:{organizationId:org,deletedAt:null},select:{id:true,name:true,providerIdentifier:true,disabled:true,customer:{select:{name:true,deletedAt:true}}}}),
  model.customer.findMany({where:{orgId:org,deletedAt:null},select:{name:true}})]);
 // Les fichiers du Mac et de Marc sont ceux de Marceau : seule son organisation (celle qui a ses marques) les voit.
 const owner=org===OWNER_ORG;
 const posts=await model.post.findMany({where:{organizationId:org,deletedAt:null,parentPostId:null},select:{id:true,integrationId:true,state:true,publishDate:true,releaseURL:true,image:true,content:true,settings:true,error:true},orderBy:{publishDate:'desc'},take:2001});
 // Alerte avant la panne : un compte dont Postiz ne pourra plus renouveler le jeton. Les jetons eux-mêmes ne sortent jamais d'ici.
 const connexions=owner?(await model.integration.findMany({where:{organizationId:org,deletedAt:null,disabled:false},select:{name:true,providerIdentifier:true,refreshNeeded:true,refreshToken:true}})).flatMap(a=>{
  const plateforme={youtube:'YouTube',facebook:'Facebook',instagram:'Instagram','instagram-standalone':'Instagram',tiktok:'TikTok'}[a.providerIdentifier]||a.providerIdentifier;
  if(a.refreshNeeded)return [{compte:a.name,plateforme,probleme:'Postiz demande une reconnexion.'}];
  if(a.providerIdentifier==='youtube'&&!a.refreshToken&&!/ranjon/i.test(a.name))return [{compte:a.name,plateforme,probleme:'Jeton de renouvellement vide : la chaîne cessera de publier dans l’heure. Reconnexion à faire.'}];
  return [];}):[];
 const mac=owner?readJson('mac.json'):null,marc=owner?readJson('marc.json'):null;
 const macData=mac&&!mac.error?mac.data:null;
 const rows=[...buildPostiz(posts.slice(0,2000),accounts,macData,now),...(owner?buildMarc(marc&&!marc.error?marc.data:null,macData,now):[])];
 const brands=BRANDS.filter(([id])=>id!=='marc'||owner).map(([id,name])=>{const list=rows.filter(r=>r.brand===id).map(({match,fromMac,brand,files,...r})=>({...r,notes:[...new Set(r.notes)]}));
  list.sort((a,b)=>ORDER.indexOf(a.state)-ORDER.indexOf(b.state)||(a.state==='programme'?Date.parse(a.date||0)-Date.parse(b.date||0):Date.parse(b.date||0)-Date.parse(a.date||0)));
  return {id,name,counts:Object.fromEntries(ORDER.map(s=>[s,list.filter(r=>r.state===s).length])),rows:list};});
 return {checkedAt:new Date(now).toISOString(),timezone:'America/New_York',postiz:{posts:Math.min(posts.length,2000),truncated:posts.length>2000},connexions,plan:owner&&macData&&Array.isArray(macData.plan)?macData.plan:[],mac:owner?summarizeMac(mac,now):null,marc:owner?summarizeMarc(marc,now):null,brands};
}
module.exports={dashboard,buildPostiz,buildMarc,platformStatus,rowState,summarizeMac,summarizeMarc,norm};
