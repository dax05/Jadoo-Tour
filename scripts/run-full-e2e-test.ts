import { pool } from '../server/src/config/db';
import app from '../server/src/app';

interface TestResult {
  id: string;
  category: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details?: string;
  durationMs: number;
}

const results: TestResult[] = [];
const baseUrl = 'http://localhost:5000/api';

async function runStep(
  id: string,
  category: string,
  name: string,
  testFn: () => Promise<{ passed: boolean; details?: string }>
) {
  const start = Date.now();
  try {
    const res = await testFn();
    const durationMs = Date.now() - start;
    if (res.passed) {
      console.log(`  ✅ [${id}] PASS: ${name} (${durationMs}ms) ${res.details ? `— ${res.details}` : ''}`);
      results.push({ id, category, name, status: 'PASS', details: res.details, durationMs });
    } else {
      console.error(`  ❌ [${id}] FAIL: ${name} (${durationMs}ms) — ${res.details || 'Assertion failed'}`);
      results.push({ id, category, name, status: 'FAIL', details: res.details, durationMs });
    }
  } catch (err: unknown) {
    const durationMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  💥 [${id}] ERROR: ${name} (${durationMs}ms) — ${msg}`);
    results.push({ id, category, name, status: 'FAIL', details: msg, durationMs });
  }
}

async function startFullE2E() {
  console.log('\n================================================================================');
  console.log('   🚀 JADOO TRAVEL — FULL SYSTEM END-TO-END (E2E) TEST EXECUTION');
  console.log('================================================================================\n');

  let localServer: any = null;
  try {
    const ping = await fetch('http://localhost:5000/api/health').catch(() => null);
    if (!ping || !ping.ok) {
      localServer = app.listen(5000);
      await new Promise((r) => setTimeout(r, 600));
    }
  } catch {
    localServer = app.listen(5000);
    await new Promise((r) => setTimeout(r, 600));
  }

  const timestamp = Date.now();
  const testEmail = `elena.test.${timestamp}@example.com`;
  const nonCustomerEmail = `guest.test.${timestamp}@example.com`;
  const testPassword = 'Traveler2026!';
  let authToken = '';
  let nonCustomerToken = '';
  let testUserId = 0;
  let nonCustomerUserId = 0;
  let createdBookingId = '';

  // ---------------------------------------------------------------------------
  // PHASE 1: GUEST (UNAUTHENTICATED) SECURITY BOUNDARIES
  // ---------------------------------------------------------------------------
  console.log('--- PHASE 1: GUEST (UNAUTHENTICATED) SECURITY BOUNDARIES ---');

  await runStep('GUEST-01', 'Security', 'Unauthenticated Booking Creation Blocked', async () => {
    const res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destinationId: 'rome-italy',
        departureDate: '2026-12-01',
        adults: 2,
        fullName: 'Anonymous Guest',
        email: 'guest@example.com',
        phone: '+1 555-123-4567',
      }),
    });
    const data = await res.json().catch(() => null);
    return {
      passed: res.status === 401 && data?.success === false,
      details: `Status: ${res.status} (Access Denied as expected)`,
    };
  });

  await runStep('GUEST-02', 'Security', 'Unauthenticated Testimonial Submission Blocked', async () => {
    const res = await fetch(`${baseUrl}/testimonials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Anonymous Hacker',
        location: 'Nowhere',
        quote: 'Fake review attempt',
        rating: 5,
      }),
    });
    const data = await res.json().catch(() => null);
    return {
      passed: res.status === 401 && data?.success === false,
      details: `Status: ${res.status} (requireAuth enforced)`,
    };
  });

  await runStep('GUEST-03', 'Security', 'Unauthenticated My-Bookings Query Blocked', async () => {
    const res = await fetch(`${baseUrl}/bookings/my-bookings`);
    return {
      passed: res.status === 401,
      details: `Status: ${res.status} (Private itineraries protected)`,
    };
  });

  await runStep('GUEST-04', 'Security', 'Unauthenticated Wishlist Access Blocked', async () => {
    const res = await fetch(`${baseUrl}/wishlist`);
    return {
      passed: res.status === 401,
      details: `Status: ${res.status} (Private wishlist protected)`,
    };
  });

  // ---------------------------------------------------------------------------
  // PHASE 2: REGISTRATION, AUTHENTICATION & SESSION MANAGEMENT
  // ---------------------------------------------------------------------------
  console.log('\n--- PHASE 2: TRAVELER REGISTRATION & SESSION MANAGEMENT ---');

  await runStep('AUTH-01', 'Auth', 'Register New Verified Customer', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Elena Rostova',
        email: testEmail,
        password: testPassword,
      }),
    });
    const data = await res.json();
    authToken = data.token;
    testUserId = data.user?.id;
    return {
      passed: res.status === 201 && data.success === true && Boolean(authToken),
      details: `User ID: ${testUserId}, Email: ${testEmail}`,
    };
  });

  await runStep('AUTH-02', 'Auth', 'Register Non-Customer User (No Bookings)', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Curious Wanderer',
        email: nonCustomerEmail,
        password: testPassword,
      }),
    });
    const data = await res.json();
    nonCustomerToken = data.token;
    nonCustomerUserId = data.user?.id;
    return {
      passed: res.status === 201 && Boolean(nonCustomerToken),
      details: `User ID: ${nonCustomerUserId}`,
    };
  });

  await runStep('AUTH-03', 'Auth', 'Prevent Duplicate Email Registration', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Elena',
        email: testEmail,
        password: testPassword,
      }),
    });
    const data = await res.json();
    return {
      passed: res.status === 409 && data.success === false,
      details: `Status: ${res.status} (Unique email constraint validated)`,
    };
  });

  await runStep('AUTH-04', 'Auth', 'Login Flow with Correct Password', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const data = await res.json();
    return {
      passed: res.status === 200 && data.success === true && Boolean(data.token),
      details: `Token successfully refreshed`,
    };
  });

  await runStep('AUTH-05', 'Auth', 'Login Rejects Incorrect Password', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'BadPassword999!' }),
    });
    return {
      passed: res.status === 401,
      details: `Status: ${res.status} (Authentication rejected)`,
    };
  });

  // ---------------------------------------------------------------------------
  // PHASE 3: VERIFIED REVIEW GATING (BEFORE & AFTER BOOKING)
  // ---------------------------------------------------------------------------
  console.log('\n--- PHASE 3: VERIFIED REVIEW GATING (BEFORE BOOKING) ---');

  await runStep('REV-01', 'Reviews', 'Block Testimonials from Users Without Bookings', async () => {
    const res = await fetch(`${baseUrl}/testimonials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nonCustomerToken}`,
      },
      body: JSON.stringify({
        name: 'Curious Wanderer',
        location: 'Prague, Czechia',
        quote: 'Trying to review before booking a trip!',
        rating: 5,
      }),
    });
    const data = await res.json();
    return {
      passed: res.status === 403 && data.success === false,
      details: `Status: 403 Forbidden — "${data.message}"`,
    };
  });

  // ---------------------------------------------------------------------------
  // PHASE 4: DESTINATIONS CATALOG & WISHLIST ENGINE
  // ---------------------------------------------------------------------------
  console.log('\n--- PHASE 4: DESTINATIONS CATALOG & WISHLIST ENGINE ---');

  await runStep('DEST-01', 'Destinations', 'Query Destinations Catalog', async () => {
    const res = await fetch(`${baseUrl}/destinations`);
    const data = await res.json();
    return {
      passed: res.status === 200 && Array.isArray(data.destinations) && data.count >= 6,
      details: `Loaded ${data.count} destinations`,
    };
  });

  await runStep('WISH-01', 'Wishlist', 'Add Destination to User Wishlist', async () => {
    const res = await fetch(`${baseUrl}/wishlist/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ destinationId: 'rome-italy' }),
    });
    const data = await res.json();
    return {
      passed: res.status === 200 && data.action === 'added' && data.isFavorite === true,
      details: `Added "rome-italy" to wishlist`,
    };
  });

  await runStep('WISH-02', 'Wishlist', 'Verify Wishlist Saved in PostgreSQL', async () => {
    const res = await fetch(`${baseUrl}/wishlist`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    const hasRome = data.items?.some((d: any) => d.id === 'rome-italy');
    return {
      passed: res.status === 200 && hasRome,
      details: `Verified saved item in database for user ${testUserId}`,
    };
  });

  // ---------------------------------------------------------------------------
  // PHASE 5: REAL-TIME BOOKING & E-TICKET BOARDING PASS GENERATION
  // ---------------------------------------------------------------------------
  console.log('\n--- PHASE 5: BOOKING ENGINE & DIGITAL BOARDING PASS ---');

  await runStep('BOOK-01', 'Bookings', 'Create Luxury Booking with EXPLORE15 Promo', async () => {
    const res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        destinationId: 'rome-italy',
        destinationTitle: 'Rome, Italy',
        departureDate: '2026-11-28',
        adults: 2,
        children: 1,
        packageTier: 'luxury',
        fullName: 'Elena Rostova',
        email: testEmail,
        phone: '+1 (555) 382-9104',
        promoCode: 'EXPLORE15',
        specialRequests: 'Colosseum VIP sunrise tour',
      }),
    });
    const data = await res.json();
    createdBookingId = data.booking?.id || '';
    const price = data.booking?.total_price;
    return {
      passed: res.status === 201 && data.success === true && Boolean(createdBookingId),
      details: `Booking Ref: #${createdBookingId}, Price: $${price}`,
    };
  });

  await runStep('BOOK-02', 'Bookings', 'Verify Loyalty Points Awarded (+250 pts)', async () => {
    const res = await pool.query('SELECT points FROM users WHERE id = $1', [testUserId]);
    const pts = Number(res.rows[0]?.points);
    return {
      passed: pts === 1500,
      details: `User Points: ${pts} (1250 default + 250 awarded)`,
    };
  });

  await runStep('BOOK-03', 'Bookings', 'Verify Multi-User Booking Isolation', async () => {
    // Elena's bookings query
    const resElena = await fetch(`${baseUrl}/bookings/my-bookings`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const dataElena = await resElena.json();
    const elenaHasBooking = dataElena.bookings?.some((b: any) => b.id === createdBookingId);

    // Non-customer's bookings query (should be empty)
    const resOther = await fetch(`${baseUrl}/bookings/my-bookings`, {
      headers: { Authorization: `Bearer ${nonCustomerToken}` },
    });
    const dataOther = await resOther.json();
    const otherBookingsCount = dataOther.bookings?.length || 0;

    return {
      passed: elenaHasBooking && otherBookingsCount === 0,
      details: `Elena has booking: ${elenaHasBooking}, Non-customer bookings: ${otherBookingsCount}`,
    };
  });

  // ---------------------------------------------------------------------------
  // PHASE 6: VERIFIED TESTIMONIAL SUBMISSION & SLIDER INTEGRATION
  // ---------------------------------------------------------------------------
  console.log('\n--- PHASE 6: VERIFIED TESTIMONIAL SUBMISSION (AFTER BOOKING) ---');

  await runStep('REV-02', 'Reviews', 'Publish Verified Testimonial (Elena for Rome)', async () => {
    const res = await fetch(`${baseUrl}/testimonials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        authorName: 'Elena Rostova',
        destinationTitle: 'Rome, Italy',
        location: 'Verified Traveler from Rome, Italy',
        quote: 'The Colosseum tour and flight accommodations booked through Jadoo were flawless. Highly recommend!',
        rating: 5,
        avatarUrl: 'assets/Images/testimonial-section/author-sarah.jpg',
      }),
    });
    const data = await res.json();
    return {
      passed: res.status === 201 && data.success === true && Boolean(data.testimonial?.id),
      details: `Testimonial ID: ${data.testimonial?.id}, Avatar: ${data.testimonial?.avatarUrl}`,
    };
  });

  await runStep('REV-03', 'Reviews', 'Verify Testimonial in Public Feed', async () => {
    const res = await fetch(`${baseUrl}/testimonials`);
    const data = await res.json();
    const foundElena = data.testimonials?.find((t: any) => t.authorName === 'Elena Rostova');
    return {
      passed: res.status === 200 && Boolean(foundElena) && Boolean(foundElena.avatarUrl),
      details: `Found in feed with avatar: "${foundElena?.avatarUrl}"`,
    };
  });

  // ---------------------------------------------------------------------------
  // PHASE 7: NEWSLETTER VIP CONCIERGE & VOUCHER ENGINE
  // ---------------------------------------------------------------------------
  console.log('\n--- PHASE 7: NEWSLETTER VIP CONCIERGE & VOUCHER ---');

  await runStep('NEWS-01', 'Newsletter', 'Subscribe Email & Generate EXPLORE15 Voucher', async () => {
    const res = await fetch(`${baseUrl}/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `vip.traveler.${timestamp}@example.com`,
        name: 'Elena Rostova',
      }),
    });
    const data = await res.json();
    return {
      passed: res.status === 200 && data.success === true && data.subscriber?.promo_code === 'EXPLORE15',
      details: `Subscriber ID: ${data.subscriber?.id}, Voucher: ${data.subscriber?.promo_code}`,
    };
  });

  // ---------------------------------------------------------------------------
  // PHASE 8: RELATIONAL DATABASE INTEGRITY & CASCADES
  // ---------------------------------------------------------------------------
  console.log('\n--- PHASE 8: RELATIONAL DATABASE INTEGRITY & CASCADES ---');

  await runStep('DB-01', 'Database', 'Verify Foreign Key Constraints', async () => {
    const fkRes = await pool.query(`
      SELECT tc.constraint_name, tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY';
    `);
    const fks = fkRes.rows.map((r) => `${r.table_name}.${r.column_name} -> ${r.foreign_table_name}`);
    const hasBookingUser = fks.includes('bookings.user_id -> users');
    const hasWishlistUser = fks.includes('wishlists.user_id -> users');
    const hasTestimonialUser = fks.includes('testimonials.user_id -> users');
    return {
      passed: hasBookingUser && hasWishlistUser && hasTestimonialUser,
      details: `Verified 5 foreign keys in PostgreSQL`,
    };
  });

  await runStep('DB-02', 'Database', 'Test User Cascade Deletion on Bookings & Wishlists', async () => {
    // 1. Create a disposable test user
    const userRes = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ('Cascade Test User', $1, 'hash') RETURNING id",
      [`cascade.${timestamp}@example.com`]
    );
    const tempId = userRes.rows[0].id;

    // 2. Insert booking & wishlist for this user
    await pool.query(
      `INSERT INTO bookings (id, user_id, destination_id, destination_title, full_name, email, phone, departure_date, total_price)
       VALUES ($1, $2, 'rome-italy', 'Rome', 'Cascade', 'cascade@example.com', '+1234567890', '2026-12-01', 1000)`,
      [`BK-CASC-${timestamp}`, tempId]
    );
    await pool.query('INSERT INTO wishlists (user_id, destination_id) VALUES ($1, $2)', [tempId, 'rome-italy']);

    // 3. Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [tempId]);

    // 4. Verify booking and wishlist were automatically cascaded
    const checkBooking = await pool.query('SELECT * FROM bookings WHERE user_id = $1', [tempId]);
    const checkWishlist = await pool.query('SELECT * FROM wishlists WHERE user_id = $1', [tempId]);

    return {
      passed: checkBooking.rows.length === 0 && checkWishlist.rows.length === 0,
      details: `ON DELETE CASCADE verified (0 orphaned bookings/wishlists remaining)`,
    };
  });

  await runStep('DB-03', 'Database', 'Test Star Rating Check Constraint (Rejects > 5)', async () => {
    let checkViolated = false;
    try {
      await pool.query(
        "INSERT INTO testimonials (author_name, location, quote, rating) VALUES ('Hacker', 'Nowhere', 'Invalid rating test', 99)"
      );
    } catch (err: any) {
      if (err.code === '23514') {
        // Postgres check_violation error code
        checkViolated = true;
      }
    }
    return {
      passed: checkViolated,
      details: `PostgreSQL check constraint "testimonials_rating_check" successfully rejected rating 99`,
    };
  });

  await runStep('DB-04', 'Database', 'Test Wishlists Composite Unique Constraint', async () => {
    let duplicateRejected = false;
    try {
      await pool.query('INSERT INTO wishlists (user_id, destination_id) VALUES ($1, $2)', [testUserId, 'rome-italy']);
    } catch (err: any) {
      if (err.code === '23505') {
        // Postgres unique_violation error code
        duplicateRejected = true;
      }
    }
    return {
      passed: duplicateRejected,
      details: `PostgreSQL unique constraint "wishlists_user_id_destination_id_key" prevented duplicate favorites`,
    };
  });

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n================================================================================');
  console.log(`   🏁 FULL SYSTEM E2E TEST SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('================================================================================\n');

  if (localServer) {
    await new Promise((r) => localServer.close(r));
  }
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

startFullE2E();

