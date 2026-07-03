import crypto from 'crypto';
import prisma from '../../prisma.js';
import { getPool } from '../connection/connection.pool-manager.js';
import { getTables, getColumns, getRelationships } from './discovery.queries.js';
import { runValidation } from '../schema-validation/validation.rules.js';
import { logger } from '../../config/logger.js';

const DISCOVERY_TIMEOUT_MS = 30000; // 30 seconds timeout

export async function runAsyncDiscovery(connectionId, userId) {
  // We wrap the entire discovery in a Promise race to enforce the timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Discovery timeout exceeded')), DISCOVERY_TIMEOUT_MS);
  });

  try {
    await Promise.race([
      performDiscovery(connectionId, userId),
      timeoutPromise
    ]);
  } catch (error) {
    logger.error({ err: error, connectionId }, 'Schema discovery failed');
    
    // Mark as FAILED if something went wrong or timed out
    await prisma.databaseConnection.updateMany({
      where: { id: connectionId, userId },
      data: { syncStatus: 'FAILED', healthStatus: 'UNHEALTHY' }
    });
  }
}

async function performDiscovery(connectionId, userId) {
  const dbConfig = await prisma.databaseConnection.findFirst({
    where: { id: connectionId, userId }
  });

  if (!dbConfig) throw new Error('Connection not found');

  const pool = await getPool(connectionId, dbConfig);
  const client = await pool.connect();
  
  let tablesData = [];
  let relationships = [];
  
  try {
    // 1. Discover Structure
    const tableNames = await getTables(client);
    
    for (const tableName of tableNames) {
      const columns = await getColumns(client, tableName);
      tablesData.push({ tableName, columns });
    }
    
    relationships = await getRelationships(client);
    
    // 2. Validate
    const warnings = runValidation(tablesData, relationships);
    if (warnings.length > 0) {
      logger.warn({ connectionId, warnings }, 'Schema validation warnings');
    }

    // 3. Clear old metadata and Store new metadata (in transaction)
    await prisma.$transaction(async (tx) => {
      await tx.schemaMetadata.deleteMany({
        where: { connectionId }
      });
      
      for (const table of tablesData) {
        // Hash the structure to detect changes in Phase 3
        const structureString = JSON.stringify({ columns: table.columns, relationships });
        const structureHash = crypto.createHash('sha256').update(structureString).digest('hex');
        
        const tableRels = relationships.filter(r => r.source_table === table.tableName || r.target_table === table.tableName);
        
        await tx.schemaMetadata.create({
          data: {
            connectionId,
            tableName: table.tableName,
            columns: table.columns,
            relationships: tableRels,
            structureHash
          }
        });
      }
      
      // Update connection status to COMPLETED and increment schemaVersion
      await tx.databaseConnection.update({
        where: { id: connectionId },
        data: {
          syncStatus: 'COMPLETED',
          healthStatus: 'HEALTHY',
          lastSyncAt: new Date(),
          schemaVersion: { increment: 1 }
        }
      });
    });

  } finally {
    client.release();
  }
}
