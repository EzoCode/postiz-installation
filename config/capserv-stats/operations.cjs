'use strict';
const {sourceKey}=require('./content-grouping.cjs');
let client;
function database(){return client ||= new (require('/app/node_modules/@prisma/client').PrismaClient)();}
function fail(status,message){const e=new Error(message);e.status=status;throw e;}
async function scope(db,org,id,group){
 const accounts=await db.integration.findMany({where:{organizationId:org,deletedAt:null,disabled:false},select:{id:true,name:true,providerIdentifier:true,refreshNeeded:true,customer:{select:{id:true,name:true,deletedAt:true}}}});
 const selected=accounts.find(a=>a.id===id);if(!selected)fail(404,'Compte introuvable');
 const brand=a=>a.customer&&!a.customer.deletedAt?a.customer.id:a.id;
 return accounts.filter(a=>group?brand(a)===brand(selected):a.id===id);
}
const postSelect={id:true,integrationId:true,state:true,publishDate:true,title:true,content:true,image:true,releaseURL:true,tags:{where:{tag:{deletedAt:null}},select:{tag:{select:{id:true,name:true,color:true,orgId:true}}}}};
const postWhere=(org,accounts)=>({organizationId:org,integrationId:{in:accounts.map(a=>a.id)},deletedAt:null,parentPostId:null});
const contentKey=(p,org)=>sourceKey(p,org)||'post:'+p.id;
function describe(posts,accounts,org,now=Date.now()){
 const grouped=new Map();for(const p of posts){const key=contentKey(p,org);let c=grouped.get(key);if(!c){c={key,title:p.title||p.content||'Contenu',video:key.startsWith('video:'),posts:[],tags:[]};grouped.set(key,c);}if(p.title)c.title=p.title;
 c.posts.push({id:p.id,accountId:p.integrationId,state:p.state,date:p.publishDate,url:p.releaseURL||null});
 for(const {tag} of p.tags||[])if(tag.orgId===org&&!c.tags.some(t=>t.id===tag.id))c.tags.push({id:tag.id,name:tag.name});
 }
 const states={published:0,scheduled:0,draft:0,failed:0,overdue:0};for(const p of posts){if(p.state==='PUBLISHED')states.published++;if(p.state==='DRAFT')states.draft++;if(p.state==='ERROR')states.failed++;if(p.state==='QUEUE'){if(+new Date(p.publishDate)<now-15*60e3)states.overdue++;else states.scheduled++;}}
 return {contents:[...grouped.values()],counts:states,accounts:accounts.map(a=>({id:a.id,name:a.name,provider:a.providerIdentifier,refreshNeeded:a.refreshNeeded}))};
}
async function getOperations(org,id,group,db=database()){
 const accounts=await scope(db,org,id,group),now=Date.now();
 const [posts,tags]=await Promise.all([db.post.findMany({where:{...postWhere(org,accounts),OR:[{state:{not:'PUBLISHED'}},{publishDate:{gte:new Date(now-180*864e5)}}]},select:postSelect,orderBy:{publishDate:'desc'},take:2001}),db.tags.findMany({where:{orgId:org,deletedAt:null},select:{id:true,name:true,color:true},orderBy:{name:'asc'}})]);
 return {cadence:await require('./cadence.cjs').getCadence(org,db),...describe(posts.slice(0,2000),accounts,org,now),tags,truncated:posts.length>2000,updatedAt:new Date(now).toISOString(),publishedSince:new Date(now-180*864e5).toISOString()};
}
async function changeTag(org,id,group,body,db=database()){
 if(!body||typeof body!=='object'||!['add','remove'].includes(body.action)||typeof body.contentKey!=='string'||body.contentKey.length>160)fail(400,'Demande invalide');
 const name=typeof body.name==='string'?body.name.trim():'';
 if(body.tagId!==undefined&&(typeof body.tagId!=='string'||body.tagId.length>100))fail(400,'Étiquette invalide');
 if(!body.tagId&&(body.action==='remove'||!name||name.length>60||/[\u0000-\u001f]/.test(name)))fail(400,'Nom de série requis, 60 caractères maximum');
 // Serializable transaction: a concurrent native edit cannot silently overwrite our scope.
 for(let attempt=0;attempt<3;attempt++)try{return await db.$transaction(async tx=>{
  const accounts=await scope(tx,org,id,group);
  const posts=await tx.post.findMany({where:postWhere(org,accounts),select:{id:true,image:true},take:10001});
  if(posts.length>10000)fail(409,'Bibliothèque trop grande pour cette opération');
  const matches=posts.filter(p=>contentKey(p,org)===body.contentKey);if(!matches.length)fail(404,'Contenu introuvable dans cette marque');
  let tag=body.tagId?await tx.tags.findFirst({where:{id:body.tagId,orgId:org,deletedAt:null}}):await tx.tags.findFirst({where:{orgId:org,deletedAt:null,name:{equals:name,mode:'insensitive'}}});
  if(!tag&&body.tagId)fail(404,'Étiquette introuvable');
  if(!tag)tag=await tx.tags.create({data:{orgId:org,name,color:'#8066ef'}});
  if(body.action==='add')await tx.tagsPosts.createMany({data:matches.map(p=>({postId:p.id,tagId:tag.id})),skipDuplicates:true});
  else await tx.tagsPosts.deleteMany({where:{tagId:tag.id,postId:{in:matches.map(p=>p.id)}}});
  return {ok:true,updated:matches.length,tag:{id:tag.id,name:tag.name}};
 },{isolationLevel:'Serializable'});}catch(e){if(e.code==='P2034'&&attempt<2)continue;throw e;}
}
module.exports={getOperations,changeTag,describe,scope,contentKey};
