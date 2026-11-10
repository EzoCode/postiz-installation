'use strict';
const {PrismaClient}=require('/app/node_modules/@prisma/client');
const {AuthService}=require('/app/apps/backend/dist/libraries/helpers/src/auth/auth.service');
(async()=>{const db=new PrismaClient();try{
 const orgs=await db.organization.findMany({where:{deletedAt:null},include:{Integration:{where:{disabled:false,deletedAt:null},select:{id:true},take:1},users:{where:{disabled:false,role:{in:['SUPERADMIN','ADMIN']}},include:{user:true}}}});
 const summary=[];
 for(const org of orgs){const user=org.users.find(m=>m.user.activated)?.user,id=org.Integration[0]?.id;if(!user||!id)continue;
 const r=await fetch('http://localhost:3000/analytics/'+encodeURIComponent(id)+'/capserv/inbox?all=1&refresh=1',{headers:{auth:AuthService.signJWT({id:user.id}),showorg:org.id},signal:AbortSignal.timeout(240000)});
 if(!r.ok)throw Error('Inbox HTTP '+r.status);const data=await r.json();
 summary.push(...data.accounts.map(a=>({account:a.account.name,provider:a.account.provider,comments:a.comments.status,messages:a.messages.status,threads:a.threads.length})));
 }
 console.log(JSON.stringify({collectedAt:new Date().toISOString(),accounts:summary}));
}finally{await db.$disconnect();}})().catch(e=>{console.error('Inbox collection failed:',e.message);process.exitCode=1;});
