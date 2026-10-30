import fs from 'fs';
import path from 'path';
import { pool, checkDatabaseConnection } from '../config/db';

async function initDatabase() {
  console.log('====================================================');
  console.log('       JADOO TRAVEL — POSTGRESQL INITIALIZATION     ');
  console.log('====================================================');

  const connected = await checkDatabaseConnection();
  if (!connected) {
    console.error('[DB Init] Failed to connect to PostgreSQL.');
    console.error('[DB Init] Please update REQUIRED_INPUTS.txt with your database credentials and try again.');
    process.exit(1);
  }

  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const seedPath = path.resolve(__dirname, 'seed.sql');

  const client = await pool.connect();

  try {
    console.log('[DB Init] Running schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await client.query(schemaSql);
    console.log('[DB Init] Schema created successfully (users, destinations, bookings, wishlists, testimonials, subscribers).');

    console.log('[DB Init] Running seed.sql...');
    const seedSql = fs.readFileSync(seedPath, 'utf-8');
    await client.query(seedSql);
    console.log('[DB Init] Seed data inserted successfully (demo user, default destinations, initial reviews, demo booking).');

    console.log('====================================================');
    console.log('       DATABASE SETUP COMPLETE & READY FOR USE!     ');
    console.log('====================================================');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DB Init] Error executing database migration:', msg);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase();
