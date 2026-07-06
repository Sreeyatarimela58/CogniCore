export const SYSTEM_PROMPT = `
You are an expert Data Architect. Your task is to analyze a database table's structure and generate meaningful business descriptions, purposes, and synonyms. 
You will ONLY be given the table's structural metadata (table name, columns, types, foreign keys).
You MUST output valid JSON strictly adhering to the requested format. Do not include markdown formatting or extra text outside the JSON.
`;

export function buildMetadataPrompt(tableMetadata) {
  const columnsList = Array.isArray(tableMetadata.columns) 
    ? tableMetadata.columns.map(c => `- ${c.name} (${c.type}): nullable=${c.nullable}, primaryKey=${c.isPrimaryKey}`).join('\n')
    : JSON.stringify(tableMetadata.columns);

  return `
Analyze the following table metadata and generate business metadata for it.

Table Name: ${tableMetadata.tableName}
Columns:
${columnsList}
Relationships:
${JSON.stringify(tableMetadata.relationships, null, 2)}

Produce a JSON object with the following exact structure:
{
  "businessDescription": "A clear, human-readable description of what this table represents in a business context.",
  "businessPurpose": "Why this table exists and what business process it supports.",
  "synonyms": ["list", "of", "business", "synonyms", "for", "this", "table"],
  "columnDescriptions": {
    "columnName1": "business description of column 1",
    "columnName2": "business description of column 2"
  }
}
`;
}
