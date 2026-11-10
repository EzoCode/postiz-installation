'use strict';
const {PrismaClient}=require('/app/node_modules/@prisma/client');
const {AuthService}=require('/app/apps/backend/dist/libraries/helpers/src/auth/auth.service');
(async()=>{const db=new PrismaClient();try{
  const integrations=await db.integration.findMany({where:{disabled:false,deletedAt:null,providerIdentifier:{in:['instagram','instagram-standalone','youtube','facebook','tiktok']}},select:{id:true,name:true,organizationId:true,providerIdentifier:true,organization:{select:{users:{where:{disabled:false},select:{user:{select:{id:true,activated:true}}}}}}}});
  const summary=[];
  for(const i of integrations){const user=i.organization.users.find(m=>m.user.activated)?.user;if(!user)continue;
    const token=AuthService.signJWT({id:user.id});
    try{const r=await fetch('http://localhost:3000/analytics/'+encodeURIComponent(i.id)+'/capserv?date=30&refresh=1',{headers:{auth:token,showorg:i.organizationId},signal:AbortSignal.timeout(150000)});const d=await r.json();summary.push({account:i.name,provider:i.providerIdentifier,status:r.status,result:d.status,followers:d.profile?.followers,samplePosts:d.summary?.count,history:d.history?.length,warnings:d.warnings});}
    catch{summary.push({account:i.name,provider:i.providerIdentifier,status:'collection_failed'});}
  }
  console.log(JSON.stringify({collectedAt:new Date().toISOString(),accounts:summary}));
  if(summary.some(r=>r.status!==200 || r.result!=='ok'))process.exitCode=1;
}finally{await db.$disconnect();}})().catch(()=>{console.error('Collection failed');process.exitCode=1;});
