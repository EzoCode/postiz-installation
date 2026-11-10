'use strict';
const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
function applyReelMetrics(post,data,video){
 const metrics=Object.fromEntries((data.data||[]).map(m=>[m.name,m.values?.[0]?.value]));
 // Total plays includes replays. Keep unavailable fields null, including empty breakdowns.
 post.views=finite(metrics.fb_reels_total_plays)??finite(metrics.blue_reels_play_count);
 post.likes=finite(video?.likes?.summary?.total_count)??post.likes??null;
 post.comments=finite(video?.comments?.summary?.total_count)??post.comments??null;
 const actions=metrics.post_video_social_actions;
 if(actions&&typeof actions==='object')post.shares=finite(actions.shares)??finite(actions.share)??post.shares??null;
 post.reach=null;post.clicks=null;post.type='VIDEO';
 post.metricsSource='facebook-reels';post.metricsObservedAt=new Date().toISOString();
 post.insightsAvailable=post.views!==null;
 return post;
}
module.exports={applyReelMetrics};
