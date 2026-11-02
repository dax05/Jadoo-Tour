const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const profileHtml = fs.readFileSync(path.join(__dirname, '..', 'profile.html'), 'utf8');
const authHtml = fs.readFileSync(path.join(__dirname, '..', 'auth.html'), 'utf8');

const requiredElements = [
  // index.html Navigation & Theme
  { file: 'index.html', selector: 'id="theme-toggle"', name: 'Theme Toggle Button' },
  { file: 'index.html', selector: 'id="nav-logout-btn"', name: 'Navbar Logout Button' },
  { file: 'index.html', selector: 'class="burger"', name: 'Mobile Hamburger Toggle' },
  { file: 'index.html', selector: 'href="auth.html?mode=login"', name: 'Navbar Login Link' },
  { file: 'index.html', selector: 'href="auth.html?mode=signup"', name: 'Navbar Signup Link' },
  { file: 'index.html', selector: 'id="nav-user-item"', name: 'Navbar Authenticated Profile Pill' },

  // index.html Destinations & Explorer
  { file: 'index.html', selector: 'class="dest-book-btn"', name: 'Card "Book This Trip" Button' },
  { file: 'index.html', selector: 'class="tripheart"', name: 'Trip to Greece Card Favorite Heart' },
  { file: 'index.html', selector: 'id="explore-dest-btn"', name: 'Explore Destinations Section Toggle' },
  { file: 'index.html', selector: 'id="dest-search-input"', name: 'Live Explorer Search Input' },
  { file: 'index.html', selector: 'id="dest-search-clear"', name: 'Explorer Search Clear Button' },
  { file: 'index.html', selector: 'id="dest-view-grid-btn"', name: 'Grid View Switcher Button' },
  { file: 'index.html', selector: 'id="dest-view-map-btn"', name: 'World Map View Switcher Button' },
  { file: 'index.html', selector: 'id="dest-map-fit-btn"', name: 'Map Fit All Pins Button' },

  // index.html Details & Booking Modals
  { file: 'index.html', selector: 'id="dest-details-modal"', name: 'Destination Details Modal Container' },
  { file: 'index.html', selector: 'id="modal-fav-toggle"', name: 'Details Modal Add to Wishlist Button' },
  { file: 'index.html', selector: 'id="modal-book-cta"', name: 'Details Modal "Book This Destination" CTA' },
  { file: 'index.html', selector: 'id="dest-booking-modal"', name: 'Booking Form Modal Container' },
  { file: 'index.html', selector: 'id="btn-back-details"', name: 'Booking Form Back to Details Button' },
  { file: 'index.html', selector: 'id="btn-adults-minus"', name: 'Adults Decrement Button' },
  { file: 'index.html', selector: 'id="btn-adults-plus"', name: 'Adults Increment Button' },
  { file: 'index.html', selector: 'id="btn-children-minus"', name: 'Children Decrement Button' },
  { file: 'index.html', selector: 'id="btn-children-plus"', name: 'Children Increment Button' },
  { file: 'index.html', selector: 'id="btn-apply-promo"', name: 'Apply Promo Code Button' },

  // index.html Testimonials Section & Modal
  { file: 'index.html', selector: 'id="btn-open-testimonial-modal"', name: '"Share Your Experience" Button' },
  { file: 'index.html', selector: 'id="testimonial-modal"', name: 'Testimonial Submission Modal Container' },
  { file: 'index.html', selector: '<select id="test-input-dest"', name: 'Booked Destination Select Dropdown' },
  { file: 'index.html', selector: 'id="test-star-picker"', name: 'Interactive Star Rating Picker' },
  { file: 'index.html', selector: 'class="test-avatar-choice', name: 'Traveler Avatar Choice Circles' },
  { file: 'index.html', selector: 'id="test-quote-counter"', name: 'Quote Character Counter' },
  { file: 'index.html', selector: 'class="test-form-footer"', name: 'Testimonial Sticky Form Footer' },

  // index.html Auth Required & Newsletter
  { file: 'index.html', selector: 'id="auth-required-modal"', name: 'Auth Required Middleware Modal' },
  { file: 'index.html', selector: 'id="newsletter-btn"', name: 'Newsletter Subscribe Button' },
  { file: 'index.html', selector: 'id="welcome-email-modal"', name: 'Welcome Email Preview Modal' },
  { file: 'index.html', selector: 'id="btn-copy-promo"', name: 'Copy VIP Promo Code Button' },
  { file: 'index.html', selector: 'id="btn-welcome-explore"', name: 'Welcome Email Explore CTA' },
  { file: 'index.html', selector: 'id="btn-toggle-email-api"', name: 'Email API Settings Toggle Button' },

  // auth.html Elements
  { file: 'auth.html', selector: 'id="tab-login"', name: 'Sign In Tab Button' },
  { file: 'auth.html', selector: 'id="tab-signup"', name: 'Create Account Tab Button' },
  { file: 'auth.html', selector: 'id="auth-inline-switch"', name: 'Inline Auth Mode Switcher' },
  { file: 'auth.html', selector: 'id="password-strength-container"', name: 'Password Strength Meter' },
  { file: 'auth.html', selector: 'id="auth-submit-btn"', name: 'Authentication Submit Button' },
  { file: 'auth.html', selector: 'id="auth-forgot-link"', name: 'Forgot Password Link' },

  // profile.html Elements
  { file: 'profile.html', selector: 'id="btn-change-avatar"', name: 'Change Avatar Button' },
  { file: 'profile.html', selector: 'id="avatar-picker-modal"', name: 'Avatar Picker Modal' },
  { file: 'profile.html', selector: 'id="boarding-pass-modal"', name: 'Digital Boarding Pass Modal' },
  { file: 'profile.html', selector: 'class="bp-header"', name: 'Boarding Pass Header' },
  { file: 'profile.html', selector: 'class="bp-flight-route"', name: 'Boarding Pass Route Row' },
  { file: 'profile.html', selector: 'class="bp-info-grid"', name: 'Boarding Pass Details Grid' },
  { file: 'profile.html', selector: 'class="bp-barcode-lines"', name: 'Boarding Pass Barcode Lines' },
  { file: 'profile.html', selector: 'id="bp-print-btn"', name: 'Print / Save E-Ticket Button' },
];

console.log('================================================================================');
console.log('   🔍 DOM BUTTONS & INTERACTIVE ELEMENTS VERIFICATION');
console.log('================================================================================\n');

let passed = 0;
let failed = 0;

requiredElements.forEach((item, index) => {
  const content = item.file === 'index.html' ? indexHtml : item.file === 'profile.html' ? profileHtml : authHtml;
  const exists = content.includes(item.selector);
  const num = String(index + 1).padStart(2, '0');

  if (exists) {
    console.log(`  ✅ [BTN-${num}] PASS: ${item.file} → ${item.name}`);
    passed++;
  } else {
    console.error(`  ❌ [BTN-${num}] FAIL: ${item.file} → ${item.name} (Missing: "${item.selector}")`);
    failed++;
  }
});

console.log('\n--------------------------------------------------------------------------------');
console.log(`   DOM VERIFICATION SUMMARY: ${passed}/${requiredElements.length} PASSED (${failed} FAILED)`);
console.log('--------------------------------------------------------------------------------\n');

process.exit(failed > 0 ? 1 : 0);
