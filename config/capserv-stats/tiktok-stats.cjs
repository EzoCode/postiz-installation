'use strict';
// Public counters only. No OAuth tokens, cookies, browser automation or AI requests.
const integer=v=>((typeof v==='number'||typeof v==='string'&&/^\d+$/.test(v))&&Number.isSafeInteger(Number(v))&&Number(v)>=0)?Number(v):null;
function scopeFromHtml(html){
 const match=html.match(/<script\b(?=[^>]*\bid=["']__UNIVERSAL_DATA_FOR_REHYDRATION__["'])[^>]*>([\s\S]*?)<\/script>/i);
 if(!match)throw Error('TIKTOK_PUBLIC_DATA_UNAVAILABLE');
 return JSON.parse(match[1]).__DEFAULT_SCOPE__||{};
}
async function publicPage(url){
 const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='www.tiktok.com'||u.search||u.hash)throw Error('TIKTOK_HOST');
 const response=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(18000)});
 if(!response.ok)throw Error('TIKTOK_HTTP_'+response.status);
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>3000000)throw Error('TIKTOK_RESPONSE_SIZE');chunks.push(value);}}finally{await reader.cancel();}
 return scopeFromHtml(Buffer.concat(chunks).toString('utf8'));
}
function profileFromScope(scope,uid,username){
 const info=scope['webapp.user-detail']?.userInfo,user=info?.user;
 if(!user||String(user.id)!==uid||user.uniqueId!==username)throw Error('TIKTOK_IDENTITY');
 const stats=info.stats||{};
 return {name:user.nickname||username,username,followers:integer(stats.followerCount),following:integer(stats.followingCount),posts:integer(stats.videoCount),picture:user.avatarMedium||null};
}
function videoFromScope(scope,uid,username,id){
 const detail=scope['webapp.video-detail'],v=detail?.itemInfo?.itemStruct;
 if(detail?.statusCode!==0||!v||String(v.id)!==id||String(v.author?.id)!==uid||v.author?.uniqueId!==username)throw Error('TIKTOK_VIDEO_IDENTITY');
 const s={...v.stats,...v.statsV2};
 return {id,title:(v.desc||'Vidéo TikTok').slice(0,180),timestamp:new Date(Number(v.createTime)*1000).toISOString(),views:integer(s.playCount),likes:integer(s.diggCount),comments:integer(s.commentCount),shares:integer(s.shareCount),saves:integer(s.collectCount),reach:null,clicks:null,thumbnail:v.video?.cover||null,url:'https://www.tiktok.com/@'+username+'/video/'+id,type:'VIDEO',metricsSource:'tiktok-public',metricsObservedAt:new Date().toISOString()};
}
async function collectTikTok(i,receipts,readPage=publicPage){
 const uid=i.internalId?.match(/^autotok:(\d+)$/)?.[1],username=i.name;
 if(!uid||!(/^[A-Za-z0-9_.]{2,32}$/.test(username)))throw Error('TIKTOK_IDENTITY');
 const warnings=['Compteurs TikTok publics. Historique des contenus limité aux publications confirmées par Postiz ; portée et clics indisponibles.'];
 let profile={name:username,username,followers:null,following:null,posts:null,picture:i.picture||null};
 try{profile=profileFromScope(await readPage('https://www.tiktok.com/@'+username),uid,username);}catch{warnings.push('Les compteurs du profil TikTok sont temporairement indisponibles.');}
 const unique=[...new Map(receipts.filter(p=>/^\d{16,22}$/.test(p.releaseId||'')).map(p=>[p.releaseId,p])).values()],selected=unique.slice(0,20),posts=[];
 let failed=0;
 for(let offset=0;offset<selected.length;offset+=3)await Promise.all(selected.slice(offset,offset+3).map(async p=>{
  try{posts.push(videoFromScope(await readPage('https://www.tiktok.com/@'+username+'/video/'+p.releaseId),uid,username,p.releaseId));}
  catch{failed++;posts.push({id:p.releaseId,title:(p.content||'Vidéo TikTok').slice(0,180),timestamp:new Date(p.publishDate).toISOString(),url:'https://www.tiktok.com/@'+username+'/video/'+p.releaseId,type:'VIDEO',views:null,likes:null,comments:null,shares:null,saves:null,reach:null,clicks:null,metricsSource:'unavailable'});}
 }));
 if(failed)warnings.push(failed+' vidéo(s) TikTok sans compteurs publics accessibles lors du relevé.');
 if(unique.length>20)warnings.push('Compteurs TikTok limités aux 20 dernières vidéos Postiz.');
 if(profile.followers===null&&posts.every(p=>p.views===null))throw Error('TIKTOK_UNAVAILABLE');
 const updatedAt=new Date().toISOString();
 return {provider:'tiktok',profile,posts:posts.sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp)),warnings,postsAvailable:failed===0,insights:[],truncated:unique.length>20,updatedAt,postsWindow:{since:new Date(Date.now()-180*86400000).toISOString(),until:updatedAt,complete:false},metricsSource:'tiktok-public'};
}
module.exports={integer,scopeFromHtml,profileFromScope,videoFromScope,collectTikTok};
