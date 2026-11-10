'use strict';
const {PrismaClient}=require('/app/node_modules/@prisma/client');
const db=new PrismaClient();
require('./watch.cjs').refreshAll(db).then(()=>console.log('YouTube watch collection complete')).catch(()=>{console.error('YouTube watch collection failed');process.exitCode=1}).finally(()=>db.$disconnect());
