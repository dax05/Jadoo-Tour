const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log('================================================================================');
console.log('   🧪 COMPREHENSIVE DOM MODAL CLICK & CLOSE INTERACTION SUITE');
console.log('================================================================================\n');

const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scriptContent = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

// Construct mock browser environment
const dom = new JSDOM(htmlContent, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'http://localhost:3000/index.html',
});

const { window } = dom;
const { document } = window;

// Provide browser globals
window.requestAnimationFrame = window.requestAnimationFrame || function(cb) { return setTimeout(cb, 0); };
window.cancelAnimationFrame = window.cancelAnimationFrame || function(id) { clearTimeout(id); };

window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {},
    addEventListener: function() {},
    removeEventListener: function() {},
    dispatchEvent: function() { return true; },
  };
};

window.L = {
  map: () => ({
    setView: () => ({ on: () => {} }),
    fitBounds: () => {},
  }),
  tileLayer: () => ({ addTo: () => {} }),
  marker: () => ({
    addTo: () => ({ bindPopup: () => {} }),
    bindPopup: () => {},
  }),
  featureGroup: () => ({
    getBounds: () => ({ pad: () => {} }),
  }),
  divIcon: () => ({}),
};

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName, details = '') {
  const num = String(testsPassed + testsFailed + 1).padStart(2, '0');
  if (condition) {
    console.log(`  ✅ [T-${num}] PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ❌ [T-${num}] FAIL: ${testName} - ${details}`);
    testsFailed++;
  }
}

try {
  // Execute application bundle
  window.eval(scriptContent);

  // Dispatch DOMContentLoaded
  document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true, cancelable: true }));

  const destDetailsModal = document.getElementById('dest-details-modal');
  const authRequiredModal = document.getElementById('auth-required-modal');
  const destDetailsCloseBtn = destDetailsModal?.querySelector('.modal-close-btn');
  const destDetailsBackdrop = destDetailsModal?.querySelector('.jadoo-modal-backdrop');
  const authCloseBtn = authRequiredModal?.querySelector('.auth-required-close');
  const authCancelBtn = authRequiredModal?.querySelector('.auth-required-cancel');
  const modalBookCta = document.getElementById('modal-book-cta');

  console.log('\n--- PHASE 1: INITIAL STATE & ELEMENT QUERY ---');
  assert(destDetailsModal !== null, 'Destination Details Modal element exists in DOM');
  assert(authRequiredModal !== null, 'Auth Required Modal element exists in DOM');
  assert(destDetailsCloseBtn !== null, 'Destination Details Close button exists in DOM');
  assert(authCloseBtn !== null, 'Auth Required Close button exists in DOM');
  assert(authCancelBtn !== null, 'Auth Required Cancel button exists in DOM');
  assert(destDetailsModal.style.display === 'none', 'Details Modal is initially hidden (display: none)');
  assert(authRequiredModal.style.display === 'none', 'Auth Modal is initially hidden (display: none)');
  assert(!document.body.style.overflow, 'Body scroll is initially unlocked');

  console.log('\n--- PHASE 2: DESTINATION DETAILS MODAL INTERACTIONS ---');
  // 1. Click Rome Card
  const romeCard = document.querySelector('.destcards[data-dest-id="static-rome"]');
  assert(romeCard !== null, 'Rome destination card exists in DOM');
  romeCard.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(destDetailsModal.style.display === 'flex', 'Details Modal opens on Destination Card click (display: flex)');
  assert(document.getElementById('modal-dest-title').textContent.includes('Rome'), 'Details modal displays correct destination title "Rome, Italy"');
  assert(document.body.style.overflow === 'hidden', 'Body scroll locked on Details Modal open');

  // 2. Click Close Button
  destDetailsCloseBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(destDetailsModal.style.display === 'none', 'Details Modal closes when clicking close button [data-close-modal]');
  assert(!document.body.style.overflow, 'Body scroll unlocked after closing Details Modal');

  // 3. Open again and close via Backdrop click
  romeCard.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(destDetailsModal.style.display === 'flex', 'Details Modal re-opens on card click');
  destDetailsBackdrop.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(destDetailsModal.style.display === 'none', 'Details Modal closes on backdrop click');
  assert(!document.body.style.overflow, 'Body scroll unlocked after backdrop close');

  // 4. Open London card and close via Escape key
  const londonCard = document.querySelector('.destcards[data-dest-id="static-london"]');
  londonCard.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(destDetailsModal.style.display === 'flex', 'Details Modal opens for London card');
  assert(document.getElementById('modal-dest-title').textContent.includes('London'), 'Details modal displays "London, UK"');
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(destDetailsModal.style.display === 'none', 'Details Modal closes on Escape key press');
  assert(!document.body.style.overflow, 'Body scroll unlocked after Escape key press');

  console.log('\n--- PHASE 3: AUTH REQUIRED MODAL & NESTED INTERACTIONS ---');
  // 5. Open details modal, then click "Book This Destination" while unauthenticated
  romeCard.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(destDetailsModal.style.display === 'flex', 'Details modal opened before booking attempt');
  modalBookCta.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(authRequiredModal.style.display === 'flex', 'Auth Required Modal opens on "Book This Destination" click');
  assert(document.getElementById('auth-modal-title').textContent === 'Traveler Login Required', 'Auth modal displays "Traveler Login Required" title');

  // 6. Click Auth Modal Close Cross Button (X)
  authCloseBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(authRequiredModal.style.display === 'none', 'Auth Required Modal closes on close button (X) click');

  // 7. Re-trigger Auth Modal via Book CTA and close via Cancel button
  modalBookCta.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(authRequiredModal.style.display === 'flex', 'Auth Required Modal re-opens');
  authCancelBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(authRequiredModal.style.display === 'none', 'Auth Required Modal closes on "Cancel and return to browsing" click');

  // 8. Re-trigger Auth Modal and close via Backdrop click
  modalBookCta.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(authRequiredModal.style.display === 'flex', 'Auth Required Modal re-opens for backdrop test');
  authRequiredModal.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(authRequiredModal.style.display === 'none', 'Auth Required Modal closes on outer backdrop overlay click');

  // 9. Re-trigger Auth Modal and close via Escape key
  modalBookCta.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(authRequiredModal.style.display === 'flex', 'Auth Required Modal re-opens for Escape key test');
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(authRequiredModal.style.display === 'none', 'Auth Required Modal closes on Escape key');

  // 10. Verify that underlying Details Modal can still be closed after Auth Modal dismissal
  assert(destDetailsModal.style.display === 'flex', 'Destination Details Modal remained active behind Auth Modal');
  destDetailsCloseBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(destDetailsModal.style.display === 'none', 'Destination Details Modal closes successfully after Auth Modal dismissal');
  assert(!document.body.style.overflow, 'Body scroll fully unlocked after all modals dismissed');

  console.log('\n--- PHASE 4: AUTHENTICATED BOOKING MODAL CLOSE INTERACTIONS ---');
  // Mock logged in session in localStorage
  const mockUser = { id: 'test-user-1', name: 'Verified Traveler', email: 'traveler@jadoo.test' };
  window.localStorage.setItem('jadoo_user', JSON.stringify(mockUser));
  window.dispatchEvent(new window.StorageEvent('storage', { key: 'jadoo_user', newValue: JSON.stringify(mockUser) }));

  const destBookingModal = document.getElementById('dest-booking-modal');
  const destBookingCloseBtn = destBookingModal?.querySelector('.modal-close-btn');
  const destBookingBackdrop = destBookingModal?.querySelector('.jadoo-modal-backdrop');

  // Trigger booking directly via card Book button or CTA
  const romeBookBtn = document.querySelector('.dest-book-btn[data-dest-id="static-rome"]');
  romeBookBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(destBookingModal.style.display === 'flex', 'Booking Modal opens when authenticated user clicks "Book This Trip"');
  assert(document.body.style.overflow === 'hidden', 'Body scroll locked on Booking Modal open');

  // Close Booking Modal via close button
  destBookingCloseBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(destBookingModal.style.display === 'none', 'Booking Modal closes when clicking its close button');
  assert(!document.body.style.overflow, 'Body scroll unlocked after Booking Modal close');

  // Open again and close via backdrop
  romeBookBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(destBookingModal.style.display === 'flex', 'Booking Modal re-opens for backdrop test');
  destBookingBackdrop.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(destBookingModal.style.display === 'none', 'Booking Modal closes on backdrop click');
  assert(!document.body.style.overflow, 'Body scroll unlocked after Booking Modal backdrop close');

  // Open again and close via Escape key
  romeBookBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(destBookingModal.style.display === 'flex', 'Booking Modal re-opens for Escape key test');
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(destBookingModal.style.display === 'none', 'Booking Modal closes on Escape key press');
  assert(!document.body.style.overflow, 'Body scroll unlocked after Booking Modal Escape close');

  console.log('\n================================================================================');
  console.log(`   TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('================================================================================\n');

  process.exit(testsFailed > 0 ? 1 : 0);
} catch (err) {
  console.error('Fatal execution error during test:', err);
  process.exit(1);
}
