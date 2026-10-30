# 🚀 Jadoo Travel — Phase 3 Study Guide: Backend REST API (Node.js & Express)

> **Phase 3 Learning Objective:** Master the architectural design, security mechanisms, controller business logic, connection pooling, and JWT authentication flow that power the Express REST API backend.  
> **Philosophy:** *“A great API is predictable, stateless, resilient under failure, and strictly validates all boundaries before touching the database.”*

---

## 📑 Phase 3 Navigation Map

1. [Architectural Overview: The Express HTTP Pipeline](#1-architectural-overview-the-express-http-pipeline)
2. [File 1: `server/src/config/env.ts` — Environment Parser & Fallbacks](#file-1-serversrcconfigenvts--environment-parser--fallbacks)
3. [File 2: `server/src/config/db.ts` — PostgreSQL Connection Pooling & Health Monitoring](#file-2-serversrcconfigdbts--postgresql-connection-pooling--health-monitoring)
4. [File 3: `server/src/middleware/auth.middleware.ts` — JWT Verification & Route Guards](#file-3-serversrcmiddlewareauthmiddlewarets--jwt-verification--route-guards)
5. [File 4: `server/src/middleware/error.middleware.ts` — Global Error Interceptor](#file-4-serversrcmiddlewareerrormiddlewarets--global-error-interceptor)
6. [File 5: `server/src/controllers/auth.controller.ts` — Authentication, Bcrypt & Profile Engine](#file-5-serversrccontrollersauthcontrollerts--authentication-bcrypt--profile-engine)
7. [File 6: `server/src/controllers/destination.controller.ts` — Trips Catalog & Dynamic Query Builder](#file-6-serversrccontrollersdestinationcontrollerts--trips-catalog--dynamic-query-builder)
8. [File 7: `server/src/controllers/booking.controller.ts` — Trip Reservations, Pricing Tiers & Loyalty](#file-7-serversrccontrollersbookingcontrollerts--trip-reservations-pricing-tiers--loyalty)
9. [File 8: `server/src/controllers/wishlist.controller.ts` — Favorites State & Foreign Key Safety](#file-8-serversrccontrollerswishlistcontrollerts--favorites-state--foreign-key-safety)
10. [File 9 & 10: Testimonials & Newsletter Controllers](#file-9--10-testimonials--newsletter-controllers)
11. [File 11: `server/src/routes/` — Routing Topology & Authorization Injection](#file-11-serversrcroutes--routing-topology--authorization-injection)
12. [File 12 & 13: `server/src/app.ts` & `server/src/index.ts` — Server Lifecycle & Bootstrapping](#file-12--13-serversrcappts--serversrcindexts--server-lifecycle--bootstrapping)
13. [File 14: `server/tests/test-suite.ts` — Automated 18-Step Integration Suite](#file-14-serverteststest-suitets--automated-18-step-integration-suite)
14. [Deep-Dive Engineering Concepts](#14-deep-dive-engineering-concepts)
15. [Self-Check Mastery Quiz](#15-self-check-mastery-quiz)

---

## 1. Architectural Overview: The Express HTTP Pipeline

Every HTTP request that hits the Jadoo Travel backend flows through a strict, unidirectional pipeline:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   INCOMING HTTP REQUEST FROM CLIENT                    │
│   e.g. POST http://localhost:5000/api/bookings                         │
│   Headers: Authorization: Bearer eyJhbGciOi...                         │
│   Body: { destinationId: "rome-italy", adults: 2, packageTier: "deluxe" }
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 1. CORS Middleware: app.use(cors({ origin: true }))                    │
│    Permits cross-origin AJAX requests from frontend Live Server (5500).│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. Body Parser: app.use(express.json())                                │
│    Buffers incoming raw TCP byte chunks and parses them into req.body. │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. Router Mapping: app.use('/api/bookings', bookingRoutes)             │
│    Matches URL prefix and delegates to router.post('/', create).       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. Security Guard: requireAuth (auth.middleware.ts)                    │
│    Verifies HMAC SHA-256 signature with JWT_SECRET.                    │
│    If valid: Attaches user payload to req.user and calls next().       │
│    If invalid: Returns 401 Unauthorized immediately.                   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 5. Controller Business Logic: BookingController.create                 │
│    - Checks pricing multipliers & discounts.                           │
│    - Queries pg.Pool with parameterized SQL ($1, $2).                  │
│    - Awards +250 loyalty points to user.                               │
│    - Returns 201 Created with JSON booking receipt.                    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ (If unhandled error thrown)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 6. Global Error Middleware: errorHandler(err, req, res, next)          │
│    Sanitizes database stack traces and returns clean 500 JSON message. │
└────────────────────────────────────────────────────────────────────────┘
```

---

## File 1: `server/src/config/env.ts` — Environment Parser & Fallbacks

### 2.1 Purpose & Architectural Duty
Decouples configuration from application code. It reads user-supplied credentials from `REQUIRED_INPUTS.txt` at the root (or from `server/.env`) and exports a strictly typed, immutable `ENV` configuration object with type conversions.

### 2.2 Full Annotated Code
```typescript
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 1. First attempt to load from server/.env if present
const serverEnvPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else {
  dotenv.config();
}

// 2. Also parse REQUIRED_INPUTS.txt from root if it exists, to allow user to configure there
const requiredInputsPath = path.resolve(__dirname, '../../../REQUIRED_INPUTS.txt');
if (fs.existsSync(requiredInputsPath)) {
  try {
    const content = fs.readFileSync(requiredInputsPath, 'utf-8');
    const lines = content.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith('=')) continue;
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        // Only set if not already overridden by process.env
        if (!process.env[key] && value && !value.includes('your_postgres_password_here')) {
          process.env[key] = value;
        }
      }
    }
  } catch (err) {
    console.warn('[Env] Notice: Could not read REQUIRED_INPUTS.txt:', err);
  }
}

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:8080',
  JWT_SECRET: process.env.JWT_SECRET || 'jadoo_super_secret_jwt_key_2026_curated_escapes',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DATABASE_URL: process.env.DATABASE_URL || '',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  DB_NAME: process.env.DB_NAME || 'jadoo_travel_db',
  DB_SSL: process.env.DB_SSL === 'true',
};
```

### 2.3 Deep Line-by-Line Breakdown
- **Lines 5–11**: Loads traditional `.env` files using `dotenv`. If none exists, it doesn't crash.
- **Lines 14–35**: **Custom Regex Parser for `REQUIRED_INPUTS.txt`**.
  - `fs.readFileSync(requiredInputsPath, 'utf-8')`: Synchronously reads the file at startup before network traffic begins.
  - `if (!line || line.startsWith('#') || line.startsWith('=')) continue;`: Skips blank lines, comments, and decorative separator borders.
  - `const match = line.match(/^([A-Z0-9_]+)=(.*)$/);`: Captures the key and value across the `=` sign.
  - `!value.includes('your_postgres_password_here')`: Defensive guard that ignores template placeholder strings so real credentials aren't overwritten with junk.
- **Lines 37–50 (`export const ENV`)**:
  - `parseInt(process.env.PORT || '5000', 10)`: Converts string to base-10 integer. Always specify the radix `10` to prevent unintended octal parsing!
  - `DB_SSL: process.env.DB_SSL === 'true'`: Safely converts string `'true'` into a real boolean `true`.

---

## File 2: `server/src/config/db.ts` — PostgreSQL Connection Pooling & Health Monitoring

### 3.1 Purpose & Architectural Duty
Manages database client connections using connection pooling (`pg.Pool`). Instead of creating a new TCP socket connection for every single HTTP request (which destroys performance and crashes PostgreSQL with connection limit errors), a pool creates and reuses a warm set of clients.

### 3.2 Full Annotated Code
```typescript
import { Pool, PoolConfig } from 'pg';
import { ENV } from './env';

const poolConfig: PoolConfig = ENV.DATABASE_URL
  ? {
      connectionString: ENV.DATABASE_URL,
      ssl: ENV.DATABASE_URL.includes('sslmode=require') || ENV.DB_SSL
        ? { rejectUnauthorized: false }
        : false,
    }
  : {
      host: ENV.DB_HOST,
      port: ENV.DB_PORT,
      user: ENV.DB_USER,
      password: ENV.DB_PASSWORD,
      database: ENV.DB_NAME,
      ssl: ENV.DB_SSL ? { rejectUnauthorized: false } : false,
    };

export const pool = new Pool(poolConfig);

let isDbConnected = false;

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected pool client error:', err.message);
});

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as current_time, current_database() as db_name');
    client.release();
    isDbConnected = true;
    console.log(
      `[PostgreSQL] Connected to database "${res.rows[0].db_name}" at ${res.rows[0].current_time}`
    );
    return true;
  } catch (err: unknown) {
    isDbConnected = false;
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[PostgreSQL] Connection warning: Could not connect to database.`);
    console.warn(`[PostgreSQL] Error details: ${msg}`);
    console.warn(
      `[PostgreSQL] Tip: Check credentials in REQUIRED_INPUTS.txt or server/.env, then run 'npm run db:setup'.`
    );
    return false;
  }
}

export function getDbConnectionStatus(): boolean {
  return isDbConnected;
}
```

### 3.3 Deep Line-by-Line Breakdown
- **Lines 4–18 (`poolConfig`)**:
  - Prioritizes `DATABASE_URL` if supplied (e.g. Neon/Supabase cloud URL).
  - Configures `ssl: { rejectUnauthorized: false }` when connecting to cloud platforms that use self-signed certificates or SNI proxies.
  - If `DATABASE_URL` is empty, cleanly maps individual parameters (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
- **Line 20 (`export const pool = new Pool(...)`)**:
  - The shared singleton connection pool instance imported by all controllers.
- **Lines 24–26 (`pool.on('error', ...)`):**
  - Event listener that traps unexpected network dropouts or backend idle disconnects so Node.js does not crash with an uncaught exception.
- **Lines 31–51 (`checkDatabaseConnection`)**:
  - Probes the database by borrowing a client (`pool.connect()`), running `SELECT NOW(), current_database()`, and immediately returning it (`client.release()`). Sets `isDbConnected = true`.

---

## File 3: `server/src/middleware/auth.middleware.ts` — JWT Verification & Route Guards

### 4.1 Purpose & Architectural Duty
Implements stateless token-based authorization. It intercepts requests aimed at protected routes (like booking a trip or accessing a profile), extracts the Bearer token, verifies its cryptographic signature, and attaches the decoded user identity to Express's `req` object.

### 4.2 Full Annotated Code
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Express middleware to verify JWT in Authorization header
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Access denied. Authentication token missing or invalid.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err: unknown) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired session token. Please log in again.',
    });
  }
}

/**
 * Optional Auth middleware (populates req.user if token is present, but allows guest access)
 */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthenticatedUser;
      req.user = decoded;
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
}
```

### 4.3 Deep Line-by-Line Breakdown & Concepts

#### TypeScript Interface Subtyping: `AuthenticatedRequest`
Express's default `Request` type does not contain a `user` property.
```typescript
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
```
By extending `Request`, downstream controllers can write `req.user.id` or `req.user.email` with **full TypeScript autocomplete and zero `any` casting errors**.

#### How `requireAuth` Works:
1. `req.headers.authorization`: Reads the HTTP header: `Authorization: Bearer <token_string>`.
2. `!authHeader.startsWith('Bearer ')`: Rejects malformed authorization schemes (e.g. Basic auth).
3. `authHeader.split(' ')[1]`: Extracts the raw token string after the space.
4. `jwt.verify(token, ENV.JWT_SECRET)`:
   - Recalculates the HMAC SHA-256 signature using the token's header and payload + `ENV.JWT_SECRET`.
   - If the signature does not match, or if the `exp` timestamp has passed, it throws a `JsonWebTokenError`.
5. `req.user = decoded; next();`: Attaches the validated user to the request object and passes control to the route controller.

#### Why `optionalAuth`?
Endpoints like submitting a testimonial (`POST /api/testimonials`) should allow both logged-in travelers (who get their real avatar attached) and anonymous guests (who submit as guest reviewers). `optionalAuth` populates `req.user` if a token exists, but calls `next()` regardless!

---

## File 4: `server/src/middleware/error.middleware.ts` — Global Error Interceptor

### 5.1 Purpose & Architectural Duty
Catches unhandled asynchronous exceptions or database query errors. It ensures the server logs the error for backend debugging, but responds to the client with a sanitized JSON payload instead of leaking vulnerable database internals or server paths.

### 5.2 Full Annotated Code
```typescript
import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const msg = err instanceof Error ? err.message : 'Internal Server Error';
  console.error(`[Server Error] ${req.method} ${req.url}:`, err);

  res.status(500).json({
    success: false,
    message: msg,
  });
}
```

### 5.3 Deep Line-by-Line Breakdown
- **Line 3 (`(err, req, res, _next)`)**: Express identifies error-handling middleware specifically by looking for a **4-argument function signature**. If you remove `_next`, Express treats it as a standard route handler!

---

## File 5: `server/src/controllers/auth.controller.ts` — Authentication, Bcrypt & Profile Engine

### 6.1 Purpose & Architectural Duty
Controls traveler authentication. Manages user registration with password salting and hashing, login authentication, token minting, and profile stats calculation.

### 6.2 Key Methods Breakdown

#### 1. Helper: `generateToken`
```typescript
function generateToken(user: { id: number; email: string; name: string; role: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );
}
```
- Mints an RFC 7519 JWT payload containing the user's primary key (`id`), `email`, `name`, and `role`, signed with a 7-day expiration.

#### 2. `register(req, res)`
1. **Input Validation**: Ensures name, email, and password exist, and that `password.length >= 8`.
2. **Uniqueness Check**: `SELECT id FROM users WHERE email = $1`. If a row exists, returns HTTP 409 Conflict: *"An account with this email address already exists."*
3. **Password Hashing**:
   ```typescript
   const passwordHash = await bcrypt.hash(password, 10);
   ```
   Generates a cryptographically strong salted hash.
4. **Database Insertion**:
   ```typescript
   const result = await pool.query(
     `INSERT INTO users (name, email, password_hash, points)
      VALUES ($1, $2, $3, 1250)
      RETURNING id, name, email, role, avatar_url, bio, phone, home_city, points, created_at`,
     [name.trim(), cleanEmail, passwordHash]
   );
   ```
   Uses PostgreSQL's `RETURNING` clause to get back the newly created user without running a second query!
5. **Token Issuance**: Returns HTTP 201 Created with the JWT and user session.

#### 3. `login(req, res)`
1. Looks up the user by email: `SELECT ... FROM users WHERE email = $1`.
2. Compares plain password with the stored hash:
   ```typescript
   const passwordMatch = await bcrypt.compare(password, user.password_hash);
   if (!passwordMatch) {
     res.status(401).json({ success: false, message: 'Invalid email or password.' });
     return;
   }
   ```
   - *Security Note:* Notice that both non-existent users and wrong passwords return the exact same generic message: `"Invalid email or password"`. This prevents user enumeration attacks!
3. On match, returns HTTP 200 with the JWT token and profile details.

#### 4. `getProfile(req, res)`
Queries the database for user details, but also runs **3 parallel aggregation queries**:
```typescript
const bookingsCountResult = await pool.query(
  `SELECT COUNT(*) as count FROM bookings WHERE user_id = $1 AND status != 'cancelled'`,
  [req.user.id]
);
const wishlistCountResult = await pool.query(
  `SELECT COUNT(*) as count FROM wishlists WHERE user_id = $1`,
  [req.user.id]
);
const countriesResult = await pool.query(
  `SELECT COUNT(DISTINCT d.country) as count 
   FROM bookings b
   JOIN destinations d ON b.destination_id = d.id
   WHERE b.user_id = $1 AND b.status != 'cancelled'`,
  [req.user.id]
);
```
- Powers the dashboard metric cards on `profile.html`: **Total Trips Booked**, **Distinct Countries Visited**, and **Saved Favorites Count**!

#### 5. `updateProfile(req, res)`
Uses SQL `COALESCE` for partial patching:
```sql
UPDATE users
SET name = COALESCE($1, name),
    phone = COALESCE($2, phone),
    home_city = COALESCE($3, home_city)
WHERE id = $4
```
If a traveler updates only their phone number (`$1 = null, $2 = '+1 555-0192'`), `COALESCE(null, name)` retains the existing name in the database without overwriting it with null!

---

## File 6: `server/src/controllers/destination.controller.ts` — Trips Catalog & Dynamic Query Builder

### 7.1 Purpose & Architectural Duty
Delivers destination packages to the frontend. Implements a secure dynamic SQL query builder that allows simultaneous filtering by category, maximum price, text search, and sorting.

### 7.2 The Dynamic Query Builder Breakdown
```typescript
let query = `
  SELECT id, title, country, price_usd, duration_days, rating, reviews_count, image_url, category, description, highlights, latitude, longitude, is_featured
  FROM destinations
  WHERE 1=1
`;
const params: (string | number)[] = [];
let paramIndex = 1;

if (category && category !== 'all') {
  query += ` AND LOWER(category) = LOWER($${paramIndex++})`;
  params.push(String(category));
}

if (maxPrice && !isNaN(Number(maxPrice))) {
  query += ` AND price_usd <= $${paramIndex++}`;
  params.push(Number(maxPrice));
}

if (search && String(search).trim()) {
  const term = `%${String(search).trim()}%`;
  query += ` AND (title ILIKE $${paramIndex} OR country ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
  paramIndex++;
  params.push(term);
}
```

#### Why `WHERE 1=1`?
- In dynamic SQL generation, appending conditions with `AND ...` is difficult if you don't know whether a `WHERE` clause already exists.
- Starting with `WHERE 1=1` (which is always true) allows every subsequent filter to simply append ` AND condition`, completely avoiding string-manipulation edge cases!

#### Why `ILIKE`?
- Standard SQL `=` or `LIKE` is case-sensitive (`'rome'` will not match `'Rome'`).
- PostgreSQL's `ILIKE` is case-insensitive, allowing travelers to search `'rome'`, `'LONDON'`, or `'greece'` effortlessly.

---

## File 7: `server/src/controllers/booking.controller.ts` — Trip Reservations, Pricing Tiers & Loyalty

### 8.1 Purpose & Architectural Duty
Handles traveler trip reservations. Calculates dynamic pricing with tier multipliers, applies promotional vouchers, auto-stubs custom destinations, updates loyalty points, and provides reservation cancellation.

### 8.2 Deep Logic Breakdown in `create()`

1. **Pricing Calculation Engine**:
   ```typescript
   let tierMultiplier = 1;
   const cleanTier = String(packageTier || 'standard').toLowerCase();
   if (cleanTier === 'deluxe') tierMultiplier = 1.35;
   if (cleanTier === 'luxury') tierMultiplier = 1.85;

   let subtotal = (basePrice * adultCount + basePrice * 0.5 * childCount) * tierMultiplier;

   if (promoCode && String(promoCode).toUpperCase().trim() === 'EXPLORE15') {
     subtotal = subtotal * 0.85;
   }

   const totalPrice = Math.round(subtotal);
   ```
   - Children are charged at 50% of the adult base price.
   - `deluxe` applies a 35% premium; `luxury` applies an 85% premium.
   - Voucher `EXPLORE15` applies an exact 15% discount.

2. **Destination Foreign Key Safety**:
   ```typescript
   const destRes = await pool.query('SELECT title, price_usd FROM destinations WHERE id = $1', [destinationId]);
   const validDestId = destRes.rows.length > 0 ? destinationId : null;
   ```
   If a user books a custom destination from live Wikipedia search that is not in the database table, `destination_id` safely becomes `null` while `destination_title` preserves the name. This prevents PostgreSQL Foreign Key Violation errors!

3. **Gamified Loyalty Points**:
   ```typescript
   await pool.query('UPDATE users SET points = points + 250 WHERE id = $1', [req.user.id]);
   ```
   Every confirmed booking immediately awards 250 points to the traveler's ledger.

---

## File 8: `server/src/controllers/wishlist.controller.ts` — Favorites State & Foreign Key Safety

### 9.1 Purpose & Architectural Duty
Manages the traveler's saved favorite destinations. Implements an intelligent toggle pattern that automatically inserts missing search destinations on the fly.

### 9.2 The Auto-Stubbing Toggle Pattern
```typescript
// 1. Ensure destination exists so foreign key check passes
const destCheck = await pool.query('SELECT id FROM destinations WHERE id = $1', [destinationId]);
if (destCheck.rows.length === 0) {
  await pool.query(
    `INSERT INTO destinations (id, title, country, price_usd, duration_days, rating, image_url, description, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO NOTHING`,
    [destinationId, req.body.title || 'Curated Place', 'Global', 2200, 7, 4.9, '...', '...', 0, 0]
  );
}

// 2. Check if already in wishlist
const checkRes = await pool.query(
  'SELECT id FROM wishlists WHERE user_id = $1 AND destination_id = $2',
  [req.user.id, destinationId]
);

if (checkRes.rows.length > 0) {
  // Remove (unfavorite)
  await pool.query('DELETE FROM wishlists WHERE id = $1', [checkRes.rows[0].id]);
  res.status(200).json({ success: true, action: 'removed', isFavorite: false });
} else {
  // Add (favorite)
  await pool.query('INSERT INTO wishlists (user_id, destination_id) VALUES ($1, $2)', [req.user.id, destinationId]);
  res.status(200).json({ success: true, action: 'added', isFavorite: true });
}
```
- **Architectural Brilliance**: A user can click the heart icon on ANY destination in the world (even dynamically fetched Wikipedia articles). The backend automatically inserts a stub row into `destinations` so the foreign key constraint `wishlists_destination_id_fkey` is always satisfied!

---

## File 9 & 10: Testimonials & Newsletter Controllers

- **`TestimonialController`**:
  - `getAll`: Returns approved reviews (`WHERE is_approved = TRUE`) sorted by `created_at DESC`.
  - `create`: Accepts author, location, quote, and rating (1–5). Uses `optionalAuth` to link the review to `req.user.id` if signed in.
- **`NewsletterController`**:
  - `subscribe`: Inserts email into `subscribers` table. Uses `ON CONFLICT (email) DO UPDATE SET promo_code = EXCLUDED.promo_code` to prevent duplicate email crashes.

---

## File 11: `server/src/routes/` — Routing Topology & Authorization Injection

All routes are grouped into modular Express sub-routers:

```typescript
// server/src/routes/booking.routes.ts
import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect ALL booking routes with requireAuth
router.use(requireAuth);

router.post('/', BookingController.create);
router.get('/', BookingController.getUserBookings);
router.get('/my-bookings', BookingController.getUserBookings);
router.patch('/:id/cancel', BookingController.cancel);

export default router;
```

#### Why `router.use(requireAuth)`?
Rather than repeating `requireAuth` on every line (`router.post('/', requireAuth, create)`), applying `router.use(requireAuth)` at the router level ensures that **every single route declared below it is automatically protected by default**. A developer cannot accidentally expose an unprotected endpoint by forgetting to add a middleware argument!

---

## File 12 & 13: `server/src/app.ts` & `server/src/index.ts` — Server Lifecycle & Bootstrapping

- **`app.ts`**:
  - Bundles middleware (`cors`, `express.json`, `express.urlencoded`).
  - Registers the `/api/health` probe:
    ```typescript
    app.get('/api/health', (_req, res) => {
      res.status(200).json({
        status: 'online',
        service: 'Jadoo Travel API',
        databaseConnected: getDbConnectionStatus(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    });
    ```
  - Mounts routers under `/api/*`.
- **`index.ts`**:
  - Runs the asynchronous pre-flight connection check `await checkDatabaseConnection()`.
  - Starts the HTTP listener: `app.listen(ENV.PORT, () => console.log(...))`.

---

## File 14: `server/tests/test-suite.ts` — Automated 18-Step Integration Suite

A single-file test harness executable via `npm test`. It systematically executes real HTTP requests against the live API, testing:

```typescript
// Sample from test-suite.ts: Testing Login and Wrong Password Rejection
const loginRes = await fetch(`${baseUrl}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: testEmail, password: testPassword })
});
assert(loginRes.status === 200, 'User Login with Correct Password');

const badLoginRes = await fetch(`${baseUrl}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: testEmail, password: 'WrongPassword999!' })
});
assert(badLoginRes.status === 401, 'Security: Rejects Invalid Password Attempt');
```

---

## 14. Deep-Dive Engineering Concepts

### 1. Stateless JWT vs Stateful Session Cookies
- **Stateful Sessions**: Traditional servers store session IDs in Redis or server memory. If you scale across 4 server instances, you need sticky sessions or a shared Redis cluster.
- **Stateless JWTs**: Jadoo stores the user ID and role directly inside the encrypted payload. Any server with `JWT_SECRET` can verify the token without querying a session store, making the backend horizontally scalable.

### 2. SQL Injection Prevention via Parameterized Queries
Never concatenate SQL strings:
```typescript
// ❌ DANGEROUS: Vulnerable to SQL Injection (' OR '1'='1)
pool.query(`SELECT * FROM users WHERE email = '${email}'`);

// ✅ SAFE: Parameterized Query
pool.query('SELECT * FROM users WHERE email = $1', [email]);
```
PostgreSQL's driver sends the query text and the parameter values as separate protocol packets. The SQL parser compiles the query structure *before* substituting values, rendering SQL injection mathematically impossible.

### 3. Timing Attacks & Bcrypt
Standard string comparisons (`if (input === stored)`) exit at the first mismatched character, meaning wrong passwords take slightly less time to evaluate than nearly-correct passwords. Attackers can measure response times in microseconds to guess passwords. `bcrypt.compare` uses a **constant-time byte comparison algorithm**, eliminating timing leaks entirely.

---

## 15. Self-Check Mastery Quiz

1. **Why does `auth.middleware.ts` create an interface `AuthenticatedRequest extends Request`?**
   - *Answer:* To inform TypeScript that `req.user` exists on the request object after token verification, providing autocomplete and preventing type-checker errors across controllers.
2. **What does the `COALESCE($1, column)` SQL function do in `updateProfile`?**
   - *Answer:* It returns the first non-null argument. If `$1` is null (user didn't update that field), it retains the current column value, enabling partial profile updates.
3. **How does `booking.controller.ts` protect against foreign key errors when a user books a Wikipedia search destination?**
   - *Answer:* It checks if the destination ID exists in the database. If not, it sets `destination_id = null` while saving the title and details, preserving foreign key integrity.
4. **Why does `DestinationController.getAll` start its query with `WHERE 1=1`?**
   - *Answer:* It provides a neutral starting condition so that subsequent filters (category, price, search) can always cleanly append ` AND ...` without checking if a `WHERE` keyword was already added.
5. **Why should database queries in Node.js always use parameterized arrays (`$1, $2`) rather than template literals?**
   - *Answer:* Parameterization prevents SQL injection by sending query text and user inputs separately to the database engine.
