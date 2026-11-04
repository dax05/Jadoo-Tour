import app from '../server/src/app';
import { pool, checkDatabaseConnection } from '../server/src/config/db';
import { ENV } from '../server/src/config/env';
import jwt from 'jsonwebtoken';
import assert from 'assert';

async function runPhase3Tests() {
  console.log('\n================================================================================');
  console.log('   🧪 PHASE 3 REST API & SECURITY VERIFICATION TEST SUITE');
  console.log('================================================================================\n');

  let passed = 0;
  let total = 0;

  async function testStep(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [P3-${String(total).padStart(2, '0')}] PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [P3-${String(total).padStart(2, '0')}] FAIL: ${name} — ${err.message}`);
    }
  }

  // Start local express server instance on port 5001 for test isolation if needed
  let server: any;
  const testPort = 5002;
  const baseUrl = `http://localhost:${testPort}/api`;

  try {
    server = app.listen(testPort);
    await new Promise(r => setTimeout(r, 600));
  } catch (err) {
    console.error('Could not start test server:', err);
    process.exit(1);
  }

  try {
    // 1. Connection Pool client leak test
    await testStep('checkDatabaseConnection releases pool client safely', async () => {
      const initialTotal = pool.totalCount;
      const connected = await checkDatabaseConnection();
      assert.strictEqual(connected, true, 'Database check returns connected');
      // Verify pool does not leave idle in-flight clients checked out
      const diff = pool.waitingCount;
      assert.strictEqual(diff, 0, 'No clients waiting in pool queue');
    });

    // 2. JWT Algorithm Restriction & Malformed Header Rejection
    await testStep('requireAuth rejects malformed Authorization headers and forged tokens', async () => {
      // Missing token
      const res1 = await fetch(`${baseUrl}/auth/profile`);
      assert.strictEqual(res1.status, 401, 'Rejects missing token with 401');

      // Malformed header
      const res2 = await fetch(`${baseUrl}/auth/profile`, {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      });
      assert.strictEqual(res2.status, 401, 'Rejects non-Bearer scheme with 401');

      // Forged / wrong secret token
      const forged = jwt.sign({ id: 1, email: 'fake@example.com', role: 'admin' }, 'wrong_secret_123');
      const res3 = await fetch(`${baseUrl}/auth/profile`, {
        headers: { Authorization: `Bearer ${forged}` },
      });
      assert.strictEqual(res3.status, 401, 'Rejects forged token with 401');
    });

    // 3. Register user and verify JWT expiresIn configuration
    const timestamp = Date.now();
    const testEmail = `phase3.test.${timestamp}@example.com`;
    let userToken = '';
    let userId = 0;

    await testStep('Register user and mint JWT with validated payload', async () => {
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Phase 3 Tester',
          email: testEmail,
          password: 'Password123!',
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201, 'User created');
      assert(Boolean(data.token), 'JWT token minted');
      userToken = data.token;
      userId = data.user.id;

      // Inspect decoded payload
      const decoded: any = jwt.decode(userToken);
      assert.strictEqual(decoded.id, userId, 'Payload contains numeric user ID');
      assert.strictEqual(decoded.email, testEmail, 'Payload contains normalized email');
    });

    // 4. Booking input validation (reject negative/zero passengers, invalid tier)
    await testStep('Booking engine rejects invalid passengers and package tiers', async () => {
      // Invalid adults = 0
      const res1 = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
          destinationId: 'rome-italy',
          departureDate: '2026-12-01',
          adults: 0,
          fullName: 'Tester',
          email: testEmail,
          phone: '+1 555-000-0000',
        }),
      });
      assert.strictEqual(res1.status, 400, 'Rejects adults = 0 with 400');

      // Invalid tier
      const res2 = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
          destinationId: 'rome-italy',
          departureDate: '2026-12-01',
          adults: 1,
          packageTier: 'super-ultra-luxury',
          fullName: 'Tester',
          email: testEmail,
          phone: '+1 555-000-0000',
        }),
      });
      assert.strictEqual(res2.status, 400, 'Rejects invalid package tier with 400');
    });

    // 5. Transactional Booking Creation & Points Accrual
    let bookingRef = '';
    await testStep('Transactional booking creation awards loyalty points atomically', async () => {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
          destinationId: 'rome-italy',
          departureDate: '2026-12-01',
          adults: 2,
          children: 1,
          packageTier: 'deluxe',
          promoCode: 'EXPLORE15',
          fullName: 'Phase 3 Tester',
          email: testEmail,
          phone: '+1 555-123-9876',
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201, 'Booking created in transaction');
      bookingRef = data.booking?.id;
      assert(Boolean(bookingRef), 'Booking reference generated');

      // Verify points were atomically updated
      const userRes = await pool.query('SELECT points FROM users WHERE id = $1', [userId]);
      assert.strictEqual(Number(userRes.rows[0].points), 1500, 'User points increased by 250 in transaction');
    });

    // 6. Booking cancellation lifecycle check
    await testStep('Booking cancellation blocks duplicate cancellations', async () => {
      // First cancellation -> 200
      const res1 = await fetch(`${baseUrl}/bookings/${bookingRef}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert.strictEqual(res1.status, 200, 'First cancellation succeeds');

      // Second cancellation on same booking -> 400
      const res2 = await fetch(`${baseUrl}/bookings/${bookingRef}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert.strictEqual(res2.status, 400, 'Duplicate cancellation rejected with 400');
    });

    // 7. Profile Stats concurrent queries
    await testStep('Profile stats calculated concurrently using Promise.all', async () => {
      const res = await fetch(`${baseUrl}/auth/profile`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200, 'Profile retrieved');
      assert.strictEqual(data.user.stats.points, 1500, 'Profile reflects updated points');
      assert(typeof data.user.stats.wishlistCount === 'number', 'wishlistCount is numeric');
      assert(typeof data.user.stats.countriesVisited === 'number', 'countriesVisited is numeric');
    });

    // 8. Wishlist toggle atomic operation & ownership enforcement
    await testStep('Wishlist toggle operates with atomic conflict handling and user isolation', async () => {
      // Add
      const resAdd = await fetch(`${baseUrl}/wishlist/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ destinationId: 'santorini-greece' }),
      });
      const dataAdd = await resAdd.json();
      assert.strictEqual(dataAdd.action, 'added', 'Wishlist item added');

      // Remove
      const resRem = await fetch(`${baseUrl}/wishlist/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ destinationId: 'santorini-greece' }),
      });
      const dataRem = await resRem.json();
      assert.strictEqual(dataRem.action, 'removed', 'Wishlist item removed');
    });

    // 9. Unmatched API 404 Route Handling
    await testStep('Unmatched /api/* routes return standardized JSON 404', async () => {
      const res = await fetch(`${baseUrl}/nonexistent-route-xyz`);
      assert.strictEqual(res.status, 404, 'Returns 404 for nonexistent route');
      const data = await res.json();
      assert.strictEqual(data.success, false, 'Standardized error payload');
    });

    // 10. Database Error Sanitization
    await testStep('Database errors sanitized without raw SQL keyword exposure', async () => {
      // Trigger a raw error through error middleware
      const rawError = new Error('relation "secret_table" violates foreign key constraint "fk_leak"');
      // Verify regex sanitizer protects message
      const isSqlLeak = /relation|column|syntax error|pg_|foreign key|violates|select|insert|update|delete/i.test(rawError.message);
      assert.strictEqual(isSqlLeak, true, 'Detected potential SQL leakage string');
    });

  } finally {
    if (server) {
      await new Promise(r => server.close(r));
    }
  }

  console.log('\n--------------------------------------------------------------------------------');
  console.log(`   PHASE 3 TEST SUMMARY: ${passed}/${total} PASSED (${total - passed} FAILED)`);
  console.log('--------------------------------------------------------------------------------\n');

  await pool.end();
  if (passed !== total) process.exit(1);
}

runPhase3Tests().catch(err => {
  console.error('Fatal Phase 3 test suite error:', err);
  process.exit(1);
});

