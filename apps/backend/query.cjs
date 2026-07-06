const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.backgroundJob.findMany();
  console.log('BackgroundJobs:', JSON.stringify(jobs, null, 2));

  const metadata = await prisma.schemaMetadata.findMany();
  console.log('SchemaMetadata:', JSON.stringify(metadata, null, 2));

  const audit = await prisma.auditLog.findMany();
  console.log('AuditLogs:', JSON.stringify(audit, null, 2));
}

main().finally(() => prisma.$disconnect());
