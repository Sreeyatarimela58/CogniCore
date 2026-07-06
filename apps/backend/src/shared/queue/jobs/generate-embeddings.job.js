import { createWorker } from '../queue.js';
import { embeddingsService } from '../../../modules/embeddings/embeddings.service.js';
import prisma from '../../../prisma.js';
import { logger } from '../../../config/logger.js';

export const embeddingsWorker = createWorker('generate-embeddings', async (job) => {
  const { metadataId, connectionId, traceId } = job.data;
  
  logger.info({ traceId, metadataId, workerPid: process.pid }, 'Embedding worker started');
  
  try {
    const tableMetadata = await prisma.schemaMetadata.findUnique({
      where: { id: metadataId }
    });

    if (!tableMetadata) {
      logger.info({ metadataId }, 'SchemaMetadata not found. Connection was likely deleted. Gracefully exiting.');
      return;
    }
    await prisma.backgroundJob.updateMany({
      where: { connectionId, type: 'embedding_generation', tableName: tableMetadata.tableName },
      data: { 
        status: 'running', 
        tableName: tableMetadata.tableName, 
        updatedAt: new Date() 
      }
    });

    // Generate Embeddings (Job 2)
    logger.info({ traceId, tableName: tableMetadata.tableName }, 'Embedding generation');
    await embeddingsService.generateEmbeddingForTable(metadataId);
    logger.info({ traceId, tableName: tableMetadata.tableName }, 'Embedding persisted');
    
    // Mark this job as completed
    await prisma.backgroundJob.updateMany({
      where: { connectionId, type: 'embedding_generation', tableName: tableMetadata?.tableName },
      data: { status: 'completed', updatedAt: new Date() }
    });
    
    logger.info({ traceId, tableName: tableMetadata.tableName }, 'BackgroundJob completed');
    logger.info({ traceId, tableName: tableMetadata.tableName }, 'Worker finished');
  } catch (error) {
    logger.error({ traceId, err: error }, `Embedding generation failed for ${metadataId}`);
    throw error; // Let BullMQ handle retries
  }
});
