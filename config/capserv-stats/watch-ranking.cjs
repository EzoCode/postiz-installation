'use strict';
const DAY=86400000;
const numeric=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
function seconds(iso){const m=/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(iso||'');return m?Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0):null}
function scoreVideo(c,v){
  if(v.source==='sequence')return {ratio:numeric(v.sequenceOutlierScore),median:numeric(c.sequenceTypicalViews),sampleSize:null,method:'sequence',reason:'Score fourni par Sequence ; médiane de ses derniers contenus, échantillon exact et date des compteurs non fournis.'};
  const now=Date.parse(c.checkedAt),age=(now-Date.parse(v.publishedAt))/DAY,duration=seconds(v.duration);
  const empty={ratio:null,median:null,sampleSize:0,method:'matched-median-v1',reason:'Données insuffisantes'};
  if(!Number.isFinite(age)||duration===null||numeric(v.views)===null)return empty;
  if(age<1)return {...empty,reason:'Vidéo de moins de 24 heures'};
  const peers=c.videos.filter(p=>p.id!==v.id&&p.recent===true&&numeric(p.views)!==null&&seconds(p.duration)!==null&&(seconds(p.duration)<=180)===(duration<=180)).filter(p=>{const a=(now-Date.parse(p.publishedAt))/DAY;return a>=1&&a>=age/2&&a<=age*2}).map(p=>Number(p.views)).sort((a,b)=>a-b);
  if(peers.length<5)return {...empty,sampleSize:peers.length,reason:'Moins de 5 vidéos comparables'};
  const n=peers.length,median=n%2?peers[(n-1)/2]:(peers[n/2-1]+peers[n/2])/2;
  return {ratio:median>0?Number(v.views)/median:null,median,sampleSize:n,method:'matched-median-v1',reason:median>0?'Même chaîne, durée ≤3 min ou >3 min, âge entre la moitié et le double de celui de la vidéo.':'Médiane nulle, ratio indisponible'};
}
function enrichChannel(c){return {...c,videos:(c.videos||[]).map(v=>({...v,outlier:scoreVideo(c,v)}))}}
module.exports={numeric,seconds,scoreVideo,enrichChannel};
