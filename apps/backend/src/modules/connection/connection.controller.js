import { z } from 'zod';
import { saveConnectionSchema, testConnectionSchema, updateConnectionSchema } from './connection.schema.js';
import * as connectionService from './connection.service.js';
import prisma from '../../prisma.js';

export async function testConnection(req, res, next) {
  try {
    const validatedData = testConnectionSchema.parse(req.body);
    await connectionService.testConnection(validatedData);
    res.json({ success: true, data: null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
    }
    next(error);
  }
}

export async function createConnection(req, res, next) {
  try {
    const validatedData = saveConnectionSchema.parse(req.body);
    const userId = req.user.userId;
    
    // Validates credentials, encrypts, saves, and starts async sync
    const connection = await connectionService.saveConnection(userId, validatedData);
    
    res.status(201).json({ success: true, data: { connection } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
    }
    next(error);
  }
}

export async function updateConnection(req, res, next) {
  try {
    const validatedData = updateConnectionSchema.parse(req.body);
    const userId = req.user.userId;
    const connectionId = req.params.id;
    
    const connection = await connectionService.updateConnection(userId, connectionId, validatedData);
    
    res.json({ success: true, data: { connection } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
    }
    next(error);
  }
}

export async function syncConnection(req, res, next) {
  try {
    const userId = req.user.userId;
    const connectionId = req.params.id;
    
    await connectionService.syncConnection(userId, connectionId);
    
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
}

export async function getConnections(req, res, next) {
  try {
    const userId = req.user.userId;
    const connections = await connectionService.getConnections(userId);
    res.json({ success: true, data: { connections } });
  } catch (error) {
    next(error);
  }
}

export async function getConnectionStatus(req, res, next) {
  try {
    const userId = req.user.userId;
    const connectionId = req.params.id;
    
    const status = await connectionService.getConnectionStatus(userId, connectionId);
    res.json({ success: true, data: { status } });
  } catch (error) {
    next(error);
  }
}

export async function deleteConnection(req, res, next) {
  try {
    const userId = req.user.userId;
    const connectionId = req.params.id;
    
    await connectionService.deleteConnection(userId, connectionId);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
}

export async function getSchemaTables(req, res, next) {
  try {
    const userId = req.user.userId;
    const connectionId = req.query.connectionId;
    
    if (!connectionId) {
      const err = new Error('connectionId query parameter is required');
      err.status = 400;
      throw err;
    }

    // Verify ownership
    const connection = await prisma.databaseConnection.findFirst({
      where: { id: connectionId, userId }
    });
    
    if (!connection) {
      const err = new Error('Connection not found or access denied');
      err.status = 404;
      throw err;
    }

    const tables = await prisma.schemaMetadata.findMany({
      where: { connectionId },
      orderBy: { tableName: 'asc' }
    });
    
    res.json({ success: true, data: { tables } });
  } catch (error) {
    next(error);
  }
}
