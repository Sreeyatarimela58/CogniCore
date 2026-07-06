import prisma from '../../prisma.js';
import { encryptPassword } from './connection.crypto.js';
import { destroyPool, testTemporaryConnection } from './connection.pool-manager.js';
import { runAsyncDiscovery } from '../schema-discovery/discovery.service.js';
import { metadataQueue, embeddingsQueue } from '../../shared/queue/queue.js';
import { logger } from '../../config/logger.js';

export async function testConnection(dbConfig) {
  try {
    await testTemporaryConnection(dbConfig);
    return true;
  } catch (error) {
    const err = new Error('Database connection failed: ' + error.message);
    err.status = 400;
    err.code = 'CONNECTION_FAILED';
    throw err;
  }
}

export async function saveConnection(userId, dbConfig) {
  const { name, host, port, database, username, password, ssl } = dbConfig;
  
  const encryptedPassword = encryptPassword(password);

  const connection = await prisma.databaseConnection.create({
    data: {
      userId,
      name,
      host,
      port,
      database,
      username,
      encryptedPassword,
      ssl,
      syncStatus: 'SYNCING',
      healthStatus: 'UNKNOWN',
    },
    select: {
      id: true,
      name: true,
      host: true,
      port: true,
      database: true,
      username: true,
      ssl: true,
      syncStatus: true,
      healthStatus: true,
      lastSyncAt: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  // Start async discovery (fire and forget for now, moves to BullMQ later)
  runAsyncDiscovery(connection.id, userId).catch(console.error);

  return connection;
}

export async function updateConnection(userId, connectionId, dbConfig) {
  const { name, host, port, database, username, password, ssl } = dbConfig;
  
  const existing = await prisma.databaseConnection.findFirst({
    where: { id: connectionId, userId },
  });

  if (!existing) {
    const err = new Error('Connection not found');
    err.status = 404;
    throw err;
  }

  const dataToUpdate = {
    name,
    host,
    port,
    database,
    username,
    ssl,
    syncStatus: 'SYNCING',
    healthStatus: 'UNKNOWN',
  };

  if (password && password.trim() !== '') {
    dataToUpdate.encryptedPassword = encryptPassword(password);
  }

  const updatedConnection = await prisma.databaseConnection.update({
    where: { id: connectionId, userId },
    data: dataToUpdate,
    select: {
      id: true,
      name: true,
      host: true,
      port: true,
      database: true,
      username: true,
      ssl: true,
      syncStatus: true,
      healthStatus: true,
      lastSyncAt: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  // Destroy the old pool so new connections use updated credentials/host
  await destroyPool(connectionId);

  // Start async discovery
  runAsyncDiscovery(connectionId, userId).catch(console.error);

  return updatedConnection;
}

export async function syncConnection(userId, connectionId) {
  const connection = await prisma.databaseConnection.findFirst({
    where: { id: connectionId, userId },
  });

  if (!connection) {
    const err = new Error('Connection not found');
    err.status = 404;
    throw err;
  }

  const updateResult = await prisma.databaseConnection.updateMany({
    where: { id: connectionId, userId, syncStatus: 'COMPLETED' },
    data: { syncStatus: 'SYNCING' },
  });

  if (updateResult.count === 0) {
    const err = new Error('Sync already in progress or connection not ready');
    err.status = 409;
    throw err;
  }

  runAsyncDiscovery(connectionId, userId).catch(console.error);
  return true;
}

export async function getConnections(userId) {
  return prisma.databaseConnection.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      host: true,
      port: true,
      database: true,
      username: true,
      ssl: true,
      syncStatus: true,
      healthStatus: true,
      lastSyncAt: true,
      schemaVersion: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' }
  });
}


export async function getConnectionStatus(userId, connectionId) {
  const connection = await prisma.databaseConnection.findFirst({
    where: { id: connectionId, userId },
    select: { syncStatus: true, healthStatus: true, lastSyncAt: true },
  });

  if (!connection) {
    const err = new Error('Connection not found');
    err.status = 404;
    throw err;
  }

  if (connection.syncStatus === 'SYNCING') {
    const jobStats = await prisma.backgroundJob.groupBy({
      by: ['status'],
      where: { connectionId },
      _count: true
    });

    let completed = 0;
    let total = 0;

    for (const group of jobStats) {
      if (group.status === 'completed') completed += group._count;
      total += group._count;
    }

    // Determine the current active job for UI display text
    const currentJob = await prisma.backgroundJob.findFirst({
      where: { connectionId, status: { in: ['queued', 'running', 'delayed'] } },
      orderBy: { updatedAt: 'desc' }
    });

    connection.progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    connection.currentJob = currentJob;
  }

  return connection;
}

export async function deleteConnection(userId, connectionId) {
  const connection = await prisma.databaseConnection.findFirst({
    where: { id: connectionId, userId },
  });

  if (!connection) {
    const err = new Error('Connection not found');
    err.status = 404;
    throw err;
  }

  await destroyPool(connectionId);

  const schemas = await prisma.schemaMetadata.findMany({
    where: { connectionId },
    select: { id: true }
  });

  await prisma.$transaction([
    prisma.schemaEmbedding.deleteMany({
      where: { metadata: { connectionId } }
    }),
    prisma.schemaMetadata.deleteMany({
      where: { connectionId }
    }),
    prisma.backgroundJob.deleteMany({
      where: { connectionId }
    }),
    prisma.databaseConnection.delete({
      where: { id: connectionId, userId }
    })
  ]);

  // Force clean Redis jobs to prevent orphaned jobs executing
  try {
    for (const schema of schemas) {
      await metadataQueue.remove(`metadata-${schema.id}`);
      await embeddingsQueue.remove(`embeddings-${schema.id}`);
    }
  } catch (error) {
    logger.error({ err: error, connectionId }, 'Failed to cleanly remove all jobs from BullMQ');
  }
  return true;
}
