import prisma from '../../prisma.js';

export async function performKeywordSearch(connectionId, query, limit = 10) {
  // Simple substring matching on table name and synonyms.
  // Using ILIKE for baseline keyword search.
  
  const searchPattern = `%${query}%`;
  
  const results = await prisma.$queryRaw`
    SELECT id, "tableName"
    FROM "SchemaMetadata"
    WHERE "connectionId" = ${connectionId}
      AND (
        "tableName" ILIKE ${searchPattern}
        OR EXISTS (
          SELECT 1 
          FROM unnest(synonyms) as s 
          WHERE s ILIKE ${searchPattern}
        )
      )
    LIMIT ${limit}
  `;

  return results.map(row => ({
    metadataId: row.id,
    tableName: row.tableName,
    score: 1.0, // Keyword matches get a flat baseline score, ranker will weight it
    source: 'keyword'
  }));
}
