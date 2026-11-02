import { pool } from '../src/config/db';

async function runComprehensiveTests() {
  const baseUrl = 'http://localhost:5000/api';
  console.log('\n==================================================================');
  console.log('   🚀 JADOO TRAVEL — FULL SYSTEM INTEGRATION TEST SUITE');
  console.log('==================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, extra = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName} ${extra}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${extra}`);
      failed++;
    }
  }

  // 1. Health & Database Check
  try {
    const healthRes = await fetch(`${baseUrl}/health`);
    const health = await healthRes.json();
    assert(healthRes.status === 200 && health.databaseConnected === true, 'Server & PostgreSQL Database Online');
  } catch (e) {
    assert(false, 'Server & PostgreSQL Database Online', String(e));
  }

  // 2. Tables Existence Check
  try {
    const tablesRes = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('users', 'destinations', 'bookings', 'wishlists', 'testimonials', 'subscribers')
    `);
    const foundTables = tablesRes.rows.map(r => r.table_name);
    assert(foundTables.length === 6, 'Database Tables Verified (6/6 found)', `[${foundTables.join(', ')}]`);
  } catch (e) {
    assert(false, 'Database Tables Verified', String(e));
  }

  // 3. User Registration & Authentication
  const timestamp = Date.now();
  const testEmail = `explorer.${timestamp}@example.com`;
  const testPassword = 'Password123!';
  let authToken = '';
  let testUserId = 0;

  try {
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alexander Sterling', email: testEmail, password: testPassword })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.success === true && Boolean(regData.token), 'User Registration & JWT Minting', `Email: ${testEmail}`);
    authToken = regData.token;
    testUserId = regData.user?.id;
  } catch (e) {
    assert(false, 'User Registration & JWT Minting', String(e));
  }

  // 4. User Login & Wrong Password Rejection
  try {
    // Correct login
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.success === true, 'User Login with Correct Password');

    // Wrong password test
    const badLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword999!' })
    });
    const badData = await badLoginRes.json();
    assert(badLoginRes.status === 401 && badData.success === false, 'Security: Rejects Invalid Password Attempt');
  } catch (e) {
    assert(false, 'User Login & Rejection Flow', String(e));
  }

  // 5. Authenticated Profile Query
  try {
    const profRes = await fetch(`${baseUrl}/auth/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const profData = await profRes.json();
    assert(profRes.status === 200 && profData.user?.email === testEmail, 'Authenticated User Profile Retrieval');
  } catch (e) {
    assert(false, 'Authenticated User Profile Retrieval', String(e));
  }

  // 6. Destinations Catalog & Details
  try {
    const destListRes = await fetch(`${baseUrl}/destinations`);
    const destListData = await destListRes.json();
    assert(destListRes.status === 200 && Array.isArray(destListData.destinations) && destListData.count >= 6, 'Destinations Catalog Query', `Count: ${destListData.count}`);

    const destDetailRes = await fetch(`${baseUrl}/destinations/rome-italy`);
    const destDetail = await destDetailRes.json();
    assert(destDetailRes.status === 200 && destDetail.destination?.title === 'Rome, Italy', 'Single Destination Query by ID');
  } catch (e) {
    assert(false, 'Destinations Catalog & Details Flow', String(e));
  }

  // 7. Wishlist Operations (Add, List, Remove)
  try {
    // Add to wishlist
    const addWishRes = await fetch(`${baseUrl}/wishlist/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ destinationId: 'santorini-greece' })
    });
    const addWishData = await addWishRes.json();
    assert(addWishRes.status === 200 && addWishData.action === 'added' && addWishData.isFavorite === true, 'Wishlist Toggle (Add Favorite)');

    // Verify list contains it
    const listWishRes = await fetch(`${baseUrl}/wishlist`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const listWishData = await listWishRes.json();
    const hasSantorini = listWishData.items?.some((i: any) => i.id === 'santorini-greece');
    assert(listWishRes.status === 200 && hasSantorini, 'Wishlist Query (Verified Item In Saved List)');

    // Toggle again to remove
    const removeWishRes = await fetch(`${baseUrl}/wishlist/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ destinationId: 'santorini-greece' })
    });
    const removeWishData = await removeWishRes.json();
    assert(removeWishRes.status === 200 && removeWishData.action === 'removed' && removeWishData.isFavorite === false, 'Wishlist Toggle (Remove Favorite)');
  } catch (e) {
    assert(false, 'Wishlist Operations Flow', String(e));
  }

  // 8. Booking Reservation & Promo Calculation
  let createdBookingId = '';
  try {
    const bookRes = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        destinationId: 'rome-italy',
        departureDate: '2026-11-20',
        adults: 2,
        children: 1,
        packageTier: 'luxury',
        fullName: 'Alexander Sterling',
        email: testEmail,
        phone: '+1 555-839-2019',
        promoCode: 'EXPLORE15',
        specialRequests: 'Ocean view suite requested'
      })
    });
    const bookData = await bookRes.json();
    createdBookingId = bookData.booking?.id || '';
    assert(bookRes.status === 201 && bookData.success === true && Boolean(createdBookingId), 'Trip Booking Creation (Luxury + Promo EXPLORE15)', `Ref: ${createdBookingId}`);

    // Verify loyalty points incremented (+250)
    const pointsRes = await pool.query('SELECT points FROM users WHERE id = $1', [testUserId]);
    assert(Number(pointsRes.rows[0]?.points) === 1500, 'Loyalty Points Accrual (+250 points awarded)', `Points: ${pointsRes.rows[0]?.points}`);

    // Fetch user bookings
    const myBookingsRes = await fetch(`${baseUrl}/bookings/my-bookings`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const myBookings = await myBookingsRes.json();
    const foundBooking = myBookings.bookings?.find((b: any) => b.id === createdBookingId);
    assert(myBookingsRes.status === 200 && Boolean(foundBooking), 'Traveler My-Bookings Query', `Found Ref: ${createdBookingId}`);

    // Cancel booking
    const cancelRes = await fetch(`${baseUrl}/bookings/${createdBookingId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const cancelData = await cancelRes.json();
    assert(cancelRes.status === 200 && cancelData.booking?.status === 'cancelled', 'Booking Cancellation Flow');
  } catch (e) {
    assert(false, 'Booking Flow', String(e));
  }

  // 9. Community Testimonials & Review Submission
  try {
    const revRes = await fetch(`${baseUrl}/testimonials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        name: 'Alexander Sterling',
        role: 'Architectural Traveler',
        location: 'Oxford, England',
        quote: 'An unforgettable voyage through the historic landmarks and romantic architecture of Europe.',
        rating: 5
      })
    });
    const revData = await revRes.json();
    assert(revRes.status === 201 && revData.success === true, 'Community Testimonial Submission');

    const feedRes = await fetch(`${baseUrl}/testimonials`);
    const feedData = await feedRes.json();
    const hasAlexander = feedData.testimonials?.some((t: any) => t.authorName === 'Alexander Sterling');
    assert(feedRes.status === 200 && hasAlexander, 'Community Testimonial Feed Integration');
  } catch (e) {
    assert(false, 'Testimonials Flow', String(e));
  }

  // 10. Newsletter Subscription
  try {
    const newsRes = await fetch(`${baseUrl}/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `vip.${timestamp}@example.com`,
        name: 'Alexander Sterling'
      })
    });
    const newsData = await newsRes.json();
    assert(newsRes.status === 200 && newsData.success === true && newsData.subscriber?.promo_code === 'EXPLORE15', 'Newsletter VIP Registration & Voucher Generation');
  } catch (e) {
    assert(false, 'Newsletter Flow', String(e));
  }

  console.log('\n------------------------------------------------------------------');
  console.log(`   TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('------------------------------------------------------------------\n');

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

runComprehensiveTests();
