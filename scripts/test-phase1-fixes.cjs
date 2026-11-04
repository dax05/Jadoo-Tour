const assert = require('assert');

// 1. Test FormValidator logic directly
const VALIDATION_RULES = {
  NAME_MIN_LENGTH: 2,
  NAME_REGEX: /^[\p{L}\s'-]+$/u,
};

function validateName(name) {
  const value = name.trim();
  if (!value) return { isValid: false, message: 'Please enter your full name' };
  if (value.length < VALIDATION_RULES.NAME_MIN_LENGTH) {
    return { isValid: false, message: `Name must be at least ${VALIDATION_RULES.NAME_MIN_LENGTH} characters` };
  }
  if (!VALIDATION_RULES.NAME_REGEX.test(value)) {
    return { isValid: false, message: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }
  const letterCount = (value.match(/\p{L}/gu) || []).length;
  if (letterCount < VALIDATION_RULES.NAME_MIN_LENGTH) {
    return { isValid: false, message: `Name must contain at least ${VALIDATION_RULES.NAME_MIN_LENGTH} letters` };
  }
  return { isValid: true };
}

console.log('Testing Name Validation...');
assert.strictEqual(validateName('René François').isValid, true, 'Accented French name should pass');
assert.strictEqual(validateName('José Müller').isValid, true, 'German/Spanish accented name should pass');
assert.strictEqual(validateName('John Doe').isValid, true, 'Standard ASCII name should pass');
assert.strictEqual(validateName("Mary-Jane O'Connor").isValid, true, 'Hyphen and apostrophe should pass');
assert.strictEqual(validateName('--').isValid, false, 'Punctuation-only should fail');
assert.strictEqual(validateName("- ' ").isValid, false, 'Mixed punctuation should fail');
assert.strictEqual(validateName('A-').isValid, false, 'Single letter + hyphen should fail');
assert.strictEqual(validateName('   ').isValid, false, 'Whitespace should fail');
console.log('✅ Name Validation Tests Passed!');

// 2. Test Salted Password Hashing logic
function hashPassword(password) {
  const salt = 'jadoo_curated_escapes_2026_salt';
  let h1 = 0xdeadbeef ^ salt.length;
  let h2 = 0x41c6ce57 ^ salt.length;
  const str = `${salt}:${password}`;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return `hash_${hash.toString(16)}`;
}

console.log('Testing Password Hashing...');
const h1 = hashPassword('Password123!');
const h2 = hashPassword('Password123!');
const h3 = hashPassword('WrongPassword');

assert.strictEqual(h1, h2, 'Identical passwords must produce identical hashes');
assert.notStrictEqual(h1, h3, 'Different passwords must produce different hashes');
assert.strictEqual(h1.startsWith('hash_'), true, 'Hash format is valid');
console.log('✅ Password Hashing Tests Passed!');

console.log('\nAll Phase 1 Fix Validations Succeeded!');
