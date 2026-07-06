import prisma from '../../prisma.js';
import { logger } from '../../config/logger.js';
import { redisConnection, metadataQueue, embeddingsQueue } from '../../shared/queue/queue.js';

export async function evaluateConnectionStatus(connectionId) {
  try {
    const counts = await prisma.backgroundJob.groupBy({
      by: ['status'],
      where: { connectionId },
      _count: true
    });

    const stats = {
      completed: 0,
      failed: 0,
      running: 0,
      queued: 0,
      delayed: 0
    };

    for (const group of counts) {
      stats[group.status] = group._count;
    }

    const activeJobsCount = stats.running + stats.queued + stats.delayed;

    if (activeJobsCount === 0) {
      const newStatus = stats.failed > 0 ? 'FAILED' : 'COMPLETED';
      
      await prisma.databaseConnection.updateMany({
        where: { id: connectionId, syncStatus: 'SYNCING' },
        data: { syncStatus: newStatus, updatedAt: new Date() }
      });
      
      logger.info({ connectionId, oldStatus: 'SYNCING', newStatus, reason: 'No remaining BackgroundJobs.' }, 'DatabaseConnection syncStatus updated');
      
      logger.info({ connectionId, stats, newStatus }, 'Onboarding evaluation terminal state reached');

      // Generate Final Diagnostic Report
      try {
        const allJobs = await prisma.backgroundJob.findMany({ where: { connectionId } });
        
        let tablesProcessed = new Set();
        let metadataSucceeded = 0;
        let metadataFailed = 0;
        let embeddingsSucceeded = 0;
        let embeddingsFailed = 0;
        let totalRetries = 0;
        let traceId = null;

        for (const job of allJobs) {
          if (job.tableName) tablesProcessed.add(job.tableName);
          if (job.traceId) traceId = job.traceId;
          
          totalRetries += (job.attempts || 0);

          if (job.type === 'metadata_generation') {
            if (job.status === 'completed') metadataSucceeded++;
            if (job.status === 'failed') metadataFailed++;
          } else if (job.type === 'embedding_generation') {
            if (job.status === 'completed') embeddingsSucceeded++;
            if (job.status === 'failed') embeddingsFailed++;
          }
        }

        let providerCalls = 0;
        let avgLatency = 0;
        let maxLatency = 0;
        
        if (traceId) {
          const calls = await redisConnection.hget(`metrics:${traceId}`, 'providerCalls');
          providerCalls = parseInt(calls || '0', 10);
          
          const latencies = await redisConnection.lrange(`metrics:${traceId}:latencies`, 0, -1);
          if (latencies.length > 0) {
            const parsedLatencies = latencies.map(l => parseInt(l, 10)).filter(l => !isNaN(l));
            if (parsedLatencies.length > 0) {
              maxLatency = Math.max(...parsedLatencies);
              avgLatency = parsedLatencies.reduce((a, b) => a + b, 0) / parsedLatencies.length;
            }
          }
        }

        const metadataQueueState = await metadataQueue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed');
        const embeddingsQueueState = await embeddingsQueue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed');

        logger.info({
          traceId,
          connectionId,
          diagnosticReport: {
            tablesProcessed: tablesProcessed.size,
            metadataSucceeded,
            metadataFailed,
            embeddingsSucceeded,
            embeddingsFailed,
            retriesPerformed: totalRetries,
            totalProviderCalls: providerCalls,
            averageProviderLatency: avgLatency,
            longestProviderCall: maxLatency,
            finalQueueState: {
              metadata: metadataQueueState,
              embeddings: embeddingsQueueState
            },
            finalBackgroundJobState: stats,
            finalConnectionState: newStatus
          }
        }, 'Final Diagnostic Report');
        
      } catch (err) {
        logger.error({ err, connectionId }, 'Failed to generate Final Diagnostic Report');
      }
    }
  } catch (error) {
    logger.error({ err: error, connectionId }, 'Failed to evaluate onboarding connection status');
  }
}
