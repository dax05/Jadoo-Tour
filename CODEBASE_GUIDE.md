# 🌍 Jadoo Travel — Complete Codebase Architecture & Explainer Guide

> **Welcome to the definitive architecture and file-by-file guide for Jadoo Travel.**  
> This document details every single file in the repository, explaining what each section contributes, how the data flows, and highlighting the **critical must-know concepts** you need before adding Node.js, Express, and PostgreSQL.

---

## 📑 Table of Contents
1. [High-Level Architecture & Design Principles](#1-high-level-architecture--design-principles)
2. [Project Root & Tooling Files](#2-project-root--tooling-files)
3. [HTML Entry Pages & Section Breakdown](#3-html-entry-pages--section-breakdown)
4. [CSS Styling Architecture (`assets/`)](#4-css-styling-architecture-assets)
5. [TypeScript Core System (`src/`)](#5-typescript-core-system-src)
   - [Application Entry Points](#application-entry-points)
   - [Constants & Configuration (`src/constants/`)](#constants--configuration-srcconstants)
   - [Type Definitions (`src/types/`)](#type-definitions-srctypes)
   - [Middleware Layer (`src/middleware/`)](#middleware-layer-srcmiddleware)
   - [Core Data Services (`src/services/`)](#core-data-services-srcservices)
   - [UI Feature Controllers (`src/modules/`)](#ui-feature-controllers-srcmodules)
6. [⭐ Must-Need-To-Know Architectural Highlights](#6--must-need-to-know-architectural-highlights)
7. [Roadmap: How PostgreSQL & Express Plug Into This System](#7-roadmap-how-postgresql--express-plug-into-this-system)

---

## 1. High-Level Architecture & Design Principles

Jadoo Travel is engineered with a **Modular Controller-Service Pattern** in TypeScript, compiled into ultra-fast standalone bundles using **esbuild**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VIEW LAYER (HTML / DOM)                         │
│   index.html (Landing)  │  auth.html (Login/Signup)  │ profile.html    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ DOM Events / User Interactions
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   FEATURE MODULES & CONTROLLERS                        │
│   • NavbarController          • DestinationExplorerController          │
│   • AuthNavController         • DestinationModalController             │
│   • DestinationMapController  • TestimonialSlider & FormController    │
│   • NewsletterController      • ProfileController & UserPanelController│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Calls Business Methods
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     CORE SINGLETON SERVICES                            │
│   • AuthService        • DestinationService    • NewsletterService     │
│   • ThemeService       • TestimonialService    • StorageService        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Reads / Writes (Reactive Listeners)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     DATA PERSISTENCE LAYER                             │
│   • StorageService (Type-Safe LocalStorage wrapper with fail-safes)    │
│   • External REST APIs: EmailJS API, Leaflet Tiles, Wikipedia API      │
│   ───► [Ready to swap directly to Node/Express/PostgreSQL REST API]    │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Strengths:
1. **Zero UI Framework Bloat**: Pure, blistering-fast Vanilla TypeScript + HTML5 without React/Vue overhead.
2. **Separation of Concerns**: Controllers only handle DOM manipulation, validation, and user feedback; Services handle data manipulation, storage, and API communication.
3. **Reactive Listeners**: Services emit updates (`onWishlistChange`, `onBookingsChange`, `subscribe`) so multiple UI components stay in sync without page reloads.

---

## 2. Project Root & Tooling Files

### `package.json`
* **Purpose**: Manages development tooling, compilation scripts, and dependencies.
* **Key Sections**:
  * `"scripts"`:
    * `"build"`: Runs TypeScript type checking (`tsc --noEmit`) then bundles with `node build.js`.
    * `"bundle"`: Runs `build.js` directly for rapid bundling.
    * `"watch"`: Watches all `.ts` files for real-time live recompilation during development.
  * `"devDependencies"`:
    * `esbuild`: Extremely fast JS/TS bundler (takes <15ms to build the entire app).
    * `typescript`: Provides strict type-safety and IDE intellisense.
* **⚠️ Must Know**: There are no heavy runtime dependencies in `dependencies`; the compiled outputs (`script.js`, `auth.js`, `profile.js`) are pure standard JavaScript executable directly in any browser.

### `tsconfig.json`
* **Purpose**: TypeScript compiler options.
* **Key Sections**:
  * `"target": "ES2020"`: Emits modern, optimized JavaScript syntax.
  * `"strict": true`: Enforces strict null checks, preventing `undefined` and `null` pointer crashes.
  * `"moduleResolution": "node"`: Allows clean module imports like `import { authService } from '../services/auth.service'`.
  * `"noEmit": true`: TypeScript only checks types; `esbuild` handles emitting code.

### `build.js`
* **Purpose**: Custom build pipeline using the esbuild JavaScript API.
* **How It Works**:
  * Defines three entry points and outputs:
    1. `src/main.ts` ➔ `script.js` (Loaded on `index.html`)
    2. `src/auth.ts` ➔ `auth.js` (Loaded on `auth.html`)
    3. `src/profile.ts` ➔ `profile.js` (Loaded on `profile.html`)
  * Supports `--watch` flag for background file watching.
  * Generates source maps (`.js.map`) for in-browser debugging.

---

## 3. HTML Entry Pages & Section Breakdown

### 1. `index.html` (Main Landing Page)
* **Lines 1–38 (`<head>` & Ambient Setup)**:
  * Google Fonts preconnection (`Montserrat`, `Poppins`, `Volkhov`).
  * FontAwesome 6 icons.
  * Stylesheets loaded: `assets/styles.css` and `assets/dark.css`.
  * Ambient top-right decorative blob (`.img4` / `hero-right-decor.svg`).
* **Lines 39–109 (Sticky Navigation Bar `#navibar`)**:
  * Sticky header with logo (`assets/Images/navigation-section/Logo.svg`).
  * Mobile slide-over drawer (`#nav-drawer`) with backdrop overlay (`.nav-backdrop`).
  * Navigation links (`Destinations`, `Services`, `Bookings`, `Testimonials`).
  * Dynamic Auth State: Guest buttons (`Login`, `Sign up`) or Authenticated profile pill (`#nav-user-item` with avatar & name) and Logout action (`#nav-logout-btn`).
  * Dark/Light mode theme toggle (`#theme-toggle`).
* **Lines 110–190 (Hero Section `#hero`)**:
  * Heading with red curved SVG underline (`text-decoration.svg`).
  * Value proposition description.
  * Primary CTA button ("Find out more") and "Play Demo" video trigger button (`.playbtn`).
  * Right hero illustration: traveler sitting on suitcases with floating airplanes (`hero-image.png`).
* **Lines 191–310 (Category Services Section `#services`)**:
  * 4 service cards: Calculated Weather, Best Flights, Local Events, Customization.
  * Hover micro-animations and orange bottom indicator tab.
* **Lines 311–430 (Top Destinations Explorer `#destinations`)**:
  * Interactive filter controls: search input (`#dest-search`), category chips (All, Europe, Cultural, Luxury, Island), sorting dropdown (Price, Rating, Duration), and price range slider (`#dest-price-slider`).
  * Dynamic Destination Cards Grid (`#dest-cards-grid`): Populated by TypeScript from `DestinationService`.
  * Quick-actions on every card: Favorite Wishlist heart button (`.card-fav-btn`) and "Book Now" trigger.
* **Lines 431–485 (Interactive World Map Section `#destinations-map-wrapper`)**:
  * Leaflet map container (`#destinations-map`).
  * Pins all destinations worldwide with interactive custom popup cards, price tags, and direct booking triggers.
* **Lines 486–540 (Easy Steps Booking Section `#bookings`)**:
  * 3-step illustrated timeline: "Choose Destination", "Make Payment", "Reach Airport on Selected Date".
  * Right floating trip preview card: "Trip to Greece" with interactive favorite heart (`.tripheart`) and progress bar.
* **Lines 541–570 (Testimonials Carousel Section `#testimonials`)**:
  * Dynamic review card with user avatar, star rating, quote, and author location.
  * Vertical navigation arrows (`#test-prev`, `#test-next`) and auto-sliding functionality.
  * "Share Your Experience" button triggering the Review Submission Modal.
* **Lines 571–590 (Partner Logos Marquee Section)**:
  * Infinite CSS-driven marquee carousel with Axon, Jetstar, Expedia, Qantas, Alitalia.
* **Lines 591–605 (Newsletter Subscription Section `#newsletter`)**:
  * Email input (`#newsletter-email`) and submit button (`#newsletter-btn`).
  * Connected to live EmailJS dispatch; triggers the Welcome Modal on submit.
* **Lines 606–670 (Footer Section)**:
  * Brand tagline, navigation links (Company, Contact, More), App Store & Google Play badges.
* **Lines 671–1460 (Interactive Dialog Modals & Drawers)**:
  * **Video Modal (`#video-modal`)**: YouTube embed player with clean close handler.
  * **Destination Details Modal (`#dest-details-modal`)**: High-res gallery, highlights, included perks, reviews count, and "Proceed to Book" CTA.
  * **Multi-Step Booking Modal (`#booking-modal`)**:
    * Step 1: Travel dates, guest selector (adults/children), luxury package tier (Standard, Deluxe, 5-Star VIP).
    * Step 2: Contact info (Name, Email, Phone, Special requests).
    * Step 3: Real-time price breakdown with promo voucher discount application (`EXPLORE15`) and booking confirmation.
  * **Add Testimonial Modal (`#add-testimonial-modal`)**: Star rating picker (1-5 stars), author details, quote textarea, and authentication verification.
  * **Slide-out Personal Travel Drawer (`#user-travel-drawer`)**: Slide-over drawer with tabs for "Saved Wishlist" and "My Bookings" with ticket references.
  * **Boarding Pass & E-Ticket Modal (`#boarding-pass-modal`)**: Luxury airline boarding pass with barcodes, flight references, seats, gate info, and print action.
  * **Welcome Email Modal (`#welcome-email-modal`)**: Envelope simulation with email headers, VIP 15% voucher (`EXPLORE15`) with copy button, diagnostic live delivery alert banner, and collapsible EmailJS API settings drawer with live "Test EmailJS Connection" button.

---

### 2. `auth.html` (Authentication Page)
* **Header Bar**: Back button to `index.html` and Dark/Light theme toggle.
* **Glassmorphism Auth Card (`#auth-card`)**:
  * Brand logo (dynamically toggles between `Logo.svg` and `Logo-dark.svg`).
  * Animated sliding tab pill: "Log In" vs "Sign Up" (`#tab-login`, `#tab-signup`).
  * Form inputs: Full Name (signup only), Email, Password with visibility eye toggle, and Confirm Password (signup only).
  * **Live Password Strength Meter (`#password-strength-container`)**: Real-time progress bar (4 strength segments) and 5 criteria checklist (Length, Uppercase, Lowercase, Number, Special character).
  * Quick Demo Helper: Autofills credentials for `sarah.jenkins@example.com` in 1 click.
  * Social login buttons (Google, Apple, Facebook).
* **⚠️ Must Know**: Redirects automatically to `returnUrl` (e.g. `profile.html` or `index.html`) after login.

---

### 3. `profile.html` (Traveler Dashboard)
* **Header Bar**: Logo, Home link, Explore link, Theme toggle, and Log Out action.
* **Guest Notice Banner (`#profile-guest-notice`)**: Displayed if an unauthenticated user views the profile in preview mode.
* **Traveler Hero Overview Card**:
  * Avatar badge with initials, traveler name, email, loyalty member badge.
  * 4 stats counters: Trips Booked, Countries Visited, Wishlist Items, and Jadoo Points.
* **5 Interactive Dashboard Tabs**:
  1. **Personal Details (`#tab-panel-details`)**: Edit name, phone, bio, home city, passport number.
  2. **Travel Preferences (`#tab-panel-preferences`)**: Preferred travel style (Adventure, Luxury, Cultural), seat preference, dietary requirements.
  3. **My Bookings (`#tab-panel-bookings`)**: Active, completed, and cancelled reservations. Each booking card displays the booking reference (`BK-XXXX`), package tier, dates, and action buttons for "View Boarding Pass" and "Cancel Trip".
  4. **Saved Wishlist (`#tab-panel-wishlist`)**: Interactive grid of saved destinations with direct "Book Now" and "Remove" triggers.
  5. **Security Settings (`#tab-panel-security`)**: Change password form with validation.

---

## 4. CSS Styling Architecture (`assets/`)

### `assets/styles.css`
* **Size**: ~6,300 lines of Vanilla CSS.
* **Structure**:
  1. **CSS Custom Properties (Variables)**: Colors (`--color-primary: #df6951`, `--color-secondary: #f1a501`, `--color-navy: #181e4b`), typography (`--font-primary: 'Poppins'`), borders, and shadows.
  2. **Layout & Grid**: Container queries, clamp-based responsive sizing (`clamp(16px, 2.5vw, 24px)`).
  3. **Navigation & Mobile Drawer**: Sticky header transitions, hamburger animation, slide-over navigation with blurred backdrop.
  4. **Hero & Component Sections**: Floating planes keyframes (`planeFloatLeft`, `planeFloatRight`), video modal overlay.
  5. **Destination Explorer & Cards**: Badge styling, price tags, favorite button hover states, category pill styling.
  6. **Leaflet Overrides**: Custom `.custom-dest-popup`, map tile filters, marker clusters.
  7. **Modals & Drawers**: Slide-in transitions, glassmorphism card styling, responsive tables.
  8. **Email Modal & Badges**: Envelope styling, voucher dashed coupon box, delivery status badges (`.live`, `.error`, `.preview`), diagnostic alert banner (`.welcome-delivery-alert`).

### `assets/dark.css`
* **Purpose**: Complete dark mode design system activated when `body.dark-mode` is present.
* **Key Adaptations**:
  * Base background switched to deep navy `#0f1422` with `#171e31` card surfaces.
  * Yellow background decor blob (`.img4`, `.auth-bg-blob`) dimmed from full brightness to `opacity: 0.12` and toned to dark navy using `filter: hue-rotate(200deg) brightness(0.85)`.
  * Text contrast adjusted from dark navy `#181e4b` to crisp white/slate (`#f8fafc`, `#cbd5e1`, `#94a3b8`).
  * Inputs and dropdowns styled with `#0f1422` backgrounds and subtle borders.
  * Modals, drawers, and Leaflet popups adapt seamlessly.

### `assets/auth.css` & `assets/profile.css`
* Dedicated styling for standalone application pages:
  * `auth.css`: Centered auth card layout, password meter colors, floating airplane keyframes.
  * `profile.css`: Tab bar styling, statistic counter tiles, booking ticket cards, cancellation status badges.

---

## 5. TypeScript Core System (`src/`)

### Application Entry Points
* [src/main.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/main.ts): Orchestrates `index.html`. Initializes `ThemeService`, `NavbarController`, `AuthNavController`, `DestinationModalController`, `DestinationMapController`, `DestinationExplorerController`, `UserPanelController`, `TestimonialSlider`, `TestimonialFormController`, and `NewsletterController`.
* [src/auth.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/auth.ts): Orchestrates `auth.html`. Binds theme buttons and initializes `AuthFormController`.
* [src/profile.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/profile.ts): Orchestrates `profile.html`. Binds theme buttons and initializes `ProfileController`.

---

### Constants & Configuration (`src/constants/`)

#### [src/constants/config.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/constants/config.ts)
* `ASSET_PATHS`: Defines `LOGO_LIGHT` (`Logo.svg`) and `LOGO_DARK` (`Logo-dark.svg`).
* `UI_CONFIG`: Scroll thresholds (50px for navbar shadow), auth redirect delays (1200ms).
* `VALIDATION_RULES`: Regex for names and emails, password minimum length rules.
* `EMAIL_SERVICE_CONFIG`:
  * `EMAILJS_SERVICE_ID`: `'service_jadoo'` (Verified active EmailJS service).
  * `EMAILJS_TEMPLATE_ID`: `'jadoo_template'` (Verified active EmailJS template).
  * `EMAILJS_PUBLIC_KEY`: `'ldeIEBtJdGkSxHvqe'` (Verified EmailJS public key).
  * `WELCOME_PROMO_CODE`: `'EXPLORE15'` (15% discount voucher).

#### [src/constants/storage-keys.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/constants/storage-keys.ts)
* Maps all `localStorage` keys to prevent typos across the app:
  * `THEME`: `'theme'`
  * `USER_SESSION`: `'jadoo_user'`
  * `USERS_DB`: `'jadoo_users'`
  * `FAVORITES`: `'jadoo_favorites'`
  * `BOOKINGS`: `'jadoo_bookings'`
  * `WISHLIST_ITEMS`: `'jadoo_wishlist_items'`
  * `TESTIMONIALS`: `'jadoo_testimonials'`
  * `NEWSLETTER_SUBSCRIBERS`: `'jadoo_newsletter_subscribers'`
  * `EMAIL_API_CONFIG`: `'jadoo_email_api_config'`

---

### Type Definitions (`src/types/`)
* [auth.types.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/types/auth.types.ts): `UserSession`, `UserProfile`, `UserRecord`, `LoginCredentials`, `SignupData`, `PasswordValidationResult`.
* [destination.types.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/types/destination.types.ts): `Destination`, `BookingRecord`, `BookingFormData`, `DestinationCategory`, `SortOption`.
* [newsletter.types.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/types/newsletter.types.ts): `NewsletterSubscriber`, `EmailApiConfig`, `SendEmailResult`.
* [testimonial.types.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/types/testimonial.types.ts): `Testimonial`, `NewTestimonialInput`.
* [theme.types.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/types/theme.types.ts): `ThemeMode ('light' | 'dark')`, `ThemeChangeListener`.

---

### Middleware Layer (`src/middleware/`)

#### [src/middleware/auth.middleware.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/middleware/auth.middleware.ts)
* **Purpose**: Client-side route and action protection.
* **Key Methods**:
  * `requireAuth(options)`: Checks if a valid session exists. If not, displays a friendly modal/toast alert informing the user why authentication is required and redirects them to `auth.html?mode=login&returnUrl=...`.
  * `isAuthenticated()`: Quick boolean check for active session.
  * `protectPage(returnUrl)`: Called on `profile.html` to prevent unauthorized guests from accessing private profile data without logging in.

---

### Core Data Services (`src/services/`)

#### [src/services/storage.service.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/services/storage.service.ts)
* Centralized, crash-resilient wrapper around browser `localStorage`.
* Automatically handles JSON serialization and deserialization.
* Gracefully catches `QuotaExceededError` or private browsing access restrictions, returning safe default fallbacks.

#### [src/services/theme.service.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/services/theme.service.ts)
* **Singleton** managing light/dark mode across all three pages.
* Syncs with OS `prefers-color-scheme` if no stored preference exists.
* Automatically flips images with class `.Top-Logo`, `.auth-logo`, and `.profile-logo-img` between `Logo.svg` and `Logo-dark.svg`.
* Provides `bindToggleButtons()` to bind all `#theme-toggle` buttons on the page.

#### [src/services/auth.service.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/services/auth.service.ts)
* Handles registration, credential verification, and user sessions.
* Pre-seeds demo accounts (e.g. `sarah.jenkins@example.com` / `Traveler123!`).
* Provides `getCurrentSession()`, `login()`, `register()`, `logout()`, `updateProfile()`, and `changePassword()`.
* Automatically creates an initial booking for demo users so "My Bookings" is populated on first login.

#### [src/services/destination.service.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/services/destination.service.ts)
* **The Heart of Destination Data**:
  * Pre-seeds 6 global destinations: Rome (Italy), London (UK), Full Europe Grand Tour, Santorini (Greece), Bali (Indonesia), Tokyo (Japan).
  * Contains geographic coordinates (`lat`, `lng`) for the Leaflet interactive map.
  * Manages Wishlists (`toggleFavorite`, `getFavorites`, `onWishlistChange`).
  * Manages Bookings (`createBooking`, `getBookings`, `cancelBooking`, `onBookingsChange`).
  * Integrates a live **Wikipedia API fallback** (`fetchWikipediaSnippet`) to automatically fetch genuine cultural summaries for any destination searched!

#### [src/services/newsletter.service.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/services/newsletter.service.ts)
* Manages newsletter subscriber lists and email dispatch.
* Dispatches live emails using the **EmailJS REST API** (`https://api.emailjs.com/api/v1.0/email/send`).
* Generates a poetic, personalized welcome email containing the `EXPLORE15` voucher code.
* Provides `testEmailJsConnection()` to test API credentials live with instant status feedback.

#### [src/services/testimonial.service.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/services/testimonial.service.ts)
* Pre-seeded with reviews from Mike Taylor, Chris Thomas, and Sarah Jenkins.
* Supports submitting new traveler reviews with ratings, persisting them to storage and notifying the slider via `onTestimonialAdded`.

---

### UI Feature Controllers (`src/modules/`)

| Controller | File | Key Responsibility |
| :--- | :--- | :--- |
| **`NavbarController`** | [navbar.controller.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/modules/navigation/navbar.controller.ts) | Manages sticky header scrolling, mobile burger menu toggle, and backdrop blur. |
| **`AuthNavController`** | [auth-nav.controller.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/modules/navigation/auth-nav.controller.ts) | Switches navbar between Guest (`Login`/`Sign up`) and Authenticated states (`Avatar` + `Logout`). |
| **`DestinationExplorerController`** | [destination-explorer.controller.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/modules/destinations/destination-explorer.controller.ts) | Renders cards, handles debounced text search, category tabs (Europe, Island, etc.), sorting, and price range filtering. |
| **`DestinationModalController`** | [destination-modal.controller.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/modules/destinations/destination-modal.controller.ts) | Opens the trip detail modal and multi-step booking checkout modal. Calculates pricing and promo discounts. |
| **`DestinationMapController`** | [destination-map.controller.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/modules/destinations/destination-map.controller.ts) | Initializes Leaflet map, places custom pin markers, and binds interactive popup booking cards. |
| **`TestimonialSlider`** | [testimonial-slider.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/modules/testimonials/testimonial-slider.ts) | Controls review transitions, next/prev arrow buttons, and auto-rotation timer. |
| **`TestimonialFormController`** | [testimonial-form.controller.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/modules/testimonials/testimonial-form.controller.ts) | Handles "Add Testimonial" modal, star rating selection, auth validation, and persistence. |
| **`NewsletterController`** | [newsletter.controller.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/modules/newsletter/newsletter.controller.ts) | Form submit, loading spinner, Welcome modal popup, voucher copy-to-clipboard, live API test button. |
| **`UserPanelController`** | [user-panel.controller.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/modules/user/user-panel.controller.ts) | Slide-over travel drawer on `index.html` for quick wishlist viewing and boarding pass inspection. |
| **`ProfileController`** | [profile.controller.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/modules/profile/profile.controller.ts) | Full dashboard on `profile.html`. Tab switching, profile editing, booking cancellation, wishlist management, password change. |
| **`AuthFormController`** | [auth-form.controller.ts](file:///d:/Waavex/Jadoo-Travel-UI/dax-jadoo/src/modules/auth/auth-form.controller.ts) | Login / Signup tab switching, real-time password strength meter, demo account quick-fill, form submission. |

---

## 6. ⭐ Must-Need-To-Know Architectural Highlights

### 1. Build Pipeline (`npm run build`)
* **Must Know**: Never edit `script.js`, `auth.js`, or `profile.js` directly! They are build artifacts generated from `src/` by `build.js`.
* Whenever you change any file in `src/`, always run:
  ```bash
  npm run build
  ```
  or run `npm run watch` to have it auto-compile as you save.

### 2. Multi-Page Theme Synchronization
* When the user toggles dark mode on `index.html`, the preference is saved in `localStorage['theme']`.
* When the user navigates to `auth.html` or `profile.html`, `themeService.bindToggleButtons()` instantly reads `localStorage['theme']`, toggles `body.dark-mode`, and ensures the logos switch to `Logo-dark.svg`.
* The right background decor blob (`.img4` on landing, `.auth-bg-blob` on auth) has custom dark-mode filters (`opacity: 0.12; filter: hue-rotate(200deg) brightness(0.85);`) to keep the page looking dark and elegant.

### 3. Live EmailJS Integration
* Email dispatch uses **EmailJS** REST API with:
  * Service ID: `service_jadoo`
  * Template ID: `jadoo_template`
  * Public Key: `ldeIEBtJdGkSxHvqe`
* **Crucial Rule**: In EmailJS templates, the recipient must be configured as `{{to_email}}` or `{{email}}`. `newsletter.service.ts` passes aliases (`to_email`, `email`, `recipient`, `to`, `to_name`, `name`, `promo_code`, `message`) so that any variable name used in the template will be populated.

### 4. Client-Side Auth Gating
* `AuthMiddleware.requireAuth()` checks if `localStorage['jadoo_user']` exists.
* If a guest clicks "Book Now" or "Add Testimonial", they are prompted to log in and automatically redirected back with the `returnUrl` query parameter.

---

## 7. Roadmap: How PostgreSQL & Express Plug Into This System

Because the entire codebase uses **Centralized Services**, moving to **Node.js, Express, and PostgreSQL** requires modifying **only 3 files in the frontend**:

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│       BEFORE (LocalStorage)     │           │   AFTER (Full-Stack PostgreSQL) │
│                                 │           │                                 │
│  auth.service.ts                │  ───►     │  fetch('/api/auth/login')       │
│  destination.service.ts         │  ───►     │  fetch('/api/destinations')     │
│  newsletter.service.ts          │  ───►     │  fetch('/api/bookings')         │
└─────────────────────────────────┘           └─────────────────────────────────┘
```

1. **`auth.service.ts`**: Replace localStorage user checks with `POST /api/auth/login` and `POST /api/auth/register`. Store the returned JWT token.
2. **`destination.service.ts`**: Replace hardcoded array with `GET /api/destinations` and `POST /api/bookings`. PostgreSQL will store the reservations persistently.
3. **`newsletter.service.ts`**: Send subscription to `POST /api/subscribers`. The Express backend can either trigger EmailJS directly or send emails via Nodemailer/SendGrid/Resend.

---
*Created for Jadoo Travel — Production Architecture Documentation.*
