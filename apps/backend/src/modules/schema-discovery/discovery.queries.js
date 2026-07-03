export async function getTables(client) {
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  return res.rows.map(r => r.table_name);
}

export async function getColumns(client, tableName) {
  const res = await client.query(`
    SELECT 
      c.column_name, 
      c.data_type, 
      c.is_nullable, 
      c.column_default,
      CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
    FROM information_schema.columns c
    LEFT JOIN (
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY' 
        AND tc.table_schema = 'public'
        AND tc.table_name = $1
    ) pk ON c.column_name = pk.column_name
    WHERE c.table_schema = 'public' AND c.table_name = $1
  `, [tableName]);
  return res.rows.map(r => ({
    name: r.column_name,
    type: r.data_type,
    nullable: r.is_nullable === 'YES',
    default: r.column_default,
    isPrimaryKey: r.is_primary_key
  }));
}

export async function getRelationships(client) {
  const res = await client.query(`
    SELECT
      tc.table_name AS source_table,
      kcu.column_name AS source_column,
      ccu.table_name AS target_table,
      ccu.column_name AS target_column
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
  `);
  return res.rows;
}
