import prisma from '../../prisma.js';

export async function expandRelationships(connectionId, candidateTables) {
  if (candidateTables.length === 0) return [];

  const candidateIds = candidateTables.map(t => t.metadataId);
  const metadataRecords = await prisma.schemaMetadata.findMany({
    where: { id: { in: candidateIds } }
  });

  const expanded = [];
  const expandedSet = new Set(candidateTables.map(t => t.tableName));

  for (const metadata of metadataRecords) {
    const relationships = metadata.relationships || [];
    for (const rel of relationships) {
      if (!expandedSet.has(rel.target_table)) {
        expandedSet.add(rel.target_table);
        expanded.push({ tableName: rel.target_table, source: 'expansion' });
      }
      if (!expandedSet.has(rel.source_table)) {
        expandedSet.add(rel.source_table);
        expanded.push({ tableName: rel.source_table, source: 'expansion' });
      }
    }
  }

  if (expanded.length > 0) {
    const expandedNames = expanded.map(e => e.tableName);
    const expandedMetadata = await prisma.schemaMetadata.findMany({
      where: { 
        connectionId,
        tableName: { in: expandedNames }
      }
    });

    const nameToId = new Map(expandedMetadata.map(m => [m.tableName, m.id]));
    
    return expanded.map(e => ({
      ...e,
      metadataId: nameToId.get(e.tableName),
      score: 0.5, // Base score for relationship expansion
    })).filter(e => e.metadataId);
  }

  return [];
}
