# 📘 Jadoo Travel — Phase 1 Study Guide: Foundations & Contracts

> **Phase 1 Learning Objective:** Master the foundational configurations, environment inputs, constants, and TypeScript type contracts that define the entire architecture of Jadoo Travel.  
> **Philosophy:** *“If you understand the shape of the data and the rules of the system, the rest of the application is just filling in the blanks.”*

---

## 📑 Phase 1 Navigation Map

1. [File 1: `package.json` — The Dependency & Script Engine](#file-1-packagejson--the-dependency--script-engine)
2. [File 2: `REQUIRED_INPUTS.txt` — The Environment & Security Credentials](#file-2-required_inputstxt--the-environment--security-credentials)
3. [File 3: `src/constants/config.ts` — Global Immutable Constants & RegEx Rules](#file-3-srcconstantsconfigts--global-immutable-constants--regex-rules)
4. [File 4: `src/constants/storage-keys.ts` — Client-Side Storage Namespacing](#file-4-srcconstantsstorage-keysts--client-side-storage-namespacing)
5. [File 5: `src/types/auth.types.ts` — Authentication & Session Contracts](#file-5-srctypesauthtypests--authentication--session-contracts)
6. [File 6: `src/types/destination.types.ts` — Travel, Wikipedia & Booking Contracts](#file-6-srctypesdestinationtypests--travel-wikipedia--booking-contracts)
7. [File 7: `src/types/newsletter.types.ts` — Subscriber & Email Contracts](#file-7-srctypesnewslettertypests--subscriber--email-contracts)
8. [File 8: `src/types/testimonial.types.ts` — Traveler Review Contracts](#file-8-srctypestestimonialtypests--traveler-review-contracts)
9. [File 9: `src/types/theme.types.ts` — Dark/Light Mode Contracts](#file-9-srctypesthemetypests--darklight-mode-contracts)
10. [Self-Check Mastery Quiz](#self-check-mastery-quiz)

---

## File 1: `package.json` — The Dependency & Script Engine

### 1.1 Purpose & Architectural Duty
`package.json` is the manifest of the Node.js project. It defines:
- The executable NPM scripts that automate development, building, database migration, and testing.
- The distinction between **runtime dependencies** (needed by the Express server in production) and **development dependencies** (needed only for compiling and type-checking).

### 1.2 Full Annotated Code
```json
{
  "name": "dax-jadoo",
  "version": "1.0.0",
  "description": "Modular, modern Jadoo Travel frontend architecture",
  "main": "script.js",
  "scripts": {
    "build": "tsc --noEmit && node build.js",
    "bundle": "node build.js",
    "type-check": "tsc --noEmit",
    "watch": "node build.js --watch",
    "server": "tsx watch server/src/index.ts",
    "db:setup": "tsx server/src/db/init-db.ts",
    "test": "tsx server/tests/test-suite.ts",
    "dev:all": "concurrently \"npm run watch\" \"npm run server\""
  },
  "keywords": [
    "travel",
    "jadoo",
    "typescript",
    "modular"
  ],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/pg": "^8.23.1",
    "concurrently": "^10.0.6",
    "esbuild": "^0.28.2",
    "tsx": "^4.23.15",
    "typescript": "^5.9.3"
  },
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "cors": "^2.8.6",
    "dotenv": "^18.0.9",
    "express": "^5.3.0",
    "jsonwebtoken": "^9.0.3",
    "pg": "^8.23.1"
  }
}
```

### 1.3 Line-by-Line Breakdown
- **Lines 1–4**: Package metadata (`name`, `version`, `description`).
- **Line 5 (`"main": "script.js"`)**: Entry output file referenced by classic HTML script tags.
- **Lines 6–14 (`"scripts"`)**:
  - `"build"`: Chained command (`&&`). First runs `tsc --noEmit` to strictly verify all types without generating JS files. If that passes with 0 errors, runs `node build.js` to bundle using `esbuild`.
  - `"watch"`: Launches `build.js --watch`. Whenever you edit any `.ts` file inside `src/`, it automatically re-bundles to `script.js`, `auth.js`, or `profile.js` in < 20ms.
  - `"server"`: Uses `tsx watch` to execute TypeScript directly on Node.js without pre-compiling. If any file in `server/` changes, the server restarts automatically.
  - `"db:setup"`: Runs the database initializer script (`server/src/db/init-db.ts`) which parses `schema.sql` and `seed.sql`.
  - `"test"`: Runs our automated 18-step integration test suite (`server/tests/test-suite.ts`).
  - `"dev:all"`: Uses `concurrently` to spawn both the frontend watcher and the backend Express server side-by-side in a single terminal.
- **Lines 23–33 (`devDependencies`)**:
  - `@types/*`: DefinitelyTyped packages providing TypeScript definitions for vanilla JS libraries (`express`, `pg`, `bcryptjs`, etc.).
  - `esbuild`: Extremely fast Go-based bundler that replaces heavy tools like Webpack.
  - `tsx`: Fast Node.js TypeScript runner powered by esbuild.
  - `concurrently`: Utility to run multiple shell processes in one terminal window.
- **Lines 34–41 (`dependencies`)**:
  - `express`: Minimalist, battle-tested HTTP web framework.
  - `pg`: Official PostgreSQL client driver featuring connection pooling (`Pool`).
  - `bcryptjs`: Pure JavaScript implementation of the Blowfish password hashing algorithm (avoids C++ build toolchain issues on Windows).
  - `jsonwebtoken`: Implementation of RFC 7519 for issuing and verifying stateless JWTs.
  - `cors`: Express middleware to enable Cross-Origin Resource Sharing.
  - `dotenv`: Loads environment variables from `.env`.

> [!NOTE]
> **Why `bcryptjs` instead of native `bcrypt`?**
> Native `bcrypt` requires node-gyp and Python/Visual Studio C++ build tools on Windows. `bcryptjs` is 100% pure JavaScript with zero native dependencies, ensuring guaranteed compatibility across all Windows setups.

---

## File 2: `REQUIRED_INPUTS.txt` — The Environment & Security Credentials

### 2.1 Purpose & Architectural Duty
This plain-text configuration file acts as the user's primary control panel. It decouples infrastructure configuration (database passwords, server ports, secret keys) from application code.

### 2.2 Full Annotated Code
```ini
================================================================================
          JADOO TRAVEL — BACKEND & DATABASE CONFIGURATION INPUTS
================================================================================

Please fill in your database credentials and configuration below.
The Express server will automatically read values from this file (or from 
server/.env). You can either provide a single connection string (DATABASE_URL) 
OR provide the individual DB parameters.

--------------------------------------------------------------------------------
1. POSTGRESQL DATABASE CREDENTIALS (REQUIRED)
--------------------------------------------------------------------------------

Option A: Complete Connection String (Recommended if using Neon, Supabase, Render, etc.)
Format: postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE_NAME>?sslmode=require
DATABASE_URL=

Option B: Individual Parameters (Used if DATABASE_URL is left blank)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=jadoo_travel_db
DB_SSL=false

--------------------------------------------------------------------------------
2. SERVER APPLICATION SETTINGS
--------------------------------------------------------------------------------
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:8080
JWT_SECRET=jadoo_super_secret_jwt_key_2026_curated_escapes
JWT_EXPIRES_IN=7d
```

### 2.3 Deep Line-by-Line Breakdown & Anatomy
- **`DATABASE_URL` (Line 16)**:
  - Anatomy: `postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require`
  - When non-empty, the backend prioritizes this string. This is ideal for cloud-hosted databases like Neon or Supabase where pooling proxies provide a single URI.
- **Individual DB Parameters (Lines 19–24)**:
  - `DB_HOST=localhost`: Points to the local machine loopback interface (`127.0.0.1`).
  - `DB_PORT=5432`: Default IANA port assigned to PostgreSQL.
  - `DB_USER=postgres`: The default superuser created upon PostgreSQL installation.
  - `DB_PASSWORD`: The authentication secret protecting PostgreSQL.
  - `DB_NAME=jadoo_travel_db`: The specific database catalog holding our tables.
  - `DB_SSL=false`: Local PostgreSQL typically does not use TLS certificates; cloud databases require `true`.
- **`PORT=5000` (Line 29)**: The TCP port where Express listens for incoming HTTP traffic.
- **`JWT_SECRET` (Line 32)**:
  - The shared secret HMAC key. When a user logs in, Express uses this string to compute the cryptographic signature of the JWT. If an attacker tampers with the user ID in the token, the signature check fails.
- **`JWT_EXPIRES_IN=7d` (Line 33)**: Time-to-Live (TTL). Tokens expire after 7 days, forcing re-authentication to prevent indefinite session hijacking.

---

## File 3: `src/constants/config.ts` — Global Immutable Constants & RegEx Rules

### 3.1 Purpose & Architectural Duty
Eliminates "magic numbers" and hardcoded strings throughout the application. Centralizes API endpoints, regex validation logic, UI timing parameters, and third-party email concierge credentials.

### 3.2 Full Annotated Code
```typescript
/**
 * Application Configuration and Asset Paths
 */

export const ASSET_PATHS = {
  LOGO_LIGHT: 'assets/Images/navigation-section/Logo.svg',
  LOGO_DARK: 'assets/Images/navigation-section/Logo-dark.svg',
} as const;

export const API_CONFIG = {
  BASE_URL: 'http://localhost:5000/api',
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
  NAME_REGEX: /^[a-zA-Z\s'-]+$/,
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
```

### 3.3 Deep Breakdown & Concepts

#### Why `as const` everywhere?
In TypeScript, writing:
```typescript
export const API_CONFIG = {
  BASE_URL: 'http://localhost:5000/api',
};
```
infers `BASE_URL` as type `string` (mutable property).  
Adding `as const` (const assertion) instructs TypeScript to:
1. Treat all properties as deeply `readonly`.
2. Narrow the type to the exact string literal `'http://localhost:5000/api'`.
This guarantees that no rogue script or middleware can accidentally mutate `API_CONFIG.BASE_URL = 'http://malicious-site.com'` at runtime.

#### Deep Dive: Regex Breakdown
1. **`NAME_REGEX: /^[a-zA-Z\s'-]+$/`**:
   - `^`: Asserts the start of the string.
   - `[a-zA-Z\s'-]`: Character class allowing uppercase (`a-z`), lowercase (`A-Z`), whitespace (`\s`), hyphens (`-`), and apostrophes (`'`) for international names (e.g., "Sarah O'Connor", "Jean-Luc").
   - `+`: Requires at least one or more of these characters.
   - `$`: Asserts the end of the string.
2. **`EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/`**:
   - `^[^\s@]+`: One or more characters that are NOT whitespace (`\s`) and NOT an at-symbol (`@`).
   - `@`: Must contain an `@` separator.
   - `[^\s@]+`: Domain name segment (cannot contain whitespace or `@`).
   - `\.`: Literal dot separator.
   - `[^\s@]+$`: Top-level domain (TLD) suffix (e.g., `com`, `org`, `travel`).

#### UI Timing Constants
- `NAVBAR_SCROLL_THRESHOLD_PX: 50`: After scrolling 50px down, the navbar gains frosted-glass blurred background styling.
- `AUTH_REDIRECT_DELAY_MS: 1200`: Delays redirection after successful sign-in by 1.2s so the user can read the green welcome banner before the page unloads.

---

## File 4: `src/constants/storage-keys.ts` — Client-Side Storage Namespacing

### 4.1 Purpose & Architectural Duty
Controls every key used in the browser's `localStorage`. By defining all keys in one file with a standard prefix (`jadoo_`), we prevent name collisions with other scripts or third-party libraries running in the same browser origin.

### 4.2 Full Annotated Code
```typescript
/**
 * LocalStorage Keys Constants
 * Centralized keys avoid magic strings and collision risk across modules.
 */

export const STORAGE_KEYS = {
  USER_SESSION: 'jadoo_user_session',
  USERS_DB: 'jadoo_users_db',
  AUTH_TOKEN: 'jadoo_auth_token',
  BOOKINGS: 'jadoo_bookings',
  FAVORITES: 'jadoo_favorites',
  WISHLIST_ITEMS: 'jadoo_wishlist_items',
  TESTIMONIALS: 'jadoo_testimonials',
  NEWSLETTER_SUBSCRIBERS: 'jadoo_newsletter_subscribers',
  THEME: 'jadoo_theme',
  EMAIL_API_CONFIG: 'jadoo_email_config',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
```

### 4.3 Deep Line-by-Line Breakdown
- **Lines 6–17**: Every key is mapped to a prefixed string.
  - `AUTH_TOKEN`: Stores the signed JWT received from Express.
  - `USER_SESSION`: Stores the deserialized traveler profile object currently logged in.
  - `BOOKINGS`: Caches user reservations locally so the offline user still sees their trips.
  - `THEME`: Stores `'light'` or `'dark'`.
- **Line 19 (`export type StorageKey = ...`)**:
  - A TypeScript union type representing only valid storage key strings:  
    `'jadoo_user_session' | 'jadoo_users_db' | 'jadoo_auth_token' | ...`
  - This ensures `StorageService.getItem(key)` will throw a compile-time error if someone tries to pass a typo like `'jadoo_booking'`!

---

## File 5: `src/types/auth.types.ts` — Authentication & Session Contracts

### 5.1 Purpose & Architectural Duty
Defines the strict interfaces governing users, sessions, password security evaluation, and authentication responses across the application.

### 5.2 Full Annotated Code
```typescript
/**
 * Authentication and User Session Type Definitions
 */

export interface UserPreferences {
  currency?: string;
  language?: string;
  mealPreference?: string;
  seatPreference?: string;
  homeAirport?: string;
  emailAlerts?: boolean;
  smsAlerts?: boolean;
}

export interface UserAccount {
  name: string;
  email: string;
  password?: string;
  registeredAt: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  country?: string;
  passportNumber?: string;
  emergencyContact?: string;
  loyaltyTier?: 'Silver Explorer' | 'Gold Adventurer' | 'Platinum Voyager';
  loyaltyPoints?: number;
  preferences?: UserPreferences;
}

export interface UserSession {
  name: string;
  email: string;
  loggedInAt: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  country?: string;
  passportNumber?: string;
  emergencyContact?: string;
  loyaltyTier?: 'Silver Explorer' | 'Gold Adventurer' | 'Platinum Voyager';
  loyaltyPoints?: number;
  preferences?: UserPreferences;
}

export type AuthMode = 'login' | 'signup';

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export type PasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordCriteria {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

export interface PasswordStrengthReport {
  criteria: PasswordCriteria;
  passedCount: number;
  level: PasswordStrengthLevel;
  label: string;
}

export interface AuthResponse {
  success: boolean;
  user?: UserSession;
  error?: string;
}
```

### 5.3 Deep Breakdown & Architectural Concepts

#### Critical Distinction: `UserAccount` vs `UserSession`
Notice lines 15–29 vs lines 31–44:
- `UserAccount` contains `password?: string` and `registeredAt: string`. This represents the stored record in the database.
- `UserSession` replaces `registeredAt` with `loggedInAt: string` and **deliberately omits `password`**.
- *Why:* Security principle of least privilege. The browser session should **never** hold a plaintext or hashed password in memory after authentication succeeds.

#### String Literal Union Types
- `export type AuthMode = 'login' | 'signup';`
- `loyaltyTier?: 'Silver Explorer' | 'Gold Adventurer' | 'Platinum Voyager';`
- Instead of using loose `string`, TypeScript restricts loyalty tiers to only these 3 specific values.

#### Password Strength Contract
- `PasswordCriteria` models 5 boolean flags (Length, Uppercase, Lowercase, Number, Special).
- `PasswordStrengthReport` bundles this with a calculated `level: PasswordStrengthLevel` ('weak' | 'fair' | 'good' | 'strong') and a human-readable `label` (e.g. "Strong password").

---

## File 6: `src/types/destination.types.ts` — Travel, Wikipedia & Booking Contracts

### 6.1 Purpose & Architectural Duty
Models travel destinations, search results returned from the free live Wikipedia REST API, package tiers, booking requests, and confirmed booking records.

### 6.2 Full Annotated Code
```typescript
/**
 * Destination Explorer Types and Interfaces
 */

export interface Destination {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  imageUrl: string;
  price: string;
  duration: string;
  rating: number;
  category?: string;
  isFavorite?: boolean;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

export interface WikipediaSummaryResponse {
  type?: string;
  title: string;
  displaytitle?: string;
  extract?: string;
  description?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  originalimage?: {
    source: string;
    width: number;
    height: number;
  };
  content_urls?: {
    desktop?: {
      page: string;
    };
  };
}

export interface WikipediaPageSearchItem {
  pageid: number;
  ns: number;
  title: string;
  index?: number;
  description?: string;
  coordinates?: Array<{
    lat: number;
    lon: number;
  }>;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  extract?: string;
}

export interface WikipediaQuerySearchResponse {
  query?: {
    pages?: Record<string, WikipediaPageSearchItem>;
  };
}

export type PackageTier = 'standard' | 'deluxe' | 'luxury';

export interface BookingRequest {
  destinationId: string;
  destinationTitle: string;
  destinationImage: string;
  fullName: string;
  email: string;
  phone: string;
  departureDate: string;
  adults: number;
  children: number;
  packageTier: PackageTier;
  notes?: string;
  specialRequests?: string;
  promoCode?: string;
  basePricePerPerson: number;
  totalPrice: number;
}

export interface BookingRecord extends BookingRequest {
  bookingId: string;
  createdAt: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}
```

### 6.3 Deep Breakdown & Architectural Concepts

#### External API Typing: `WikipediaSummaryResponse`
When Jadoo's search bar queries `https://en.wikipedia.org/api/rest_v1/page/summary/{city}`, Wikipedia returns a complex JSON document. This interface models:
- `extract`: The summary paragraph displayed on destination cards.
- `thumbnail.source`: The image URL.
- `coordinates.lat` / `coordinates.lon`: The geographical coordinates passed directly to the interactive Leaflet map!

#### Interface Inheritance: `BookingRecord extends BookingRequest`
Notice lines 75–97:
```typescript
export interface BookingRecord extends BookingRequest {
  bookingId: string;
  createdAt: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}
```
- A `BookingRequest` is what the user fills in on the modal (dates, tier, adults).
- Once the server confirms the reservation, it transforms into a `BookingRecord` by adding a system-generated `bookingId` (`BK-XXXX`), a creation timestamp (`createdAt`), and a state machine enum (`status`).
- Through `extends`, we avoid repeating all 13 fields of `BookingRequest`!

---

## File 7: `src/types/newsletter.types.ts` — Subscriber & Email Contracts

### 7.1 Purpose & Architectural Duty
Models newsletter sign-up payloads, API configuration for third-party dispatch providers (EmailJS / Web3Forms), and standardized email dispatch results.

### 7.2 Full Annotated Code
```typescript
/**
 * Newsletter & Welcome Email Types
 */

export interface NewsletterSubscriber {
  email: string;
  name?: string;
  subscribedAt: string;
  promoCode: string;
}

export interface EmailApiConfig {
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
  web3formsKey?: string;
}

export interface SendEmailPayload {
  toEmail: string;
  toName: string;
  subject: string;
  promoCode: string;
  message?: string;
}

export interface SendEmailResult {
  success: boolean;
  provider: 'emailjs' | 'web3forms' | 'simulated';
  message: string;
  error?: string;
}
```

### 7.3 Deep Breakdown
- **`NewsletterSubscriber`**: Stores the subscriber email and their issued `EXPLORE15` voucher.
- **`SendEmailResult`**: Uses a string union for `provider: 'emailjs' | 'web3forms' | 'simulated'`. This allows the UI to know which transport sent the email, or if it ran in simulated offline mode!

---

## File 8: `src/types/testimonial.types.ts` — Traveler Review Contracts

### 8.1 Purpose & Architectural Duty
Defines the structure of traveler reviews featured on the homepage carousel and submitted via the "Share Your Story" modal.

### 8.2 Full Annotated Code
```typescript
/**
 * Testimonial Type Definitions
 */

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  location: string;
  avatar: string;
  rating?: number;
  destinationVisited?: string;
  createdAt?: string;
  isUserSubmitted?: boolean;
}
```

### 8.3 Deep Breakdown
- `isUserSubmitted?: boolean`: Flags whether a testimonial was loaded from curated seeds or submitted dynamically by the traveler during their browser session. User-submitted testimonials can be deleted or prioritized in the carousel!

---

## File 9: `src/types/theme.types.ts` — Dark/Light Mode Contracts

### 9.1 Purpose & Architectural Duty
Defines the binary theme states and callback listener signatures for the application's dark mode system.

### 9.2 Full Annotated Code
```typescript
/**
 * Theme Type Definitions
 */

export type ThemeMode = 'light' | 'dark';

export type ThemeChangeListener = (isDark: boolean, theme: ThemeMode) => void;
```

### 9.3 Deep Breakdown
- `ThemeChangeListener`: A function type signature `(isDark: boolean, theme: ThemeMode) => void`. Whenever the user clicks the sun/moon button, `ThemeService` loops through registered listeners and passes them the new state. This updates both the CSS `data-theme` attribute and the Leaflet map tile filter!

---

## 🧠 Self-Check Mastery Quiz

To test your understanding of Phase 1 before moving to Phase 2 (Database Layer), answer these 5 questions:

1. **Why does `src/constants/config.ts` use `as const` instead of standard variable declarations?**
   - *Answer:* It converts all object properties into deeply immutable `readonly` literals, preventing accidental runtime modification and providing exact string literal types to TypeScript.
2. **What is the difference between `UserAccount` and `UserSession` in `src/types/auth.types.ts`?**
   - *Answer:* `UserAccount` represents the stored database user (including password hash and registration date). `UserSession` represents the authenticated browser state and **strictly omits the password** for security.
3. **In `src/constants/storage-keys.ts`, how does `typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]` work?**
   - *Answer:* It extracts the object values into a TypeScript union type (`'jadoo_user_session' | 'jadoo_auth_token' | ...`), guaranteeing compile-time type checking on all storage operations.
4. **How does `BookingRecord` relate to `BookingRequest` in `src/types/destination.types.ts`?**
   - *Answer:* `BookingRecord extends BookingRequest`. It inherits all 13 request parameters (dates, tier, adults, etc.) and adds the server confirmation fields: `bookingId`, `createdAt`, and `status`.
5. **Why do we have both `DATABASE_URL` and individual parameters (`DB_HOST`, `DB_PORT`, etc.) in `REQUIRED_INPUTS.txt`?**
   - *Answer:* `DATABASE_URL` is preferred for cloud hosts (Neon/Supabase) which supply a single connection URI, while individual parameters provide flexibility for local PostgreSQL without constructing a URL manually.
