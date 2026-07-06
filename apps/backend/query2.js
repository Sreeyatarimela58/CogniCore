import prisma from './src/prisma.js';

async function main() {
  const jobs = await prisma.backgroundJob.findMany();
  console.log('BackgroundJobs:', JSON.stringify(jobs, null, 2));

  const metadata = await prisma.schemaMetadata.findMany();
  console.log('SchemaMetadata:', JSON.stringify(metadata, null, 2));

  const audit = await prisma.auditLog.findMany();
  console.log('AuditLogs:', JSON.stringify(audit, null, 2));
}

main().then(() => {
  console.log('Done');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
