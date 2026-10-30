/**
 * Centralized Form & Input Validation Utilities
 * Provides strict validation and live formatting for phones, emails, dates, and promo codes.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  formatted?: string;
}

/**
 * Validates international and local phone numbers
 * Follows ITU E.164 recommendations (7 to 15 digits, optional leading '+')
 */
export function validatePhoneNumber(phone: string): ValidationResult {
  if (!phone || !phone.trim()) {
    return {
      isValid: false,
      error: 'Phone number is required for booking confirmations and gate alerts.',
    };
  }

  const trimmed = phone.trim();

  // Reject invalid characters (letters, emojis, illegal symbols)
  // Allowed: digits, leading +, spaces, hyphens, parentheses, dots
  const allowedCharsRegex = /^(\+)?[\d\s\-().]{6,25}$/;
  if (!allowedCharsRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Phone number contains invalid characters. Only digits, +, -, and ( ) are allowed.',
    };
  }

  // Count actual numeric digits
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length < 7) {
    return {
      isValid: false,
      error: `Phone number is too short (${digits.length} digits). Standard phone numbers require at least 7 digits.`,
    };
  }

  if (digits.length > 15) {
    return {
      isValid: false,
      error: `Phone number is too long (${digits.length} digits). International E.164 standard limits phone numbers to 15 digits.`,
    };
  }

  // Check for repeated single character nonsense (e.g. "0000000" or "9999999999")
  if (/^(\d)\1{6,}$/.test(digits)) {
    return {
      isValid: false,
      error: 'Please enter a genuine, active telephone number.',
    };
  }

  const formatted = formatPhoneNumber(trimmed);

  return {
    isValid: true,
    formatted,
  };
}

/**
 * Live sanitizer that strips illegal characters during user typing
 */
export function sanitizePhoneInput(val: string): string {
  // Allow leading + and only digits, spaces, parentheses, hyphens
  let sanitized = val.replace(/[^\d+\s\-().]/g, '');
  // Ensure '+' can only appear at the very start
  if (sanitized.indexOf('+') > 0) {
    const hasLeadingPlus = sanitized.startsWith('+');
    sanitized = (hasLeadingPlus ? '+' : '') + sanitized.replace(/\+/g, '');
  }
  return sanitized;
}

/**
 * Formats a phone number cleanly into standard presentation
 */
export function formatPhoneNumber(val: string): string {
  const isPlus = val.trim().startsWith('+');
  const digits = val.replace(/\D/g, '');

  if (digits.length === 10 && !isPlus) {
    // US/Standard 10-digit: (555) 345-6789
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // North American +1 format: +1 (555) 345-6789
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  } else if (isPlus) {
    // International format: preserve + and group readable blocks
    return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  return val.trim();
}

/**
 * Validates travel departure dates: must be today or in the future
 */
export function validateDepartureDate(dateStr: string): ValidationResult {
  if (!dateStr || !dateStr.trim()) {
    return {
      isValid: false,
      error: 'Please select your preferred travel departure date.',
    };
  }

  const selectedDate = new Date(`${dateStr.trim()}T00:00:00`);
  if (isNaN(selectedDate.getTime())) {
    return {
      isValid: false,
      error: 'Please enter a valid date in YYYY-MM-DD format.',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    return {
      isValid: false,
      error: 'Departure date cannot be in the past. Please select an upcoming date.',
    };
  }

  // Max 2 years in advance
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 2);
  if (selectedDate > maxDate) {
    return {
      isValid: false,
      error: 'Reservations can be booked up to a maximum of 2 years in advance.',
    };
  }

  return { isValid: true };
}

/**
 * Validates RFC-compliant email address
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || !email.trim()) {
    return {
      isValid: false,
      error: 'Email address is required for sending your travel tickets and vouchers.',
    };
  }

  const clean = email.trim();
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(clean)) {
    return {
      isValid: false,
      error: 'Please provide a valid email address (e.g. name@example.com).',
    };
  }

  return { isValid: true };
}

/**
 * Validates passenger legal full name
 */
export function validatePassengerName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return {
      isValid: false,
      error: 'Primary passenger legal name is required as it appears on your passport/ID.',
    };
  }

  const clean = name.trim();
  if (clean.length < 2) {
    return {
      isValid: false,
      error: 'Passenger name must be at least 2 characters long.',
    };
  }

  if (clean.length > 80) {
    return {
      isValid: false,
      error: 'Passenger name cannot exceed 80 characters.',
    };
  }

  return { isValid: true };
}
