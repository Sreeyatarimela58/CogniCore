import { getEmbeddingProvider } from '../embeddings/provider-factory.js';
import prisma from '../../prisma.js';

export async function performSemanticSearch(connectionId, query, limit = 10) {
  const provider = getEmbeddingProvider();
  const queryVector = await provider.embed(query);

  // Use pgvector's <=> operator (cosine distance) to find nearest neighbors
  // Ensure we only search within the specific connection's metadata
  const results = await prisma.$queryRaw`
    SELECT 
      m.id, 
      m."tableName", 
      1 - (e.embedding <=> ${JSON.stringify(queryVector)}::vector) as similarity
    FROM "SchemaMetadata" m
    JOIN "SchemaEmbedding" e ON m.id = e."metadataId"
    WHERE m."connectionId" = ${connectionId}
    ORDER BY e.embedding <=> ${JSON.stringify(queryVector)}::vector
    LIMIT ${limit}
  `;

  return results.map(row => ({
    metadataId: row.id,
    tableName: row.tableName,
    score: row.similarity, // 1 is identical, 0 is orthogonal
    source: 'semantic'
  }));
}
