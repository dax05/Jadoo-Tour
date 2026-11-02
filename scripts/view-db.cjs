const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function getDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // Check server/.env
  const serverEnv = path.join(__dirname, '..', 'server', '.env');
  if (fs.existsSync(serverEnv)) {
    const text = fs.readFileSync(serverEnv, 'utf8');
    const match = text.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (match) return match[1];
  }

  // Check render-pg.md
  const pgMd = path.join(__dirname, '..', 'render-pg.md');
  if (fs.existsSync(pgMd)) {
    const text = fs.readFileSync(pgMd, 'utf8');
    const lines = text.split(/\r?\n/).map((l) => l.trim());
    const extIdx = lines.findIndex((l) => l === 'External Database URL');
    if (extIdx !== -1 && lines[extIdx + 1]) {
      return lines[extIdx + 1];
    }
  }

  return null;
}

async function viewDatabase() {
  const dbUrl = getDbUrl();
  if (!dbUrl) {
    console.error('❌ Could not find DATABASE_URL in environment or render-pg.md');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    console.log('\n============================================================');
    console.log('  🌐 JADOO TOURS — LIVE RENDER POSTGRESQL VIEWER');
    console.log('============================================================\n');

    // 1. Users
    const usersRes = await client.query(
      'SELECT id, name, email, role, points, to_char(created_at, \'YYYY-MM-DD HH24:MI:SS\') as registered_at FROM users ORDER BY id ASC'
    );
    console.log(`📌 USERS TABLE (${usersRes.rows.length} Total Registered Accounts):`);
    console.table(usersRes.rows);

    // 2. Bookings
    const bookingsRes = await client.query(
      'SELECT id, user_id, destination_title, full_name, email, to_char(departure_date, \'YYYY-MM-DD\') as dep_date, total_price, status, to_char(created_at, \'YYYY-MM-DD HH24:MI:SS\') as booked_at FROM bookings ORDER BY created_at DESC'
    );
    console.log(`\n📌 BOOKINGS TABLE (${bookingsRes.rows.length} Total Reservations):`);
    if (bookingsRes.rows.length > 0) {
      console.table(bookingsRes.rows);
    } else {
      console.log('   (No reservations recorded yet)');
    }

    // 3. Destinations & Subscribers Counts
    const destCount = await client.query('SELECT count(*) FROM destinations');
    const subCount = await client.query('SELECT count(*) FROM subscribers');
    console.log(`\n📊 SUMMARY METRICS:`);
    console.log(`   - Destinations in Catalog: ${destCount.rows[0].count}`);
    console.log(`   - Newsletter Subscribers: ${subCount.rows[0].count}`);
    console.log('============================================================\n');

    client.release();
  } catch (err) {
    console.error('❌ Error querying database:', err.message);
  } finally {
    await pool.end();
  }
}

viewDatabase();
