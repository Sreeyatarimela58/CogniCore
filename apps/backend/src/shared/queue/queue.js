import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../../config/env.js';
import prisma from '../../prisma.js';
import { logger } from '../../config/logger.js';
import { evaluateConnectionStatus } from '../../modules/knowledge-base/onboarding-evaluator.service.js';

const redisOpts = {
  maxRetriesPerRequest: null
};

export const redisConnection = new Redis(env.REDIS_URL, redisOpts);

redisConnection.on('error', (err) => {
  // Suppress Redis connection errors from crashing the process
});

// Queues - BullMQ requires separate Redis connections for blocking operations
export const metadataQueue = new Queue('generate-metadata', { connection: new Redis(env.REDIS_URL, redisOpts) });
export const embeddingsQueue = new Queue('generate-embeddings', { connection: new Redis(env.REDIS_URL, redisOpts) });

export const metadataQueueEvents = new QueueEvents('generate-metadata', { connection: new Redis(env.REDIS_URL, redisOpts) });
export const embeddingsQueueEvents = new QueueEvents('generate-embeddings', { connection: new Redis(env.REDIS_URL, redisOpts) });

[metadataQueue, embeddingsQueue, metadataQueueEvents, embeddingsQueueEvents].forEach(q => {
  q.on('error', () => {});
});

export async function logQueueStates(traceId) {
  try {
    const metadataCounts = await metadataQueue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed');
    const embeddingCounts = await embeddingsQueue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed');
    logger.info({
      traceId,
      metadataQueue: metadataCounts,
      embeddingQueue: embeddingCounts
    }, 'Queue State Trace');
  } catch (err) {
    logger.error({ err, traceId }, 'Failed to trace queue states');
  }
}

export function createWorker(queueName, processor, options = {}) {
  let worker; // Declare worker outside so it can be captured by the closure
  
  worker = new Worker(queueName, async (job, token) => {
    return processor(job, token, worker);
  }, {
    connection: new Redis(env.REDIS_URL, redisOpts),
    concurrency: 1, // Process one table at a time to prevent LLM rate limits
    ...options
  });

  worker.on('completed', async (job) => {
    logger.info({ jobId: job.id, queueName, connectionId: job.data?.connectionId, traceId: job.data?.traceId }, `Job completed successfully`);
    if (job.data?.traceId) {
      await logQueueStates(job.data.traceId);
    }
    if (job.data?.connectionId) {
      await evaluateConnectionStatus(job.data.connectionId);
    }
  });

  worker.on('failed', async (job, err) => {
    logger.error({ 
      err, 
      jobId: job.id, 
      queueName, 
      connectionId: job.data?.connectionId, 
      traceId: job.data?.traceId,
      attempt: job.attemptsMade 
    }, `Job failed`);
    
    if (job.data?.traceId) {
      await logQueueStates(job.data.traceId);
    }

    if (job.data?.traceId && job.data?.metadataId) {
      try {
        const typeMap = {
          'generate-metadata': 'metadata_generation',
          'generate-embeddings': 'embedding_generation'
        };
        const jobType = typeMap[queueName];
        if (jobType) {
          const tableMeta = await prisma.schemaMetadata.findUnique({ where: { id: job.data.metadataId } });
          if (tableMeta) {
            await prisma.backgroundJob.updateMany({
              where: { connectionId: job.data.connectionId, type: jobType, tableName: tableMeta.tableName },
              data: { attempts: job.attemptsMade }
            });
          }
        }
      } catch (e) {
        logger.error({ err: e }, 'Failed to update BackgroundJob attempt count');
      }
    }
    
    // Only mark as failed in DB if we are out of retries or it's unrecoverable
    if (err.name === 'UnrecoverableError' || job.attemptsMade >= job.opts.attempts) {
      if (job.data?.connectionId) {
        // We might not have tableName here, so we update any job matching the type that was running/queued
        // Specifically we can look up the table by metadataId
        try {
          const typeMap = {
            'generate-metadata': 'metadata_generation',
            'generate-embeddings': 'embedding_generation'
          };
          const jobType = typeMap[queueName];
          if (jobType && job.data.metadataId) {
            const tableMeta = await prisma.schemaMetadata.findUnique({ where: { id: job.data.metadataId } });
            if (tableMeta) {
              await prisma.backgroundJob.updateMany({
                where: { 
                  connectionId: job.data.connectionId, 
                  type: jobType, 
                  tableName: tableMeta.tableName 
                },
                data: { status: 'failed', updatedAt: new Date() }
              });
            }
          }
          await evaluateConnectionStatus(job.data.connectionId);
        } catch (e) {
          logger.error({ err: e }, 'Failed to update BackgroundJob failure status');
        }
      }
    }
  });
  
  worker.on('error', (err) => {
    logger.error({ err }, `Worker error in ${queueName}`);
    // Suppress worker errors (like Redis connection refused) from crashing process
  });

  return worker;
}
