import crypto from 'crypto';

export function calculateStructureHash(columns, relationships) {
  // Sort columns and relationships for deterministic hashing
  const sortedColumns = [...columns].sort((a, b) => a.name.localeCompare(b.name));
  const sortedRelationships = [...relationships].sort((a, b) => 
    `${a.source_table}-${a.target_table}-${a.foreign_key_name}`.localeCompare(`${b.source_table}-${b.target_table}-${b.foreign_key_name}`)
  );
  
  const structureString = JSON.stringify({ columns: sortedColumns, relationships: sortedRelationships });
  return crypto.createHash('sha256').update(structureString).digest('hex');
}
