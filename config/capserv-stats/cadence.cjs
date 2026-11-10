'use strict';
const fs=require('node:fs');
const {sourceKey,canonical}=require('./content-grouping.cjs');
const ZONE='America/New_York',INITIAL='2026-10-16T16:00:00.000Z';
const lanes=[['claudette','Claudette · Short',1],['cristal','Cristal Memoria · Short',1],['personal','Marceau · Vie personnelle',1],['mba','Marceau · Personal MBA',1],['long','Marceau · YouTube long',3]];
function localDay(d){return new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d));}
function noonAfter(d,days){const target=new Date(localDay(d)+'T12:00:00Z');target.setUTCDate(target.getUTCDate()+days);let result=target.getTime();for(let i=0;i<3;i++){const h=Number(new Intl.DateTimeFormat('en-US',{timeZone:ZONE,hour:'numeric',hourCycle:'h23'}).format(result));result+=(12-h)*3600000;}return new Date(result).toISOString();}
function classify(p,a,media){const key=sourceKey(p,p.organizationId);if(!key)return null;const tags=(p.tags||[]).map(x=>x.tag.name.toLowerCase());const override=tags.filter(t=>t.startsWith('cadence:')).map(t=>t.slice(8).trim());if(override.length>1)return null;
 const brand=(a.customer?.name||a.name||'').toLowerCase();const isMarceau=/marceau/.test(brand),isCM=/cristal/.test(brand),isDog=/claudette|mascot/.test(brand);
 if(override.length){const v=override[0];return (isMarceau&&['personal','mba','long'].includes(v)||isCM&&v==='cristal'||isDog&&v==='claudette')?v:null;}
 const meta=media[key];if(!meta)return null;const short=meta.duration>0&&meta.duration<=180&&meta.height>=meta.width;
 if(isCM&&short)return 'cristal';if(isDog&&short)return 'claudette';if(!isMarceau)return null;if(!short)return 'long';
 if(/personal mba/i.test(p.content||'')||tags.some(t=>/personal mba/.test(t)))return 'mba';return 'personal';
}
function calculate(posts,accounts,media={},now=Date.now()) {const amap=new Map(accounts.map(a=>[a.id,a])),groups=new Map();let unknown=0;
 for(const p of posts){const a=amap.get(p.integrationId);if(!a||p.state!=='PUBLISHED'||!p.releaseId||!canonical(p.releaseURL)||!Number.isFinite(+new Date(p.publishDate))||+new Date(p.publishDate)>now)continue;
 const key=sourceKey(p,p.organizationId),lane=classify(p,a,media);if(!lane){unknown++;continue;}if(lane==='long'&&a.providerIdentifier!=='youtube')continue;
 const gkey=lane+':'+key,prev=groups.get(gkey);if(!prev||+new Date(p.publishDate)<+new Date(prev.publishDate))groups.set(gkey,p);
 }
 return {timezone:ZONE,checkedAt:new Date(now).toISOString(),unknown,lanes:lanes.map(([id,label,intervalDays])=>{const found=[...groups.entries()].filter(([k])=>k.startsWith(id+':')).map(([,p])=>p).sort((a,b)=>+new Date(b.publishDate)-+new Date(a.publishDate)),p=found[0];const dueAt=p?noonAfter(p.publishDate,intervalDays):(id==='long'?INITIAL:'2026-10-14T16:00:00.000Z');return {id,label,intervalDays,lastPublishedAt:p?.publishDate||null,lastUrl:p?.releaseURL||null,sourcePostId:p?.id||null,dueAt,initial:!p,overdue:Date.parse(dueAt)<now};})};}
async function getCadence(org,db){const accounts=await db.integration.findMany({where:{organizationId:org,disabled:false,deletedAt:null},select:{id:true,name:true,providerIdentifier:true,customer:{select:{name:true}}}});const posts=await db.post.findMany({where:{organizationId:org,deletedAt:null,parentPostId:null,state:'PUBLISHED'},select:{id:true,organizationId:true,integrationId:true,state:true,publishDate:true,releaseId:true,releaseURL:true,image:true,content:true,tags:{where:{tag:{deletedAt:null}},select:{tag:{select:{name:true}}}}},orderBy:{publishDate:'desc'},take:5001});let metadata={};try{metadata=JSON.parse(fs.readFileSync('/config/capserv-stats/cadence-media.json','utf8'));}catch{}return {...calculate(posts.slice(0,5000),accounts,metadata.items),truncated:posts.length>5000,mediaCheckedAt:metadata.checkedAt||null};}
module.exports={getCadence,calculate,noonAfter,classify};
