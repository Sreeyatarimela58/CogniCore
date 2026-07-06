import { calculateStructureHash } from './knowledge-base.versioning.js';
import prisma from '../../prisma.js';
import { metadataQueue } from '../../shared/queue/queue.js';
import { logger } from '../../config/logger.js';
import { randomUUID } from 'crypto';

export async function processSchemaRefresh(connectionId, discoveredTables, allRelationships) {
  const traceId = randomUUID();
  logger.info({ traceId, connectionId }, 'Starting schema refresh for onboarding session');
  const existingMetadata = await prisma.schemaMetadata.findMany({
    where: { connectionId }
  });

  const existingMap = new Map(existingMetadata.map(m => [m.tableName, m]));
  const discoveredMap = new Map(discoveredTables.map(t => [t.tableName, t]));

  const tablesToUpdate = [];
  const tablesToCreate = [];
  const tablesToDelete = [];

  // 1. Identify Deletions
  for (const [tableName, existing] of existingMap.entries()) {
    if (!discoveredMap.has(tableName)) {
      tablesToDelete.push(existing.id);
    }
  }

  // 2. Identify Creations & Updates
  for (const table of discoveredTables) {
    const tableRels = allRelationships.filter(r => r.source_table === table.tableName || r.target_table === table.tableName);
    const newHash = calculateStructureHash(table.columns, tableRels);
    
    if (existingMap.has(table.tableName)) {
      const existing = existingMap.get(table.tableName);
      if (existing.structureHash !== newHash) {
        tablesToUpdate.push({
          id: existing.id,
          columns: table.columns,
          relationships: tableRels,
          structureHash: newHash,
          version: existing.version + 1,
          isStale: true
        });
      }
    } else {
      tablesToCreate.push({
        connectionId,
        tableName: table.tableName,
        columns: table.columns,
        relationships: tableRels,
        structureHash: newHash,
        version: 1,
        isStale: true
      });
    }
  }

  // 3. Apply changes in transaction
  let jobsToQueue = [];

  await prisma.$transaction(async (tx) => {
    // Delete
    if (tablesToDelete.length > 0) {
      await tx.schemaMetadata.deleteMany({ where: { id: { in: tablesToDelete } } });
    }
    
    // Create
    if (tablesToCreate.length > 0) {
      // Need to capture IDs to queue them, so we insert one by one, OR we insert many and then query.
      // createMany doesn't return inserted IDs in Postgres until Prisma 5+.
      // We will loop, but in a safe sequential manner.
      for (const table of tablesToCreate) {
        const created = await tx.schemaMetadata.create({ data: table });
        jobsToQueue.push({ id: created.id, tableName: created.tableName, version: created.version });
      }
    }
    
    // Update
    for (const table of tablesToUpdate) {
      const { id, ...data } = table;
      await tx.schemaMetadata.update({ where: { id }, data });
      jobsToQueue.push({ id, tableName: data.tableName, version: data.version });
    }

    // Create BackgroundJob records atomically
    if (jobsToQueue.length > 0) {
      await tx.backgroundJob.createMany({
        data: jobsToQueue.map(job => ({
          connectionId,
          traceId,
          type: 'metadata_generation',
          status: 'queued',
          tableName: job.tableName
        }))
      });
    }
  });

  // 4. Queue Jobs (Job 1: Metadata Generation)
  // According to constraints, jobs run sequentially: Job 1 queues Job 2.
  for (const job of jobsToQueue) {
    const metadataId = job.id;
    try {
      await metadataQueue.add(
        `metadata-${metadataId}`, 
        { metadataId, connectionId, traceId },
        { 
          jobId: `metadata-${metadataId}-v${job.version}`,
          attempts: 8, 
          backoff: { type: 'exponential', delay: 10000 } 
        }
      );
    } catch (error) {
      logger.error({ err: error, metadataId, connectionId }, 'Failed to enqueue metadata job');
      await prisma.backgroundJob.updateMany({
        where: { connectionId, type: 'metadata_generation', tableName: job.tableName },
        data: { status: 'failed', updatedAt: new Date() }
      });
    }
  }

  const changedCount = jobsToQueue.length;
  
  if (changedCount > 0) {
    logger.info({ connectionId, changedCount }, 'Queued background metadata generation jobs for changed tables');
  } else {
    logger.info({ connectionId }, 'No schema changes detected. Skipping AI regeneration.');
  }
  
  return changedCount;
}
