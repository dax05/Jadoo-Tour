import fs from 'fs';
import path from 'path';
import { pool, checkDatabaseConnection } from '../config/db';

async function initDatabase() {
  console.log('====================================================');
  console.log('       JADOO TRAVEL — POSTGRESQL INITIALIZATION     ');
  console.log('====================================================');

  const schemaPath = fs.existsSync(path.resolve(__dirname, 'schema.sql'))
    ? path.resolve(__dirname, 'schema.sql')
    : path.resolve(__dirname, '../../src/db/schema.sql');
  const seedPath = fs.existsSync(path.resolve(__dirname, 'seed.sql'))
    ? path.resolve(__dirname, 'seed.sql')
    : path.resolve(__dirname, '../../src/db/seed.sql');

  // Pre-flight validation: check SQL files before opening database connections
  if (!fs.existsSync(schemaPath) || !fs.existsSync(seedPath)) {
    console.error('[DB Init] Fatal: Missing schema.sql or seed.sql migration file.');
    process.exitCode = 1;
    return;
  }

  const connected = await checkDatabaseConnection();
  if (!connected) {
    console.error('[DB Init] Failed to connect to PostgreSQL.');
    console.error('[DB Init] Please update REQUIRED_INPUTS.txt with your database credentials and try again.');
    process.exitCode = 1;
    return;
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    console.log('[DB Init] Running schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await client.query(schemaSql);
    console.log('[DB Init] Schema created successfully (users, destinations, bookings, wishlists, testimonials, subscribers).');

    console.log('[DB Init] Running seed.sql...');
    const seedSql = fs.readFileSync(seedPath, 'utf-8');
    await client.query(seedSql);
    console.log('[DB Init] Seed data inserted successfully (demo user, default destinations, initial reviews, demo booking).');

    await client.query('COMMIT');
    console.log('====================================================');
    console.log('       DATABASE SETUP COMPLETE & READY FOR USE!     ');
    console.log('====================================================');
  } catch (err: unknown) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('[DB Init] Rollback error:', rollbackErr);
      }
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DB Init] Error executing database migration:', msg);
    process.exitCode = 1;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

initDatabase();
