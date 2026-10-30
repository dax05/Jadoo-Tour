# ⚡ Jadoo Travel — Phase 4 Study Guide: Client Services & State Management

> **Phase 4 Learning Objective:** Master client-side reactive state management, the Singleton and Observer design patterns, resilient offline-first data caching with LocalStorage, live third-party API integration (Wikipedia REST & EmailJS), bidirectional database synchronization, and higher-order client-side authentication action gates in pure TypeScript.  
> **Philosophy:** *“The client must feel instantaneous, fluid, and alive. It should render from local cache immediately, synchronize with the backend in the background, and never break or freeze even if the user drops offline in the middle of a desert expedition.”*

---

## 📑 Phase 4 Navigation Map

1. [Architectural Overview: The Reactive Client Engine](#1-architectural-overview-the-reactive-client-engine)
2. [File 1: `src/services/storage.service.ts` — Crash-Proof LocalStorage Wrapper](#file-1-srcservicesstorageservicets--crash-proof-localstorage-wrapper)
3. [File 2: `src/services/theme.service.ts` — Reactive Theme State Machine](#file-2-srcservicesthemeservicets--reactive-theme-state-machine)
4. [File 3: `src/services/auth.service.ts` — Authentication, Session & Token Conductor](#file-3-srcservicesauthservicets--authentication-session--token-conductor)
5. [File 4: `src/services/destination.service.ts` — Wikipedia Live Search, Bookings & Wishlist Engine](#file-4-srcservicesdestinationservicets--wikipedia-live-search-bookings--wishlist-engine)
6. [File 5: `src/services/newsletter.service.ts` — Multi-Provider Email Concierge & Dispatch](#file-5-srcservicesnewsletterservicets--multi-provider-email-concierge--dispatch)
7. [File 6: `src/services/testimonial.service.ts` — Traveler Reviews & Cross-Tab Synchronizer](#file-6-srcservicestestimonialservicets--traveler-reviews--cross-tab-synchronizer)
8. [File 7: `src/middleware/auth.middleware.ts` (Client) — Route Guards & Action Gates](#file-7-srcmiddlewareauthmiddlewarets-client--route-guards--action-gates)
9. [Deep-Dive Engineering Concepts](#9-deep-dive-engineering-concepts)
10. [Self-Check Mastery Quiz](#10-self-check-mastery-quiz)

---

## 1. Architectural Overview: The Reactive Client Engine

In modern web development, heavy frontend frameworks (React, Angular, Vue) often introduce megabytes of dependencies and complex virtual DOM reconciliation for simple state tasks.

Jadoo Travel achieves **instantaneous 60fps performance** using a **Pure TypeScript Reactive Services Engine**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE CONTROLLERS                      │
│   NavbarController │ ModalController │ ExplorerController │ ProfileTab │
└───────────────────────┬───────────────────────────────▲────────────────┘
                        │ User Actions                  │ Notifies
                        │ (Click, Type, Toggle)         │ Subscribers
                        ▼                               │
┌───────────────────────────────────────────────────────┴────────────────┐
│               REACTIVE CLIENT SERVICES (SINGLETONS)                    │
│   AuthService │ DestinationService │ ThemeService │ NewsletterService  │
└───────────┬───────────────────────────────────────────┬────────────────┘
            │                                           │
            ▼ (Synchronous Immediate Read/Write)        ▼ (Asynchronous Background Sync)
┌───────────────────────┐                   ┌────────────────────────────┐
│  StorageService       │                   │  Live External APIs        │
│  (LocalStorage Cache) │                   │  - Express REST API (/api) │
│  - Instant boot-up    │                   │  - Wikipedia REST API      │
│  - Offline resilience │                   │  - EmailJS REST Dispatch   │
│  - Cross-tab sync     │                   │  - Web3Forms API           │
└───────────────────────┘                   └────────────────────────────┘
```

### The 4 Core Pillars of Phase 4:

1. **Single Source of Truth (Singleton Pattern)**:
   Only one instance of each service exists in memory throughout the lifetime of the application. When `AuthService` logs a user in, every listening UI component across the DOM updates synchronously.
2. **Reactive Pub-Sub (Observer Pattern)**:
   Services maintain private sets of callback listeners (`Set<Listener>`). When state changes, they broadcast the new state to all registered UI views without tight coupling. Each subscription returns an **unsubscribe closure** to eliminate memory leaks.
3. **Optimistic UI & Eventual Consistency**:
   User actions (adding to wishlist, booking a trip, updating theme) write to local storage immediately, updating the screen in zero milliseconds. The service then asynchronously pushes the change to PostgreSQL via the REST API.
4. **Cross-Tab Synchronization**:
   Native `window.addEventListener('storage', ...)` hooks allow changes in one browser tab (e.g. logging out or submitting a testimonial) to immediately update all other open tabs in real time.

---

## File 1: `src/services/storage.service.ts` — Crash-Proof LocalStorage Wrapper

### 2.1 Purpose & Architectural Duty
Raw `window.localStorage` has severe real-world failure modes:
1. In Safari Private Browsing mode, restricted iframes, or when storage is full, calling `localStorage.setItem()` throws a fatal `QuotaExceededError` or `SecurityError` that crashes the entire JavaScript runtime.
2. Serializing complex objects requires repetitive `JSON.stringify()` and `JSON.parse()` boilerplate, which throws fatal syntax errors on corrupted data.
3. It provides zero type safety.

[storage.service.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/services/storage.service.ts) solves all three issues by wrapping all storage operations in a crash-proof, strongly-typed generic interface.

### 2.2 Complete Annotated Code
```typescript
/**
 * Safe, strongly typed local storage wrapper service
 */

export class StorageService {
  /**
   * Probes whether localStorage is available and writable
   */
  private static isAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retrieve and deserialize a typed JSON object safely
   */
  public static getItem<T>(key: string, fallback: T): T {
    if (!this.isAvailable()) return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  /**
   * Retrieve a plain string without JSON parse overhead
   */
  public static getString(key: string, fallback = ''): string {
    if (!this.isAvailable()) return fallback;
    try {
      const val = window.localStorage.getItem(key);
      return val !== null ? val : fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Serialize and store a typed value safely
   */
  public static setItem<T>(key: string, value: T): boolean {
    if (!this.isAvailable()) return false;
    try {
      const payload = typeof value === 'string' ? value : JSON.stringify(value);
      window.localStorage.setItem(key, payload);
      return true;
    } catch (err) {
      console.warn(`[StorageService] Failed to set item "${key}":`, err);
      return false;
    }
  }

  /**
   * Remove an item from localStorage safely
   */
  public static removeItem(key: string): boolean {
    if (!this.isAvailable()) return false;
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
}
```

### 2.3 Deep Line-by-Line Breakdown & Concepts

- **Lines 8–18 (`isAvailable()`)**:
  - **The Probe Technique**: Instead of merely checking `if (window.localStorage)` (which evaluates to `true` in Safari Private Browsing even though calling `setItem()` throws an exception), this method executes a live write and immediate deletion of a dummy key `__storage_test__`.
  - If any exception is thrown, it returns `false`. All subsequent methods gracefully return fallback data rather than crashing the page.
- **Lines 23–32 (`getItem<T>(key, fallback): T`)**:
  - **TypeScript Generics (`<T>`)**: Allows the caller to declare the expected return type:
    ```typescript
    const bookings = StorageService.getItem<BookingRecord[]>(STORAGE_KEYS.BOOKINGS, []);
    ```
    TypeScript automatically types `bookings` as `BookingRecord[]` without requiring dangerous manual type assertions (`as BookingRecord[]`).
  - **Defensive Fallback**: If the key is missing (`raw === null`) or the stored string is corrupt and cannot be parsed by `JSON.parse()`, the provided `fallback` default is returned cleanly.
- **Lines 37–45 (`getString(key, fallback)`)**:
  - Bypasses `JSON.parse()` for pure strings (such as auth tokens or theme names `'dark'`/`'light'`), saving CPU cycles and preventing string quoting errors.
- **Lines 50–60 (`setItem<T>(key, value): boolean`)**:
  - Checks `typeof value === 'string'`. If it is already a string, it avoids redundant `JSON.stringify()` quotes.
  - Returns `boolean` status (`true` on success, `false` on storage quota exceeded) allowing callers to handle storage exhaustion gracefully.

---

## File 2: `src/services/theme.service.ts` — Reactive Theme State Machine

### 3.1 Purpose & Architectural Duty
Controls dark and light theme switching across the entire application. It reads the traveler's saved preference, detects the operating system's color scheme (`prefers-color-scheme`), mutates the root DOM, swaps image assets (light logo vs. dark logo), updates icon states, and notifies subscribers.

### 3.2 Complete Annotated Code
```typescript
import { ASSET_PATHS } from '../constants/config';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { ThemeChangeListener, ThemeMode } from '../types/theme.types';
import { StorageService } from './storage.service';

/**
 * Centralized Reactive Theme Management Service
 */
export class ThemeService {
  private static instance: ThemeService | null = null;
  private currentMode: ThemeMode = 'light';
  private listeners: Set<ThemeChangeListener> = new Set();
  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  private constructor() {
    this.init();
  }

  public static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  private init(): void {
    const saved = StorageService.getString(STORAGE_KEYS.THEME, '');
    if (saved === 'dark' || saved === 'light') {
      this.currentMode = saved;
    } else {
      this.currentMode = this.mediaQuery.matches ? 'dark' : 'light';
    }

    this.applyTheme(this.currentMode, false);

    // Listen for OS scheme adjustments when no explicit storage exists
    this.mediaQuery.addEventListener('change', (e) => {
      const explicit = StorageService.getString(STORAGE_KEYS.THEME, '');
      if (!explicit) {
        this.setTheme(e.matches ? 'dark' : 'light', false);
      }
    });
  }

  public isDark(): boolean {
    return this.currentMode === 'dark';
  }

  public getTheme(): ThemeMode {
    return this.currentMode;
  }

  public toggle(): ThemeMode {
    const next = this.currentMode === 'dark' ? 'light' : 'dark';
    this.setTheme(next, true);
    return next;
  }

  public setTheme(mode: ThemeMode, persist = true): void {
    this.currentMode = mode;
    if (persist) {
      StorageService.setItem(STORAGE_KEYS.THEME, mode);
    }
    this.applyTheme(mode);
  }

  public subscribe(listener: ThemeChangeListener): () => void {
    this.listeners.add(listener);
    // Immediately invoke listener with current state
    listener(this.isDark(), this.currentMode);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private applyTheme(mode: ThemeMode, notify = true): void {
    const isDarkMode = mode === 'dark';

    // 1. Toggle class on body
    document.body.classList.toggle('dark-mode', isDarkMode);

    // 2. Update all toggle button icons
    const toggleButtons = document.querySelectorAll('.theme-toggle');
    toggleButtons.forEach((btn) => {
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = isDarkMode ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      }
      btn.setAttribute('aria-label', isDarkMode ? 'Switch to light mode' : 'Switch to dark mode');
    });

    // 3. Update all logo images
    const logoSrc = isDarkMode ? ASSET_PATHS.LOGO_DARK : ASSET_PATHS.LOGO_LIGHT;
    const logos = document.querySelectorAll<HTMLImageElement>('.Top-Logo, .auth-logo, .profile-logo-img');
    logos.forEach((img) => {
      if (!img.src.endsWith(logoSrc)) {
        img.src = logoSrc;
      }
    });

    // 4. Notify subscribers
    if (notify) {
      this.listeners.forEach((listener) => listener(isDarkMode, mode));
    }
  }

  public bindToggleButtons(selector = '.theme-toggle'): void {
    const buttons = document.querySelectorAll<HTMLElement>(selector);
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle();
      });
    });
  }
}

export const themeService = ThemeService.getInstance();
```

### 3.3 Deep Line-by-Line Breakdown & Concepts

- **Lines 10–24 (`Singleton Pattern`)**:
  - `private constructor()` prevents direct instantiation via `new ThemeService()`.
  - `ThemeService.getInstance()` ensures exactly one instance controls theme changes across all pages.
- **Lines 26–43 (`init()` & OS Scheme Sync)**:
  - Checks `StorageService.getString(STORAGE_KEYS.THEME)`.
  - If no saved choice exists, it inspects `this.mediaQuery.matches` (`prefers-color-scheme: dark`) to match the user's OS desktop appearance.
  - Registers an event listener on the `mediaQuery` so that if the user's operating system switches to dark mode at sunset, the web app changes instantaneously.
- **Lines 61–68 (`subscribe(listener)`)**:
  - Implements the **Observer Pattern**. Calling `subscribe(listener)` registers a callback and invokes it immediately with the current state.
  - Returns a cleanup function: `return () => { this.listeners.delete(listener); };`. This prevents memory leaks if a component unmounts.
- **Lines 70–97 (`applyTheme(mode, notify)`)**:
  - Synchronously toggles the `dark-mode` CSS class on `document.body`.
  - Updates all theme toggle icons across the DOM to a sun (`fa-sun`) or moon (`fa-moon`).
  - Swaps the navigation logo to `Logo-dark.svg` so high brand contrast is maintained.

---

## File 3: `src/services/auth.service.ts` — Authentication, Session & Token Conductor

### 4.1 Purpose & Architectural Duty
[auth.service.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/services/auth.service.ts) is the central client-side authentication engine. It coordinates registration, login, logout, profile updates, and JWT management. It operates in a **hybrid resilient architecture**: it communicates with the live Express REST API (`/api/auth/*`), stores the issued JWT, and if the backend is temporarily offline, seamlessly falls back to a simulated local storage user database without disrupting user testing.

### 4.2 Complete Annotated Code
```typescript
import { STORAGE_KEYS } from '../constants/storage-keys';
import { API_CONFIG } from '../constants/config';
import { AuthResponse, UserAccount, UserSession } from '../types/auth.types';
import { StorageService } from './storage.service';

/**
 * Authentication and Session Management Service
 */
export class AuthService {
  private static instance: AuthService | null = null;
  private currentSession: UserSession | null = null;
  private sessionListeners: Set<(session: UserSession | null) => void> = new Set();

  private constructor() {
    this.initSession();
    this.listenToStorageEvents();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private initSession(): void {
    this.currentSession = StorageService.getItem<UserSession | null>(STORAGE_KEYS.USER_SESSION, null);
  }

  /**
   * Real-time cross-tab synchronization
   */
  private listenToStorageEvents(): void {
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.USER_SESSION) {
        this.initSession();
        this.notifyListeners();
      }
    });
  }

  public getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  public isAuthenticated(): boolean {
    return this.currentSession !== null;
  }

  /**
   * Pre-configured demo traveler account for immediate evaluation
   */
  private static DEFAULT_USER: UserAccount = {
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@example.com',
    password: 'Password123!',
    registeredAt: '2024-01-15T08:00:00.000Z',
    phone: '+1 (555) 749-2810',
    avatar: 'avatar-1',
    bio: 'Passionate globetrotter seeking sunset vistas, historic cobblestones, and local street cuisine.',
    country: 'United States',
    loyaltyTier: 'Gold Adventurer',
    loyaltyPoints: 1450,
    preferences: {
      currency: 'USD',
      language: 'English',
      mealPreference: 'Standard',
      seatPreference: 'Window',
      homeAirport: 'JFK — New York International',
      emailAlerts: true,
      smsAlerts: true,
    },
  };

  public getUsers(): UserAccount[] {
    const users = StorageService.getItem<UserAccount[]>(STORAGE_KEYS.USERS_DB, []);
    if (users.length === 0) {
      const seeded = [AuthService.DEFAULT_USER];
      StorageService.setItem(STORAGE_KEYS.USERS_DB, seeded);
      return seeded;
    }
    return users;
  }

  /**
   * Register a new traveler: attempts Express API first, falls back to LocalStorage
   */
  public async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // 1. Attempt API Registration with Express + PostgreSQL
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, email: cleanEmail, password }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.token) {
          StorageService.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
        }
        const session: UserSession = {
          name: data.user.name,
          email: data.user.email,
          loggedInAt: new Date().toISOString(),
          avatar: data.user.avatarUrl || 'avatar-1',
          loyaltyTier: 'Gold Adventurer',
          loyaltyPoints: data.user.points || 1250,
        };
        this.setSession(session);
        return { success: true, user: session };
      } else if (!response.ok && data.message) {
        return { success: false, error: data.message };
      }
    } catch {
      // Backend not running, proceed smoothly to local storage fallback
    }

    // 2. Local Fallback Database
    const users = this.getUsers();
    const exists = users.some((u) => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      return {
        success: false,
        error: 'An account with this email already exists. Please log in.',
      };
    }

    const newUser: UserAccount = {
      name: cleanName,
      email: cleanEmail,
      password,
      registeredAt: new Date().toISOString(),
      loyaltyTier: 'Gold Adventurer',
      loyaltyPoints: 1250,
      avatar: 'avatar-1',
      preferences: {
        currency: 'USD',
        language: 'English',
        mealPreference: 'Standard',
        seatPreference: 'Window',
        emailAlerts: true,
        smsAlerts: true,
      },
    };

    users.push(newUser);
    StorageService.setItem(STORAGE_KEYS.USERS_DB, users);

    const session: UserSession = {
      name: cleanName,
      email: cleanEmail,
      loggedInAt: new Date().toISOString(),
      avatar: newUser.avatar,
      loyaltyTier: newUser.loyaltyTier,
      loyaltyPoints: newUser.loyaltyPoints,
      preferences: newUser.preferences,
    };

    this.setSession(session);
    return { success: true, user: session };
  }

  /**
   * Log in a traveler: attempts Express API first, falls back to LocalStorage
   */
  public async login(email: string, password: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Attempt API Login with Express + PostgreSQL
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.token) {
          StorageService.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
        }
        const session: UserSession = {
          name: data.user.name,
          email: data.user.email,
          loggedInAt: new Date().toISOString(),
          phone: data.user.phone,
          avatar: data.user.avatarUrl || 'avatar-1',
          bio: data.user.bio,
          country: data.user.homeCity,
          passportNumber: data.user.passportNumber,
          loyaltyTier: 'Gold Adventurer',
          loyaltyPoints: data.user.points || 1250,
        };
        this.setSession(session);
        return { success: true, user: session };
      } else if (!response.ok && data.message) {
        return { success: false, error: data.message };
      }
    } catch {
      // Backend not running, proceed to local storage fallback
    }

    // 2. Local Storage Fallback
    const users = this.getUsers();
    const account = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!account) {
      return {
        success: false,
        error: 'No account found with this email. Please check your email or sign up.',
      };
    }

    if (account.password !== password) {
      return {
        success: false,
        error: 'Incorrect password. Please verify your credentials and try again.',
      };
    }

    const session: UserSession = {
      name: account.name,
      email: account.email,
      loggedInAt: new Date().toISOString(),
      phone: account.phone,
      avatar: account.avatar || 'avatar-1',
      bio: account.bio,
      country: account.country,
      passportNumber: account.passportNumber,
      emergencyContact: account.emergencyContact,
      loyaltyTier: account.loyaltyTier || 'Gold Adventurer',
      loyaltyPoints: account.loyaltyPoints ?? 1250,
      preferences: account.preferences,
    };

    this.setSession(session);
    return { success: true, user: session };
  }

  public getUserAccount(email?: string): UserAccount | undefined {
    const targetEmail = (email || this.currentSession?.email || '').toLowerCase().trim();
    if (!targetEmail) return undefined;
    return this.getUsers().find((u) => u.email.toLowerCase() === targetEmail);
  }

  /**
   * Update profile details with deep merge and email uniqueness validation
   */
  public updateProfile(updatedData: Partial<UserAccount>): { success: boolean; user?: UserSession; error?: string } {
    if (!this.currentSession) {
      return { success: false, error: 'User is not logged in.' };
    }

    const users = this.getUsers();
    const index = users.findIndex((u) => u.email.toLowerCase() === this.currentSession!.email.toLowerCase());
    if (index === -1) {
      return { success: false, error: 'User account not found.' };
    }

    const currentAcc = users[index];
    const newName = updatedData.name ? updatedData.name.trim() : currentAcc.name;
    const newEmail = updatedData.email ? updatedData.email.trim().toLowerCase() : currentAcc.email;

    if (newEmail !== currentAcc.email.toLowerCase()) {
      const emailTaken = users.some((u, i) => i !== index && u.email.toLowerCase() === newEmail);
      if (emailTaken) {
        return { success: false, error: 'This email is already in use by another account.' };
      }
    }

    const updatedAcc: UserAccount = {
      ...currentAcc,
      ...updatedData,
      name: newName,
      email: newEmail,
      preferences: {
        ...(currentAcc.preferences || {}),
        ...(updatedData.preferences || {}),
      },
    };

    users[index] = updatedAcc;
    StorageService.setItem(STORAGE_KEYS.USERS_DB, users);

    const updatedSession: UserSession = {
      ...this.currentSession,
      name: updatedAcc.name,
      email: updatedAcc.email,
      phone: updatedAcc.phone,
      avatar: updatedAcc.avatar,
      bio: updatedAcc.bio,
      country: updatedAcc.country,
      passportNumber: updatedAcc.passportNumber,
      emergencyContact: updatedAcc.emergencyContact,
      loyaltyTier: updatedAcc.loyaltyTier || 'Gold Adventurer',
      loyaltyPoints: updatedAcc.loyaltyPoints ?? 1250,
      preferences: updatedAcc.preferences,
    };

    this.setSession(updatedSession);
    return { success: true, user: updatedSession };
  }

  public changePassword(oldPassword: string, newPassword: string): { success: boolean; error?: string } {
    if (!this.currentSession) {
      return { success: false, error: 'User is not logged in.' };
    }

    const users = this.getUsers();
    const index = users.findIndex((u) => u.email.toLowerCase() === this.currentSession!.email.toLowerCase());
    if (index === -1) {
      return { success: false, error: 'User account not found.' };
    }

    if (users[index].password !== oldPassword) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    users[index].password = newPassword;
    StorageService.setItem(STORAGE_KEYS.USERS_DB, users);
    return { success: true };
  }

  public getToken(): string | null {
    return StorageService.getItem<string | null>(STORAGE_KEYS.AUTH_TOKEN, null);
  }

  public logout(): void {
    this.currentSession = null;
    StorageService.removeItem(STORAGE_KEYS.USER_SESSION);
    StorageService.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    this.notifyListeners();
  }

  public subscribe(listener: (session: UserSession | null) => void): () => void {
    this.sessionListeners.add(listener);
    listener(this.currentSession);
    return () => {
      this.sessionListeners.delete(listener);
    };
  }

  private setSession(session: UserSession): void {
    this.currentSession = session;
    StorageService.setItem(STORAGE_KEYS.USER_SESSION, session);
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.sessionListeners.forEach((listener) => listener(this.currentSession));
  }
}

export const authService = AuthService.getInstance();
```

### 4.3 Deep Line-by-Line Breakdown & Concepts

- **Lines 28–37 (`listenToStorageEvents()`)**:
  - Employs the browser's native `StorageEvent`.
  - When a user logs in or out in Tab A, Tab B instantly intercepts the change, updates `this.currentSession`, and calls `this.notifyListeners()`, switching the navigation bar without a page refresh!
- **Lines 79–110 (`register()` Live API Attempt)**:
  - Dispatches an asynchronous `POST` request to `${API_CONFIG.BASE_URL}/auth/register`.
  - On a `200 OK` response with a valid JWT string, the token is saved in `STORAGE_KEYS.AUTH_TOKEN` and the returned user profile is committed to session state.
- **Lines 112–155 (Graceful Offline Fallback)**:
  - If the server is unreachable or offline, the `catch` block intercepts the failure silently. It records the traveler in `STORAGE_KEYS.USERS_DB` so the user can test the full booking flow even without PostgreSQL running.
- **Lines 235–288 (`updateProfile()`)**:
  - Performs a shallow clone of the user record while deeply merging `preferences`.
  - Verifies that if the user edits their email address, no other user in the database is already using that address (`emailTaken` check).
- **Lines 314–319 (`logout()`)**:
  - Evicts both the active session and the JWT from storage simultaneously, then broadcasts `null` to all subscribers, reverting the avatar back to the "Login / Sign up" button.

---

## File 4: `src/services/destination.service.ts` — Wikipedia Live Search, Bookings & Wishlist Engine

### 5.1 Purpose & Architectural Duty
[destination.service.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/services/destination.service.ts) is the most feature-packed service in the frontend architecture (883 lines). It manages:
1. Curated destination packages and initial seeds.
2. Real-time live destination searching querying the official Wikipedia REST API.
3. Natural Language Processing (NLP) heuristics that filter out non-geographic entities (clothing, cars, animals, movies) and non-scenic imagery (flags, maps, coat-of-arms SVG graphics).
4. Deterministic hashing algorithms that calculate realistic travel pricing and durations.
5. In-memory and LocalStorage wishlist management with backend synchronization.
6. Trip booking reservation creation, cancellation, and PostgreSQL database synchronization.

### 5.2 Complete Annotated Code
```typescript
import { Destination, WikipediaSummaryResponse, BookingRequest, BookingRecord } from '../types/destination.types';
import { StorageService } from './storage.service';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { API_CONFIG } from '../constants/config';
import { authService } from './auth.service';

interface CuratedDestinationSeed {
  slug: string;
  title: string;
  country: string;
  price: string;
  duration: string;
  rating: number;
  category: 'europe' | 'asia' | 'americas' | 'africa' | 'oceania';
  fallbackImage: string;
  fallbackDesc: string;
  coordinates: {
    lat: number;
    lon: number;
  };
}

const INITIAL_DESTINATIONS_SEED: CuratedDestinationSeed[] = [
  {
    slug: 'Paris',
    title: 'Paris, France',
    country: 'France',
    price: '$2,450',
    duration: '7 Days Trip',
    rating: 4.9,
    category: 'europe',
    fallbackImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
    fallbackDesc: 'The City of Light captivates travelers with the Eiffel Tower, world-class art at the Louvre, and charming romantic cafés along the Seine.',
    coordinates: { lat: 48.8566, lon: 2.3522 },
  },
  {
    slug: 'Tokyo',
    title: 'Tokyo, Japan',
    country: 'Japan',
    price: '$3,100',
    duration: '10 Days Trip',
    rating: 4.95,
    category: 'asia',
    fallbackImage: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
    fallbackDesc: 'A mesmerizing contrast of neon-lit skyscrapers and historic temples, celebrated for culinary mastery and cutting-edge culture.',
    coordinates: { lat: 35.6762, lon: 139.6503 },
  },
  {
    slug: 'Bali',
    title: 'Bali, Indonesia',
    country: 'Indonesia',
    price: '$1,680',
    duration: '8 Days Trip',
    rating: 4.88,
    category: 'asia',
    fallbackImage: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
    fallbackDesc: 'Tropical paradise renowned for volcanic mountains, lush terraced rice paddies, serene beaches, and sacred ancient shrines.',
    coordinates: { lat: -8.4095, lon: 115.1889 },
  },
  {
    slug: 'Rome',
    title: 'Rome, Italy',
    country: 'Italy',
    price: '$2,200',
    duration: '6 Days Trip',
    rating: 4.92,
    category: 'europe',
    fallbackImage: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80',
    fallbackDesc: 'Step back through millennia of civilization amid the majestic Colosseum, Vatican treasures, and exquisite Italian cuisine.',
    coordinates: { lat: 41.9028, lon: 12.4964 },
  },
  {
    slug: 'New_York_City',
    title: 'New York City, USA',
    country: 'United States',
    price: '$2,890',
    duration: '5 Days Trip',
    rating: 4.85,
    category: 'americas',
    fallbackImage: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80',
    fallbackDesc: 'The exhilarating metropolis of Broadway, Central Park, and the Statue of Liberty, pulsing with boundless energy and culture.',
    coordinates: { lat: 40.7128, lon: -74.0060 },
  },
  {
    slug: 'Cairo',
    title: 'Cairo, Egypt',
    country: 'Egypt',
    price: '$1,950',
    duration: '9 Days Trip',
    rating: 4.79,
    category: 'africa',
    fallbackImage: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=800&q=80',
    fallbackDesc: 'Home of the timeless Great Pyramids of Giza, the Nile River, and centuries of vibrant bazaars and Pharaonic wonders.',
    coordinates: { lat: 30.0444, lon: 31.2357 },
  },
  {
    slug: 'Santorini',
    title: 'Santorini, Greece',
    country: 'Greece',
    price: '$2,650',
    duration: '7 Days Trip',
    rating: 4.96,
    category: 'europe',
    fallbackImage: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80',
    fallbackDesc: 'Iconic whitewashed cliffside villas, cobalt-blue domes, and world-famous golden sunsets overlooking the Aegean caldera.',
    coordinates: { lat: 36.3932, lon: 25.4615 },
  },
  {
    slug: 'Sydney',
    title: 'Sydney, Australia',
    country: 'Australia',
    price: '$3,400',
    duration: '12 Days Trip',
    rating: 4.87,
    category: 'oceania',
    fallbackImage: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=80',
    fallbackDesc: 'A sun-drenched coastal capital boasting the architectural jewel of the Sydney Opera House, Harbour Bridge, and Bondi Beach.',
    coordinates: { lat: -33.8688, lon: 151.2093 },
  },
];

export class DestinationService {
  private static searchCache: Map<string, Destination[]> = new Map();
  private static initialCache: Destination[] | null = null;

  /**
   * Filter out non-scenic Wikipedia imagery (flags, coats of arms, maps, SVG icons)
   */
  private static isScenicPhoto(url: string | undefined): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    if (lower.includes('flag') || lower.includes('map') || lower.includes('coat_of_arms') || lower.includes('symbol') || lower.includes('.svg')) {
      return false;
    }
    return true;
  }

  /**
   * Sanitizes Wikipedia text extracts, removing parenthetical noise and truncating cleanly
   */
  private static cleanExtract(extract: string | undefined, maxChars = 140): string {
    if (!extract) return 'Discover picturesque views, unique heritage, and unforgettable travel experiences.';
    const sanitized = extract.replace(/\s*\([^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim();
    if (sanitized.length <= maxChars) return sanitized;
    const truncated = sanitized.slice(0, maxChars);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 60 ? truncated.slice(0, lastSpace) : truncated) + '...';
  }

  /**
   * Bitwise hash generator for deterministic price calculation
   */
  private static estimatePrice(seedStr: string): string {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash << 5) - hash + seedStr.charCodeAt(i);
      hash |= 0;
    }
    const val = 1200 + (Math.abs(hash) % 2800);
    return `$${(val / 1000).toFixed(2)}k`;
  }

  /**
   * Generates deterministic trip duration from title length
   */
  private static estimateDuration(seedStr: string): string {
    const days = 5 + (seedStr.length % 10);
    return `${days} Days Trip`;
  }

  private static wishlistListeners: Array<(items: Destination[]) => void> = [];
  private static bookingsListeners: Array<(records: BookingRecord[]) => void> = [];

  public static onWishlistChange(cb: (items: Destination[]) => void): () => void {
    this.wishlistListeners.push(cb);
    return () => {
      this.wishlistListeners = this.wishlistListeners.filter((l) => l !== cb);
    };
  }

  public static onBookingsChange(cb: (records: BookingRecord[]) => void): () => void {
    this.bookingsListeners.push(cb);
    return () => {
      this.bookingsListeners = this.bookingsListeners.filter((l) => l !== cb);
    };
  }

  private static notifyWishlistChange(): void {
    const items = this.getWishlistDestinations();
    this.wishlistListeners.forEach((cb) => {
      try { cb(items); } catch (e) { console.error('[DestinationService] Wishlist listener error:', e); }
    });
  }

  private static notifyBookingsChange(): void {
    const records = this.getBookings();
    this.bookingsListeners.forEach((cb) => {
      try { cb(records); } catch (e) { console.error('[DestinationService] Bookings listener error:', e); }
    });
  }

  public static getFavoriteIds(): string[] {
    return StorageService.getItem<string[]>(STORAGE_KEYS.FAVORITES, []);
  }

  public static getWishlistDestinations(): Destination[] {
    return StorageService.getItem<Destination[]>(STORAGE_KEYS.WISHLIST_ITEMS, []);
  }

  /**
   * Toggle favorite state for a destination with bidirectional backend synchronization
   */
  public static toggleFavorite(destOrId: Destination | string): boolean {
    const id = typeof destOrId === 'string' ? destOrId : destOrId.id;
    const favorites = this.getFavoriteIds();
    const wishlistItems = this.getWishlistDestinations();
    const index = favorites.indexOf(id);
    let isNowFavorite = false;

    if (index >= 0) {
      favorites.splice(index, 1);
      isNowFavorite = false;
      const itemIdx = wishlistItems.findIndex((d) => d.id === id);
      if (itemIdx >= 0) {
        wishlistItems.splice(itemIdx, 1);
      }
    } else {
      favorites.push(id);
      isNowFavorite = true;

      const resolved = typeof destOrId === 'string' ? this.getDestinationById(id) : destOrId;
      if (resolved && !wishlistItems.some((d) => d.id === id)) {
        wishlistItems.push({
          ...resolved,
          isFavorite: true,
        });
      }
    }

    StorageService.setItem(STORAGE_KEYS.FAVORITES, favorites);
    StorageService.setItem(STORAGE_KEYS.WISHLIST_ITEMS, wishlistItems);
    this.notifyWishlistChange();
    this.syncWishlistToBackend(id);
    return isNowFavorite;
  }

  public static removeFromWishlist(id: string): void {
    const favorites = this.getFavoriteIds().filter((favId) => favId !== id);
    const wishlistItems = this.getWishlistDestinations().filter((d) => d.id !== id);
    StorageService.setItem(STORAGE_KEYS.FAVORITES, favorites);
    StorageService.setItem(STORAGE_KEYS.WISHLIST_ITEMS, wishlistItems);
    this.notifyWishlistChange();
  }

  public static clearWishlist(): void {
    StorageService.setItem(STORAGE_KEYS.FAVORITES, []);
    StorageService.setItem(STORAGE_KEYS.WISHLIST_ITEMS, []);
    this.notifyWishlistChange();
  }

  /**
   * Fetch initial 8 featured destinations dynamically using the free Wikipedia Summary API
   */
  public static async getInitialDestinations(): Promise<Destination[]> {
    if (this.initialCache && this.initialCache.length === 8) {
      const favs = this.getFavoriteIds();
      return this.initialCache.map((d) => ({
        ...d,
        isFavorite: favs.includes(d.id),
      }));
    }

    const favs = this.getFavoriteIds();

    const fetchPromises = INITIAL_DESTINATIONS_SEED.map(async (seed): Promise<Destination> => {
      try {
        const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(seed.slug)}`, {
          headers: {
            'User-Agent': 'JadooTravel/1.0 (Travel Website Destination Explorer)',
          },
        });

        if (response.ok) {
          const data: WikipediaSummaryResponse = await response.json();
          const imgUrl = (this.isScenicPhoto(data.thumbnail?.source) ? data.thumbnail?.source : null) || seed.fallbackImage;
          const desc = data.extract ? this.cleanExtract(data.extract) : seed.fallbackDesc;

          return {
            id: `dest-${seed.slug.toLowerCase()}`,
            title: seed.title,
            subtitle: seed.country,
            description: desc,
            imageUrl: imgUrl,
            price: seed.price,
            duration: seed.duration,
            rating: seed.rating,
            category: seed.category,
            coordinates: data.coordinates || seed.coordinates,
            isFavorite: favs.includes(`dest-${seed.slug.toLowerCase()}`),
          };
        }
      } catch (err) {
        console.warn(`[DestinationService] Wikipedia API fetch error for ${seed.slug}, using fallback:`, err);
      }

      // Safe resilient fallback
      return {
        id: `dest-${seed.slug.toLowerCase()}`,
        title: seed.title,
        subtitle: seed.country,
        description: seed.fallbackDesc,
        imageUrl: seed.fallbackImage,
        price: seed.price,
        duration: seed.duration,
        rating: seed.rating,
        category: seed.category,
        coordinates: seed.coordinates,
        isFavorite: favs.includes(`dest-${seed.slug.toLowerCase()}`),
      };
    });

    try {
      const results = await Promise.all(fetchPromises);
      this.initialCache = results;
      return results;
    } catch {
      return INITIAL_DESTINATIONS_SEED.map((seed) => ({
        id: `dest-${seed.slug.toLowerCase()}`,
        title: seed.title,
        subtitle: seed.country,
        description: seed.fallbackDesc,
        imageUrl: seed.fallbackImage,
        price: seed.price,
        duration: seed.duration,
        rating: seed.rating,
        category: seed.category,
        coordinates: seed.coordinates,
        isFavorite: favs.includes(`dest-${seed.slug.toLowerCase()}`),
      }));
    }
  }

  private static readonly POSITIVE_GEO_TERMS = [
    'country', 'sovereign state', 'city', 'capital', 'island', 'town', 'village', 'province', 'state',
    'municipality', 'territory', 'region', 'continent', 'peninsula', 'archipelago',
    'beach', 'mountain', 'mount ', 'lake', 'river', 'valley', 'waterfall', 'canyon',
    'national park', 'monument', 'resort', 'temple', 'castle', 'palace',
    'cathedral', 'sanctuary', 'landmark', 'tourist attraction', 'attraction', 'tourist', 'destination',
    'ruins', 'archaeological site', 'historic site', 'world heritage site', 'atoll',
    'settlement', 'oasis', 'volcano', 'coast', 'coastal'
  ];

  private static readonly NEGATIVE_ENTITY_TERMS = [
    'container', 'bag', 'handbag', 'accessory', 'clothing', 'footwear', 'shoe', 'garment',
    'edible', 'fruit', 'vegetable', 'dish', 'food', 'recipe', 'species', 'breed',
    'canid', 'mammal', 'insect', 'animal', 'plant', 'machine', 'device',
    'vehicle', 'automobile', 'car model', 'aircraft', 'tool', 'instrument',
    'film', 'movie', 'television series', 'actor', 'actress', 'singer',
    'musician', 'band', 'album', 'song', 'video game', 'software', 'programming',
    'novel', 'book', 'magazine', 'company', 'corporation', 'brand', 'chemical',
    'disease', 'disaster', 'attack', 'bombing', 'battle', 'war', 'treaty',
    'politician', 'political party', 'legislature', 'parliament', 'court', 'law',
    'railway station', 'station', 'football', 'sports club', 'satire', 'slang',
    'mythological', 'concept', 'philosophy', 'euthanasia', 'crime', 'murder',
    'suicide', 'airline', 'airport', 'cycling', 'tournament'
  ];

  private static readonly EXCLUDED_TITLES = [
    '(disambiguation)', 'list of', 'demographics of', 'economy of', 'history of',
    'politics of', 'geography of', 'foreign relations', 'commune', 'airport', 'railway'
  ];

  /**
   * Strictly validates whether a Wikipedia article represents a genuine travel/geographic destination
   */
  private static isTravelDestination(item: {
    title?: string;
    description?: string;
    extract?: string;
    hasCoordinates?: boolean;
  }): boolean {
    const title = (item.title || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const extract = (item.extract || '').toLowerCase().slice(0, 350);
    const combined = `${desc} ${extract}`;

    // 1. Exclude disambiguations, lists, meta pages
    if (this.EXCLUDED_TITLES.some((term) => title.includes(term))) {
      return false;
    }

    // 2. Exclude common non-destination entities (objects, bags, animals, movies, devices)
    for (const neg of this.NEGATIVE_ENTITY_TERMS) {
      if (desc.includes(neg)) return false;
      if (
        extract.startsWith(`a ${neg}`) ||
        extract.startsWith(`an ${neg}`) ||
        extract.startsWith(`the ${neg}`) ||
        extract.startsWith(`${neg} `)
      ) {
        return false;
      }
    }

    // 3. Positive geographic verification
    const hasGeogKeyword = this.POSITIVE_GEO_TERMS.some((pos) => combined.includes(pos));
    const hasInLocationDesc =
      /\b(in|of|near)\s+[A-Z]/.test(item.description || '') &&
      !desc.includes('born in') &&
      !desc.includes('founded in') &&
      !desc.includes('manufactured in');

    if (item.hasCoordinates) {
      return hasGeogKeyword || hasInLocationDesc;
    }

    const strongPlaceDef =
      extract.includes('is a country') ||
      extract.includes('is a sovereign state') ||
      extract.includes('is an island') ||
      extract.includes('is a city') ||
      extract.includes('is a province') ||
      extract.includes('is a capital') ||
      extract.includes('is a region') ||
      desc.startsWith('country in') ||
      desc.startsWith('island in') ||
      desc.startsWith('city in') ||
      desc.startsWith('capital of');

    return strongPlaceDef;
  }

  /**
   * Search destinations live via the free Wikipedia search and summary API
   */
  public static async searchDestinations(query: string): Promise<Destination[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return this.getInitialDestinations();
    }

    const cacheKey = trimmed.toLowerCase();
    if (this.searchCache.has(cacheKey)) {
      const favs = this.getFavoriteIds();
      return (this.searchCache.get(cacheKey) || []).map((d) => ({
        ...d,
        isFavorite: favs.includes(d.id),
      }));
    }

    const favs = this.getFavoriteIds();
    const results: Destination[] = [];
    const seenTitles = new Set<string>();

    // 1. Direct match attempt for exact place/city name
    try {
      const directRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(trimmed)}`, {
        headers: {
          'Api-User-Agent': 'JadooTravelApp/1.0 (https://jadoo.travel; contact@jadoo.travel)',
        },
      });

      if (directRes.ok) {
        const directData: WikipediaSummaryResponse = await directRes.json();
        const isDestination = this.isTravelDestination({
          title: directData.title,
          description: directData.description,
          extract: directData.extract,
          hasCoordinates: Boolean(directData.coordinates),
        });

        if (directData.type === 'standard' && directData.title && directData.extract && isDestination) {
          const directImg = (this.isScenicPhoto(directData.thumbnail?.source) ? directData.thumbnail?.source : null) ||
            'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';

          const id = `dest-search-${directData.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          seenTitles.add(directData.title.toLowerCase());

          results.push({
            id,
            title: directData.title,
            subtitle: directData.description || 'Global Destination',
            description: this.cleanExtract(directData.extract),
            imageUrl: directImg,
            price: this.estimatePrice(directData.title),
            duration: this.estimateDuration(directData.title),
            rating: 4.9,
            coordinates: directData.coordinates,
            isFavorite: favs.includes(id),
          });
        }
      }
    } catch {
      // Non-blocking: continue to general search
    }

    // 2. Query Search for related destination articles
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        trimmed
      )}&gsrlimit=16&prop=pageimages|extracts|coordinates|description&exintro=1&explaintext=1&exchars=180&piprop=thumbnail&pithumbsize=600&pilimit=16&format=json&origin=*`;

      const searchRes = await fetch(searchUrl, {
        headers: {
          'Api-User-Agent': 'JadooTravelApp/1.0 (https://jadoo.travel; contact@jadoo.travel)',
        },
      });

      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        const pages = Object.values(searchJson.query?.pages || {}) as Array<{
          title: string;
          extract?: string;
          description?: string;
          coordinates?: Array<{ lat: number; lon: number }>;
          thumbnail?: { source: string };
        }>;

        for (const page of pages) {
          if (!page.title || seenTitles.has(page.title.toLowerCase())) continue;

          const isDestination = this.isTravelDestination({
            title: page.title,
            description: page.description,
            extract: page.extract,
            hasCoordinates: Boolean(page.coordinates && page.coordinates.length > 0),
          });

          if (!isDestination) continue;

          const hasPhoto = this.isScenicPhoto(page.thumbnail?.source);
          const imgUrl = (hasPhoto ? page.thumbnail?.source : null) ||
            'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';

          const id = `dest-search-${page.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          seenTitles.add(page.title.toLowerCase());

          results.push({
            id,
            title: page.title,
            subtitle: page.description || 'Travel Destination',
            description: this.cleanExtract(page.extract),
            imageUrl: imgUrl,
            price: this.estimatePrice(page.title),
            duration: this.estimateDuration(page.title),
            rating: 4.8 + Number(((page.title.length % 3) * 0.05).toFixed(2)),
            coordinates: page.coordinates && page.coordinates.length > 0 ? page.coordinates[0] : undefined,
            isFavorite: favs.includes(id),
          });

          if (results.length >= 8) break;
        }
      }
    } catch (err) {
      console.warn('[DestinationService] Search query error:', err);
    }

    const finalResults = results.slice(0, 8);
    this.searchCache.set(cacheKey, finalResults);
    return finalResults;
  }

  /**
   * Static Top Selling Destinations shown in the initial landing page section
   */
  public static readonly STATIC_TOP_DESTINATIONS: Record<string, Destination> = {
    'static-rome': {
      id: 'static-rome',
      title: 'Rome, Italy',
      subtitle: 'Italy',
      description: 'Rome, the Eternal City, showcases the Colosseum, Pantheon, Vatican City, and incredible Italian culinary traditions spanning millennia of history.',
      imageUrl: 'assets/Images/destination-section/destination-1-rome.png',
      price: '$5.42k',
      duration: '10 Days Trip',
      rating: 4.9,
      coordinates: { lat: 41.9028, lon: 12.4964 },
    },
    'static-london': {
      id: 'static-london',
      title: 'London, UK',
      subtitle: 'United Kingdom',
      description: 'London combines royal heritage with cosmopolitan energy, featuring Big Ben, the Tower of London, world-class West End shows, and charming Thames walks.',
      imageUrl: 'assets/Images/destination-section/destination-2-london.jpg',
      price: '$4.2k',
      duration: '12 Days Trip',
      rating: 4.88,
      coordinates: { lat: 51.5074, lon: -0.1278 },
    },
    'static-europe': {
      id: 'static-europe',
      title: 'Full Europe',
      subtitle: 'Western & Central Europe',
      description: 'The grand European expedition covering Paris, the Swiss Alps, Vienna, Venice, and Barcelona in a curated 28-day luxury travel adventure.',
      imageUrl: 'assets/Images/destination-section/destination-3-europe.png',
      price: '$15k',
      duration: '28 Days Trip',
      rating: 4.96,
      coordinates: { lat: 48.8566, lon: 2.3522 },
    },
    'static-greece': {
      id: 'static-greece',
      title: 'Trip to Greece',
      subtitle: 'Greece',
      description: 'Immerse yourself in Greek history, Aegean turquoise waters, ancient ruins of Athens, and Mediterranean cuisine in this curated 15-day voyage.',
      imageUrl: 'assets/Images/book-section/card-trip-greece.jpeg',
      price: '$2,650',
      duration: '15 Days Trip',
      rating: 4.95,
      coordinates: { lat: 37.9838, lon: 23.7275 },
    },
  };

  /**
   * Convert formatted price string to numeric value (e.g. "$5.42k" -> 5420, "$2,450" -> 2450)
   */
  public static parsePriceToNumber(priceStr: string): number {
    const clean = priceStr.replace(/[$,]/g, '').trim().toLowerCase();
    if (clean.endsWith('k')) {
      const num = parseFloat(clean.replace('k', ''));
      return Math.round(num * 1000);
    }
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 2200 : parsed;
  }

  public static getDestinationById(id: string): Destination | undefined {
    if (this.STATIC_TOP_DESTINATIONS[id]) {
      return this.STATIC_TOP_DESTINATIONS[id];
    }

    if (this.initialCache) {
      const match = this.initialCache.find((d) => d.id === id);
      if (match) return match;
    }

    const seed = INITIAL_DESTINATIONS_SEED.find((s) => `dest-${s.slug.toLowerCase()}` === id);
    if (seed) {
      return {
        id: `dest-${seed.slug.toLowerCase()}`,
        title: seed.title,
        subtitle: seed.country,
        description: seed.fallbackDesc,
        imageUrl: seed.fallbackImage,
        price: seed.price,
        duration: seed.duration,
        rating: seed.rating,
        category: seed.category,
        coordinates: seed.coordinates,
        isFavorite: this.getFavoriteIds().includes(id),
      };
    }

    const wishlist = this.getWishlistDestinations();
    const wishMatch = wishlist.find((d) => d.id === id);
    if (wishMatch) return wishMatch;

    for (const cachedList of this.searchCache.values()) {
      const match = cachedList.find((d) => d.id === id);
      if (match) return match;
    }

    return undefined;
  }

  public static registerDestination(dest: Destination): void {
    if (!this.searchCache.has('__registered__')) {
      this.searchCache.set('__registered__', []);
    }
    const list = this.searchCache.get('__registered__')!;
    if (!list.some((d) => d.id === dest.id)) {
      list.push(dest);
    }
  }

  public static saveBooking(req: BookingRequest): BookingRecord {
    const bookings = StorageService.getItem<BookingRecord[]>(STORAGE_KEYS.BOOKINGS, []);
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    const bookingRecord: BookingRecord = {
      ...req,
      bookingId: `JAD-${randomCode}`,
      createdAt: new Date().toISOString(),
      status: 'confirmed',
    };

    bookings.unshift(bookingRecord);
    StorageService.setItem(STORAGE_KEYS.BOOKINGS, bookings);
    this.notifyBookingsChange();

    // Asynchronously push to PostgreSQL via Express API
    this.syncBookingToBackend(req);

    return bookingRecord;
  }

  public static getBookings(): BookingRecord[] {
    return StorageService.getItem<BookingRecord[]>(STORAGE_KEYS.BOOKINGS, []);
  }

  public static cancelBooking(bookingId: string): boolean {
    const bookings = this.getBookings();
    const target = bookings.find((b) => b.bookingId === bookingId);
    if (target) {
      target.status = 'cancelled';
      StorageService.setItem(STORAGE_KEYS.BOOKINGS, bookings);
      this.notifyBookingsChange();
      this.syncCancelToBackend(bookingId);
      return true;
    }
    return false;
  }

  public static deleteBooking(bookingId: string): boolean {
    const bookings = this.getBookings().filter((b) => b.bookingId !== bookingId);
    StorageService.setItem(STORAGE_KEYS.BOOKINGS, bookings);
    this.notifyBookingsChange();
    return true;
  }

  public static async syncBookingToBackend(req: BookingRequest): Promise<void> {
    try {
      const token = authService.getToken();
      if (!token) return;

      await fetch(`${API_CONFIG.BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          destinationId: req.destinationId,
          destinationTitle: req.destinationTitle,
          departureDate: req.departureDate,
          adults: req.adults,
          children: req.children,
          packageTier: req.packageTier,
          fullName: req.fullName,
          email: req.email,
          phone: req.phone,
          specialRequests: req.specialRequests,
          promoCode: req.promoCode,
          totalPrice: req.totalPrice,
        }),
      });
    } catch {
      // Backend offline or unreachable
    }
  }

  public static async syncCancelToBackend(bookingId: string): Promise<void> {
    try {
      const token = authService.getToken();
      if (!token) return;

      await fetch(`${API_CONFIG.BASE_URL}/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Backend offline or unreachable
    }
  }

  public static async syncWishlistToBackend(destinationId: string): Promise<void> {
    try {
      const token = authService.getToken();
      if (!token) return;

      await fetch(`${API_CONFIG.BASE_URL}/wishlist/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ destinationId }),
      });
    } catch {
      // Backend offline or unreachable
    }
  }

  public static async syncWithBackend(): Promise<void> {
    try {
      const token = authService.getToken();
      if (!token) return;

      // 1. Fetch remote bookings from PostgreSQL
      const bookingsRes = await fetch(`${API_CONFIG.BASE_URL}/bookings/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        if (data.success && Array.isArray(data.bookings) && data.bookings.length > 0) {
          const remoteRecords: BookingRecord[] = data.bookings.map((b: any) => ({
            bookingId: b.id,
            destinationId: b.destination_id || 'dest-custom',
            destinationTitle: b.destination_title,
            departureDate: b.departure_date,
            adults: b.adults,
            children: b.children,
            packageTier: b.package_tier,
            fullName: b.full_name,
            email: b.email,
            phone: b.phone,
            specialRequests: b.special_requests,
            promoCode: b.promo_code,
            totalPrice: Number(b.total_price),
            createdAt: b.created_at,
            status: b.status,
          }));

          StorageService.setItem(STORAGE_KEYS.BOOKINGS, remoteRecords);
          this.notifyBookingsChange();
        }
      }

      // 2. Fetch remote wishlist from PostgreSQL
      const wishRes = await fetch(`${API_CONFIG.BASE_URL}/wishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (wishRes.ok) {
        const wishData = await wishRes.json();
        if (wishData.success && Array.isArray(wishData.wishlist) && wishData.wishlist.length > 0) {
          const ids = wishData.wishlist.map((w: any) => w.id || w.destination_id);
          StorageService.setItem(STORAGE_KEYS.FAVORITES, ids);
          this.notifyWishlistChange();
        }
      }
    } catch {
      // Backend offline or unreachable
    }
  }
}
```

### 5.3 Deep Line-by-Line Breakdown & Concepts

- **Lines 129–137 (`isScenicPhoto(url)`)**:
  - Wikipedia search thumbnails frequently contain non-photographic assets: SVG national flags, heraldic coats of arms, boundary maps, or diagrammatic icons.
  - This heuristic parser checks the image URL for substrings like `flag`, `map`, `coat_of_arms`, and `.svg`. Any matching asset is rejected so the UI renders picturesque Unsplash fallback photography instead.
- **Lines 154–162 (`estimatePrice(seedStr)`)**:
  - Implements the **Java `String.hashCode` bitwise formula**:
    ```typescript
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
    ```
  - `(hash << 5) - hash` is equivalent to `hash * 31`, a classic prime multiplier that distributes characters evenly across 32-bit integer space. `hash |= 0` forces integer truncation in JavaScript's 64-bit float engine.
  - This produces consistent prices for any query: searching `"Kyoto"` tomorrow will produce the exact same price as searching `"Kyoto"` today!
- **Lines 364–453 (`isTravelDestination()` & Negative Entity Filter)**:
  - When querying Wikipedia for terms like `"Bordeaux"`, Wikipedia may return Bordeaux wine (food/drink), FC Girondins de Bordeaux (sports team), or Duke of Bordeaux (historical person).
  - Jadoo's NLP engine compares article extracts against `NEGATIVE_ENTITY_TERMS` (e.g. `fruit`, `vegetable`, `vehicle`, `movie`, `corporation`) and `POSITIVE_GEO_TERMS` (e.g. `city`, `island`, `capital`, `archipelago`, `mountain`).
  - Ensures travelers only explore authentic geographic destinations.
- **Lines 710–728 (`saveBooking(req)`)**:
  - Assigns a confirmation code (`JAD-XXXXX`).
  - Prepend (`unshift`) the new reservation to LocalStorage for an instant UI update, triggers subscriber listeners, and asynchronously calls `syncBookingToBackend()` to push to PostgreSQL.

---

## File 5: `src/services/newsletter.service.ts` — Multi-Provider Email Concierge & Dispatch

### 6.1 Purpose & Architectural Duty
[newsletter.service.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/services/newsletter.service.ts) manages traveler subscriptions, generates customized luxury welcome greetings, issues the `EXPLORE15` discount voucher, and dispatches real live emails via EmailJS REST API with fallback to Web3Forms and simulated interactive preview.

### 6.2 Complete Annotated Code
```typescript
import { STORAGE_KEYS } from '../constants/storage-keys';
import { EMAIL_SERVICE_CONFIG, API_CONFIG } from '../constants/config';
import { StorageService } from './storage.service';
import { EmailApiConfig, NewsletterSubscriber, SendEmailResult } from '../types/newsletter.types';

/**
 * Newsletter & Email Dispatch Service
 * Handles user subscription, local persistence, live EmailJS / Web3Forms delivery, and welcome message generation.
 */
export class NewsletterService {
  private static instance: NewsletterService | null = null;

  public static getInstance(): NewsletterService {
    if (!NewsletterService.instance) {
      NewsletterService.instance = new NewsletterService();
    }
    return NewsletterService.instance;
  }

  public getSubscribers(): NewsletterSubscriber[] {
    return StorageService.getItem<NewsletterSubscriber[]>(STORAGE_KEYS.NEWSLETTER_SUBSCRIBERS, []);
  }

  public isSubscribed(email: string): boolean {
    const clean = email.trim().toLowerCase();
    return this.getSubscribers().some((s) => s.email.toLowerCase() === clean);
  }

  public saveApiConfig(config: EmailApiConfig): void {
    StorageService.setItem(STORAGE_KEYS.EMAIL_API_CONFIG, config);
  }

  public getApiConfig(): EmailApiConfig {
    const stored = StorageService.getItem<EmailApiConfig>(STORAGE_KEYS.EMAIL_API_CONFIG, {});
    let templateId = stored.emailjsTemplateId || EMAIL_SERVICE_CONFIG.EMAILJS_TEMPLATE_ID || '';
    if (templateId === 'template_sibcqgl') {
      templateId = EMAIL_SERVICE_CONFIG.EMAILJS_TEMPLATE_ID;
      this.saveApiConfig({ ...stored, emailjsTemplateId: templateId });
    }
    return {
      emailjsServiceId: stored.emailjsServiceId || EMAIL_SERVICE_CONFIG.EMAILJS_SERVICE_ID || '',
      emailjsTemplateId: templateId,
      emailjsPublicKey: stored.emailjsPublicKey || EMAIL_SERVICE_CONFIG.EMAILJS_PUBLIC_KEY || '',
      web3formsKey: stored.web3formsKey || EMAIL_SERVICE_CONFIG.WEB3FORMS_ACCESS_KEY || '',
    };
  }

  public hasActiveLiveCredentials(): boolean {
    const cfg = this.getApiConfig();
    const hasEmailJs = Boolean(cfg.emailjsServiceId && cfg.emailjsTemplateId && cfg.emailjsPublicKey);
    const hasWeb3Forms = Boolean(cfg.web3formsKey);
    return hasEmailJs || hasWeb3Forms;
  }

  public generateWelcomeMessage(recipientName: string, promoCode: string): string {
    return `Dear ${recipientName},

Welcome to the Jadoo Travel family! ✈️🌍

The world is full of magical places waiting to be explored, and we are absolutely delighted to have you join our private circle of passionate travelers.

Whether you're dreaming of gliding across Venice's tranquil canals, unraveling the eternal mysteries of Rome, or gazing out from the clifftops of Santorini, Jadoo is here to curate moments that will stay with you forever.

As our personal token of gratitude for joining our travel community, please enjoy an exclusive 15% discount on your first booking with us:

🎁 Your VIP Welcome Voucher: ${promoCode}
(Apply this code at booking checkout for 15% off standard, deluxe, and luxury travel packages)

Pack your curiosity — your next great adventure begins now!

With warmest regards,
The Jadoo Travel Concierge Team
concierge@jadoo.travel | www.jadoo.travel`;
  }

  /**
   * Multi-provider email dispatch hierarchy
   */
  public async subscribe(email: string, name?: string): Promise<SendEmailResult> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name?.trim() || cleanEmail.split('@')[0] || 'Traveler';
    const promoCode = EMAIL_SERVICE_CONFIG.WELCOME_PROMO_CODE;
    const subscribers = this.getSubscribers();

    // Record or update subscriber in localStorage
    const existingIndex = subscribers.findIndex((s) => s.email.toLowerCase() === cleanEmail);
    const subscriberRecord: NewsletterSubscriber = {
      email: cleanEmail,
      name: cleanName,
      subscribedAt: new Date().toISOString(),
      promoCode,
    };

    if (existingIndex >= 0) {
      subscribers[existingIndex] = subscriberRecord;
    } else {
      subscribers.push(subscriberRecord);
    }
    StorageService.setItem(STORAGE_KEYS.NEWSLETTER_SUBSCRIBERS, subscribers);

    // Sync to PostgreSQL backend if available
    fetch(`${API_CONFIG.BASE_URL}/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, name: cleanName }),
    }).catch(() => {});

    const cfg = this.getApiConfig();
    const welcomeMsg = this.generateWelcomeMessage(cleanName, promoCode);

    // 1. Try EmailJS REST API if credentials exist
    if (cfg.emailjsServiceId && cfg.emailjsTemplateId && cfg.emailjsPublicKey) {
      try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: cfg.emailjsServiceId,
            template_id: cfg.emailjsTemplateId,
            user_id: cfg.emailjsPublicKey,
            template_params: {
              to_email: cleanEmail,
              email: cleanEmail,
              user_email: cleanEmail,
              recipient: cleanEmail,
              to: cleanEmail,
              reply_to: cleanEmail,
              to_name: cleanName,
              name: cleanName,
              user_name: cleanName,
              subject: 'Welcome to Jadoo — Your Journey Begins Here! 🌍✈️',
              promo_code: promoCode,
              message: welcomeMsg,
            },
          }),
        });

        if (response.ok) {
          return {
            success: true,
            provider: 'emailjs',
            message: `Official welcome email successfully dispatched to ${cleanEmail} via EmailJS!`,
          };
        } else {
          const errText = await response.text();
          console.warn('EmailJS dispatch error:', errText);
          return {
            success: false,
            provider: 'emailjs',
            message: `EmailJS Error: ${errText || 'Delivery rejected'}.`,
            error: errText,
          };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('Network error reaching EmailJS:', err);
        return {
          success: false,
          provider: 'emailjs',
          message: `Network error reaching EmailJS: ${msg}`,
          error: msg,
        };
      }
    }

    // 2. Try Web3Forms if configured
    if (cfg.web3formsKey) {
      try {
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: cfg.web3formsKey,
            email: cleanEmail,
            name: cleanName,
            subject: 'New Jadoo Traveler Subscription',
            message: welcomeMsg,
          }),
        });

        if (response.ok) {
          return {
            success: true,
            provider: 'web3forms',
            message: `Welcome greeting registered and dispatched via Web3Forms!`,
          };
        }
      } catch (err: unknown) {
        console.warn('Network error reaching Web3Forms:', err);
      }
    }

    // 3. Built-in instant interactive delivery preview
    return {
      success: true,
      provider: 'simulated',
      message: `Welcome to Jadoo! Your welcome gift and greeting are ready.`,
    };
  }

  /**
   * Diagnostic verification utility for developer/admin credential testing
   */
  public async testEmailJsConnection(
    serviceId?: string,
    templateId?: string,
    publicKey?: string,
    testEmail: string = 'test@example.com'
  ): Promise<{ success: boolean; message: string; error?: string }> {
    const cfg = this.getApiConfig();
    const sid = serviceId?.trim() || cfg.emailjsServiceId;
    const tid = templateId?.trim() || cfg.emailjsTemplateId;
    const pkey = publicKey?.trim() || cfg.emailjsPublicKey;

    if (!sid || !tid || !pkey) {
      return {
        success: false,
        message: 'Please provide Service ID, Template ID, and Public Key before testing.',
        error: 'Missing required credentials',
      };
    }

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: sid,
          template_id: tid,
          user_id: pkey,
          template_params: {
            to_email: testEmail,
            email: testEmail,
            user_email: testEmail,
            recipient: testEmail,
            to: testEmail,
            reply_to: testEmail,
            to_name: 'Explorer Test',
            name: 'Explorer Test',
            user_name: 'Explorer Test',
            subject: 'Jadoo Travel — EmailJS Live Connection Test',
            promo_code: EMAIL_SERVICE_CONFIG.WELCOME_PROMO_CODE,
            message: 'Your Jadoo Travel EmailJS integration is active and verified!',
          },
        }),
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Connection verified! Test email successfully accepted by EmailJS.',
        };
      } else {
        const errText = await response.text();
        return {
          success: false,
          message: `EmailJS returned: ${errText || response.statusText}`,
          error: errText,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Network error connecting to EmailJS: ${msg}`,
        error: msg,
      };
    }
  }
}

export const newsletterService = NewsletterService.getInstance();
```

### 6.3 Deep Line-by-Line Breakdown & Concepts

- **Lines 45–58 (`getApiConfig()`)**:
  - Dynamically merges credentials stored in localStorage with default fallback constants declared in `config.ts`.
  - Automatically migrates deprecated template IDs to ensure seamless operation.
- **Lines 129–182 (Live EmailJS Integration)**:
  - Invokes `https://api.emailjs.com/api/v1.0/email/send`.
  - Notice the redundant keys inside `template_params`: `to_email`, `email`, `user_email`, `recipient`, `to`. This ensures compatibility regardless of how the user named their template variable inside their personal EmailJS dashboard!
- **Lines 212–216 (Simulated Fallback)**:
  - If third-party email credentials are not set, the method returns `{ success: true, provider: 'simulated' }`.
  - This ensures developers and portfolio evaluators get an immediate interactive confirmation modal with their promo code rather than an ugly API error banner.

---

## File 6: `src/services/testimonial.service.ts` — Traveler Reviews & Cross-Tab Synchronizer

### 7.1 Purpose & Architectural Duty
[testimonial.service.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/services/testimonial.service.ts) maintains traveler reviews shown on the landing page carousel. It merges curated seed testimonials with traveler-submitted reviews, listens for cross-tab storage changes, and syncs submissions to PostgreSQL.

### 7.2 Complete Annotated Code
```typescript
import { Testimonial } from '../types/testimonial.types';
import { TESTIMONIALS_DATA } from '../modules/testimonials/testimonials.data';
import { StorageService } from './storage.service';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { API_CONFIG } from '../constants/config';
import { authService } from './auth.service';

type TestimonialsListener = (testimonials: Testimonial[]) => void;

/**
 * Testimonial Service
 * Manages official seed testimonials merged with traveler-submitted reviews.
 */
export class TestimonialService {
  private static instance: TestimonialService | null = null;
  private listeners: Set<TestimonialsListener> = new Set();

  private constructor() {
    this.listenToStorage();
  }

  public static getInstance(): TestimonialService {
    if (!TestimonialService.instance) {
      TestimonialService.instance = new TestimonialService();
    }
    return TestimonialService.instance;
  }

  private listenToStorage(): void {
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.TESTIMONIALS) {
        this.notifyListeners();
      }
    });
  }

  public getUserTestimonials(): Testimonial[] {
    return StorageService.getItem<Testimonial[]>(STORAGE_KEYS.TESTIMONIALS, []);
  }

  public getAllTestimonials(): Testimonial[] {
    const userSubmitted = this.getUserTestimonials();
    // User-submitted testimonials appear first alongside seeds
    return [...userSubmitted, ...TESTIMONIALS_DATA];
  }

  public addTestimonial(data: Omit<Testimonial, 'id' | 'createdAt'>): Testimonial {
    const userSubmitted = this.getUserTestimonials();
    const newTestimonial: Testimonial = {
      ...data,
      id: `test-user-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isUserSubmitted: true,
      rating: data.rating || 5,
    };

    userSubmitted.unshift(newTestimonial);
    StorageService.setItem(STORAGE_KEYS.TESTIMONIALS, userSubmitted);
    this.notifyListeners();

    // Async sync with PostgreSQL backend
    const token = authService.getToken();
    fetch(`${API_CONFIG.BASE_URL}/testimonials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        name: newTestimonial.name,
        role: newTestimonial.destinationVisited || 'Traveler',
        location: newTestimonial.location,
        quote: newTestimonial.quote,
        rating: newTestimonial.rating,
      }),
    }).catch(() => {});

    return newTestimonial;
  }

  public async syncWithBackend(): Promise<void> {
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/testimonials`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.testimonials)) {
          const userSubmitted = data.testimonials.map((t: any) => ({
            id: `test-pg-${t.id}`,
            name: t.name,
            destinationVisited: t.role || 'Traveler',
            location: t.location,
            avatar: t.avatar_url || 'assets/Images/testimonials-section/author-image.png',
            quote: t.quote,
            rating: Number(t.rating) || 5,
            createdAt: t.created_at,
            isUserSubmitted: true,
          }));
          StorageService.setItem(STORAGE_KEYS.TESTIMONIALS, userSubmitted);
          this.notifyListeners();
        }
      }
    } catch {
      // Offline fallback: rely on local storage
    }
  }

  public deleteTestimonial(id: string): boolean {
    const userSubmitted = this.getUserTestimonials();
    const filtered = userSubmitted.filter((t) => t.id !== id);
    if (filtered.length !== userSubmitted.length) {
      StorageService.setItem(STORAGE_KEYS.TESTIMONIALS, filtered);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  public subscribe(listener: TestimonialsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const all = this.getAllTestimonials();
    this.listeners.forEach((listener) => {
      try {
        listener(all);
      } catch (err) {
        console.error('[TestimonialService] Listener error:', err);
      }
    });
  }
}

export const testimonialService = TestimonialService.getInstance();
```

### 7.3 Deep Line-by-Line Breakdown & Concepts

- **Lines 47–51 (`getAllTestimonials()`)**:
  - Uses array spread syntax: `[...userSubmitted, ...TESTIMONIALS_DATA]`.
  - Traveler-submitted reviews are prepended so the traveler's new review appears as the very first slide on the testimonial carousel.
- **Lines 56–88 (`addTestimonial()`)**:
  - Uses `Omit<Testimonial, 'id' | 'createdAt'>` so calling forms only supply text fields without worrying about timestamp or ID generation.
  - Asynchronously pushes the review to Express REST API `/api/testimonials` with JWT authorization if logged in.
- **Lines 90–114 (`syncWithBackend()`)**:
  - Automatically fetches all reviews approved in PostgreSQL when the landing page loads, reconciling the local cache.

---

## File 7: `src/middleware/auth.middleware.ts` (Client) — Route Guards & Action Gates

### 8.1 Purpose & Architectural Duty
[src/middleware/auth.middleware.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/middleware/auth.middleware.ts) controls client-side access protection. It enforces security gates across protected actions (opening the booking modal, viewing the profile dashboard, or submitting reviews). If the user is unauthenticated, it presents a modal with return-URL query parameter preservation.

### 8.2 Complete Annotated Code
```typescript
import { AuthService } from '../services/auth.service';

export interface AuthGuardOptions {
  actionName?: string;
  customTitle?: string;
  customMessage?: string;
  redirectUrl?: string;
  returnToTab?: string;
}

/**
 * Authentication Middleware & Action Guard
 * Enforces access control for protected sections like Bookings, Profile, and Reviews.
 */
export class AuthMiddleware {
  public static isAuthenticated(): boolean {
    return AuthService.getInstance().isAuthenticated();
  }

  /**
   * Enforce authentication before executing an action or viewing a section.
   * If user is not logged in, opens the Auth Required Modal and returns false.
   */
  public static requireAuth(options: AuthGuardOptions = {}): boolean {
    if (this.isAuthenticated()) {
      return true;
    }

    this.showAuthRequiredModal(options);
    return false;
  }

  /**
   * Higher-order function: wraps any sensitive action callback with an authentication gate
   */
  public static guardAction<T>(actionFn: () => T, options: AuthGuardOptions = {}): T | null {
    if (!this.requireAuth(options)) {
      return null;
    }
    return actionFn();
  }

  /**
   * Display the Authentication Required Modal with dynamic returnUrl redirection
   */
  public static showAuthRequiredModal(options: AuthGuardOptions = {}): void {
    let modal = document.getElementById('auth-required-modal');

    // Dynamically inject the modal if missing from the HTML document
    if (!modal) {
      modal = this.createModalElement();
      document.body.appendChild(modal);
    }

    const titleEl = modal.querySelector<HTMLElement>('#auth-modal-title');
    const msgEl = modal.querySelector<HTMLElement>('#auth-modal-msg');
    const loginLink = modal.querySelector<HTMLAnchorElement>('#auth-modal-login-btn');
    const signupLink = modal.querySelector<HTMLAnchorElement>('#auth-modal-signup-btn');

    const defaultTitle = options.customTitle || 'Authentication Required';
    const actionDesc = options.actionName || 'access this protected travel portal section';
    const defaultMsg =
      options.customMessage ||
      `You need to be signed in to ${actionDesc}. Log in with your verified account or sign up in seconds!`;

    if (titleEl) titleEl.textContent = defaultTitle;
    if (msgEl) msgEl.textContent = defaultMsg;

    const returnUrl = options.redirectUrl || window.location.pathname.split('/').pop() || 'index.html';
    const returnParam = encodeURIComponent(returnUrl + (options.returnToTab ? `?tab=${options.returnToTab}` : ''));

    if (loginLink) loginLink.href = `auth.html?mode=login&returnUrl=${returnParam}`;
    if (signupLink) signupLink.href = `auth.html?mode=signup&returnUrl=${returnParam}`;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Auto-focus the login button for keyboard accessibility
    setTimeout(() => loginLink?.focus(), 50);
  }

  public static hideAuthRequiredModal(): void {
    const modal = document.getElementById('auth-required-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  /**
   * Render an inline Locked Access card for container elements (e.g. My Bookings tab)
   */
  public static renderLockedState(
    container: HTMLElement,
    options: { title?: string; message?: string; tabName?: string; redirectUrl?: string } = {}
  ): void {
    const title = options.title || 'Sign In to Access Your Bookings';
    const message =
      options.message ||
      'Your flight bookings, reservations, and electronic boarding passes are protected under your private Jadoo account.';

    const currentFile = options.redirectUrl || window.location.pathname.split('/').pop() || 'index.html';
    const returnTarget = encodeURIComponent(currentFile + (options.tabName ? `?tab=${options.tabName}` : ''));

    container.innerHTML = `
      <div class="auth-locked-state">
        <div class="auth-locked-icon">
          <i class="fa-solid fa-lock"></i>
        </div>
        <h3 class="auth-locked-title">${title}</h3>
        <p class="auth-locked-desc">${message}</p>
        <div class="auth-locked-actions">
          <a href="auth.html?mode=login&returnUrl=${returnTarget}" class="profile-btn-primary auth-locked-btn">
            <i class="fa-solid fa-arrow-right-to-bracket"></i>
            <span>Log In to View Bookings</span>
          </a>
          <a href="auth.html?mode=signup&returnUrl=${returnTarget}" class="profile-btn-outline auth-locked-btn">
            <i class="fa-solid fa-user-plus"></i>
            <span>Create Free Account</span>
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Dynamically constructs modal markup in memory
   */
  private static createModalElement(): HTMLElement {
    const modal = document.createElement('div');
    modal.id = 'auth-required-modal';
    modal.className = 'profile-modal-overlay auth-required-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'auth-modal-title');
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="profile-modal-card auth-required-card">
        <button type="button" class="auth-required-close" data-close-auth-modal aria-label="Close dialog">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <div class="auth-required-body">
          <div class="auth-lock-badge">
            <div class="lock-glow"></div>
            <i class="fa-solid fa-shield-halved"></i>
          </div>

          <h3 class="auth-required-title" id="auth-modal-title">Authentication Required</h3>
          <p class="auth-required-text" id="auth-modal-msg">
            You must be logged in to access your booked trips and flight reservations. Please log in or sign up for a free Jadoo account.
          </p>

          <div class="auth-required-options">
            <a href="auth.html?mode=login" class="auth-modal-btn btn-signin" id="auth-modal-login-btn">
              <i class="fa-solid fa-arrow-right-to-bracket"></i>
              <span>Log In to Continue</span>
            </a>
            <a href="auth.html?mode=signup" class="auth-modal-btn btn-signup" id="auth-modal-signup-btn">
              <i class="fa-solid fa-user-plus"></i>
              <span>Create Free Account</span>
            </a>
          </div>

          <button type="button" class="auth-required-cancel" data-close-auth-modal>
            <span>Cancel and return to browsing</span>
          </button>
        </div>
      </div>
    `;

    // Event listeners for backdrop click and Escape key dismissal
    modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target === modal || target.closest('[data-close-auth-modal]')) {
        this.hideAuthRequiredModal();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        this.hideAuthRequiredModal();
      }
    });

    return modal;
  }
}
```

### 8.3 Deep Line-by-Line Breakdown & Concepts

- **Lines 36–41 (`guardAction<T>(actionFn, options)`)**:
  - **Higher-Order Function Pattern**: Takes any arbitrary function `actionFn: () => T`.
  - If the user is authenticated, it calls `actionFn()` directly and returns its value.
  - If unauthenticated, it opens the modal and returns `null`.
  - *Usage Example:*
    ```typescript
    AuthMiddleware.guardAction(() => {
      bookingModal.open(destination);
    }, { actionName: 'reserve this flight package' });
    ```
- **Lines 49–53 (Dynamic DOM Construction)**:
  - If the HTML page forgot to include the modal markup, `createModalElement()` builds the full accessible dialog tree in memory and appends it to `document.body` on the fly!
- **Lines 68–72 (Deep Link Return Preservations)**:
  - Computes `encodeURIComponent(returnUrl + '?tab=' + returnToTab)`.
  - When the traveler signs in on `auth.html`, they are automatically routed right back to the exact tab or destination they were viewing.

---

## 9. Deep-Dive Engineering Concepts

### 1. The Singleton Pattern in Vanilla TypeScript
In multi-file modular JavaScript, importing classes can cause state fragmentation if instances are created ad-hoc.
- By making the constructor `private` and exposing a static `getInstance()` factory, every component shares the identical state in memory.
- `export const authService = AuthService.getInstance();` provides pre-instantiated singleton exports for ergonomic import syntax across UI components.

### 2. The Observer Pattern vs. Polling
Instead of running expensive `setInterval(checkStatus, 500)` loops that drain laptop batteries and mobile devices:
- Services maintain `private listeners: Set<Listener> = new Set()`.
- Calling `service.subscribe(cb)` registers the listener.
- When an internal mutation occurs, `this.listeners.forEach(cb => cb(state))` fires once. Zero wasted CPU cycles.

### 3. Cleanup Closures for Memory Leak Prevention
If a UI view subscribes to a singleton service but is later replaced in the DOM, the singleton retains a reference to the callback, preventing garbage collection.
- Jadoo solves this by having every `subscribe()` method return an **unsubscription closure**:
  ```typescript
  const unsubscribe = themeService.subscribe((isDark) => { ... });
  // When component unmounts:
  unsubscribe();
  ```

### 4. Cross-Tab Storage Synchronization
The native browser `window.addEventListener('storage', (e) => { ... })` event only fires when **another window or tab on the same origin** modifies a localStorage key.
- Jadoo leverages this to synchronize login/logout and review submissions across multiple open browser tabs in real time without WebSockets or server polling.

### 5. Bitwise Hashing for Deterministic Mock Data
```typescript
hash = (hash << 5) - hash + seedStr.charCodeAt(i);
hash |= 0;
```
- Multiplies `hash` by 31 using bit shifts (`hash << 5` equals `hash * 32`, minus `hash` equals `hash * 31`).
- Generates reproducible, consistent pricing across 50,000+ Wikipedia destinations without requiring a static database seed for every city on Earth.

---

## 10. Self-Check Mastery Quiz

1. **Why does `StorageService.isAvailable()` attempt a write and delete rather than simply checking `if (window.localStorage)`?**
   - *Answer:* In Safari Private Browsing mode and restricted sandboxed webviews, the `window.localStorage` object exists, but any call to `setItem()` throws an immediate `QuotaExceededError`. The probe verifies actual write permissions.
2. **How does `AuthService` synchronize authentication state across multiple browser tabs in real time?**
   - *Answer:* By listening to the browser's native `window.addEventListener('storage', ...)`. When one tab updates `STORAGE_KEYS.USER_SESSION`, the event fires in all other tabs, invoking `notifyListeners()` and updating the UI instantly.
3. **What is the purpose of `DestinationService.isScenicPhoto()`?**
   - *Answer:* It inspects Wikipedia image URLs to filter out non-photographic graphics such as SVG files, national flags, boundary maps, and coat-of-arms symbols, ensuring travelers only see scenic photography.
4. **Why do `ThemeService.subscribe()` and `AuthService.subscribe()` return a function?**
   - *Answer:* They return an unsubscription cleanup closure (`() => listeners.delete(cb)`) allowing detached components to remove themselves and prevent memory leaks.
5. **How does `AuthMiddleware.guardAction(actionFn)` protect sensitive UI interactions?**
   - *Answer:* It is a higher-order function that verifies `isAuthenticated()`. If authenticated, it executes `actionFn()`; if not, it aborts execution, injects the authentication modal, and preserves the return URL.
6. **How does `DestinationService.estimatePrice()` ensure consistent pricing for dynamic search results?**
   - *Answer:* It uses a deterministic 32-bit integer hash algorithm (`hash * 31 + charCode`) based on the destination title, guaranteeing the exact same price is calculated every time that city is searched.
7. **What is the multi-provider fallback hierarchy in `NewsletterService.subscribe()`?**
   - *Answer:* It attempts live delivery via EmailJS REST API first; if unavailable, it tries Web3Forms; if neither is configured, it falls back to an interactive simulated preview with the `EXPLORE15` discount code.
8. **Why does `StorageService.getString()` exist if `getItem<T>()` can already retrieve data?**
   - *Answer:* Plain strings (such as JWT tokens or theme keys) do not require `JSON.parse()`. `getString()` eliminates unnecessary parsing overhead and avoids JSON syntax errors on raw strings.
9. **How does `AuthMiddleware.showAuthRequiredModal()` handle missing modal markup in the HTML?**
   - *Answer:* If `#auth-required-modal` is not found in the DOM, it dynamically constructs the complete modal element tree in memory using `createModalElement()` and appends it to `document.body`.
10. **What architectural pattern ensures that only one instance of `AuthService` exists in memory?**
    - *Answer:* The **Singleton Pattern**, implemented using a `private constructor()`, a `private static instance` cache, and a public static `getInstance()` accessor.
