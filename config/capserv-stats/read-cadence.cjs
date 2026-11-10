const {PrismaClient}=require('/app/node_modules/@prisma/client');const {getCadence}=require('./cadence.cjs');
(async()=>{const db=new PrismaClient();try{console.log(JSON.stringify(await getCadence('91864f0c-4a9f-4f13-8960-3f3c9190c8ad',db)))}finally{await db.$disconnect()}})().catch(()=>{console.error('Cadence unavailable');process.exitCode=1});
