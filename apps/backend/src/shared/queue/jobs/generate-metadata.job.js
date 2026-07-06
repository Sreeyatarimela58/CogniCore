import { createWorker, embeddingsQueue } from '../queue.js';
import { metadataService } from '../../../modules/metadata-generation/metadata.service.js';
import prisma from '../../../prisma.js';
import { Worker, UnrecoverableError } from 'bullmq';
import { ProviderRateLimitError, ProviderPermanentError } from '../../llm/llm-errors.js';

import { logger } from '../../../config/logger.js';

export const metadataWorker = createWorker('generate-metadata', async (job, token, worker) => {
  const { metadataId, connectionId, traceId } = job.data;
  
  logger.info({ traceId, metadataId, attempt: job.attemptsMade, workerPid: process.pid }, 'Job dequeued');
  
  try {
    const tableMetadata = await prisma.schemaMetadata.findUnique({
      where: { id: metadataId }
    });

    if (!tableMetadata) {
      logger.info({ metadataId }, 'SchemaMetadata not found. Connection was likely deleted. Gracefully exiting.');
      return;
    }

    await prisma.backgroundJob.updateMany({
      where: { connectionId, type: 'metadata_generation', tableName: tableMetadata.tableName },
      data: { 
        status: 'running', 
        tableName: tableMetadata.tableName, 
        updatedAt: new Date() 
      }
    });
    
    logger.info({ traceId, tableName: tableMetadata.tableName }, 'BackgroundJob -> running');

    // Generate Metadata (Job 1)
    await metadataService.generateMetadataForTable(metadataId, traceId, job.attemptsMade);
    
    // Mark this job as completed
    await prisma.backgroundJob.updateMany({
      where: { connectionId, type: 'metadata_generation', tableName: tableMetadata?.tableName },
      data: { status: 'completed', updatedAt: new Date() }
    });
    
    logger.info({ traceId, tableName: tableMetadata.tableName }, 'BackgroundJob completed');

    // Create the next BackgroundJob for embeddings
    await prisma.backgroundJob.create({
      data: {
        connectionId,
        traceId,
        type: 'embedding_generation',
        status: 'queued',
        tableName: tableMetadata.tableName
      }
    });

    // Queue Embeddings (Job 2)
    await embeddingsQueue.add(
      `embeddings-${metadataId}`, 
      { metadataId, connectionId, traceId },
      { attempts: 5, backoff: { type: 'exponential', delay: 10000 } }
    );
    
    logger.info({ traceId, tableName: tableMetadata.tableName }, 'Embedding job queued');
    logger.info({ traceId, tableName: tableMetadata.tableName }, 'Metadata worker finished');
    
  } catch (error) {
    logger.error({ traceId, err: error }, `Metadata generation failed for ${metadataId}`);
    
    if (error instanceof ProviderRateLimitError) {
      console.log(`Global rate limit reached. Pausing worker for ${error.delayMs}ms`);
      
      // Tell the worker (and all other workers on this queue) to stop fetching new jobs
      await worker.rateLimit(error.delayMs);
      
      // Throw BullMQ's specific rate limit error to cleanly put Job A back into the wait queue
      throw Worker.RateLimitError();
    }
    
    if (error instanceof ProviderPermanentError) {
      throw new UnrecoverableError(error.message);
    }
    
    throw error; // Let BullMQ handle standard retries
  }
});
