import { UtilityLLMClient } from '../../shared/llm/utility-llm.client.js';
import { SYSTEM_PROMPT, buildMetadataPrompt } from './metadata.prompts.js';
import prisma from '../../prisma.js';
import { z } from 'zod';
import { ProviderPermanentError } from '../../shared/llm/llm-errors.js';
import { logger } from '../../config/logger.js';
import { redisConnection } from '../../shared/queue/queue.js';

const MetadataResponseSchema = z.object({
  businessDescription: z.string().min(5),
  businessPurpose: z.string().min(5),
  synonyms: z.array(z.string()).default([]),
  columnDescriptions: z.record(z.string()).default({}),
});

export class MetadataService {
  constructor() {
    this.llmClient = new UtilityLLMClient();
  }

  /**
   * Generates business metadata for a given SchemaMetadata record using the Utility LLM.
   * As per architectural rules, this is strictly an offline onboarding process.
   * @param {string} metadataId
   */
  async generateMetadataForTable(metadataId, traceId, attempt = 1) {
    const tableMetadata = await prisma.schemaMetadata.findUnique({
      where: { id: metadataId }
    });

    if (!tableMetadata) throw new Error(`SchemaMetadata ${metadataId} not found`);
    const tableName = tableMetadata.tableName;

    if (tableMetadata.isStale === false) {
      logger.info({ traceId, tableName }, `Metadata for ${metadataId} already generated. Skipping LLM call.`);
      return;
    }

    const prompt = buildMetadataPrompt(tableMetadata);
    logger.info({ traceId, tableName, promptSize: prompt.length }, 'Prompt constructed');
    
    logger.info({ traceId, tableName }, 'Calling Groq');
    
    const startTime = Date.now();
    let rawResult;
    try {
      const completion = await this.llmClient.generateJson(SYSTEM_PROMPT, prompt, { traceId, tableName, attempt });
      rawResult = completion; // utility client parses json and returns it, but wait, utility-llm.client.js returns JSON.parse(response.text)
      const duration = Date.now() - startTime;
      logger.info({ traceId, tableName, duration, httpStatus: 200 }, 'Groq responded');
      
      if (traceId) {
        await redisConnection.hincrby(`metrics:${traceId}`, 'providerCalls', 1);
        await redisConnection.lpush(`metrics:${traceId}:latencies`, duration);
      }
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.error({ traceId, tableName, duration, httpStatus: err.httpStatus || 500, err }, 'Groq responded with error');
      
      if (traceId) {
        await redisConnection.hincrby(`metrics:${traceId}`, 'providerCalls', 1);
        await redisConnection.lpush(`metrics:${traceId}:latencies`, duration);
      }
      throw err;
    }

    let result;
    try {
      result = MetadataResponseSchema.parse(rawResult);
      logger.info({ traceId, tableName }, 'JSON parsed');
      logger.info({ traceId, tableName }, 'Schema validated');
    } catch (error) {
      logger.error({ traceId, err: error, errors: error.errors }, 'LLM returned invalid metadata schema');
      throw new ProviderPermanentError('Invalid LLM Response Schema: ' + JSON.stringify(error.errors));
    }

    await prisma.schemaMetadata.update({
      where: { id: metadataId },
      data: {
        businessDescription: result.businessDescription,
        businessPurpose: result.businessPurpose,
        synonyms: result.synonyms || [],
        columnDescriptions: result.columnDescriptions || {},
        promptVersion: '1.0',
        metadataVersion: { increment: 1 },
        generatedAt: new Date(),
        isStale: false
      }
    });

    logger.info({ traceId, tableName }, 'Metadata saved');

    return result;
  }
}

export const metadataService = new MetadataService();
