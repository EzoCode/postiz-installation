'use strict';
const {createHash}=require('node:crypto');
function canonical(link){try{const u=new URL(link);if(!['http:','https:'].includes(u.protocol))return null;const host=u.hostname.toLowerCase().replace(/^www\./,'');if(host==='youtu.be')return u.pathname.split('/')[1]?'youtube:'+u.pathname.split('/')[1]:null;if(host==='youtube.com'){const id=u.searchParams.get('v')||u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1];return id?'youtube:'+id:null;}if(host==='instagram.com'){const code=u.pathname.match(/^\/(?:p|reel|tv)\/([^/]+)/)?.[1];return code?'instagram:'+code:null;}if(host==='tiktok.com'){const id=u.pathname.match(/\/video\/(\d+)/)?.[1];return id?'tiktok:'+id:null;}if(host==='facebook.com'){const id=u.pathname.match(/^\/reel\/(\d+)/)?.[1]||u.searchParams.get('v');return id?'facebook:'+id:null;}return null;}catch{return null;}}
function sourceKey(post,organizationId){
 let media;try{media=JSON.parse(post.image||'[]');}catch{return null;}
 // A single confirmed video asset, never captions, dates or generic Postiz groups.
 if(!Array.isArray(media)||media.length!==1||!media[0]||!media[0].id||!(/\.(mp4|mov|m4v|webm)(?:\?|$)/i.test(media[0].path||'')))return null;
 return 'video:'+createHash('sha256').update(organizationId+'\0'+media[0].id).digest('hex');
}
function attachContentKeys(results,receipts,organizationId){
 const index=new Map();for(const r of receipts){const key=sourceKey(r,organizationId);if(!key)continue;for(const identity of ['id:'+r.id,...(r.releaseId?['id:'+r.releaseId]:[]),...(canonical(r.releaseURL)?['url:'+canonical(r.releaseURL)]:[])]){const lookup=r.integrationId+'\0'+identity;const previous=index.get(lookup);index.set(lookup,previous&&previous!==key?'ambiguous':key);}}
 for(const account of results)for(const p of account.latestPosts||[]){const candidates=new Set([index.get(account.accountId+'\0id:'+p.id),index.get(account.accountId+'\0url:'+canonical(p.url))].filter(Boolean));if(candidates.size===1&&!candidates.has('ambiguous')){p.contentKey=[...candidates][0];p.groupingMethod='postiz-video-file';}}
 return results;
}
module.exports={canonical,sourceKey,attachContentKeys};
