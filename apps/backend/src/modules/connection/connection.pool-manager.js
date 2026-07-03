import pg from 'pg';
import { decryptPassword } from './connection.crypto.js';
import { logger } from '../../config/logger.js';

// Cache for connection pools: { connectionId: pg.Pool }
const pools = new Map();

/**
 * Gets an existing pg.Pool for a connection ID, or creates and caches a new one.
 * The password is decrypted here and discarded immediately after pool creation.
 */
export async function getPool(connectionId, dbConfig) {
  if (pools.has(connectionId)) {
    return pools.get(connectionId);
  }

  const { host, port, database, username, encryptedPassword, ssl } = dbConfig;
  
  // Decrypt exactly when needed, discard immediately.
  const plaintextPassword = decryptPassword(encryptedPassword);

  const poolConfig = {
    host,
    port,
    database,
    user: username,
    password: plaintextPassword,
    ssl: ssl ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  const pool = new pg.Pool(poolConfig);
  
  pool.on('error', (err) => {
    logger.error({ err, connectionId }, 'Unexpected error on idle pg client');
  });

  pools.set(connectionId, pool);
  return pool;
}

/**
 * Creates a temporary pool for testing connection without caching.
 */
export async function testTemporaryConnection(dbConfig) {
  const { host, port, database, username, password, ssl } = dbConfig;
  
  const pool = new pg.Pool({
    host,
    port,
    database,
    user: username,
    password: password, // Plaintext since it's from the request body
    ssl: ssl ? { rejectUnauthorized: false } : false,
    max: 1, // Only need 1 connection to test
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } finally {
    await pool.end();
  }
}

/**
 * Destroys a pool and removes it from the cache.
 */
export async function destroyPool(connectionId) {
  if (pools.has(connectionId)) {
    const pool = pools.get(connectionId);
    try {
      await pool.end();
    } catch (err) {
      logger.error({ err, connectionId }, 'Error ending pool during destruction');
    }
    pools.delete(connectionId);
  }
}
