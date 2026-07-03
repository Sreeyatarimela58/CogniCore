import prisma from '../../prisma.js';
import { encryptPassword } from './connection.crypto.js';
import { destroyPool, testTemporaryConnection } from './connection.pool-manager.js';
import { runAsyncDiscovery } from '../schema-discovery/discovery.service.js';

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

  if (connection.syncStatus === 'SYNCING') {
    const err = new Error('Sync already in progress');
    err.status = 409;
    throw err;
  }

  await prisma.databaseConnection.update({
    where: { id: connectionId, userId },
    data: { syncStatus: 'SYNCING' },
  });

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

  await prisma.$transaction([
    prisma.schemaMetadata.deleteMany({
      where: { connectionId }
    }),
    prisma.databaseConnection.delete({
      where: { id: connectionId, userId } // Enforce userId again just in case
    })
  ]);

  return true;
}
