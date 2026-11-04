/**
 * Application Configuration and Asset Paths
 */

export const ASSET_PATHS = {
  LOGO_LIGHT: 'assets/Images/navigation-section/Logo.svg',
  LOGO_DARK: 'assets/Images/navigation-section/Logo-dark.svg',
} as const;

export const API_CONFIG = {
  BASE_URL:
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1' &&
    window.location.protocol !== 'file:'
      ? `${window.location.origin}/api`
      : 'http://localhost:5000/api',
  TIMEOUT_MS: 5000,
} as const;

export const UI_CONFIG = {
  NAVBAR_SCROLL_THRESHOLD_PX: 50,
  AUTH_REDIRECT_DELAY_MS: 1200,
  FORM_SUBMIT_SIMULATED_LATENCY_MS: 500,
} as const;

export const VALIDATION_RULES = {
  NAME_MIN_LENGTH: 2,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_LOGIN_MIN_LENGTH: 6,
  NAME_REGEX: /^[\p{L}\s'-]+$/u,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

export const EMAIL_SERVICE_CONFIG = {
  EMAILJS_SERVICE_ID: 'service_jadoo',
  EMAILJS_TEMPLATE_ID: 'jadoo_template',
  EMAILJS_PUBLIC_KEY: 'ldeIEBtJdGkSxHvqe',
  WEB3FORMS_ACCESS_KEY: '',
  WELCOME_PROMO_CODE: 'EXPLORE15',
  DEFAULT_SENDER_NAME: 'Jadoo Travel Concierge',
  DEFAULT_SENDER_EMAIL: 'concierge@jadoo.travel',
} as const;
