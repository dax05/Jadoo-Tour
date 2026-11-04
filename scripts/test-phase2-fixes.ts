import { pool } from '../server/src/config/db';
import bcrypt from 'bcryptjs';
import assert from 'assert';

async function runPhase2Tests() {
  console.log('\n================================================================================');
  console.log('   🧪 PHASE 2 DEFECT FIXES VERIFICATION TEST SUITE');
  console.log('================================================================================\n');

  let passed = 0;
  let total = 0;

  async function testStep(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [P2-${String(total).padStart(2, '0')}] PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [P2-${String(total).padStart(2, '0')}] FAIL: ${name} — ${err.message}`);
    }
  }

  // 1. Verify Demo User Sarah Jenkins Password and Avatar
  await testStep('Demo User Sarah Jenkins Bcrypt Hash matches Traveler123!', async () => {
    const res = await pool.query('SELECT password_hash, avatar_url FROM users WHERE email = $1', ['sarah.jenkins@example.com']);
    assert(res.rows.length > 0, 'Demo user Sarah Jenkins found in database');
    const row = res.rows[0];
    const match = await bcrypt.compare('Traveler123!', row.password_hash);
    assert.strictEqual(match, true, 'Sarah Jenkins password hash must match Traveler123!');
    assert.strictEqual(row.avatar_url, 'assets/Images/testimonial-section/author-sarah.jpg', 'Sarah Jenkins avatar matches author-sarah.jpg');
  });

  // 2. Verify Destination Rating CHECK constraint
  await testStep('Reject invalid destination rating (rating = 9.9)', async () => {
    let failed = false;
    try {
      await pool.query(
        "INSERT INTO destinations (id, title, country, price_usd, duration_days, rating, image_url, description, latitude, longitude) VALUES ('test-rating-fail', 'Test', 'Test', 100, 5, 9.9, 'test.jpg', 'desc', 10, 10)"
      );
    } catch (err: any) {
      if (err.code === '23514') failed = true; // check_violation
    }
    assert.strictEqual(failed, true, 'Database must reject rating 9.9 via CHECK constraint');
  });

  // 3. Verify GPS latitude and longitude CHECK constraints
  await testStep('Reject out-of-bounds GPS latitude (> 90)', async () => {
    let failed = false;
    try {
      await pool.query(
        "INSERT INTO destinations (id, title, country, price_usd, duration_days, rating, image_url, description, latitude, longitude) VALUES ('test-lat-fail', 'Test', 'Test', 100, 5, 4.5, 'test.jpg', 'desc', 999.0, 10)"
      );
    } catch (err: any) {
      if (err.code === '23514') failed = true;
    }
    assert.strictEqual(failed, true, 'Database must reject latitude 999.0 via CHECK constraint');
  });

  // 4. Verify Positive Price CHECK constraint
  await testStep('Reject negative destination price (price_usd < 0)', async () => {
    let failed = false;
    try {
      await pool.query(
        "INSERT INTO destinations (id, title, country, price_usd, duration_days, rating, image_url, description, latitude, longitude) VALUES ('test-price-fail', 'Test', 'Test', -500, 5, 4.5, 'test.jpg', 'desc', 10, 10)"
      );
    } catch (err: any) {
      if (err.code === '23514') failed = true;
    }
    assert.strictEqual(failed, true, 'Database must reject negative price via CHECK constraint');
  });

  // 5. Verify Booking Adults Count CHECK constraint
  await testStep('Reject invalid booking adult count (adults < 1)', async () => {
    let failed = false;
    try {
      await pool.query(
        "INSERT INTO bookings (id, user_id, destination_id, destination_title, full_name, email, phone, departure_date, adults, children, package_tier, total_price, status) VALUES ('BK-TEST-ADULTS', (SELECT id FROM users LIMIT 1), 'rome-italy', 'Rome', 'Test', 'test@example.com', '+123', '2026-12-01', 0, 0, 'standard', 1000, 'confirmed')"
      );
    } catch (err: any) {
      if (err.code === '23514') failed = true;
    }
    assert.strictEqual(failed, true, 'Database must reject adults = 0 via CHECK constraint');
  });

  // 6. Verify Booking Status CHECK constraint
  await testStep('Reject invalid booking status (status = banana)', async () => {
    let failed = false;
    try {
      await pool.query(
        "INSERT INTO bookings (id, user_id, destination_id, destination_title, full_name, email, phone, departure_date, adults, children, package_tier, total_price, status) VALUES ('BK-TEST-STATUS', (SELECT id FROM users LIMIT 1), 'rome-italy', 'Rome', 'Test', 'test@example.com', '+123', '2026-12-01', 1, 0, 'standard', 1000, 'banana')"
      );
    } catch (err: any) {
      if (err.code === '23514') failed = true;
    }
    assert.strictEqual(failed, true, 'Database must reject invalid status via CHECK constraint');
  });

  // 7. Verify Users Points CHECK constraint
  await testStep('Reject negative loyalty points (points < 0)', async () => {
    let failed = false;
    try {
      await pool.query(
        "INSERT INTO users (name, email, password_hash, points) VALUES ('Bad Points', 'badpoints@example.com', 'hash', -100)"
      );
    } catch (err: any) {
      if (err.code === '23514') failed = true;
    }
    assert.strictEqual(failed, true, 'Database must reject points = -100 via CHECK constraint');
  });

  // 8. Verify Automatic updated_at Trigger
  await testStep('Automatic updated_at trigger executes on profile updates', async () => {
    const userRes = await pool.query('SELECT id, updated_at FROM users WHERE email = $1', ['sarah.jenkins@example.com']);
    const initialUpdatedAt = new Date(userRes.rows[0].updated_at).getTime();

    // Sleep 60ms to ensure timestamp delta
    await new Promise(r => setTimeout(r, 60));

    await pool.query("UPDATE users SET bio = 'Updated bio for trigger test' WHERE email = $1", ['sarah.jenkins@example.com']);

    const updatedRes = await pool.query('SELECT updated_at FROM users WHERE email = $1', ['sarah.jenkins@example.com']);
    const newUpdatedAt = new Date(updatedRes.rows[0].updated_at).getTime();

    assert(newUpdatedAt > initialUpdatedAt, 'updated_at timestamp must increase on row update');
  });

  // 9. Verify Foreign Key Indexes Exist
  await testStep('Verify foreign key indexes exist in information_schema / pg_indexes', async () => {
    const res = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE indexname IN ('idx_bookings_destination_id', 'idx_wishlists_destination_id', 'idx_testimonials_user_id')
    `);
    const found = res.rows.map((r: any) => r.indexname);
    assert(found.includes('idx_bookings_destination_id'), 'idx_bookings_destination_id exists');
    assert(found.includes('idx_wishlists_destination_id'), 'idx_wishlists_destination_id exists');
    assert(found.includes('idx_testimonials_user_id'), 'idx_testimonials_user_id exists');
  });

  // 10. Verify Redundant users(email) index was dropped
  await testStep('Verify duplicate idx_users_email index is absent', async () => {
    const res = await pool.query("SELECT indexname FROM pg_indexes WHERE indexname = 'idx_users_email'");
    assert.strictEqual(res.rows.length, 0, 'Duplicate idx_users_email must be absent');
  });

  console.log('\n--------------------------------------------------------------------------------');
  console.log(`   PHASE 2 TEST SUMMARY: ${passed}/${total} PASSED (${total - passed} FAILED)`);
  console.log('--------------------------------------------------------------------------------\n');

  await pool.end();
  if (passed !== total) process.exit(1);
}

runPhase2Tests().catch(err => {
  console.error('Fatal Phase 2 test suite error:', err);
  process.exit(1);
});

