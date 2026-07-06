import { getEmbeddingProvider } from './provider-factory.js';
import prisma from '../../prisma.js';

export class EmbeddingsService {
  constructor() {
    this.provider = getEmbeddingProvider();
  }

  /**
   * Generates embeddings strictly from the stored AI metadata in SchemaMetadata.
   * As per architectural rules, embeddings are never generated directly from raw schema or business data.
   * @param {string} metadataId
   */
  async generateEmbeddingForTable(metadataId) {
    const tableMetadata = await prisma.schemaMetadata.findUnique({
      where: { id: metadataId }
    });

    if (!tableMetadata) throw new Error(`SchemaMetadata ${metadataId} not found`);

    // Create a rich text representation of the stored metadata for semantic embedding
    const contentParts = [
      `Table: ${tableMetadata.tableName}`,
      tableMetadata.businessDescription ? `Description: ${tableMetadata.businessDescription}` : '',
      tableMetadata.businessPurpose ? `Purpose: ${tableMetadata.businessPurpose}` : '',
      (tableMetadata.synonyms && tableMetadata.synonyms.length > 0) ? `Synonyms: ${tableMetadata.synonyms.join(', ')}` : '',
      tableMetadata.columnDescriptions ? `Columns: ${Object.keys(tableMetadata.columnDescriptions).join(', ')}` : ''
    ];

    const contentToEmbed = contentParts.filter(part => part.trim() !== '').join(' | ');
    const vector = await this.provider.embed(contentToEmbed);

    // Save vector to database using transaction for idempotency
    await prisma.$transaction([
      prisma.schemaEmbedding.deleteMany({
        where: { metadataId }
      }),
      prisma.$executeRaw`
        INSERT INTO "SchemaEmbedding" ("id", "metadataId", "embedding", "createdAt")
        VALUES (gen_random_uuid(), ${metadataId}, ${JSON.stringify(vector)}::vector, NOW())
      `,
      prisma.schemaMetadata.update({
        where: { id: metadataId },
        data: { embeddingVersion: { increment: 1 } }
      })
    ]);
  }
}

export const embeddingsService = new EmbeddingsService();
