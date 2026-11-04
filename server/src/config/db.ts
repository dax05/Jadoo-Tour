import { Pool, PoolConfig } from 'pg';
import { ENV } from './env';

// Render External URL (*.render.com) requires SSL.
// Render Internal URL (dpg-...) is within Render private network and does NOT use SSL.
const isRenderInternal =
  ENV.DATABASE_URL.includes('dpg-') && !ENV.DATABASE_URL.includes('.render.com');

const isSslRequired =
  !isRenderInternal &&
  (ENV.DATABASE_URL.includes('sslmode=require') ||
   ENV.DATABASE_URL.includes('.render.com') ||
   ENV.DB_SSL);

const poolConfig: PoolConfig = ENV.DATABASE_URL
  ? {
      connectionString: ENV.DATABASE_URL,
      ssl: isSslRequired ? { rejectUnauthorized: false } : false,
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host: ENV.DB_HOST,
      port: ENV.DB_PORT,
      user: ENV.DB_USER,
      password: ENV.DB_PASSWORD,
      database: ENV.DB_NAME,
      ssl: ENV.DB_SSL ? { rejectUnauthorized: false } : false,
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

export const pool = new Pool(poolConfig);

let isDbConnected = false;
let lastDbError: string | null = null;

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected pool client error:', err.message);
  lastDbError = err.message;
});

/**
 * Test PostgreSQL connectivity and log friendly status
 * Guaranteed to release client back to pool on both success and failure
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  let client;
  try {
    client = await pool.connect();
    const res = await client.query('SELECT NOW() as current_time, current_database() as db_name');
    isDbConnected = true;
    lastDbError = null;
    console.log(
      `[PostgreSQL] Connected to database "${res.rows[0].db_name}" at ${res.rows[0].current_time}`
    );
    return true;
  } catch (err: unknown) {
    isDbConnected = false;
    const msg = err instanceof Error ? err.message : String(err);
    lastDbError = msg;
    console.warn(`[PostgreSQL] Connection warning: Could not connect to database.`);
    console.warn(`[PostgreSQL] Error details: ${msg}`);
    console.warn(
      `[PostgreSQL] Tip: Check DATABASE_URL in Render environment variables or REQUIRED_INPUTS.txt.`
    );
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

export function getDbConnectionStatus(): boolean {
  return isDbConnected;
}

export function getLastDbError(): string | null {
  return lastDbError;
}
