'use strict';
const fs = require('node:fs');
const path = require('node:path');
const STORE = process.env.CAPSERV_STATS_DIR || '/config/capserv-stats/data';
const inflight = new Map();
const num = value => value === null || value === undefined || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
const dayKey = date => new Intl.DateTimeFormat('en-CA', {timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));
const sum = list => list.length && list.every(x=>x!==null) ? list.reduce((a,b)=>a+b,0) : null;
function summarize(posts, profile, days, now = new Date()) {
  const end = +new Date(now), start = end - days*86400000;
  const selected = posts.filter(p => +new Date(p.timestamp)>=start && +new Date(p.timestamp)<=end);
  const likes = sum(selected.map(p=>num(p.likes))), comments = sum(selected.map(p=>num(p.comments)));
  const views = sum(selected.map(p=>num(p.views)));
  const count = selected.length;
  return {count, averageLikes: count && likes!==null ? likes/count:null, averageComments:count && comments!==null?comments/count:null, averageViews:count && views!==null?views/count:null,
    engagementRate: count && likes!==null && comments!==null && profile.followers>0 ? (likes+comments)/count/profile.followers*100:null,
    weeklyPosts:posts.filter(p=>+new Date(p.timestamp)>=end-7*86400000 && +new Date(p.timestamp)<=end).length,
    followersRatio: profile.followers!==null && profile.following>0 ? profile.followers/profile.following:null,
    commentsRatio:likes>0 && comments!==null?comments/likes*100:null, posts:selected};
}
function baseline(history, days, now = new Date()) {
  const target = dayKey(+new Date(now)-days*86400000);
  return [...history].reverse().find(row=>row.date===target) || null;
}
function growth(current, previous) {
  if (current===null || previous===null || previous===undefined) return {delta:null,percent:null};
  return {delta:current-previous,percent:previous>0?(current-previous)/previous*100:null};
}
async function api(url, token, bearer=false) {
  const u = new URL(url);
  if(u.protocol!=='https:' || !['graph.instagram.com','graph.facebook.com','www.googleapis.com','youtubeanalytics.googleapis.com'].includes(u.hostname)) throw new Error('API_HOST');
  const headers = bearer ? {Authorization:'Bearer '+token} : {};
  if(!bearer) u.searchParams.set('access_token',token.split('___')[0]);
  const response = await fetch(u, {headers,signal:AbortSignal.timeout(18000)});
  const data = await response.json();
  if(!response.ok || data.error) {const e = new Error('PLATFORM_'+(data.error?.code || response.status));e.platformCode=data.error?.code || response.status;throw e;}
  return data;
}
function url(base, endpoint, params) {const u=new URL(endpoint,base);u.search=new URLSearchParams(params);return u.href;}
async function collect(i) {
  const profile = {name:i.name,username:null,followers:null,following:null,posts:null,picture:i.picture||null};
  const warnings = [];let posts = [], truncated=false, insights=[], postsAvailable=true;
  const cutoff=Date.now()-90*86400000;
  const provider=i.providerIdentifier;
  if(provider.startsWith('instagram')) {
    const base = provider==='instagram-standalone'?'https://graph.instagram.com/v25.0/':'https://graph.facebook.com/v25.0/';
    const p=await api(url(base,i.internalId,{fields:'username,followers_count,follows_count,media_count'}),i.token);
    Object.assign(profile,{username:p.username,followers:num(p.followers_count),following:num(p.follows_count),posts:num(p.media_count)});
    let next=url(base,i.internalId+'/media',{fields:'id,caption,media_type,timestamp,like_count,comments_count,permalink,media_url,thumbnail_url',limit:'100'});
    try {for(let page=0;next && page<10;page++) {const data=await api(next,i.token);const batch=data.data||[];
      posts.push(...batch.map(p=>({id:p.id,title:(p.caption||p.media_type||'Publication').slice(0,180),timestamp:p.timestamp,likes:num(p.like_count),comments:num(p.comments_count),views:null,thumbnail:p.thumbnail_url||(p.media_type!=='VIDEO'?p.media_url:null),url:p.permalink||null,type:p.media_type})));
      if(!batch.length || batch.some(p=>+new Date(p.timestamp)<cutoff)){next=null;break;}
      next=data.paging?.next||null; if(next && page===9) truncated=true;
    }}catch{postsAvailable=false;warnings.push('Les statistiques des publications sont temporairement indisponibles.');}
    const until=Math.floor(Date.now()/1000), since=until-30*86400;
    try {const a=await api(url(base,i.internalId+'/insights',{metric:'views,likes,comments,shares,saves',metric_type:'total_value',period:'day',since:String(since),until:String(until)}),i.token);
      insights=(a.data||[]).map(m=>({key:m.name,value:num(m.total_value?.value),days:30}));
    }catch{warnings.push('La portée, les vues, partages et sauvegardes nécessitent les droits Insights du compte.');}
  }else if(provider==='youtube') {
    const base='https://www.googleapis.com/youtube/v3/';
    const ch=await api(url(base,'channels',{part:'snippet,statistics,contentDetails',id:i.internalId}),i.token,true);
    const p=ch.items?.[0];if(!p)throw new Error('CHANNEL_NOT_FOUND');
    Object.assign(profile,{name:p.snippet.title,followers:p.statistics.hiddenSubscriberCount?null:num(p.statistics.subscriberCount),posts:num(p.statistics.videoCount),username:p.snippet.customUrl||null});
    let pageToken='', videoIds=[];
    try {for(let page=0;page<10;page++) {const data=await api(url(base,'playlistItems',{part:'contentDetails',playlistId:p.contentDetails.relatedPlaylists.uploads,maxResults:'50',...(pageToken?{pageToken}:{})}),i.token,true);
      const batch=data.items||[];
      videoIds.push(...batch.filter(v=>+new Date(v.contentDetails.videoPublishedAt)>=cutoff).map(v=>v.contentDetails.videoId));
      if(batch.some(v=>+new Date(v.contentDetails.videoPublishedAt)<cutoff)||!data.nextPageToken)break;
      pageToken=data.nextPageToken;if(page===9)truncated=true;
    }
    for(let n=0;n<videoIds.length;n+=50) {const data=await api(url(base,'videos',{part:'snippet,statistics',id:videoIds.slice(n,n+50).join(',')}),i.token,true);
      posts.push(...(data.items||[]).map(v=>({id:v.id,title:v.snippet.title,timestamp:v.snippet.publishedAt,likes:num(v.statistics.likeCount),comments:num(v.statistics.commentCount),views:num(v.statistics.viewCount),thumbnail:v.snippet.thumbnails?.medium?.url||null,url:'https://www.youtube.com/watch?v='+v.id,type:'VIDEO'})));
    }}catch{postsAvailable=false;warnings.push('Les statistiques des vidéos sont temporairement indisponibles.');}
  }else if(provider==='facebook') {
    const base='https://graph.facebook.com/v25.0/';
    const p=await api(url(base,i.internalId,{fields:'name,followers_count,fan_count'}),i.token);
    Object.assign(profile,{name:p.name,followers:num(p.followers_count)});
    let next=url(base,i.internalId+'/posts',{fields:'id,message,created_time,permalink_url,reactions.limit(0).summary(true),comments.limit(0).summary(true),shares,full_picture',limit:'100',since:String(Math.floor(cutoff/1000))});
    try {for(let page=0;next && page<10;page++){const data=await api(next,i.token);posts.push(...(data.data||[]).map(v=>({id:v.id,title:(v.message||'Publication Facebook').slice(0,180),timestamp:v.created_time,likes:num(v.reactions?.summary?.total_count),comments:num(v.comments?.summary?.total_count),shares:num(v.shares?.count),thumbnail:v.full_picture||null,views:null,url:v.permalink_url||null,type:'POST'})));next=data.paging?.next||null;if(next&&page===9)truncated=true;}}catch{postsAvailable=false;warnings.push('Les réactions et commentaires nécessitent les droits de lecture de la page.');}
  }else throw new Error('UNSUPPORTED_PROVIDER');
  if(provider.startsWith('instagram') || provider==='facebook') {
    const base=provider==='instagram-standalone'?'https://graph.instagram.com/v25.0/':'https://graph.facebook.com/v25.0/';
    const recent=posts.filter(p=>+new Date(p.timestamp)>=cutoff).slice(0,50);
    const metrics=provider==='facebook'?{post_media_view:'views',post_total_media_view_unique:'reach',post_clicks:'clicks'}:{views:'views',reach:'reach',saved:'saves',shares:'shares'};
    let unavailable=0;
    for(const post of recent) {
      try {
        let data;
        try {data=await api(url(base,post.id+'/insights',{metric:Object.keys(metrics).join(',')}),i.token);}
        catch {data={data:[]};for(const metric of Object.keys(metrics)){try{const one=await api(url(base,post.id+'/insights',{metric}),i.token);data.data.push(...(one.data||[]));}catch{}}}
        for(const m of data.data||[]) {const key=metrics[m.name];if(key)post[key]=num(m.values?.[0]?.value??m.total_value?.value);}
        post.insightsAvailable=Object.values(metrics).some(k=>post[k]!==undefined&&post[k]!==null);
        if(!post.insightsAvailable)unavailable++;
      } catch {post.insightsAvailable=false;unavailable++;}
    }
    if(unavailable)warnings.push('Certaines mesures détaillées ne sont pas fournies par le réseau. Un tiret indique une donnée indisponible.');
    if(posts.filter(p=>+new Date(p.timestamp)>=cutoff).length>50)warnings.push('Vues, portée et partages détaillés : 50 publications récentes maximum par compte.');
  }
  return {profile,posts:posts.sort((a,b)=>+new Date(b.timestamp)-+new Date(a.timestamp)),warnings,truncated,insights,postsAvailable,updatedAt:new Date().toISOString(),provider};
}
function filename(i) {return path.join(STORE,i.organizationId+'_'+i.id+'.json');}
function read(i) {try{return JSON.parse(fs.readFileSync(filename(i),'utf8'));}catch{return {history:[]};}}
function persist(i,data) {
  fs.mkdirSync(STORE,{recursive:true,mode:0o700});const file=filename(i), tmp=file+'.tmp';
  fs.writeFileSync(tmp,JSON.stringify(data),{mode:0o600});fs.renameSync(tmp,file);
}
async function update(i) {
  const key=filename(i);if(inflight.has(key))return inflight.get(key);
  const promise=(async()=>{
    const previous=read(i);const observation=await collect(i);const sample=summarize(observation.posts,observation.profile,30);if(!observation.postsAvailable){for(const k of ['count','weeklyPosts','averageLikes','averageComments','averageViews','engagementRate','commentsRatio'])sample[k]=null;}
    const snapshot={date:dayKey(observation.updatedAt),observedAt:observation.updatedAt,followers:observation.profile.followers,following:observation.profile.following,posts:observation.profile.posts,engagementRate:sample.engagementRate,averageLikes:sample.averageLikes,averageComments:sample.averageComments,samplePosts:sample.count};
    const history=(previous.history||[]).filter(row=>row.date!==snapshot.date);history.push(snapshot);history.sort((a,b)=>a.date.localeCompare(b.date));
    const data={...observation,history:history.slice(-400)};persist(i,data);return data;
  })().finally(()=>inflight.delete(key));inflight.set(key,promise);return promise;
}
async function getInsights(service, org, id, requestedDays, forceRefresh=false) {
  const days=[7,30,90].includes(Number(requestedDays))?Number(requestedDays):30;
  let i=await service.getIntegrationById(org.id,id);
  if(!i || i.deletedAt || i.disabled) {const e=new Error('Invalid integration');e.status=404;throw e;}
  let data=read(i), stale=false, failed=false;
  if(!data.updatedAt || Date.now()-+new Date(data.updatedAt)>(forceRefresh?60000:3600000)) {
    try {
      if(i.tokenExpiration && +new Date(i.tokenExpiration)<Date.now()) {
        const refreshed=await service._refreshIntegrationService.refresh(i);
        if(!refreshed?.accessToken)throw new Error('RECONNECT');i={...i,token:refreshed.accessToken};
      }
      data=await update(i);
    }catch{stale=!!data.updatedAt;failed=true;}
  }
  if(!data.updatedAt)return {status:'unavailable',days,provider:i.providerIdentifier,name:i.name,message:'Le réseau ne fournit pas ces statistiques. Vérifie la connexion et ses autorisations dans Postiz.',history:[],posts:[]};
  const snapshotDate=new Date(data.updatedAt), period=baseline(data.history,days,snapshotDate), week=baseline(data.history,7,snapshotDate);
  const summary=summarize(data.posts,data.profile,days,snapshotDate);if(!data.postsAvailable){for(const k of ['count','weeklyPosts','averageLikes','averageComments','averageViews','engagementRate','commentsRatio'])summary[k]=null;}
  const from=dayKey(+snapshotDate-days*86400000);
  return {status:stale?'stale':'ok',days,provider:i.providerIdentifier,profile:data.profile,updatedAt:data.updatedAt,trackingSince:data.history[0]?.date,
    growth:{followers:growth(data.profile.followers,period?.followers),following:growth(data.profile.following,period?.following),posts:growth(data.profile.posts,period?.posts),weeklyFollowers:growth(data.profile.followers,week?.followers).delta},
    summary:{...summary,posts:undefined},posts:summary.posts,latestPosts:data.posts.slice(0,100),history:data.history.filter(r=>r.date>=from),insights:days===30?data.insights:[],
    warnings:[...(data.warnings||[]),...(data.truncated?['Les moyennes portent sur les publications récupérées, la limite de collecte a été atteinte.']:[]),...(failed?['Actualisation impossible, les dernières données disponibles sont affichées.']:[])],
    definitions:{engagementRate:'Moyenne des mentions J’aime et commentaires par publication publiée sur la période, divisée par le nombre actuel d’abonnés, × 100.',averageLikes:i.providerIdentifier==='facebook'?'Réactions cumulées sur les publications de la période, divisées par leur nombre.':'Mentions J’aime cumulées sur les publications de la période, divisées par leur nombre.',history:'Observations réelles quotidiennes, heure de New Haven. Engagement et moyennes historiques calculés sur 30 jours glissants.',followers:i.providerIdentifier==='youtube'?'Le compteur d’abonnés YouTube peut être arrondi par la plateforme.':null}};
}
module.exports={getInsights,collect,update,summarize,baseline,growth,dayKey,num,read};

async function dashboard(service,org,id,days,force=false,group=false) {
 const db=service._integrationRepository._integration.model;
 const accounts=await db.integration.findMany({where:{organizationId:org.id,deletedAt:null,disabled:false},select:{id:true,name:true,profile:true,providerIdentifier:true,customerId:true,customer:{select:{id:true,name:true,deletedAt:true}}}});
 const selected=accounts.find(a=>a.id===id);if(!selected){const e=new Error('Invalid integration');e.status=404;throw e;}
 const groups=[];for(const a of accounts){const key=a.customer&&!a.customer.deletedAt?a.customer.id:a.id;let g=groups.find(g=>g.id===key);if(!g){g={id:key,name:a.customer&&!a.customer.deletedAt?a.customer.name:a.name,accounts:[]};groups.push(g);}g.accounts.push({id:a.id,name:a.name,provider:a.providerIdentifier});}
 const current=groups.find(g=>g.accounts.some(a=>a.id===id));
 const targets=group?current.accounts:current.accounts.filter(a=>a.id===id);
 const results=[];
 for(const a of targets){let result;
  if(['instagram','instagram-standalone','facebook','youtube'].includes(a.provider))result=await getInsights(service,org,a.id,days,force);
  else {const posts=await service._integrationRepository._posts.model.post.findMany({where:{organizationId:org.id,integrationId:a.id,state:'PUBLISHED',deletedAt:null,parentPostId:null},orderBy:{publishDate:'desc'},take:50,select:{id:true,content:true,publishDate:true,releaseURL:true}});
   result={status:'unavailable',provider:a.provider,message:'Cette connexion ne donne pas accès aux compteurs. Les publications ci-dessous sont celles confirmées par Postiz.',latestPosts:posts.map(p=>({id:p.id,title:p.content,timestamp:p.publishDate,url:p.releaseURL,likes:null,comments:null,views:null}))};}
  results.push({...result,accountId:a.id,accountName:a.name});
 }
 const navigation={groups,currentGroup:current.id,groupMode:group,selectedId:id};
 if(!group)return {...results[0],navigation};
 return {status:'group',days:Number(days)||30,name:current.name,accounts:results,navigation,latestPosts:results.flatMap(r=>(r.latestPosts||r.posts||[]).map(p=>({...p,provider:r.provider,accountId:r.accountId,accountName:r.accountName,updatedAt:r.updatedAt}))).sort((a,b)=>+new Date(b.timestamp)-+new Date(a.timestamp))};
}
module.exports.dashboard=dashboard;
