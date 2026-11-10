'use strict';
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.StatsMath=factory();})(typeof globalThis==='object'?globalThis:this,function(){
  const DAY=86400000;
  const number=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
  function value(p,key){
    if(key==='interactions'||key==='rate'){
      const likes=number(p.likes),comments=number(p.comments),views=number(p.views);
      if(likes===null||comments===null)return null;
      return key==='interactions'?likes+comments:views>0?(likes+comments)/views*100:null;
    }
    return key==='timestamp'?Date.parse(p.timestamp):number(p[key]);
  }
  function median(values){const list=values.filter(v=>v!==null&&Number.isFinite(v)).sort((a,b)=>a-b),n=list.length;return n?n%2?list[(n-1)/2]:(list[n/2-1]+list[n/2])/2:null;}
  function cohort(posts,start,end){return posts.filter(p=>Date.parse(p.timestamp)>start&&Date.parse(p.timestamp)<=end);}
  function summary(posts){const result={count:posts.length};for(const key of ['views','interactions','rate','shares','saves']){const known=posts.map(p=>value(p,key)).filter(v=>v!==null);result[key]={known:known.length,total:known.length===posts.length&&posts.length?known.reduce((a,b)=>a+b,0):null,median:median(known)};}return result;}
  function compare(account,days){
    const end=Date.parse(account.updatedAt),start=end-days*DAY,previousStart=start-days*DAY,posts=account.latestPosts||[];
    const current=summary(cohort(posts,start,end)),previous=summary(cohort(posts,previousStart,start));
    const complete=account.postsWindow?.complete===true&&Date.parse(account.postsWindow.since)<=previousStart;
    return {current,previous,start,end,previousStart,complete};
  }
  function change(current,previous){return current===null||previous===null||!Number.isFinite(current)||!Number.isFinite(previous)?{delta:null,percent:null}:{delta:current-previous,percent:previous>0?(current-previous)/previous*100:null};}
  function filter(posts,options,now=Date.now()){
    const query=(options.query||'').trim().toLocaleLowerCase('fr');
    return posts.filter(p=>(!query||String(p.title||'').toLocaleLowerCase('fr').includes(query))&&(!options.account||p.accountId===options.account)&&(!options.format||(p.type||'UNKNOWN')===options.format)&&(!options.days||Date.parse(p.timestamp)>now-options.days*DAY&&Date.parse(p.timestamp)<=now)).sort((a,b)=>{const x=value(a,options.sort||'timestamp'),y=value(b,options.sort||'timestamp');return x===null?(y===null?0:1):y===null?-1:y-x||Date.parse(b.timestamp)-Date.parse(a.timestamp);});
  }
  function formats(posts){const groups=new Map();for(const p of posts){const key=p.type||'UNKNOWN';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}return [...groups].map(([type,items])=>({type,...summary(items)}));}
  function timing(posts,now=Date.now(),timeZone='America/New_York'){
    const cells=Array.from({length:7},()=>Array.from({length:6},()=>[]));
    const formatter=new Intl.DateTimeFormat('en-US',{timeZone,weekday:'short',hour:'numeric',hourCycle:'h23'});
    let eligible=0;
    for(const p of posts){const timestamp=Date.parse(p.timestamp),score=value(p,'rate');if(!Number.isFinite(timestamp)||timestamp>now-2*DAY||score===null)continue;
      const parts=Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map(v=>[v.type,v.value]));
      const day=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(parts.weekday),hour=Number(parts.hour);cells[day][Math.floor(hour/4)].push(score);eligible++;
    }
    const flat=cells.flatMap((row,day)=>row.map((list,slot)=>({day,slot,count:list.length,median:median(list)})));
    const qualified=flat.filter(c=>c.count>=3).sort((a,b)=>b.median-a.median);
    return {cells:flat,eligible,best:eligible>=12&&qualified.length>=2&&qualified[0].median>qualified[1].median?qualified[0]:null};
  }
  function groupContent(posts,sort='timestamp',query=''){
    const groups=new Map();
    for(const post of posts){const key=post.contentKey||'post:'+post.accountId+':'+post.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(post);}
    const result=[];
    for(const [key,members] of groups){
      const unique=[...new Map(members.map(p=>[p.accountId+':'+p.id,p])).values()];
      if(query.trim()&&!unique.some(p=>String(p.title||'').toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr'))))continue;
      const first=[...unique].sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp))[0];
      const titlePost=unique.find(p=>p.provider==='youtube'&&p.title)||first;
      const group={key,title:titlePost.title,thumbnail:unique.find(p=>p.thumbnail)?.thumbnail,timestamp:new Date(Math.max(...unique.map(p=>Date.parse(p.timestamp)))).toISOString(),posts:unique,coverage:{},type:key.startsWith('video:')?'VIDEO':first.type};
      for(const metric of ['views','likes','comments','shares','saves','clicks']){const known=unique.map(p=>number(p[metric])).filter(v=>v!==null);group[metric]=known.length?known.reduce((a,b)=>a+b,0):null;group.coverage[metric]=known.length;}
      // Reach is an audience estimate, it must not be summed across platforms.
      group.reach=unique.length===1?number(first.reach):null;
      group.rate=unique.every(p=>value(p,'rate')!==null)&&group.views>0?(group.likes+group.comments)/group.views*100:null;
      group.interactions=unique.every(p=>value(p,'interactions')!==null)?group.likes+group.comments:null;
      result.push(group);
    }
    return result.sort((a,b)=>{const x=sort==='timestamp'?Date.parse(a.timestamp):number(a[sort]),y=sort==='timestamp'?Date.parse(b.timestamp):number(b[sort]);return x===null?(y===null?0:1):y===null?-1:y-x||Date.parse(b.timestamp)-Date.parse(a.timestamp);});
  }
  return {DAY,number,value,median,cohort,summary,compare,change,filter,formats,timing,groupContent};
});
