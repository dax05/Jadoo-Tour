"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/constants/storage-keys.ts
  var STORAGE_KEYS = {
    THEME: "theme",
    USER_SESSION: "jadoo_user",
    USERS_DB: "jadoo_users",
    FAVORITES: "jadoo_favorites",
    BOOKINGS: "jadoo_bookings",
    WISHLIST_ITEMS: "jadoo_wishlist_items",
    TESTIMONIALS: "jadoo_testimonials",
    NEWSLETTER_SUBSCRIBERS: "jadoo_newsletter_subscribers",
    EMAIL_API_CONFIG: "jadoo_email_api_config",
    AUTH_TOKEN: "jadoo_token"
  };

  // src/constants/config.ts
  var ASSET_PATHS = {
    LOGO_LIGHT: "assets/Images/navigation-section/Logo.svg",
    LOGO_DARK: "assets/Images/navigation-section/Logo-dark.svg"
  };
  var API_CONFIG = {
    BASE_URL: "http://localhost:5000/api",
    TIMEOUT_MS: 5e3
  };
  var UI_CONFIG = {
    NAVBAR_SCROLL_THRESHOLD_PX: 50,
    AUTH_REDIRECT_DELAY_MS: 1200,
    FORM_SUBMIT_SIMULATED_LATENCY_MS: 500
  };
  var EMAIL_SERVICE_CONFIG = {
    EMAILJS_SERVICE_ID: "service_jadoo",
    EMAILJS_TEMPLATE_ID: "jadoo_template",
    EMAILJS_PUBLIC_KEY: "ldeIEBtJdGkSxHvqe",
    WEB3FORMS_ACCESS_KEY: "",
    WELCOME_PROMO_CODE: "EXPLORE15",
    DEFAULT_SENDER_NAME: "Jadoo Travel Concierge",
    DEFAULT_SENDER_EMAIL: "concierge@jadoo.travel"
  };

  // src/services/storage.service.ts
  var StorageService = class {
    static isAvailable() {
      try {
        const testKey = "__storage_test__";
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
        return true;
      } catch {
        return false;
      }
    }
    static getItem(key, fallback) {
      if (!this.isAvailable()) return fallback;
      try {
        const raw = window.localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    }
    static getString(key, fallback = "") {
      if (!this.isAvailable()) return fallback;
      try {
        const val = window.localStorage.getItem(key);
        return val !== null ? val : fallback;
      } catch {
        return fallback;
      }
    }
    static setItem(key, value) {
      if (!this.isAvailable()) return false;
      try {
        const payload = typeof value === "string" ? value : JSON.stringify(value);
        window.localStorage.setItem(key, payload);
        return true;
      } catch (err) {
        console.warn(`[StorageService] Failed to set item "${key}":`, err);
        return false;
      }
    }
    static removeItem(key) {
      if (!this.isAvailable()) return false;
      try {
        window.localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    }
  };

  // src/services/auth.service.ts
  var _AuthService = class _AuthService {
    constructor() {
      __publicField(this, "currentSession", null);
      __publicField(this, "sessionListeners", /* @__PURE__ */ new Set());
      this.initSession();
      this.listenToStorageEvents();
    }
    static getInstance() {
      if (!_AuthService.instance) {
        _AuthService.instance = new _AuthService();
      }
      return _AuthService.instance;
    }
    initSession() {
      this.currentSession = StorageService.getItem(STORAGE_KEYS.USER_SESSION, null);
    }
    listenToStorageEvents() {
      window.addEventListener("storage", (e) => {
        if (e.key === STORAGE_KEYS.USER_SESSION) {
          this.initSession();
          this.notifyListeners();
        }
      });
    }
    getCurrentSession() {
      return this.currentSession;
    }
    isAuthenticated() {
      return this.currentSession !== null;
    }
    getUsers() {
      const users = StorageService.getItem(STORAGE_KEYS.USERS_DB, []);
      if (users.length === 0) {
        const seeded = [_AuthService.DEFAULT_USER];
        StorageService.setItem(STORAGE_KEYS.USERS_DB, seeded);
        return seeded;
      }
      return users;
    }
    async register(name, email, password) {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: cleanName, email: cleanEmail, password })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          if (data.token) {
            StorageService.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
          }
          const session2 = {
            name: data.user.name,
            email: data.user.email,
            loggedInAt: (/* @__PURE__ */ new Date()).toISOString(),
            avatar: data.user.avatarUrl || "avatar-1",
            loyaltyTier: "Gold Adventurer",
            loyaltyPoints: data.user.points || 1250
          };
          this.setSession(session2);
          return { success: true, user: session2 };
        } else if (!response.ok && data.message) {
          return { success: false, error: data.message };
        }
      } catch {
      }
      const users = this.getUsers();
      const exists = users.some((u) => u.email.toLowerCase() === cleanEmail);
      if (exists) {
        return {
          success: false,
          error: "An account with this email already exists. Please log in."
        };
      }
      const newUser = {
        name: cleanName,
        email: cleanEmail,
        password,
        registeredAt: (/* @__PURE__ */ new Date()).toISOString(),
        loyaltyTier: "Gold Adventurer",
        loyaltyPoints: 1250,
        avatar: "avatar-1",
        preferences: {
          currency: "USD",
          language: "English",
          mealPreference: "Standard",
          seatPreference: "Window",
          emailAlerts: true,
          smsAlerts: true
        }
      };
      users.push(newUser);
      StorageService.setItem(STORAGE_KEYS.USERS_DB, users);
      const session = {
        name: cleanName,
        email: cleanEmail,
        loggedInAt: (/* @__PURE__ */ new Date()).toISOString(),
        avatar: newUser.avatar,
        loyaltyTier: newUser.loyaltyTier,
        loyaltyPoints: newUser.loyaltyPoints,
        preferences: newUser.preferences
      };
      this.setSession(session);
      return { success: true, user: session };
    }
    async login(email, password) {
      const cleanEmail = email.trim().toLowerCase();
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          if (data.token) {
            StorageService.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
          }
          const session2 = {
            name: data.user.name,
            email: data.user.email,
            loggedInAt: (/* @__PURE__ */ new Date()).toISOString(),
            phone: data.user.phone,
            avatar: data.user.avatarUrl || "avatar-1",
            bio: data.user.bio,
            country: data.user.homeCity,
            passportNumber: data.user.passportNumber,
            loyaltyTier: "Gold Adventurer",
            loyaltyPoints: data.user.points || 1250
          };
          this.setSession(session2);
          return { success: true, user: session2 };
        } else if (!response.ok && data.message) {
          return { success: false, error: data.message };
        }
      } catch {
      }
      const users = this.getUsers();
      const account = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!account) {
        return {
          success: false,
          error: "No account found with this email. Please check your email or sign up."
        };
      }
      if (account.password !== password) {
        return {
          success: false,
          error: "Incorrect password. Please verify your credentials and try again."
        };
      }
      const session = {
        name: account.name,
        email: account.email,
        loggedInAt: (/* @__PURE__ */ new Date()).toISOString(),
        phone: account.phone,
        avatar: account.avatar || "avatar-1",
        bio: account.bio,
        country: account.country,
        passportNumber: account.passportNumber,
        emergencyContact: account.emergencyContact,
        loyaltyTier: account.loyaltyTier || "Gold Adventurer",
        loyaltyPoints: account.loyaltyPoints ?? 1250,
        preferences: account.preferences
      };
      this.setSession(session);
      return { success: true, user: session };
    }
    getUserAccount(email) {
      const targetEmail = (email || this.currentSession?.email || "").toLowerCase().trim();
      if (!targetEmail) return void 0;
      return this.getUsers().find((u) => u.email.toLowerCase() === targetEmail);
    }
    updateProfile(updatedData) {
      if (!this.currentSession) {
        return { success: false, error: "User is not logged in." };
      }
      const users = this.getUsers();
      const index = users.findIndex((u) => u.email.toLowerCase() === this.currentSession.email.toLowerCase());
      if (index === -1) {
        return { success: false, error: "User account not found." };
      }
      const currentAcc = users[index];
      const newName = updatedData.name ? updatedData.name.trim() : currentAcc.name;
      const newEmail = updatedData.email ? updatedData.email.trim().toLowerCase() : currentAcc.email;
      if (newEmail !== currentAcc.email.toLowerCase()) {
        const emailTaken = users.some((u, i) => i !== index && u.email.toLowerCase() === newEmail);
        if (emailTaken) {
          return { success: false, error: "This email is already in use by another account." };
        }
      }
      const updatedAcc = {
        ...currentAcc,
        ...updatedData,
        name: newName,
        email: newEmail,
        preferences: {
          ...currentAcc.preferences || {},
          ...updatedData.preferences || {}
        }
      };
      users[index] = updatedAcc;
      StorageService.setItem(STORAGE_KEYS.USERS_DB, users);
      const updatedSession = {
        ...this.currentSession,
        name: updatedAcc.name,
        email: updatedAcc.email,
        phone: updatedAcc.phone,
        avatar: updatedAcc.avatar,
        bio: updatedAcc.bio,
        country: updatedAcc.country,
        passportNumber: updatedAcc.passportNumber,
        emergencyContact: updatedAcc.emergencyContact,
        loyaltyTier: updatedAcc.loyaltyTier || "Gold Adventurer",
        loyaltyPoints: updatedAcc.loyaltyPoints ?? 1250,
        preferences: updatedAcc.preferences
      };
      this.setSession(updatedSession);
      return { success: true, user: updatedSession };
    }
    changePassword(oldPassword, newPassword) {
      if (!this.currentSession) {
        return { success: false, error: "User is not logged in." };
      }
      const users = this.getUsers();
      const index = users.findIndex((u) => u.email.toLowerCase() === this.currentSession.email.toLowerCase());
      if (index === -1) {
        return { success: false, error: "User account not found." };
      }
      if (users[index].password !== oldPassword) {
        return { success: false, error: "Current password is incorrect." };
      }
      users[index].password = newPassword;
      StorageService.setItem(STORAGE_KEYS.USERS_DB, users);
      return { success: true };
    }
    getToken() {
      return StorageService.getItem(STORAGE_KEYS.AUTH_TOKEN, null);
    }
    logout() {
      this.currentSession = null;
      StorageService.removeItem(STORAGE_KEYS.USER_SESSION);
      StorageService.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      this.notifyListeners();
    }
    subscribe(listener) {
      this.sessionListeners.add(listener);
      listener(this.currentSession);
      return () => {
        this.sessionListeners.delete(listener);
      };
    }
    setSession(session) {
      this.currentSession = session;
      StorageService.setItem(STORAGE_KEYS.USER_SESSION, session);
      this.notifyListeners();
    }
    notifyListeners() {
      this.sessionListeners.forEach((listener) => listener(this.currentSession));
    }
  };
  __publicField(_AuthService, "instance", null);
  __publicField(_AuthService, "DEFAULT_USER", {
    name: "Sarah Jenkins",
    email: "sarah.jenkins@example.com",
    password: "Password123!",
    registeredAt: "2024-01-15T08:00:00.000Z",
    phone: "+1 (555) 749-2810",
    avatar: "avatar-1",
    bio: "Passionate globetrotter seeking sunset vistas, historic cobblestones, and local street cuisine.",
    country: "United States",
    loyaltyTier: "Gold Adventurer",
    loyaltyPoints: 1450,
    preferences: {
      currency: "USD",
      language: "English",
      mealPreference: "Standard",
      seatPreference: "Window",
      homeAirport: "JFK \u2014 New York International",
      emailAlerts: true,
      smsAlerts: true
    }
  });
  var AuthService = _AuthService;
  var authService = AuthService.getInstance();

  // src/modules/navigation/auth-nav.controller.ts
  var AuthNavController = class {
    constructor() {
      __publicField(this, "guestItems");
      __publicField(this, "userItems");
      __publicField(this, "userNameEl");
      __publicField(this, "userAvatarEl");
      __publicField(this, "logoutBtn");
      this.guestItems = document.querySelectorAll(".auth-guest-item");
      this.userItems = document.querySelectorAll(".auth-user-item");
      this.userNameEl = document.getElementById("nav-user-name");
      this.userAvatarEl = document.getElementById("nav-user-avatar");
      this.logoutBtn = document.getElementById("nav-logout-btn");
      this.init();
    }
    init() {
      this.logoutBtn?.addEventListener("click", () => {
        authService.logout();
      });
      authService.subscribe((session) => {
        this.render(session);
      });
    }
    render(session) {
      if (session) {
        const displayName = session.name || session.email.split("@")[0] || "Traveler";
        const initial = displayName.charAt(0).toUpperCase();
        if (this.userNameEl) {
          this.userNameEl.textContent = `Hi, ${displayName}`;
        }
        if (this.userAvatarEl) {
          this.userAvatarEl.textContent = initial;
        }
        this.guestItems.forEach((el) => {
          el.style.display = "none";
        });
        this.userItems.forEach((el) => {
          el.style.display = el.tagName === "BUTTON" ? "inline-flex" : "";
        });
      } else {
        this.guestItems.forEach((el) => {
          el.style.display = "";
        });
        this.userItems.forEach((el) => {
          el.style.display = "none";
        });
      }
    }
  };

  // src/modules/navigation/navbar.controller.ts
  var NavbarController = class {
    constructor() {
      __publicField(this, "navbar");
      __publicField(this, "burgerMenu");
      __publicField(this, "navDrawer");
      __publicField(this, "closeDrawerBtn");
      __publicField(this, "navBackdrop");
      __publicField(this, "navLinks");
      __publicField(this, "isTicking", false);
      this.navbar = document.getElementById("navibar");
      this.burgerMenu = document.getElementById("burger-menu");
      this.navDrawer = document.getElementById("nav-drawer");
      this.closeDrawerBtn = document.getElementById("close-drawer");
      this.navBackdrop = document.getElementById("nav-backdrop");
      this.navLinks = document.querySelectorAll(".links");
      this.init();
    }
    init() {
      this.initStickyScroll();
      this.initDrawerEvents();
    }
    initStickyScroll() {
      if (!this.navbar) return;
      window.addEventListener("scroll", () => {
        if (!this.isTicking) {
          window.requestAnimationFrame(() => {
            if (this.navbar) {
              const isScrolled = window.scrollY >= UI_CONFIG.NAVBAR_SCROLL_THRESHOLD_PX;
              this.navbar.classList.toggle("scrolled", isScrolled);
            }
            this.isTicking = false;
          });
          this.isTicking = true;
        }
      }, { passive: true });
    }
    initDrawerEvents() {
      this.burgerMenu?.addEventListener("click", () => this.toggleDrawer());
      this.closeDrawerBtn?.addEventListener("click", () => this.closeDrawer());
      this.navBackdrop?.addEventListener("click", () => this.closeDrawer());
      this.navLinks.forEach((link) => {
        link.addEventListener("click", () => this.closeDrawer());
      });
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.isDrawerOpen()) {
          this.closeDrawer();
        }
      });
    }
    isDrawerOpen() {
      return this.navDrawer?.classList.contains("is-active") ?? false;
    }
    openDrawer() {
      this.burgerMenu?.classList.add("is-active");
      this.burgerMenu?.setAttribute("aria-expanded", "true");
      this.navDrawer?.classList.add("is-active");
      this.navBackdrop?.classList.add("is-active");
      document.body.classList.add("overflow-hidden");
    }
    closeDrawer() {
      this.burgerMenu?.classList.remove("is-active");
      this.burgerMenu?.setAttribute("aria-expanded", "false");
      this.navDrawer?.classList.remove("is-active");
      this.navBackdrop?.classList.remove("is-active");
      document.body.classList.remove("overflow-hidden");
    }
    toggleDrawer() {
      if (this.isDrawerOpen()) {
        this.closeDrawer();
      } else {
        this.openDrawer();
      }
    }
  };

  // src/modules/testimonials/testimonials.data.ts
  var TESTIMONIALS_DATA = [
    {
      id: "test-1",
      quote: "\u201COn the Windows talking painted pasture yet its express parties use. Sure last upon he same as knew next. Of believed or diverted no.\u201D",
      name: "Mike Taylor",
      location: "Lahore, Pakistan",
      avatar: "assets/Images/testimonial-section/author-mike.jpg"
    },
    {
      id: "test-2",
      quote: "\u201CJadoo made our corporate retreat to Europe completely stress-free. Every detail from booking to flights was seamless!\u201D",
      name: "Chris Thomas",
      location: "CEO of Red Button",
      avatar: "assets/Images/testimonial-section/author-chris.jpg"
    },
    {
      id: "test-3",
      quote: "\u201CAfter going through a number of sites, I had to settle for Jadoo because honestly it was a no brainer trying anyone else.\u201D",
      name: "Sarah Connor",
      location: "Globetrotter & Travel Blogger",
      avatar: "assets/Images/testimonial-section/author-sarah.jpg"
    }
  ];

  // src/services/testimonial.service.ts
  var _TestimonialService = class _TestimonialService {
    constructor() {
      __publicField(this, "listeners", /* @__PURE__ */ new Set());
      this.listenToStorage();
    }
    static getInstance() {
      if (!_TestimonialService.instance) {
        _TestimonialService.instance = new _TestimonialService();
      }
      return _TestimonialService.instance;
    }
    listenToStorage() {
      window.addEventListener("storage", (e) => {
        if (e.key === STORAGE_KEYS.TESTIMONIALS) {
          this.notifyListeners();
        }
      });
    }
    /**
     * Get user-submitted testimonials saved in localStorage
     */
    getUserTestimonials() {
      return StorageService.getItem(STORAGE_KEYS.TESTIMONIALS, []);
    }
    /**
     * Get all testimonials (default seeds + user submitted)
     */
    getAllTestimonials() {
      const userSubmitted = this.getUserTestimonials();
      return [...userSubmitted, ...TESTIMONIALS_DATA];
    }
    /**
     * Add a new traveler testimonial
     */
    addTestimonial(data) {
      const userSubmitted = this.getUserTestimonials();
      const newTestimonial = {
        ...data,
        id: `test-user-${Date.now()}`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        isUserSubmitted: true,
        rating: data.rating || 5
      };
      userSubmitted.unshift(newTestimonial);
      StorageService.setItem(STORAGE_KEYS.TESTIMONIALS, userSubmitted);
      this.notifyListeners();
      const token = authService.getToken();
      fetch(`${API_CONFIG.BASE_URL}/testimonials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...token ? { Authorization: `Bearer ${token}` } : {}
        },
        body: JSON.stringify({
          name: newTestimonial.name,
          role: newTestimonial.destinationVisited || "Traveler",
          location: newTestimonial.location,
          quote: newTestimonial.quote,
          rating: newTestimonial.rating
        })
      }).catch(() => {
      });
      return newTestimonial;
    }
    async syncWithBackend() {
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/testimonials`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.testimonials)) {
            const userSubmitted = data.testimonials.map((t) => ({
              id: `test-pg-${t.id}`,
              name: t.name,
              destinationVisited: t.role || "Traveler",
              location: t.location,
              avatar: t.avatar_url || "assets/Images/testimonials-section/author-image.png",
              quote: t.quote,
              rating: Number(t.rating) || 5,
              createdAt: t.created_at,
              isUserSubmitted: true
            }));
            StorageService.setItem(STORAGE_KEYS.TESTIMONIALS, userSubmitted);
            this.notifyListeners();
          }
        }
      } catch {
      }
    }
    /**
     * Delete a user-submitted testimonial
     */
    deleteTestimonial(id) {
      const userSubmitted = this.getUserTestimonials();
      const filtered = userSubmitted.filter((t) => t.id !== id);
      if (filtered.length !== userSubmitted.length) {
        StorageService.setItem(STORAGE_KEYS.TESTIMONIALS, filtered);
        this.notifyListeners();
        return true;
      }
      return false;
    }
    /**
     * Subscribe to testimonial updates
     */
    subscribe(listener) {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    }
    notifyListeners() {
      const all = this.getAllTestimonials();
      this.listeners.forEach((listener) => {
        try {
          listener(all);
        } catch (err) {
          console.error("[TestimonialService] Listener error:", err);
        }
      });
    }
  };
  __publicField(_TestimonialService, "instance", null);
  var TestimonialService = _TestimonialService;
  var testimonialService = TestimonialService.getInstance();

  // src/modules/testimonials/testimonial-slider.ts
  var _TestimonialSlider = class _TestimonialSlider {
    constructor() {
      __publicField(this, "testimonialService");
      __publicField(this, "testimonials", []);
      __publicField(this, "currentIndex", 0);
      // DOM Elements
      __publicField(this, "mainCard", null);
      __publicField(this, "mainAvatar", null);
      __publicField(this, "mainQuote", null);
      __publicField(this, "mainName", null);
      __publicField(this, "mainLocation", null);
      __publicField(this, "mainRating", null);
      __publicField(this, "backQuote", null);
      __publicField(this, "backName", null);
      __publicField(this, "backLocation", null);
      __publicField(this, "prevBtn", null);
      __publicField(this, "nextBtn", null);
      __publicField(this, "dotsContainer", null);
      __publicField(this, "dots", null);
      _TestimonialSlider.instance = this;
      this.testimonialService = testimonialService;
      this.testimonials = this.testimonialService.getAllTestimonials();
      this.mainCard = document.getElementById("test-main-card");
      this.mainAvatar = document.getElementById("test-main-avatar");
      this.mainQuote = document.getElementById("test-main-quote");
      this.mainName = document.getElementById("test-main-name");
      this.mainLocation = document.getElementById("test-main-location");
      this.mainRating = document.getElementById("test-main-rating");
      this.backQuote = document.getElementById("test-back-quote");
      this.backName = document.getElementById("test-back-name");
      this.backLocation = document.getElementById("test-back-location");
      this.prevBtn = document.getElementById("test-prev");
      this.nextBtn = document.getElementById("test-next");
      this.dotsContainer = document.getElementById("test-dots");
      this.init();
    }
    init() {
      if (this.testimonials.length === 0) return;
      this.prevBtn?.addEventListener("click", () => this.prev());
      this.nextBtn?.addEventListener("click", () => this.next());
      this.renderDots();
      this.render(this.currentIndex);
      this.testimonialService.subscribe((updated) => {
        this.testimonials = updated;
        this.renderDots();
        this.render(this.currentIndex);
      });
    }
    next() {
      this.goTo(this.currentIndex + 1);
    }
    prev() {
      this.goTo(this.currentIndex - 1);
    }
    goTo(index) {
      const total = this.testimonials.length;
      if (total === 0) return;
      this.currentIndex = (index % total + total) % total;
      this.render(this.currentIndex);
    }
    renderDots() {
      if (!this.dotsContainer) return;
      this.dotsContainer.innerHTML = this.testimonials.map(
        (_, i) => `<button type="button" class="test-dot ${i === this.currentIndex ? "active" : ""}" data-index="${i}" aria-label="Testimonial ${i + 1}"></button>`
      ).join("");
      this.dots = this.dotsContainer.querySelectorAll(".test-dot");
      this.dots.forEach((dot) => {
        dot.addEventListener("click", () => {
          const idx = Number(dot.dataset.index);
          if (!isNaN(idx)) {
            this.goTo(idx);
          }
        });
      });
    }
    render(index) {
      const total = this.testimonials.length;
      if (total === 0) return;
      const nextIndex = (index + 1) % total;
      const current = this.testimonials[index];
      const next = this.testimonials[nextIndex];
      if (!current) return;
      if (this.mainCard) {
        this.mainCard.classList.remove("animating");
        requestAnimationFrame(() => {
          this.mainCard?.classList.add("animating");
        });
      }
      if (this.mainAvatar) {
        this.mainAvatar.src = current.avatar;
        this.mainAvatar.alt = current.name;
      }
      if (this.mainQuote) this.mainQuote.textContent = current.quote;
      if (this.mainName) this.mainName.textContent = current.name;
      if (this.mainLocation) this.mainLocation.textContent = current.location;
      if (this.mainRating) {
        const rating = current.rating || 5;
        this.mainRating.innerHTML = Array.from({ length: 5 }).map(
          (_, starIdx) => `<i class="fa-solid fa-star ${starIdx < rating ? "star-gold" : "star-muted"}"></i>`
        ).join("");
      }
      if (next) {
        if (this.backQuote) this.backQuote.textContent = next.quote;
        if (this.backName) this.backName.textContent = next.name;
        if (this.backLocation) this.backLocation.textContent = next.location;
      }
      this.dots?.forEach((dot, i) => {
        dot.classList.toggle("active", i === index);
        dot.setAttribute("aria-current", i === index ? "true" : "false");
      });
    }
  };
  __publicField(_TestimonialSlider, "instance", null);
  var TestimonialSlider = _TestimonialSlider;

  // src/modules/testimonials/testimonial-form.controller.ts
  var TestimonialFormController = class {
    constructor() {
      __publicField(this, "testimonialService");
      __publicField(this, "authService");
      // DOM Elements
      __publicField(this, "openBtn", null);
      __publicField(this, "modal", null);
      __publicField(this, "form", null);
      __publicField(this, "inputName", null);
      __publicField(this, "inputLocation", null);
      __publicField(this, "inputDest", null);
      __publicField(this, "inputQuote", null);
      __publicField(this, "quoteCounter", null);
      __publicField(this, "starContainer", null);
      __publicField(this, "avatarOptions", null);
      // State
      __publicField(this, "selectedRating", 5);
      __publicField(this, "selectedAvatar", "assets/Images/testimonial-section/author-sarah.jpg");
      this.testimonialService = testimonialService;
      this.authService = AuthService.getInstance();
      this.initElements();
      this.bindEvents();
    }
    initElements() {
      this.openBtn = document.getElementById("btn-open-testimonial-modal");
      this.modal = document.getElementById("testimonial-modal");
      this.form = document.getElementById("form-add-testimonial");
      this.inputName = document.getElementById("test-input-name");
      this.inputLocation = document.getElementById("test-input-location");
      this.inputDest = document.getElementById("test-input-dest");
      this.inputQuote = document.getElementById("test-input-quote");
      this.quoteCounter = document.getElementById("test-quote-counter");
      this.starContainer = document.getElementById("test-star-picker");
      this.avatarOptions = document.querySelectorAll(".test-avatar-choice");
    }
    bindEvents() {
      this.openBtn?.addEventListener("click", () => {
        this.openModal();
      });
      this.modal?.addEventListener("click", (e) => {
        const target = e.target;
        if (target === this.modal || target.closest("[data-close-testimonial-modal]")) {
          this.closeModal();
        }
      });
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.modal?.style.display === "flex") {
          this.closeModal();
        }
      });
      if (this.starContainer) {
        const stars = this.starContainer.querySelectorAll(".test-star-item");
        stars.forEach((star) => {
          star.addEventListener("mouseenter", () => {
            const val = Number(star.getAttribute("data-value") || "5");
            this.highlightStars(val);
          });
          star.addEventListener("mouseleave", () => {
            this.highlightStars(this.selectedRating);
          });
          star.addEventListener("click", () => {
            const val = Number(star.getAttribute("data-value") || "5");
            this.selectedRating = val;
            this.highlightStars(val);
          });
        });
      }
      this.avatarOptions?.forEach((opt) => {
        opt.addEventListener("click", () => {
          this.avatarOptions?.forEach((o) => o.classList.remove("selected"));
          opt.classList.add("selected");
          const avatarSrc = opt.getAttribute("data-avatar-src");
          if (avatarSrc) {
            this.selectedAvatar = avatarSrc;
          }
        });
      });
      this.inputQuote?.addEventListener("input", () => {
        const len = this.inputQuote?.value.length || 0;
        if (this.quoteCounter) {
          this.quoteCounter.textContent = `${len}/280`;
        }
      });
      this.form?.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }
    openModal() {
      if (!this.modal) return;
      const session = this.authService.getCurrentSession();
      if (session) {
        if (this.inputName && !this.inputName.value) {
          this.inputName.value = session.name;
        }
        if (this.inputLocation && !this.inputLocation.value) {
          this.inputLocation.value = session.country ? `Traveler from ${session.country}` : "Verified Traveler";
        }
      }
      this.modal.style.display = "flex";
      document.body.style.overflow = "hidden";
      this.highlightStars(this.selectedRating);
      setTimeout(() => this.inputName?.focus(), 80);
    }
    closeModal() {
      if (this.modal) {
        this.modal.style.display = "none";
        document.body.style.overflow = "";
      }
    }
    highlightStars(rating) {
      if (!this.starContainer) return;
      const stars = this.starContainer.querySelectorAll(".test-star-item");
      stars.forEach((s) => {
        const val = Number(s.getAttribute("data-value") || "1");
        s.classList.toggle("active", val <= rating);
        const icon = s.querySelector("i");
        if (icon) {
          icon.className = val <= rating ? "fa-solid fa-star" : "fa-regular fa-star";
        }
      });
    }
    handleSubmit() {
      const name = this.inputName?.value.trim() || "";
      const location = this.inputLocation?.value.trim() || "";
      const destination = this.inputDest?.value.trim() || "";
      const quote = this.inputQuote?.value.trim() || "";
      if (!name || name.length < 2) {
        this.showToast("Please enter your name (at least 2 characters).", "error");
        this.inputName?.focus();
        return;
      }
      if (!location || location.length < 2) {
        this.showToast("Please specify your location or traveler title.", "error");
        this.inputLocation?.focus();
        return;
      }
      if (!quote || quote.length < 10) {
        this.showToast("Please share at least a short sentence of feedback (10+ characters).", "error");
        this.inputQuote?.focus();
        return;
      }
      const formattedQuote = quote.startsWith("\u201C") || quote.startsWith('"') ? quote : `\u201C${quote}\u201D`;
      const fullLocation = destination ? `${location} \u2022 Visited ${destination}` : location;
      this.testimonialService.addTestimonial({
        name,
        location: fullLocation,
        quote: formattedQuote,
        avatar: this.selectedAvatar,
        rating: this.selectedRating,
        destinationVisited: destination
      });
      if (this.form) this.form.reset();
      if (this.quoteCounter) this.quoteCounter.textContent = "0/280";
      this.selectedRating = 5;
      this.closeModal();
      this.showToast(`\u{1F389} Thank you, ${name}! Your review has been published!`);
      setTimeout(() => {
        TestimonialSlider.instance?.goTo(0);
        const testSection = document.getElementById("testimonials");
        testSection?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
    showToast(message, type = "success") {
      const existing = document.querySelector(".dest-toast, .profile-toast");
      existing?.remove();
      const toast = document.createElement("div");
      toast.className = `dest-toast ${type === "error" ? "toast-error" : "toast-success"}`;
      toast.innerHTML = `
      <i class="fa-solid ${type === "error" ? "fa-circle-xmark" : "fa-circle-check"}"></i>
      <span>${message}</span>
    `;
      document.body.appendChild(toast);
      setTimeout(() => toast.classList.add("visible"), 10);
      setTimeout(() => {
        toast.classList.remove("visible");
        setTimeout(() => toast.remove(), 300);
      }, 4e3);
    }
  };

  // src/services/destination.service.ts
  var INITIAL_DESTINATIONS_SEED = [
    {
      slug: "Paris",
      title: "Paris, France",
      country: "France",
      price: "$2,450",
      duration: "7 Days Trip",
      rating: 4.9,
      category: "europe",
      fallbackImage: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80",
      fallbackDesc: "The City of Light captivates travelers with the Eiffel Tower, world-class art at the Louvre, and charming romantic caf\xE9s along the Seine.",
      coordinates: { lat: 48.8566, lon: 2.3522 }
    },
    {
      slug: "Tokyo",
      title: "Tokyo, Japan",
      country: "Japan",
      price: "$3,100",
      duration: "10 Days Trip",
      rating: 4.95,
      category: "asia",
      fallbackImage: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80",
      fallbackDesc: "A mesmerizing contrast of neon-lit skyscrapers and historic temples, celebrated for culinary mastery and cutting-edge culture.",
      coordinates: { lat: 35.6762, lon: 139.6503 }
    },
    {
      slug: "Bali",
      title: "Bali, Indonesia",
      country: "Indonesia",
      price: "$1,680",
      duration: "8 Days Trip",
      rating: 4.88,
      category: "asia",
      fallbackImage: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80",
      fallbackDesc: "Tropical paradise renowned for volcanic mountains, lush terraced rice paddies, serene beaches, and sacred ancient shrines.",
      coordinates: { lat: -8.4095, lon: 115.1889 }
    },
    {
      slug: "Rome",
      title: "Rome, Italy",
      country: "Italy",
      price: "$2,200",
      duration: "6 Days Trip",
      rating: 4.92,
      category: "europe",
      fallbackImage: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80",
      fallbackDesc: "Step back through millennia of civilization amid the majestic Colosseum, Vatican treasures, and exquisite Italian cuisine.",
      coordinates: { lat: 41.9028, lon: 12.4964 }
    },
    {
      slug: "New_York_City",
      title: "New York City, USA",
      country: "United States",
      price: "$2,890",
      duration: "5 Days Trip",
      rating: 4.85,
      category: "americas",
      fallbackImage: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80",
      fallbackDesc: "The exhilarating metropolis of Broadway, Central Park, and the Statue of Liberty, pulsing with boundless energy and culture.",
      coordinates: { lat: 40.7128, lon: -74.006 }
    },
    {
      slug: "Cairo",
      title: "Cairo, Egypt",
      country: "Egypt",
      price: "$1,950",
      duration: "9 Days Trip",
      rating: 4.79,
      category: "africa",
      fallbackImage: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=800&q=80",
      fallbackDesc: "Home of the timeless Great Pyramids of Giza, the Nile River, and centuries of vibrant bazaars and Pharaonic wonders.",
      coordinates: { lat: 30.0444, lon: 31.2357 }
    },
    {
      slug: "Santorini",
      title: "Santorini, Greece",
      country: "Greece",
      price: "$2,650",
      duration: "7 Days Trip",
      rating: 4.96,
      category: "europe",
      fallbackImage: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80",
      fallbackDesc: "Iconic whitewashed cliffside villas, cobalt-blue domes, and world-famous golden sunsets overlooking the Aegean caldera.",
      coordinates: { lat: 36.3932, lon: 25.4615 }
    },
    {
      slug: "Sydney",
      title: "Sydney, Australia",
      country: "Australia",
      price: "$3,400",
      duration: "12 Days Trip",
      rating: 4.87,
      category: "oceania",
      fallbackImage: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=80",
      fallbackDesc: "A sun-drenched coastal capital boasting the architectural jewel of the Sydney Opera House, Harbour Bridge, and Bondi Beach.",
      coordinates: { lat: -33.8688, lon: 151.2093 }
    }
  ];
  var DestinationService = class {
    /**
     * Helper to determine if an image url is a valid photographic thumbnail
     */
    static isScenicPhoto(url) {
      if (!url) return false;
      const lower = url.toLowerCase();
      if (lower.includes("flag") || lower.includes("map") || lower.includes("coat_of_arms") || lower.includes("symbol") || lower.includes(".svg")) {
        return false;
      }
      return true;
    }
    /**
     * Cleans Wikipedia summary extracts to concise readable sentences
     */
    static cleanExtract(extract, maxChars = 140) {
      if (!extract) return "Discover picturesque views, unique heritage, and unforgettable travel experiences.";
      const sanitized = extract.replace(/\s*\([^)]*\)/g, "").replace(/\s{2,}/g, " ").trim();
      if (sanitized.length <= maxChars) return sanitized;
      const truncated = sanitized.slice(0, maxChars);
      const lastSpace = truncated.lastIndexOf(" ");
      return (lastSpace > 60 ? truncated.slice(0, lastSpace) : truncated) + "...";
    }
    /**
     * Generate an estimated travel package price deterministically based on title
     */
    static estimatePrice(seedStr) {
      let hash = 0;
      for (let i = 0; i < seedStr.length; i++) {
        hash = (hash << 5) - hash + seedStr.charCodeAt(i);
        hash |= 0;
      }
      const val = 1200 + Math.abs(hash) % 2800;
      return `$${(val / 1e3).toFixed(2)}k`;
    }
    /**
     * Generate an estimated trip duration
     */
    static estimateDuration(seedStr) {
      const days = 5 + seedStr.length % 10;
      return `${days} Days Trip`;
    }
    /**
     * Subscribe to wishlist changes (favorites added/removed)
     */
    static onWishlistChange(cb) {
      this.wishlistListeners.push(cb);
      return () => {
        this.wishlistListeners = this.wishlistListeners.filter((l) => l !== cb);
      };
    }
    /**
     * Subscribe to bookings changes (trips booked/cancelled)
     */
    static onBookingsChange(cb) {
      this.bookingsListeners.push(cb);
      return () => {
        this.bookingsListeners = this.bookingsListeners.filter((l) => l !== cb);
      };
    }
    static notifyWishlistChange() {
      const items = this.getWishlistDestinations();
      this.wishlistListeners.forEach((cb) => {
        try {
          cb(items);
        } catch (e) {
          console.error("[DestinationService] Wishlist listener error:", e);
        }
      });
    }
    static notifyBookingsChange() {
      const records = this.getBookings();
      this.bookingsListeners.forEach((cb) => {
        try {
          cb(records);
        } catch (e) {
          console.error("[DestinationService] Bookings listener error:", e);
        }
      });
    }
    /**
     * Get list of favorited destination IDs from local storage
     */
    static getFavoriteIds() {
      return StorageService.getItem(STORAGE_KEYS.FAVORITES, []);
    }
    /**
     * Retrieve all saved wishlist destination objects
     */
    static getWishlistDestinations() {
      return StorageService.getItem(STORAGE_KEYS.WISHLIST_ITEMS, []);
    }
    /**
     * Toggle favorite state for a destination (supports either full Destination object or string ID)
     */
    static toggleFavorite(destOrId) {
      const id = typeof destOrId === "string" ? destOrId : destOrId.id;
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
        const resolved = typeof destOrId === "string" ? this.getDestinationById(id) : destOrId;
        if (resolved && !wishlistItems.some((d) => d.id === id)) {
          wishlistItems.push({
            ...resolved,
            isFavorite: true
          });
        }
      }
      StorageService.setItem(STORAGE_KEYS.FAVORITES, favorites);
      StorageService.setItem(STORAGE_KEYS.WISHLIST_ITEMS, wishlistItems);
      this.notifyWishlistChange();
      this.syncWishlistToBackend(id);
      return isNowFavorite;
    }
    /**
     * Remove a destination from wishlist
     */
    static removeFromWishlist(id) {
      const favorites = this.getFavoriteIds().filter((favId) => favId !== id);
      const wishlistItems = this.getWishlistDestinations().filter((d) => d.id !== id);
      StorageService.setItem(STORAGE_KEYS.FAVORITES, favorites);
      StorageService.setItem(STORAGE_KEYS.WISHLIST_ITEMS, wishlistItems);
      this.notifyWishlistChange();
    }
    /**
     * Clear all wishlist destinations
     */
    static clearWishlist() {
      StorageService.setItem(STORAGE_KEYS.FAVORITES, []);
      StorageService.setItem(STORAGE_KEYS.WISHLIST_ITEMS, []);
      this.notifyWishlistChange();
    }
    /**
     * Fetch the initial 8 featured destinations using the free Wikipedia Summary API
     */
    static async getInitialDestinations() {
      if (this.initialCache && this.initialCache.length === 8) {
        const favs2 = this.getFavoriteIds();
        return this.initialCache.map((d) => ({
          ...d,
          isFavorite: favs2.includes(d.id)
        }));
      }
      const favs = this.getFavoriteIds();
      const fetchPromises = INITIAL_DESTINATIONS_SEED.map(async (seed) => {
        try {
          const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(seed.slug)}`, {
            headers: {
              "User-Agent": "JadooTravel/1.0 (Travel Website Destination Explorer)"
            }
          });
          if (response.ok) {
            const data = await response.json();
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
              isFavorite: favs.includes(`dest-${seed.slug.toLowerCase()}`)
            };
          }
        } catch (err) {
          console.warn(`[DestinationService] Wikipedia API fetch error for ${seed.slug}, using fallback:`, err);
        }
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
          isFavorite: favs.includes(`dest-${seed.slug.toLowerCase()}`)
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
          isFavorite: favs.includes(`dest-${seed.slug.toLowerCase()}`)
        }));
      }
    }
    /**
     * Strictly validates whether a Wikipedia article represents a genuine travel/geographic destination
     */
    static isTravelDestination(item) {
      const title = (item.title || "").toLowerCase();
      const desc = (item.description || "").toLowerCase();
      const extract = (item.extract || "").toLowerCase().slice(0, 350);
      const combined = `${desc} ${extract}`;
      if (this.EXCLUDED_TITLES.some((term) => title.includes(term))) {
        return false;
      }
      for (const neg of this.NEGATIVE_ENTITY_TERMS) {
        if (desc.includes(neg)) return false;
        if (extract.startsWith(`a ${neg}`) || extract.startsWith(`an ${neg}`) || extract.startsWith(`the ${neg}`) || extract.startsWith(`${neg} `)) {
          return false;
        }
      }
      const hasGeogKeyword = this.POSITIVE_GEO_TERMS.some((pos) => combined.includes(pos));
      const hasInLocationDesc = /\b(in|of|near)\s+[A-Z]/.test(item.description || "") && !desc.includes("born in") && !desc.includes("founded in") && !desc.includes("manufactured in");
      if (item.hasCoordinates) {
        return hasGeogKeyword || hasInLocationDesc;
      }
      const strongPlaceDef = extract.includes("is a country") || extract.includes("is a sovereign state") || extract.includes("is an island") || extract.includes("is a city") || extract.includes("is a province") || extract.includes("is a capital") || extract.includes("is a region") || desc.startsWith("country in") || desc.startsWith("island in") || desc.startsWith("city in") || desc.startsWith("capital of");
      return strongPlaceDef;
    }
    /**
     * Search destinations live via the free Wikipedia search and summary API
     */
    static async searchDestinations(query) {
      const trimmed = query.trim();
      if (!trimmed) {
        return this.getInitialDestinations();
      }
      const cacheKey = trimmed.toLowerCase();
      if (this.searchCache.has(cacheKey)) {
        const favs2 = this.getFavoriteIds();
        return (this.searchCache.get(cacheKey) || []).map((d) => ({
          ...d,
          isFavorite: favs2.includes(d.id)
        }));
      }
      const favs = this.getFavoriteIds();
      const results = [];
      const seenTitles = /* @__PURE__ */ new Set();
      try {
        const directRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(trimmed)}`, {
          headers: {
            "Api-User-Agent": "JadooTravelApp/1.0 (https://jadoo.travel; contact@jadoo.travel)"
          }
        });
        if (directRes.ok) {
          const directData = await directRes.json();
          const isDestination = this.isTravelDestination({
            title: directData.title,
            description: directData.description,
            extract: directData.extract,
            hasCoordinates: Boolean(directData.coordinates)
          });
          if (directData.type === "standard" && directData.title && directData.extract && isDestination) {
            const directImg = (this.isScenicPhoto(directData.thumbnail?.source) ? directData.thumbnail?.source : null) || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80";
            const id = `dest-search-${directData.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
            seenTitles.add(directData.title.toLowerCase());
            results.push({
              id,
              title: directData.title,
              subtitle: directData.description || "Global Destination",
              description: this.cleanExtract(directData.extract),
              imageUrl: directImg,
              price: this.estimatePrice(directData.title),
              duration: this.estimateDuration(directData.title),
              rating: 4.9,
              coordinates: directData.coordinates,
              isFavorite: favs.includes(id)
            });
          }
        }
      } catch {
      }
      try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
          trimmed
        )}&gsrlimit=16&prop=pageimages|extracts|coordinates|description&exintro=1&explaintext=1&exchars=180&piprop=thumbnail&pithumbsize=600&pilimit=16&format=json&origin=*`;
        const searchRes = await fetch(searchUrl, {
          headers: {
            "Api-User-Agent": "JadooTravelApp/1.0 (https://jadoo.travel; contact@jadoo.travel)"
          }
        });
        if (searchRes.ok) {
          const searchJson = await searchRes.json();
          const pages = Object.values(searchJson.query?.pages || {});
          for (const page of pages) {
            if (!page.title || seenTitles.has(page.title.toLowerCase())) continue;
            const isDestination = this.isTravelDestination({
              title: page.title,
              description: page.description,
              extract: page.extract,
              hasCoordinates: Boolean(page.coordinates && page.coordinates.length > 0)
            });
            if (!isDestination) continue;
            const hasPhoto = this.isScenicPhoto(page.thumbnail?.source);
            const imgUrl = (hasPhoto ? page.thumbnail?.source : null) || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80";
            const id = `dest-search-${page.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
            seenTitles.add(page.title.toLowerCase());
            results.push({
              id,
              title: page.title,
              subtitle: page.description || "Travel Destination",
              description: this.cleanExtract(page.extract),
              imageUrl: imgUrl,
              price: this.estimatePrice(page.title),
              duration: this.estimateDuration(page.title),
              rating: 4.8 + Number((page.title.length % 3 * 0.05).toFixed(2)),
              coordinates: page.coordinates && page.coordinates.length > 0 ? page.coordinates[0] : void 0,
              isFavorite: favs.includes(id)
            });
            if (results.length >= 8) break;
          }
        }
      } catch (err) {
        console.warn("[DestinationService] Search query error:", err);
      }
      const finalResults = results.slice(0, 8);
      this.searchCache.set(cacheKey, finalResults);
      return finalResults;
    }
    /**
     * Convert formatted price string to numeric value (e.g. "$5.42k" -> 5420, "$2,450" -> 2450)
     */
    static parsePriceToNumber(priceStr) {
      const clean = priceStr.replace(/[$,]/g, "").trim().toLowerCase();
      if (clean.endsWith("k")) {
        const num = parseFloat(clean.replace("k", ""));
        return Math.round(num * 1e3);
      }
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? 2200 : parsed;
    }
    /**
     * Find a destination by ID across static, initial seeds, and search caches
     */
    static getDestinationById(id) {
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
          isFavorite: this.getFavoriteIds().includes(id)
        };
      }
      const wishlist = this.getWishlistDestinations();
      const wishMatch = wishlist.find((d) => d.id === id);
      if (wishMatch) return wishMatch;
      for (const cachedList of this.searchCache.values()) {
        const match = cachedList.find((d) => d.id === id);
        if (match) return match;
      }
      return void 0;
    }
    /**
     * Register a new destination in search cache so details can be resolved immediately
     */
    static registerDestination(dest) {
      if (!this.searchCache.has("__registered__")) {
        this.searchCache.set("__registered__", []);
      }
      const list = this.searchCache.get("__registered__");
      if (!list.some((d) => d.id === dest.id)) {
        list.push(dest);
      }
    }
    /**
     * Save a completed trip booking
     */
    static saveBooking(req) {
      const bookings = StorageService.getItem(STORAGE_KEYS.BOOKINGS, []);
      const randomCode = Math.floor(1e4 + Math.random() * 9e4);
      const bookingRecord = {
        ...req,
        bookingId: `JAD-${randomCode}`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        status: "confirmed"
      };
      bookings.unshift(bookingRecord);
      StorageService.setItem(STORAGE_KEYS.BOOKINGS, bookings);
      this.notifyBookingsChange();
      this.syncBookingToBackend(req);
      return bookingRecord;
    }
    /**
     * Retrieve all saved bookings
     */
    static getBookings() {
      return StorageService.getItem(STORAGE_KEYS.BOOKINGS, []);
    }
    /**
     * Cancel an existing booking
     */
    static cancelBooking(bookingId) {
      const bookings = this.getBookings();
      const target = bookings.find((b) => b.bookingId === bookingId);
      if (target) {
        target.status = "cancelled";
        StorageService.setItem(STORAGE_KEYS.BOOKINGS, bookings);
        this.notifyBookingsChange();
        this.syncCancelToBackend(bookingId);
        return true;
      }
      return false;
    }
    /**
     * Delete an existing booking record permanently
     */
    static deleteBooking(bookingId) {
      const bookings = this.getBookings().filter((b) => b.bookingId !== bookingId);
      StorageService.setItem(STORAGE_KEYS.BOOKINGS, bookings);
      this.notifyBookingsChange();
      return true;
    }
    /**
     * Backend Sync Helpers (Gracefully degrade to offline LocalStorage)
     */
    static async syncBookingToBackend(req) {
      try {
        const token = authService.getToken();
        if (!token) return;
        await fetch(`${API_CONFIG.BASE_URL}/bookings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
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
            totalPrice: req.totalPrice
          })
        });
      } catch {
      }
    }
    static async syncCancelToBackend(bookingId) {
      try {
        const token = authService.getToken();
        if (!token) return;
        await fetch(`${API_CONFIG.BASE_URL}/bookings/${bookingId}/cancel`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      } catch {
      }
    }
    static async syncWishlistToBackend(destinationId) {
      try {
        const token = authService.getToken();
        if (!token) return;
        await fetch(`${API_CONFIG.BASE_URL}/wishlist/toggle`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ destinationId })
        });
      } catch {
      }
    }
    static async syncWithBackend() {
      try {
        const token = authService.getToken();
        if (!token) return;
        const bookingsRes = await fetch(`${API_CONFIG.BASE_URL}/bookings/my-bookings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (bookingsRes.ok) {
          const data = await bookingsRes.json();
          if (data.success && Array.isArray(data.bookings) && data.bookings.length > 0) {
            const remoteRecords = data.bookings.map((b) => ({
              bookingId: b.id,
              destinationId: b.destination_id || "dest-custom",
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
              status: b.status
            }));
            StorageService.setItem(STORAGE_KEYS.BOOKINGS, remoteRecords);
            this.notifyBookingsChange();
          }
        }
        const wishRes = await fetch(`${API_CONFIG.BASE_URL}/wishlist`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (wishRes.ok) {
          const wishData = await wishRes.json();
          if (wishData.success && Array.isArray(wishData.wishlist) && wishData.wishlist.length > 0) {
            const ids = wishData.wishlist.map((w) => w.id || w.destination_id);
            StorageService.setItem(STORAGE_KEYS.FAVORITES, ids);
            this.notifyWishlistChange();
          }
        }
      } catch {
      }
    }
  };
  __publicField(DestinationService, "searchCache", /* @__PURE__ */ new Map());
  __publicField(DestinationService, "initialCache", null);
  __publicField(DestinationService, "wishlistListeners", []);
  __publicField(DestinationService, "bookingsListeners", []);
  __publicField(DestinationService, "POSITIVE_GEO_TERMS", [
    "country",
    "sovereign state",
    "city",
    "capital",
    "island",
    "town",
    "village",
    "province",
    "state",
    "municipality",
    "territory",
    "region",
    "continent",
    "peninsula",
    "archipelago",
    "beach",
    "mountain",
    "mount ",
    "lake",
    "river",
    "valley",
    "waterfall",
    "canyon",
    "national park",
    "monument",
    "resort",
    "temple",
    "castle",
    "palace",
    "cathedral",
    "sanctuary",
    "landmark",
    "tourist attraction",
    "attraction",
    "tourist",
    "destination",
    "ruins",
    "archaeological site",
    "historic site",
    "world heritage site",
    "atoll",
    "settlement",
    "oasis",
    "volcano",
    "coast",
    "coastal"
  ]);
  __publicField(DestinationService, "NEGATIVE_ENTITY_TERMS", [
    "container",
    "bag",
    "handbag",
    "accessory",
    "clothing",
    "footwear",
    "shoe",
    "garment",
    "edible",
    "fruit",
    "vegetable",
    "dish",
    "food",
    "recipe",
    "species",
    "breed",
    "canid",
    "mammal",
    "insect",
    "animal",
    "plant",
    "machine",
    "device",
    "vehicle",
    "automobile",
    "car model",
    "aircraft",
    "tool",
    "instrument",
    "film",
    "movie",
    "television series",
    "actor",
    "actress",
    "singer",
    "musician",
    "band",
    "album",
    "song",
    "video game",
    "software",
    "programming",
    "novel",
    "book",
    "magazine",
    "company",
    "corporation",
    "brand",
    "chemical",
    "disease",
    "disaster",
    "attack",
    "bombing",
    "battle",
    "war",
    "treaty",
    "politician",
    "political party",
    "legislature",
    "parliament",
    "court",
    "law",
    "railway station",
    "station",
    "football",
    "sports club",
    "satire",
    "slang",
    "mythological",
    "concept",
    "philosophy",
    "euthanasia",
    "crime",
    "murder",
    "suicide",
    "airline",
    "airport",
    "cycling",
    "tournament"
  ]);
  __publicField(DestinationService, "EXCLUDED_TITLES", [
    "(disambiguation)",
    "list of",
    "demographics of",
    "economy of",
    "history of",
    "politics of",
    "geography of",
    "foreign relations",
    "commune",
    "airport",
    "railway"
  ]);
  /**
   * Static Top Selling Destinations shown in the initial landing page section
   */
  __publicField(DestinationService, "STATIC_TOP_DESTINATIONS", {
    "static-rome": {
      id: "static-rome",
      title: "Rome, Italy",
      subtitle: "Italy",
      description: "Rome, the Eternal City, showcases the Colosseum, Pantheon, Vatican City, and incredible Italian culinary traditions spanning millennia of history.",
      imageUrl: "assets/Images/destination-section/destination-1-rome.png",
      price: "$5.42k",
      duration: "10 Days Trip",
      rating: 4.9,
      coordinates: { lat: 41.9028, lon: 12.4964 }
    },
    "static-london": {
      id: "static-london",
      title: "London, UK",
      subtitle: "United Kingdom",
      description: "London combines royal heritage with cosmopolitan energy, featuring Big Ben, the Tower of London, world-class West End shows, and charming Thames walks.",
      imageUrl: "assets/Images/destination-section/destination-2-london.jpg",
      price: "$4.2k",
      duration: "12 Days Trip",
      rating: 4.88,
      coordinates: { lat: 51.5074, lon: -0.1278 }
    },
    "static-europe": {
      id: "static-europe",
      title: "Full Europe",
      subtitle: "Western & Central Europe",
      description: "The grand European expedition covering Paris, the Swiss Alps, Vienna, Venice, and Barcelona in a curated 28-day luxury travel adventure.",
      imageUrl: "assets/Images/destination-section/destination-3-europe.png",
      price: "$15k",
      duration: "28 Days Trip",
      rating: 4.96,
      coordinates: { lat: 48.8566, lon: 2.3522 }
    },
    "static-greece": {
      id: "static-greece",
      title: "Trip to Greece",
      subtitle: "Greece",
      description: "Immerse yourself in Greek history, Aegean turquoise waters, ancient ruins of Athens, and Mediterranean cuisine in this curated 15-day voyage.",
      imageUrl: "assets/Images/book-section/card-trip-greece.jpeg",
      price: "$2,650",
      duration: "15 Days Trip",
      rating: 4.95,
      coordinates: { lat: 37.9838, lon: 23.7275 }
    }
  });

  // src/middleware/auth.middleware.ts
  var AuthMiddleware = class {
    static isAuthenticated() {
      return AuthService.getInstance().isAuthenticated();
    }
    /**
     * Enforce authentication before executing an action or viewing a section.
     * If user is not logged in, opens the Auth Required Modal and returns false.
     */
    static requireAuth(options = {}) {
      if (this.isAuthenticated()) {
        return true;
      }
      this.showAuthRequiredModal(options);
      return false;
    }
    /**
     * Wrap an action function with authentication check
     */
    static guardAction(actionFn, options = {}) {
      if (!this.requireAuth(options)) {
        return null;
      }
      return actionFn();
    }
    /**
     * Display the Authentication Required Modal
     */
    static showAuthRequiredModal(options = {}) {
      let modal = document.getElementById("auth-required-modal");
      if (!modal) {
        modal = this.createModalElement();
        document.body.appendChild(modal);
      }
      const titleEl = modal.querySelector("#auth-modal-title");
      const msgEl = modal.querySelector("#auth-modal-msg");
      const loginLink = modal.querySelector("#auth-modal-login-btn");
      const signupLink = modal.querySelector("#auth-modal-signup-btn");
      const defaultTitle = options.customTitle || "Authentication Required";
      const actionDesc = options.actionName || "access this protected travel portal section";
      const defaultMsg = options.customMessage || `You need to be signed in to ${actionDesc}. Log in with your verified account or sign up in seconds!`;
      if (titleEl) titleEl.textContent = defaultTitle;
      if (msgEl) msgEl.textContent = defaultMsg;
      const returnUrl = options.redirectUrl || window.location.pathname.split("/").pop() || "index.html";
      const returnParam = encodeURIComponent(returnUrl + (options.returnToTab ? `?tab=${options.returnToTab}` : ""));
      if (loginLink) loginLink.href = `auth.html?mode=login&returnUrl=${returnParam}`;
      if (signupLink) signupLink.href = `auth.html?mode=signup&returnUrl=${returnParam}`;
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
      setTimeout(() => loginLink?.focus(), 50);
    }
    /**
     * Hide the Authentication Required Modal
     */
    static hideAuthRequiredModal() {
      const modal = document.getElementById("auth-required-modal");
      if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "";
      }
    }
    /**
     * Render an inline Locked Access card for container elements (e.g. My Bookings tab)
     */
    static renderLockedState(container, options = {}) {
      const title = options.title || "Sign In to Access Your Bookings";
      const message = options.message || "Your flight bookings, reservations, and electronic boarding passes are protected under your private Jadoo account.";
      const currentFile = options.redirectUrl || window.location.pathname.split("/").pop() || "index.html";
      const returnTarget = encodeURIComponent(currentFile + (options.tabName ? `?tab=${options.tabName}` : ""));
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
     * Create the DOM structure for the Auth Required Modal if not present
     */
    static createModalElement() {
      const modal = document.createElement("div");
      modal.id = "auth-required-modal";
      modal.className = "profile-modal-overlay auth-required-overlay";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "auth-modal-title");
      modal.style.display = "none";
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
      modal.addEventListener("click", (e) => {
        const target = e.target;
        if (target === modal || target.closest("[data-close-auth-modal]")) {
          this.hideAuthRequiredModal();
        }
      });
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.style.display === "flex") {
          this.hideAuthRequiredModal();
        }
      });
      return modal;
    }
  };

  // src/utils/validation.utils.ts
  function validatePhoneNumber(phone) {
    if (!phone || !phone.trim()) {
      return {
        isValid: false,
        error: "Phone number is required for booking confirmations and gate alerts."
      };
    }
    const trimmed = phone.trim();
    const allowedCharsRegex = /^(\+)?[\d\s\-().]{6,25}$/;
    if (!allowedCharsRegex.test(trimmed)) {
      return {
        isValid: false,
        error: "Phone number contains invalid characters. Only digits, +, -, and ( ) are allowed."
      };
    }
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 7) {
      return {
        isValid: false,
        error: `Phone number is too short (${digits.length} digits). Standard phone numbers require at least 7 digits.`
      };
    }
    if (digits.length > 15) {
      return {
        isValid: false,
        error: `Phone number is too long (${digits.length} digits). International E.164 standard limits phone numbers to 15 digits.`
      };
    }
    if (/^(\d)\1{6,}$/.test(digits)) {
      return {
        isValid: false,
        error: "Please enter a genuine, active telephone number."
      };
    }
    const formatted = formatPhoneNumber(trimmed);
    return {
      isValid: true,
      formatted
    };
  }
  function sanitizePhoneInput(val) {
    let sanitized = val.replace(/[^\d+\s\-().]/g, "");
    if (sanitized.indexOf("+") > 0) {
      const hasLeadingPlus = sanitized.startsWith("+");
      sanitized = (hasLeadingPlus ? "+" : "") + sanitized.replace(/\+/g, "");
    }
    return sanitized;
  }
  function formatPhoneNumber(val) {
    const isPlus = val.trim().startsWith("+");
    const digits = val.replace(/\D/g, "");
    if (digits.length === 10 && !isPlus) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits.startsWith("1")) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else if (isPlus) {
      return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return val.trim();
  }
  function validateDepartureDate(dateStr) {
    if (!dateStr || !dateStr.trim()) {
      return {
        isValid: false,
        error: "Please select your preferred travel departure date."
      };
    }
    const selectedDate = /* @__PURE__ */ new Date(`${dateStr.trim()}T00:00:00`);
    if (isNaN(selectedDate.getTime())) {
      return {
        isValid: false,
        error: "Please enter a valid date in YYYY-MM-DD format."
      };
    }
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return {
        isValid: false,
        error: "Departure date cannot be in the past. Please select an upcoming date."
      };
    }
    const maxDate = /* @__PURE__ */ new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 2);
    if (selectedDate > maxDate) {
      return {
        isValid: false,
        error: "Reservations can be booked up to a maximum of 2 years in advance."
      };
    }
    return { isValid: true };
  }
  function validateEmail(email) {
    if (!email || !email.trim()) {
      return {
        isValid: false,
        error: "Email address is required for sending your travel tickets and vouchers."
      };
    }
    const clean = email.trim();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(clean)) {
      return {
        isValid: false,
        error: "Please provide a valid email address (e.g. name@example.com)."
      };
    }
    return { isValid: true };
  }
  function validatePassengerName(name) {
    if (!name || !name.trim()) {
      return {
        isValid: false,
        error: "Primary passenger legal name is required as it appears on your passport/ID."
      };
    }
    const clean = name.trim();
    if (clean.length < 2) {
      return {
        isValid: false,
        error: "Passenger name must be at least 2 characters long."
      };
    }
    if (clean.length > 80) {
      return {
        isValid: false,
        error: "Passenger name cannot exceed 80 characters."
      };
    }
    return { isValid: true };
  }

  // src/modules/destinations/destination-modal.controller.ts
  var _DestinationModalController = class _DestinationModalController {
    constructor() {
      // Details Modal Elements
      __publicField(this, "detailsModal", null);
      __publicField(this, "modalCoverImg", null);
      __publicField(this, "modalRating", null);
      __publicField(this, "modalDuration", null);
      __publicField(this, "modalTitle", null);
      __publicField(this, "modalSubtitle", null);
      __publicField(this, "modalPrice", null);
      __publicField(this, "modalDesc", null);
      __publicField(this, "modalFavBtn", null);
      __publicField(this, "modalBookCta", null);
      // Booking Modal Elements
      __publicField(this, "bookingModal", null);
      __publicField(this, "bookingFormScreen", null);
      __publicField(this, "bookingSuccessScreen", null);
      __publicField(this, "bookingBannerImg", null);
      __publicField(this, "bookingDestName", null);
      __publicField(this, "bookingDuration", null);
      __publicField(this, "bookingBasePrice", null);
      // Booking Form Fields
      __publicField(this, "bookingForm", null);
      __publicField(this, "inputName", null);
      __publicField(this, "inputEmail", null);
      __publicField(this, "inputPhone", null);
      __publicField(this, "inputDate", null);
      __publicField(this, "inputAdults", null);
      __publicField(this, "inputChildren", null);
      __publicField(this, "inputNotes", null);
      __publicField(this, "btnAdultsMinus", null);
      __publicField(this, "btnAdultsPlus", null);
      __publicField(this, "btnChildrenMinus", null);
      __publicField(this, "btnChildrenPlus", null);
      __publicField(this, "btnBackDetails", null);
      // Promo Elements
      __publicField(this, "inputPromo", null);
      __publicField(this, "btnApplyPromo", null);
      __publicField(this, "badgePromo", null);
      __publicField(this, "priceDiscountRow", null);
      __publicField(this, "priceDiscountVal", null);
      // Live Price Elements
      __publicField(this, "priceBreakdown", null);
      __publicField(this, "priceSubtotal", null);
      __publicField(this, "priceTax", null);
      __publicField(this, "priceTotal", null);
      // Receipt Elements
      __publicField(this, "receiptBookingId", null);
      __publicField(this, "receiptDestName", null);
      __publicField(this, "receiptTravelerName", null);
      __publicField(this, "receiptTravelerPhone", null);
      __publicField(this, "receiptTravelerEmail", null);
      __publicField(this, "receiptTravelDate", null);
      __publicField(this, "receiptGuests", null);
      __publicField(this, "receiptDiscountRow", null);
      __publicField(this, "receiptDiscountVal", null);
      __publicField(this, "receiptTotalPrice", null);
      // State
      __publicField(this, "currentDestination", null);
      __publicField(this, "appliedPromoCode", "");
      __publicField(this, "appliedDiscountPercent", 0);
      _DestinationModalController.instance = this;
      this.initElements();
      this.bindEvents();
      this.initDefaultMinDate();
    }
    initElements() {
      this.detailsModal = document.getElementById("dest-details-modal");
      this.modalCoverImg = document.getElementById("modal-dest-img");
      this.modalRating = document.getElementById("modal-dest-rating");
      this.modalDuration = document.getElementById("modal-dest-duration");
      this.modalTitle = document.getElementById("modal-dest-title");
      this.modalSubtitle = document.getElementById("modal-dest-subtitle");
      this.modalPrice = document.getElementById("modal-dest-price");
      this.modalDesc = document.getElementById("modal-dest-desc");
      this.modalFavBtn = document.getElementById("modal-fav-toggle");
      this.modalBookCta = document.getElementById("modal-book-cta");
      this.bookingModal = document.getElementById("dest-booking-modal");
      this.bookingFormScreen = document.getElementById("booking-form-screen");
      this.bookingSuccessScreen = document.getElementById("booking-success-screen");
      this.bookingBannerImg = document.getElementById("booking-banner-img");
      this.bookingDestName = document.getElementById("booking-dest-name");
      this.bookingDuration = document.getElementById("booking-banner-duration");
      this.bookingBasePrice = document.getElementById("booking-banner-base-price");
      this.bookingForm = document.getElementById("destination-booking-form");
      this.inputName = document.getElementById("book-name");
      this.inputEmail = document.getElementById("book-email");
      this.inputPhone = document.getElementById("book-phone");
      this.inputDate = document.getElementById("book-date");
      this.inputAdults = document.getElementById("book-adults");
      this.inputChildren = document.getElementById("book-children");
      this.inputNotes = document.getElementById("book-notes");
      this.btnAdultsMinus = document.getElementById("btn-adults-minus");
      this.btnAdultsPlus = document.getElementById("btn-adults-plus");
      this.btnChildrenMinus = document.getElementById("btn-children-minus");
      this.btnChildrenPlus = document.getElementById("btn-children-plus");
      this.btnBackDetails = document.getElementById("btn-back-details");
      this.inputPromo = document.getElementById("book-promo");
      this.btnApplyPromo = document.getElementById("btn-apply-promo");
      this.badgePromo = document.getElementById("promo-applied-badge");
      this.priceDiscountRow = document.getElementById("price-discount-row");
      this.priceDiscountVal = document.getElementById("price-calc-discount");
      this.priceBreakdown = document.getElementById("price-calc-breakdown");
      this.priceSubtotal = document.getElementById("price-calc-subtotal");
      this.priceTax = document.getElementById("price-calc-tax");
      this.priceTotal = document.getElementById("price-calc-total");
      this.receiptBookingId = document.getElementById("receipt-booking-id");
      this.receiptDestName = document.getElementById("receipt-dest-name");
      this.receiptTravelerName = document.getElementById("receipt-traveler-name");
      this.receiptTravelerPhone = document.getElementById("receipt-traveler-phone");
      this.receiptTravelerEmail = document.getElementById("receipt-traveler-email");
      this.receiptTravelDate = document.getElementById("receipt-travel-date");
      this.receiptGuests = document.getElementById("receipt-guests");
      this.receiptDiscountRow = document.getElementById("receipt-discount-row");
      this.receiptDiscountVal = document.getElementById("receipt-discount-val");
      this.receiptTotalPrice = document.getElementById("receipt-total-price");
    }
    initDefaultMinDate() {
      if (this.inputDate) {
        const today = /* @__PURE__ */ new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        this.inputDate.min = `${yyyy}-${mm}-${dd}`;
      }
    }
    bindEvents() {
      document.addEventListener("click", (e) => {
        const target = e.target;
        const bookBtn = target.closest(".dest-book-btn");
        if (bookBtn) {
          e.preventDefault();
          e.stopPropagation();
          const destId = bookBtn.getAttribute("data-dest-id") || bookBtn.closest("[data-id]")?.getAttribute("data-id") || "";
          const dest = this.resolveDestination(destId, bookBtn.getAttribute("data-title"));
          if (dest) {
            this.openBookingModal(dest);
          }
          return;
        }
        if (target.closest(".dest-fav-btn")) {
          return;
        }
        const card = target.closest(".destcards");
        if (card) {
          const destId = card.getAttribute("data-dest-id") || card.getAttribute("data-id") || "";
          const cardTitle = card.querySelector(".ct-name")?.textContent || "";
          const dest = this.resolveDestination(destId, cardTitle);
          if (dest) {
            this.openDetailsModal(dest);
          }
          return;
        }
        if (target.hasAttribute("data-close-modal") || target.closest("[data-close-modal]")) {
          this.closeAllModals();
          return;
        }
      });
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.closeAllModals();
        }
      });
      this.modalBookCta?.addEventListener("click", () => {
        if (this.currentDestination) {
          this.openBookingModal(this.currentDestination);
        }
      });
      this.modalFavBtn?.addEventListener("click", () => {
        if (!this.currentDestination) return;
        const isNowFav = DestinationService.toggleFavorite(this.currentDestination.id);
        this.updateDetailsFavBtn(isNowFav);
        const cardFavBtn = document.querySelector(`.dest-fav-btn[data-id="${this.currentDestination.id}"]`);
        if (cardFavBtn) {
          cardFavBtn.classList.toggle("active", isNowFav);
          const icon = cardFavBtn.querySelector("i");
          if (icon) {
            icon.className = isNowFav ? "fa-solid fa-heart" : "fa-regular fa-heart";
          }
        }
        this.showToast(isNowFav ? "Saved to your wishlist! \u2764\uFE0F" : "Removed from wishlist.");
      });
      this.btnBackDetails?.addEventListener("click", () => {
        if (this.currentDestination) {
          this.openDetailsModal(this.currentDestination);
        }
      });
      this.btnAdultsMinus?.addEventListener("click", () => this.adjustGuestCount("adults", -1));
      this.btnAdultsPlus?.addEventListener("click", () => this.adjustGuestCount("adults", 1));
      this.btnChildrenMinus?.addEventListener("click", () => this.adjustGuestCount("children", -1));
      this.btnChildrenPlus?.addEventListener("click", () => this.adjustGuestCount("children", 1));
      const tierRadios = document.querySelectorAll('input[name="package-tier"]');
      tierRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
          document.querySelectorAll(".package-tier-card").forEach((card) => card.classList.remove("active"));
          radio.closest(".package-tier-card")?.classList.add("active");
          this.updateLivePrice();
        });
      });
      this.inputPhone?.addEventListener("input", () => {
        if (this.inputPhone) {
          this.inputPhone.value = sanitizePhoneInput(this.inputPhone.value);
          const err = document.getElementById("book-phone-error");
          if (err && err.textContent) {
            const res = validatePhoneNumber(this.inputPhone.value);
            if (res.isValid) {
              err.textContent = "";
              this.inputPhone.classList.remove("input-error");
            }
          }
        }
      });
      this.inputPhone?.addEventListener("blur", () => {
        if (this.inputPhone && this.inputPhone.value.trim()) {
          const res = validatePhoneNumber(this.inputPhone.value);
          const err = document.getElementById("book-phone-error");
          if (res.isValid && res.formatted) {
            this.inputPhone.value = res.formatted;
            if (err) err.textContent = "";
            this.inputPhone.classList.remove("input-error");
          } else if (err && res.error) {
            err.textContent = res.error;
            this.inputPhone.classList.add("input-error");
          }
        }
      });
      this.inputName?.addEventListener("input", () => {
        const err = document.getElementById("book-name-error");
        if (err && err.textContent && this.inputName) {
          const res = validatePassengerName(this.inputName.value);
          if (res.isValid) {
            err.textContent = "";
            this.inputName.classList.remove("input-error");
          }
        }
      });
      this.inputEmail?.addEventListener("input", () => {
        const err = document.getElementById("book-email-error");
        if (err && err.textContent && this.inputEmail) {
          const res = validateEmail(this.inputEmail.value);
          if (res.isValid) {
            err.textContent = "";
            this.inputEmail.classList.remove("input-error");
          }
        }
      });
      this.inputDate?.addEventListener("input", () => {
        const err = document.getElementById("book-date-error");
        if (err && err.textContent && this.inputDate) {
          const res = validateDepartureDate(this.inputDate.value);
          if (res.isValid) {
            err.textContent = "";
            this.inputDate.classList.remove("input-error");
          }
        }
      });
      this.btnApplyPromo?.addEventListener("click", () => {
        const code = this.inputPromo?.value.trim().toUpperCase() || "";
        if (!code) {
          this.showToast("Please enter a voucher code before applying.", "error");
          return;
        }
        if (code === "EXPLORE15") {
          this.appliedPromoCode = "EXPLORE15";
          this.appliedDiscountPercent = 15;
          if (this.badgePromo) {
            this.badgePromo.style.display = "inline-flex";
            this.badgePromo.innerHTML = '<i class="fa-solid fa-circle-check"></i> 15% VIP Welcome Voucher Applied!';
          }
          this.updateLivePrice();
          this.showToast("\u{1F389} Promo code EXPLORE15 applied! 15% discount activated.");
        } else {
          this.showToast("Invalid or expired promo code. Try EXPLORE15!", "error");
        }
      });
      this.bookingForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleBookingSubmit();
      });
    }
    /**
     * Resolve a destination object from its ID or fallback title
     */
    resolveDestination(id, fallbackTitle) {
      if (!id && !fallbackTitle) return null;
      const matched = DestinationService.getDestinationById(id);
      if (matched) return matched;
      if (id.includes("rome") || fallbackTitle && fallbackTitle.toLowerCase().includes("rome")) {
        return DestinationService.STATIC_TOP_DESTINATIONS["static-rome"];
      }
      if (id.includes("london") || fallbackTitle && fallbackTitle.toLowerCase().includes("london")) {
        return DestinationService.STATIC_TOP_DESTINATIONS["static-london"];
      }
      if (id.includes("europe") || fallbackTitle && fallbackTitle.toLowerCase().includes("europe")) {
        return DestinationService.STATIC_TOP_DESTINATIONS["static-europe"];
      }
      if (id.includes("greece") || fallbackTitle && fallbackTitle.toLowerCase().includes("greece")) {
        return DestinationService.STATIC_TOP_DESTINATIONS["static-greece"];
      }
      return null;
    }
    /**
     * Open Details Popup Modal for a destination
     */
    openDetailsModal(dest) {
      this.currentDestination = dest;
      this.closeAllModals();
      if (!this.detailsModal) return;
      if (this.modalCoverImg) {
        this.modalCoverImg.src = dest.imageUrl;
        this.modalCoverImg.alt = dest.title;
        this.modalCoverImg.onerror = () => {
          if (this.modalCoverImg) {
            this.modalCoverImg.src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80";
          }
        };
      }
      if (this.modalRating) {
        this.modalRating.innerHTML = `<i class="fa-solid fa-star"></i> ${dest.rating.toFixed(1)}`;
      }
      if (this.modalDuration) {
        this.modalDuration.innerHTML = `<i class="fa-solid fa-location-arrow"></i> ${dest.duration}`;
      }
      if (this.modalTitle) {
        this.modalTitle.textContent = dest.title;
      }
      if (this.modalSubtitle) {
        this.modalSubtitle.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${dest.subtitle || "Global Destination"}`;
      }
      if (this.modalPrice) {
        this.modalPrice.textContent = dest.price;
      }
      if (this.modalDesc) {
        this.modalDesc.textContent = dest.description;
      }
      const isFav = DestinationService.getFavoriteIds().includes(dest.id);
      this.updateDetailsFavBtn(isFav);
      this.detailsModal.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
    /**
     * Open Booking Form Popup Modal for a destination
     */
    openBookingModal(dest) {
      this.currentDestination = dest;
      this.closeAllModals();
      if (!this.bookingModal) return;
      if (this.bookingFormScreen) this.bookingFormScreen.style.display = "block";
      if (this.bookingSuccessScreen) this.bookingSuccessScreen.style.display = "none";
      if (this.bookingBannerImg) {
        this.bookingBannerImg.src = dest.imageUrl;
        this.bookingBannerImg.alt = dest.title;
      }
      if (this.bookingDestName) {
        this.bookingDestName.textContent = dest.title;
      }
      if (this.bookingDuration) {
        this.bookingDuration.innerHTML = `<i class="fa-solid fa-clock"></i> ${dest.duration}`;
      }
      const basePriceNum = DestinationService.parsePriceToNumber(dest.price);
      if (this.bookingBasePrice) {
        this.bookingBasePrice.innerHTML = `<i class="fa-solid fa-tag"></i> $${basePriceNum.toLocaleString()} base`;
      }
      this.appliedPromoCode = "";
      this.appliedDiscountPercent = 0;
      if (this.inputPromo) this.inputPromo.value = "";
      if (this.badgePromo) this.badgePromo.style.display = "none";
      if (this.priceDiscountRow) this.priceDiscountRow.style.display = "none";
      this.clearFormErrors();
      this.resetFormCounters();
      this.updateLivePrice();
      const session = AuthService.getInstance().getCurrentSession();
      if (session) {
        if (this.inputName && !this.inputName.value) this.inputName.value = session.name;
        if (this.inputEmail && !this.inputEmail.value) this.inputEmail.value = session.email;
        if (this.inputPhone && !this.inputPhone.value && session.phone) {
          this.inputPhone.value = formatPhoneNumber(session.phone);
        }
      }
      this.bookingModal.style.display = "flex";
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        this.inputName?.focus();
      }, 100);
    }
    /**
     * Close all active dialog modals
     */
    closeAllModals() {
      if (this.detailsModal) this.detailsModal.style.display = "none";
      if (this.bookingModal) this.bookingModal.style.display = "none";
      document.body.style.overflow = "";
    }
    updateDetailsFavBtn(isFav) {
      if (!this.modalFavBtn) return;
      this.modalFavBtn.classList.toggle("active", isFav);
      const icon = this.modalFavBtn.querySelector("i");
      const span = this.modalFavBtn.querySelector("span");
      if (icon) {
        icon.className = isFav ? "fa-solid fa-heart" : "fa-regular fa-heart";
      }
      if (span) {
        span.textContent = isFav ? "Saved to Wishlist" : "Add to Wishlist";
      }
    }
    adjustGuestCount(type, delta) {
      if (type === "adults" && this.inputAdults) {
        const cur = parseInt(this.inputAdults.value || "1", 10);
        const next = Math.max(1, Math.min(10, (isNaN(cur) ? 1 : cur) + delta));
        this.inputAdults.value = String(next);
      } else if (type === "children" && this.inputChildren) {
        const cur = parseInt(this.inputChildren.value || "0", 10);
        const next = Math.max(0, Math.min(6, (isNaN(cur) ? 0 : cur) + delta));
        this.inputChildren.value = String(next);
      }
      this.updateLivePrice();
    }
    getSelectedTier() {
      const checked = document.querySelector('input[name="package-tier"]:checked');
      return checked?.value || "standard";
    }
    /**
     * Recalculate live prices in the booking summary with promo discount support
     */
    updateLivePrice() {
      if (!this.currentDestination) return;
      const basePerPerson = DestinationService.parsePriceToNumber(this.currentDestination.price);
      const adults = Math.max(1, parseInt(this.inputAdults?.value || "1", 10) || 1);
      const children = Math.max(0, parseInt(this.inputChildren?.value || "0", 10) || 0);
      const tier = this.getSelectedTier();
      let tierMultiplier = 1;
      if (tier === "deluxe") tierMultiplier = 1.2;
      if (tier === "luxury") tierMultiplier = 1.4;
      const grossSubtotal = Math.round((adults * basePerPerson + children * (basePerPerson * 0.5)) * tierMultiplier);
      const discount = this.appliedDiscountPercent > 0 ? Math.round(grossSubtotal * (this.appliedDiscountPercent / 100)) : 0;
      const subtotal = grossSubtotal - discount;
      const taxAndFees = Math.round(subtotal * 0.05);
      const total = subtotal + taxAndFees;
      if (this.priceBreakdown) {
        const adultLabel = `${adults} Adult${adults > 1 ? "s" : ""}`;
        const childLabel = children > 0 ? `, ${children} Child${children > 1 ? "ren" : ""}` : "";
        const tierLabel = tier !== "standard" ? ` (${tier.toUpperCase()})` : "";
        this.priceBreakdown.textContent = `${adultLabel}${childLabel}${tierLabel}`;
      }
      if (this.priceSubtotal) {
        this.priceSubtotal.textContent = `$${grossSubtotal.toLocaleString()}`;
      }
      if (this.priceDiscountRow && this.priceDiscountVal) {
        if (discount > 0) {
          this.priceDiscountRow.style.display = "flex";
          this.priceDiscountVal.textContent = `-$${discount.toLocaleString()}`;
        } else {
          this.priceDiscountRow.style.display = "none";
        }
      }
      if (this.priceTax) {
        this.priceTax.textContent = `$${taxAndFees.toLocaleString()}`;
      }
      if (this.priceTotal) {
        this.priceTotal.textContent = `$${total.toLocaleString()}`;
      }
    }
    resetFormCounters() {
      if (this.inputAdults) this.inputAdults.value = "1";
      if (this.inputChildren) this.inputChildren.value = "0";
      const standardRadio = document.querySelector('input[name="package-tier"][value="standard"]');
      if (standardRadio) {
        standardRadio.checked = true;
        document.querySelectorAll(".package-tier-card").forEach((c) => c.classList.remove("active"));
        standardRadio.closest(".package-tier-card")?.classList.add("active");
      }
    }
    clearFormErrors() {
      document.querySelectorAll(".field-error").forEach((el) => {
        el.textContent = "";
      });
      document.querySelectorAll(".input-error").forEach((el) => {
        el.classList.remove("input-error", "shake-animation");
      });
    }
    /**
     * Validate and submit booking with strict phone, email, name, and departure date verification
     */
    handleBookingSubmit() {
      if (!AuthMiddleware.requireAuth({
        actionName: "confirm this flight reservation and book your vacation",
        customMessage: "You must be signed in to finalize and record travel bookings to your verified Jadoo profile."
      })) {
        return;
      }
      this.clearFormErrors();
      const name = this.inputName?.value.trim() || "";
      const email = this.inputEmail?.value.trim() || "";
      const phone = this.inputPhone?.value.trim() || "";
      const date = this.inputDate?.value || "";
      let isValid = true;
      let firstErrorField = null;
      const nameRes = validatePassengerName(name);
      if (!nameRes.isValid) {
        const err = document.getElementById("book-name-error");
        if (err) err.textContent = nameRes.error || "Please provide your full legal name.";
        this.inputName?.classList.add("input-error", "shake-animation");
        setTimeout(() => this.inputName?.classList.remove("shake-animation"), 350);
        if (!firstErrorField) firstErrorField = this.inputName;
        isValid = false;
      }
      const emailRes = validateEmail(email);
      if (!emailRes.isValid) {
        const err = document.getElementById("book-email-error");
        if (err) err.textContent = emailRes.error || "Please enter a valid email address.";
        this.inputEmail?.classList.add("input-error", "shake-animation");
        setTimeout(() => this.inputEmail?.classList.remove("shake-animation"), 350);
        if (!firstErrorField) firstErrorField = this.inputEmail;
        isValid = false;
      }
      const phoneRes = validatePhoneNumber(phone);
      if (!phoneRes.isValid) {
        const err = document.getElementById("book-phone-error");
        if (err) err.textContent = phoneRes.error || "Please provide a valid contact phone number.";
        this.inputPhone?.classList.add("input-error", "shake-animation");
        setTimeout(() => this.inputPhone?.classList.remove("shake-animation"), 350);
        if (!firstErrorField) firstErrorField = this.inputPhone;
        isValid = false;
      }
      const dateRes = validateDepartureDate(date);
      if (!dateRes.isValid) {
        const err = document.getElementById("book-date-error");
        if (err) err.textContent = dateRes.error || "Please select your preferred departure date.";
        this.inputDate?.classList.add("input-error", "shake-animation");
        setTimeout(() => this.inputDate?.classList.remove("shake-animation"), 350);
        if (!firstErrorField) firstErrorField = this.inputDate;
        isValid = false;
      }
      if (!isValid || !this.currentDestination) {
        firstErrorField?.focus();
        return;
      }
      const adults = Math.max(1, parseInt(this.inputAdults?.value || "1", 10) || 1);
      const children = Math.max(0, parseInt(this.inputChildren?.value || "0", 10) || 0);
      const tier = this.getSelectedTier();
      const basePerPerson = DestinationService.parsePriceToNumber(this.currentDestination.price);
      let tierMultiplier = 1;
      if (tier === "deluxe") tierMultiplier = 1.2;
      if (tier === "luxury") tierMultiplier = 1.4;
      const grossSubtotal = Math.round((adults * basePerPerson + children * (basePerPerson * 0.5)) * tierMultiplier);
      const discount = this.appliedDiscountPercent > 0 ? Math.round(grossSubtotal * (this.appliedDiscountPercent / 100)) : 0;
      const subtotal = grossSubtotal - discount;
      const total = subtotal + Math.round(subtotal * 0.05);
      const formattedPhone = phoneRes.formatted || phone;
      const bookingReq = {
        destinationId: this.currentDestination.id,
        destinationTitle: this.currentDestination.title,
        destinationImage: this.currentDestination.imageUrl,
        fullName: name,
        email,
        phone: formattedPhone,
        departureDate: date,
        adults,
        children,
        packageTier: tier,
        notes: this.inputNotes?.value.trim(),
        basePricePerPerson: basePerPerson,
        totalPrice: total,
        promoCode: this.appliedPromoCode || void 0
      };
      const record = DestinationService.saveBooking(bookingReq);
      if (this.receiptBookingId) this.receiptBookingId.textContent = `#${record.bookingId}`;
      if (this.receiptDestName) this.receiptDestName.textContent = record.destinationTitle;
      if (this.receiptTravelerName) this.receiptTravelerName.textContent = record.fullName;
      if (this.receiptTravelerPhone) this.receiptTravelerPhone.textContent = formattedPhone;
      if (this.receiptTravelerEmail) this.receiptTravelerEmail.textContent = email;
      if (this.receiptTravelDate) {
        try {
          const d = /* @__PURE__ */ new Date(record.departureDate + "T00:00:00");
          this.receiptTravelDate.textContent = d.toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" });
        } catch {
          this.receiptTravelDate.textContent = record.departureDate;
        }
      }
      if (this.receiptGuests) {
        const guestText = `${adults} Adult${adults > 1 ? "s" : ""}${children > 0 ? `, ${children} Child${children > 1 ? "ren" : ""}` : ""}`;
        this.receiptGuests.textContent = `${guestText} (${tier.toUpperCase()})`;
      }
      if (this.receiptDiscountRow && this.receiptDiscountVal) {
        if (this.appliedDiscountPercent > 0) {
          this.receiptDiscountRow.style.display = "flex";
          this.receiptDiscountVal.textContent = `-${this.appliedDiscountPercent}% (${this.appliedPromoCode})`;
        } else {
          this.receiptDiscountRow.style.display = "none";
        }
      }
      if (this.receiptTotalPrice) {
        this.receiptTotalPrice.textContent = `$${record.totalPrice.toLocaleString()}`;
      }
      if (this.bookingFormScreen) this.bookingFormScreen.style.display = "none";
      if (this.bookingSuccessScreen) {
        this.bookingSuccessScreen.style.display = "block";
      }
      this.showToast(`\u{1F389} Reservation confirmed for ${record.destinationTitle}!`);
    }
    showToast(message) {
      let toast = document.getElementById("jadoo-toast");
      if (!toast) {
        toast = document.createElement("div");
        toast.id = "jadoo-toast";
        toast.className = "jadoo-toast";
        document.body.appendChild(toast);
      }
      toast.textContent = message;
      toast.classList.add("show");
      setTimeout(() => {
        toast?.classList.remove("show");
      }, 3200);
    }
  };
  __publicField(_DestinationModalController, "instance", null);
  var DestinationModalController = _DestinationModalController;

  // src/modules/destinations/destination-map.controller.ts
  var _DestinationMapController = class _DestinationMapController {
    constructor() {
      // View toggle buttons
      __publicField(this, "gridViewBtn", null);
      __publicField(this, "mapViewBtn", null);
      __publicField(this, "gridContainer", null);
      __publicField(this, "mapContainer", null);
      __publicField(this, "mapElement", null);
      __publicField(this, "mapFitBtn", null);
      // Leaflet map instances
      __publicField(this, "map", null);
      __publicField(this, "markerLayerGroup", null);
      __publicField(this, "isMapInitialized", false);
      __publicField(this, "currentDestinations", []);
      __publicField(this, "activeView", "grid");
      _DestinationMapController.instance = this;
      this.initElements();
      this.bindEvents();
    }
    static getInstance() {
      return _DestinationMapController.instance;
    }
    initElements() {
      this.gridViewBtn = document.getElementById("dest-view-grid-btn");
      this.mapViewBtn = document.getElementById("dest-view-map-btn");
      this.gridContainer = document.getElementById("dest-dynamic-grid");
      this.mapContainer = document.getElementById("dest-map-container");
      this.mapElement = document.getElementById("dest-leaflet-map");
      this.mapFitBtn = document.getElementById("dest-map-fit-btn");
    }
    bindEvents() {
      this.gridViewBtn?.addEventListener("click", () => {
        this.switchView("grid");
      });
      this.mapViewBtn?.addEventListener("click", () => {
        this.switchView("map");
      });
      this.mapFitBtn?.addEventListener("click", () => {
        this.fitMapToMarkers();
      });
      document.addEventListener("click", (e) => {
        const target = e.target;
        const detailsBtn = target.closest(".popup-btn-details");
        if (detailsBtn) {
          const destId = detailsBtn.getAttribute("data-id");
          const dest = this.currentDestinations.find((d) => d.id === destId);
          if (dest) {
            DestinationModalController.instance?.openDetailsModal(dest);
          }
          return;
        }
        const bookBtn = target.closest(".popup-btn-book");
        if (bookBtn) {
          const destId = bookBtn.getAttribute("data-id");
          const dest = this.currentDestinations.find((d) => d.id === destId);
          if (dest) {
            DestinationModalController.instance?.openBookingModal(dest);
          }
          return;
        }
      });
    }
    /**
     * Switch between Grid View and Interactive World Map View
     */
    switchView(view) {
      this.activeView = view;
      if (view === "grid") {
        this.gridViewBtn?.classList.add("active");
        this.mapViewBtn?.classList.remove("active");
        this.gridViewBtn?.setAttribute("aria-pressed", "true");
        this.mapViewBtn?.setAttribute("aria-pressed", "false");
        if (this.gridContainer) this.gridContainer.style.display = "grid";
        if (this.mapContainer) this.mapContainer.style.display = "none";
      } else {
        this.mapViewBtn?.classList.add("active");
        this.gridViewBtn?.classList.remove("active");
        this.mapViewBtn?.setAttribute("aria-pressed", "true");
        this.gridViewBtn?.setAttribute("aria-pressed", "false");
        if (this.gridContainer) this.gridContainer.style.display = "none";
        if (this.mapContainer) this.mapContainer.style.display = "block";
        this.ensureMapInitialized();
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
            this.fitMapToMarkers();
          }
        }, 150);
      }
    }
    /**
     * Initialize Leaflet map and tile layer
     */
    ensureMapInitialized() {
      if (this.isMapInitialized || !this.mapElement || typeof L === "undefined") {
        return;
      }
      try {
        this.map = L.map(this.mapElement, {
          center: [25, 10],
          zoom: 2.3,
          minZoom: 2,
          maxZoom: 18,
          worldCopyJump: true,
          scrollWheelZoom: true
        });
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19
        }).addTo(this.map);
        this.markerLayerGroup = L.layerGroup().addTo(this.map);
        this.isMapInitialized = true;
        if (this.currentDestinations.length > 0) {
          this.plotMarkers();
        }
      } catch (err) {
        console.error("[DestinationMapController] Error initializing Leaflet map:", err);
      }
    }
    /**
     * Update the current destinations list and update map pins
     */
    updateDestinations(destinations) {
      this.currentDestinations = destinations;
      if (this.isMapInitialized) {
        this.plotMarkers();
        if (this.activeView === "map") {
          setTimeout(() => this.fitMapToMarkers(), 200);
        }
      }
    }
    /**
     * Render custom markers on the Leaflet map
     */
    plotMarkers() {
      if (!this.map || !this.markerLayerGroup || typeof L === "undefined") return;
      this.markerLayerGroup.clearLayers();
      const withCoords = this.currentDestinations.filter((d) => d.coordinates?.lat && d.coordinates?.lon);
      withCoords.forEach((dest) => {
        const { lat, lon } = dest.coordinates;
        const shortTitle = dest.title.split(",")[0].trim();
        const pinIcon = L.divIcon({
          className: "custom-leaflet-marker",
          html: `
          <div class="map-pin-container" title="${dest.title}">
            <div class="map-pin-pulse"></div>
            <div class="map-pin-head">
              <i class="fa-solid fa-location-dot"></i>
            </div>
            <div class="map-pin-label">
              <span class="pin-title">${shortTitle}</span>
              <span class="pin-price">${dest.price}</span>
            </div>
          </div>
        `,
          iconSize: [120, 42],
          iconAnchor: [18, 40],
          popupAnchor: [42, -36]
        });
        const popupHtml = `
        <div class="map-popup-card">
          <div class="popup-cover-wrap">
            <img src="${dest.imageUrl}" alt="${dest.title}" class="popup-cover" onerror="this.src='https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'" />
            <span class="popup-star-tag"><i class="fa-solid fa-star"></i> ${dest.rating.toFixed(1)}</span>
          </div>
          <div class="popup-content">
            <h4 class="popup-title">${dest.title}</h4>
            <div class="popup-badges">
              <span class="popup-duration"><i class="fa-solid fa-clock"></i> ${dest.duration}</span>
              <span class="popup-price">${dest.price}</span>
            </div>
            <p class="popup-summary">${dest.description.slice(0, 110)}...</p>
            <div class="popup-btns">
              <button type="button" class="popup-btn-details" data-id="${dest.id}">
                <i class="fa-solid fa-circle-info"></i>
                <span>Details</span>
              </button>
              <button type="button" class="popup-btn-book" data-id="${dest.id}">
                <i class="fa-solid fa-paper-plane"></i>
                <span>Book Now</span>
              </button>
            </div>
          </div>
        </div>
      `;
        const marker = L.marker([lat, lon], { icon: pinIcon }).bindPopup(popupHtml, {
          maxWidth: 290,
          className: "jadoo-leaflet-popup"
        });
        this.markerLayerGroup.addLayer(marker);
      });
    }
    /**
     * Fit map viewport smoothly to cover all currently plotted pins
     */
    fitMapToMarkers() {
      if (!this.map || !this.markerLayerGroup || typeof L === "undefined") return;
      const layers = this.markerLayerGroup.getLayers();
      if (layers.length === 0) {
        this.map.flyTo([25, 10], 2.3, { duration: 1 });
        return;
      }
      if (layers.length === 1) {
        const latLng = layers[0].getLatLng();
        this.map.flyTo(latLng, 6, { duration: 1.2 });
        return;
      }
      const bounds = L.latLngBounds(layers.map((layer) => layer.getLatLng()));
      this.map.flyToBounds(bounds.pad(0.25), {
        duration: 1.2,
        maxZoom: 7
      });
    }
  };
  __publicField(_DestinationMapController, "instance", null);
  var DestinationMapController = _DestinationMapController;

  // src/modules/destinations/destination-explorer.controller.ts
  var DestinationExplorerController = class {
    constructor() {
      __publicField(this, "exploreBtn", null);
      __publicField(this, "explorerSection", null);
      __publicField(this, "searchForm", null);
      __publicField(this, "searchInput", null);
      __publicField(this, "clearBtn", null);
      __publicField(this, "gridContainer", null);
      __publicField(this, "statusText", null);
      __publicField(this, "filterPills", null);
      __publicField(this, "isLoaded", false);
      __publicField(this, "isExpanded", false);
      __publicField(this, "currentDestinations", []);
      __publicField(this, "debounceTimer", null);
      this.initElements();
      if (this.exploreBtn && this.explorerSection) {
        this.bindEvents();
      }
    }
    initElements() {
      this.exploreBtn = document.getElementById("explore-dest-btn");
      this.explorerSection = document.getElementById("destination-explorer");
      this.searchForm = document.getElementById("dest-search-form");
      this.searchInput = document.getElementById("dest-search-input");
      this.clearBtn = document.getElementById("dest-search-clear");
      this.gridContainer = document.getElementById("dest-dynamic-grid");
      this.statusText = document.getElementById("dest-status-text");
      this.filterPills = document.querySelectorAll(".dest-filter-pill");
    }
    bindEvents() {
      this.exploreBtn?.addEventListener("click", () => {
        this.toggleExplorer();
      });
      this.searchForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        const query = this.searchInput?.value.trim() || "";
        this.executeSearch(query);
      });
      this.searchInput?.addEventListener("input", () => {
        const val = this.searchInput?.value || "";
        this.toggleClearButton(val.length > 0);
        if (this.debounceTimer) {
          window.clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = window.setTimeout(() => {
          this.executeSearch(val.trim());
        }, 400);
      });
      this.clearBtn?.addEventListener("click", () => {
        if (this.searchInput) {
          this.searchInput.value = "";
          this.searchInput.focus();
        }
        this.toggleClearButton(false);
        this.resetActivePills();
        this.executeSearch("");
      });
      this.filterPills?.forEach((pill) => {
        pill.addEventListener("click", () => {
          const category = pill.getAttribute("data-category");
          this.setActivePill(pill);
          this.handleCategoryFilter(category);
        });
      });
      this.gridContainer?.addEventListener("click", (e) => {
        const target = e.target;
        const favBtn = target.closest(".dest-fav-btn");
        if (favBtn) {
          e.stopPropagation();
          const destId = favBtn.getAttribute("data-id");
          if (destId) {
            const dest = DestinationService.getDestinationById(destId);
            const isNowFav = DestinationService.toggleFavorite(dest || destId);
            favBtn.classList.toggle("active", isNowFav);
            favBtn.setAttribute("aria-label", isNowFav ? "Remove from favorites" : "Add to favorites");
            const heartIcon = favBtn.querySelector("i");
            if (heartIcon) {
              heartIcon.className = isNowFav ? "fa-solid fa-heart" : "fa-regular fa-heart";
            }
            this.showToast(isNowFav ? "Saved to your wishlist! \u2764\uFE0F" : "Removed from wishlist.");
          }
          return;
        }
      });
    }
    /**
     * Toggle the explorer section open/closed
     */
    toggleExplorer() {
      this.isExpanded = !this.isExpanded;
      if (this.explorerSection) {
        if (this.isExpanded) {
          this.explorerSection.style.display = "block";
          this.exploreBtn?.classList.add("active");
          this.exploreBtn?.setAttribute("aria-expanded", "true");
          const span = this.exploreBtn?.querySelector("span");
          if (span) span.textContent = "Hide Explorer";
          if (!this.isLoaded) {
            this.loadInitialDestinations();
          }
          setTimeout(() => {
            this.explorerSection?.scrollIntoView({ behavior: "smooth", block: "start" });
            this.searchInput?.focus();
          }, 100);
        } else {
          this.explorerSection.style.display = "none";
          this.exploreBtn?.classList.remove("active");
          this.exploreBtn?.setAttribute("aria-expanded", "false");
          const span = this.exploreBtn?.querySelector("span");
          if (span) span.textContent = "Explore Destination";
        }
      }
    }
    /**
     * Fetch and render the 8 initial destinations
     */
    async loadInitialDestinations() {
      this.renderSkeletons(8);
      this.updateStatus("Fetching 8 featured world destinations from free Wikipedia API...");
      try {
        const destinations = await DestinationService.getInitialDestinations();
        this.currentDestinations = destinations;
        this.isLoaded = true;
        this.renderCards(destinations);
        this.updateStatus(`Showing 8 featured destinations around the world`);
      } catch (err) {
        console.error("[DestinationExplorer] Error loading initial destinations:", err);
        this.renderError("Unable to load live destinations right now. Please try again.");
      }
    }
    /**
     * Search method: query the free Wikipedia API for what the user wants
     */
    async executeSearch(query) {
      if (!query) {
        this.updateStatus("Showing 8 featured destinations around the world");
        await this.loadInitialDestinations();
        return;
      }
      this.renderSkeletons(4);
      this.updateStatus(`Searching live destinations for "${query}"...`);
      try {
        const results = await DestinationService.searchDestinations(query);
        this.currentDestinations = results;
        if (results.length === 0) {
          this.renderEmptyState(query);
          this.updateStatus(`No destinations found for "${query}"`);
        } else {
          this.renderCards(results);
          this.updateStatus(`Found ${results.length} destination${results.length > 1 ? "s" : ""} for "${query}"`);
        }
      } catch (err) {
        console.error("[DestinationExplorer] Search failed:", err);
        this.renderError(`Search error while fetching "${query}". Please try again.`);
      }
    }
    /**
     * Filter initial destinations by category
     */
    handleCategoryFilter(category) {
      if (!category || category === "all") {
        this.loadInitialDestinations();
        return;
      }
      if (!this.isLoaded) {
        this.loadInitialDestinations().then(() => {
          this.filterLoadedByCategory(category);
        });
      } else {
        this.filterLoadedByCategory(category);
      }
    }
    filterLoadedByCategory(category) {
      const filtered = this.currentDestinations.filter((d) => d.category === category);
      if (filtered.length > 0) {
        this.renderCards(filtered);
        this.updateStatus(`Showing ${filtered.length} destinations in ${category.toUpperCase()}`);
      } else {
        if (this.searchInput) {
          this.searchInput.value = category;
          this.toggleClearButton(true);
        }
        this.executeSearch(category);
      }
    }
    /**
     * Render destination cards into the grid
     */
    renderCards(destinations) {
      if (!this.gridContainer) return;
      destinations.forEach((d) => DestinationService.registerDestination(d));
      DestinationMapController.getInstance()?.updateDestinations(destinations);
      this.gridContainer.innerHTML = destinations.map((dest) => {
        const heartClass = dest.isFavorite ? "fa-solid fa-heart" : "fa-regular fa-heart";
        const activeClass = dest.isFavorite ? "active" : "";
        return `
          <article class="destcards dynamic-destcard" data-id="${dest.id}" data-dest-id="${dest.id}" tabindex="0" role="button" aria-label="View details for ${dest.title}">
            <div class="dest-img-wrap">
              <img 
                src="${dest.imageUrl}" 
                class="dest-img" 
                alt="${dest.title}" 
                loading="lazy" 
                onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';"
              />
              <button 
                type="button" 
                class="dest-fav-btn ${activeClass}" 
                data-id="${dest.id}" 
                aria-label="${dest.isFavorite ? "Remove from favorites" : "Add to favorites"}"
                title="Save destination"
              >
                <i class="${heartClass}"></i>
              </button>
              <div class="dest-badge">
                <i class="fa-solid fa-star"></i>
                <span>${dest.rating.toFixed(1)}</span>
              </div>
            </div>

            <div class="d-card-ut">
              <div class="d-card-row">
                <h4 class="ct-name" title="${dest.title}">${dest.title}</h4>
                <span class="ct-price">${dest.price}</span>
              </div>

              <div class="d-card-sub">
                <i class="fa-solid fa-location-arrow"></i>
                <span class="dest-dz">${dest.duration}</span>
              </div>

              <p class="dest-desc">${dest.description}</p>

              <div class="dest-card-actions">
                <button 
                  type="button" 
                  class="dest-book-btn" 
                  data-dest-id="${dest.id}"
                  data-title="${dest.title}"
                >
                  <span>Book This Trip</span>
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </article>
        `;
      }).join("");
    }
    /**
     * Render shimmer skeleton loading cards
     */
    renderSkeletons(count = 8) {
      if (!this.gridContainer) return;
      const skeletonsHtml = Array.from({ length: count }).map(
        () => `
        <article class="destcards dynamic-destcard skeleton-card" aria-hidden="true">
          <div class="skeleton-img skeleton-pulse"></div>
          <div class="d-card-ut">
            <div class="skeleton-line title skeleton-pulse"></div>
            <div class="skeleton-line sub skeleton-pulse"></div>
            <div class="skeleton-line desc skeleton-pulse"></div>
            <div class="skeleton-line desc short skeleton-pulse"></div>
            <div class="skeleton-btn skeleton-pulse"></div>
          </div>
        </article>
      `
      ).join("");
      this.gridContainer.innerHTML = skeletonsHtml;
    }
    /**
     * Render empty state when search produces no results
     */
    renderEmptyState(query) {
      if (!this.gridContainer) return;
      this.gridContainer.innerHTML = `
      <div class="dest-empty-state">
        <div class="empty-icon"><i class="fa-solid fa-magnifying-glass-location"></i></div>
        <h3>No Destinations Found</h3>
        <p>We couldn't find any destination matches for "<strong>${this.escapeHtml(query)}</strong>". Try searching for iconic cities like <em>Tokyo, Paris, Rome, Bali, Cairo</em> or <em>Sydney</em>.</p>
        <button type="button" class="empty-reset-btn" id="empty-reset-btn">
          <i class="fa-solid fa-rotate-left"></i>
          <span>Reset Search</span>
        </button>
      </div>
    `;
      document.getElementById("empty-reset-btn")?.addEventListener("click", () => {
        if (this.searchInput) {
          this.searchInput.value = "";
          this.searchInput.focus();
        }
        this.toggleClearButton(false);
        this.resetActivePills();
        this.executeSearch("");
      });
    }
    /**
     * Render error message
     */
    renderError(message) {
      if (!this.gridContainer) return;
      this.gridContainer.innerHTML = `
      <div class="dest-empty-state dest-error-state">
        <div class="empty-icon error"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <h3>Connection Issue</h3>
        <p>${this.escapeHtml(message)}</p>
        <button type="button" class="empty-reset-btn" id="error-retry-btn">
          <i class="fa-solid fa-arrow-rotate-right"></i>
          <span>Try Again</span>
        </button>
      </div>
    `;
      document.getElementById("error-retry-btn")?.addEventListener("click", () => {
        this.loadInitialDestinations();
      });
    }
    updateStatus(msg) {
      if (this.statusText) {
        this.statusText.textContent = msg;
      }
    }
    toggleClearButton(visible) {
      if (this.clearBtn) {
        this.clearBtn.style.display = visible ? "flex" : "none";
      }
    }
    setActivePill(activePill) {
      this.filterPills?.forEach((pill) => pill.classList.remove("active"));
      activePill.classList.add("active");
    }
    resetActivePills() {
      this.filterPills?.forEach((pill, idx) => {
        if (idx === 0) pill.classList.add("active");
        else pill.classList.remove("active");
      });
    }
    escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }
    /**
     * Show a smooth floating toast notification
     */
    showToast(message) {
      let toast = document.getElementById("jadoo-toast");
      if (!toast) {
        toast = document.createElement("div");
        toast.id = "jadoo-toast";
        toast.className = "jadoo-toast";
        document.body.appendChild(toast);
      }
      toast.textContent = message;
      toast.classList.add("show");
      setTimeout(() => {
        toast?.classList.remove("show");
      }, 3e3);
    }
  };

  // src/modules/user/user-panel.controller.ts
  var UserPanelController = class {
    constructor() {
      // Navigation trigger buttons
      __publicField(this, "navWishlistBtn", null);
      __publicField(this, "navBookingsBtn", null);
      __publicField(this, "navWishlistBadge", null);
      __publicField(this, "navBookingsBadge", null);
      // Drawer Elements
      __publicField(this, "drawerOverlay", null);
      __publicField(this, "drawerPanel", null);
      __publicField(this, "drawerCloseBtn", null);
      __publicField(this, "tabWishlistBtn", null);
      __publicField(this, "tabBookingsBtn", null);
      __publicField(this, "tabWishlistBadge", null);
      __publicField(this, "tabBookingsBadge", null);
      __publicField(this, "tabContentWishlist", null);
      __publicField(this, "tabContentBookings", null);
      __publicField(this, "wishlistItemsList", null);
      __publicField(this, "bookingsItemsList", null);
      __publicField(this, "clearWishlistBtn", null);
      // Boarding Pass Modal Elements
      __publicField(this, "boardingPassModal", null);
      __publicField(this, "bpPassengerName", null);
      __publicField(this, "bpPassengerPhone", null);
      __publicField(this, "bpBookingRef", null);
      __publicField(this, "bpDestTitle", null);
      __publicField(this, "bpDepartureDate", null);
      __publicField(this, "bpDuration", null);
      __publicField(this, "bpPackageTier", null);
      __publicField(this, "bpGuests", null);
      __publicField(this, "bpTotalPrice", null);
      __publicField(this, "bpStatusBadge", null);
      __publicField(this, "bpPrintBtn", null);
      __publicField(this, "activeTab", "wishlist");
      this.initElements();
      this.bindEvents();
      this.syncBadges();
      this.listenToServiceUpdates();
      this.initUrlDrawerState();
    }
    initUrlDrawerState() {
      const urlParams = new URLSearchParams(window.location.search);
      const drawerParam = urlParams.get("drawer") || (window.location.hash === "#drawer-bookings" ? "bookings" : window.location.hash === "#drawer-wishlist" ? "wishlist" : null);
      if (drawerParam === "wishlist" || drawerParam === "bookings") {
        if (drawerParam === "bookings" && !AuthMiddleware.isAuthenticated()) {
        } else {
          setTimeout(() => this.openDrawer(drawerParam), 120);
        }
      }
    }
    initElements() {
      this.navWishlistBtn = document.getElementById("nav-wishlist-btn");
      this.navBookingsBtn = document.getElementById("nav-bookings-btn");
      this.navWishlistBadge = document.getElementById("nav-wishlist-badge");
      this.navBookingsBadge = document.getElementById("nav-bookings-badge");
      this.drawerOverlay = document.getElementById("user-travel-drawer-overlay");
      this.drawerPanel = document.getElementById("user-travel-drawer");
      this.drawerCloseBtn = document.getElementById("drawer-close-btn");
      this.tabWishlistBtn = document.getElementById("drawer-tab-wishlist");
      this.tabBookingsBtn = document.getElementById("drawer-tab-bookings");
      this.tabWishlistBadge = document.getElementById("drawer-wishlist-count");
      this.tabBookingsBadge = document.getElementById("drawer-bookings-count");
      this.tabContentWishlist = document.getElementById("drawer-view-wishlist");
      this.tabContentBookings = document.getElementById("drawer-view-bookings");
      this.wishlistItemsList = document.getElementById("drawer-wishlist-list");
      this.bookingsItemsList = document.getElementById("drawer-bookings-list");
      this.clearWishlistBtn = document.getElementById("drawer-clear-wishlist");
      this.boardingPassModal = document.getElementById("boarding-pass-modal");
      this.bpPassengerName = document.getElementById("bp-passenger-name");
      this.bpPassengerPhone = document.getElementById("bp-passenger-phone");
      this.bpBookingRef = document.getElementById("bp-booking-ref");
      this.bpDestTitle = document.getElementById("bp-dest-title");
      this.bpDepartureDate = document.getElementById("bp-departure-date");
      this.bpDuration = document.getElementById("bp-duration");
      this.bpPackageTier = document.getElementById("bp-package-tier");
      this.bpGuests = document.getElementById("bp-guests");
      this.bpTotalPrice = document.getElementById("bp-total-price");
      this.bpStatusBadge = document.getElementById("bp-status-badge");
      this.bpPrintBtn = document.getElementById("bp-print-btn");
    }
    bindEvents() {
      this.navWishlistBtn?.addEventListener("click", () => {
        this.openDrawer("wishlist");
      });
      this.navBookingsBtn?.addEventListener("click", () => {
        if (!AuthMiddleware.requireAuth({
          actionName: "view your trip bookings and boarding passes",
          customMessage: "You must be signed in to access your booked trips, reservation references, and electronic boarding passes.",
          redirectUrl: "index.html?drawer=bookings"
        })) {
          return;
        }
        this.openDrawer("bookings");
      });
      this.drawerCloseBtn?.addEventListener("click", () => {
        this.closeDrawer();
      });
      this.drawerOverlay?.addEventListener("click", (e) => {
        if (e.target === this.drawerOverlay) {
          this.closeDrawer();
        }
      });
      this.tabWishlistBtn?.addEventListener("click", () => {
        this.switchTab("wishlist");
      });
      this.tabBookingsBtn?.addEventListener("click", () => {
        if (!AuthMiddleware.requireAuth({
          actionName: "access your bookings tab",
          customMessage: "Please log in or create an account to view and manage confirmed travel reservations.",
          redirectUrl: "index.html?drawer=bookings"
        })) {
          return;
        }
        this.switchTab("bookings");
      });
      this.clearWishlistBtn?.addEventListener("click", () => {
        if (confirm("Are you sure you want to clear your saved wishlist?")) {
          DestinationService.clearWishlist();
          this.showToast("Wishlist cleared.");
        }
      });
      this.bpPrintBtn?.addEventListener("click", () => {
        window.print();
      });
      this.boardingPassModal?.addEventListener("click", (e) => {
        const target = e.target;
        if (target === this.boardingPassModal || target.closest("[data-close-bp]")) {
          this.closeBoardingPass();
        }
      });
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if (this.boardingPassModal && this.boardingPassModal.style.display === "flex") {
            this.closeBoardingPass();
          } else if (this.drawerOverlay && this.drawerOverlay.classList.contains("open")) {
            this.closeDrawer();
          }
        }
      });
      this.wishlistItemsList?.addEventListener("click", (e) => {
        const target = e.target;
        const removeBtn = target.closest(".wishlist-remove-btn");
        if (removeBtn) {
          const destId = removeBtn.getAttribute("data-id");
          if (destId) {
            DestinationService.removeFromWishlist(destId);
            this.showToast("Removed from wishlist.");
          }
          return;
        }
        const bookBtn = target.closest(".wishlist-book-btn");
        if (bookBtn) {
          const destId = bookBtn.getAttribute("data-id");
          if (destId) {
            const dest = DestinationService.getDestinationById(destId);
            if (dest) {
              this.closeDrawer();
              setTimeout(() => {
                DestinationModalController.instance?.openBookingModal(dest);
              }, 250);
            }
          }
          return;
        }
        const detailsBtn = target.closest(".wishlist-details-btn");
        if (detailsBtn) {
          const destId = detailsBtn.getAttribute("data-id");
          if (destId) {
            const dest = DestinationService.getDestinationById(destId);
            if (dest) {
              this.closeDrawer();
              setTimeout(() => {
                DestinationModalController.instance?.openDetailsModal(dest);
              }, 250);
            }
          }
          return;
        }
      });
      this.bookingsItemsList?.addEventListener("click", (e) => {
        const target = e.target;
        const ticketBtn = target.closest(".booking-ticket-btn");
        if (ticketBtn) {
          const bookingId = ticketBtn.getAttribute("data-booking-id");
          if (bookingId) {
            const record = DestinationService.getBookings().find((b) => b.bookingId === bookingId);
            if (record) {
              this.openBoardingPass(record);
            }
          }
          return;
        }
        const cancelBtn = target.closest(".booking-cancel-btn");
        if (cancelBtn) {
          const bookingId = cancelBtn.getAttribute("data-booking-id");
          if (bookingId) {
            if (confirm(`Are you sure you want to cancel reservation ${bookingId}?`)) {
              DestinationService.cancelBooking(bookingId);
              this.showToast(`Booking ${bookingId} has been cancelled.`);
            }
          }
          return;
        }
        const deleteBtn = target.closest(".booking-delete-btn");
        if (deleteBtn) {
          const bookingId = deleteBtn.getAttribute("data-booking-id");
          if (bookingId) {
            if (confirm(`Remove this booking record from your device?`)) {
              DestinationService.deleteBooking(bookingId);
              this.showToast("Booking record removed.");
            }
          }
          return;
        }
      });
    }
    /**
     * Listen to reactive storage events from DestinationService
     */
    listenToServiceUpdates() {
      DestinationService.onWishlistChange(() => {
        this.syncBadges();
        if (this.activeTab === "wishlist" && this.isDrawerOpen()) {
          this.renderWishlist();
        }
      });
      DestinationService.onBookingsChange(() => {
        this.syncBadges();
        if (this.activeTab === "bookings" && this.isDrawerOpen()) {
          this.renderBookings();
        }
      });
      AuthService.getInstance().subscribe(() => {
        this.syncBadges();
        if (this.activeTab === "bookings" && this.isDrawerOpen()) {
          this.renderBookings();
        }
      });
    }
    /**
     * Sync badge numbers on nav buttons and drawer tabs
     */
    syncBadges() {
      const wishlist = DestinationService.getWishlistDestinations();
      const bookings = DestinationService.getBookings();
      const wishCount = wishlist.length;
      const isAuth = AuthMiddleware.isAuthenticated();
      const bookCount = isAuth ? bookings.filter((b) => b.status === "confirmed").length : 0;
      if (this.navWishlistBadge) {
        this.navWishlistBadge.textContent = String(wishCount);
        this.navWishlistBadge.style.display = wishCount > 0 ? "inline-flex" : "none";
      }
      if (this.navBookingsBadge) {
        this.navBookingsBadge.textContent = String(bookCount);
        this.navBookingsBadge.style.display = bookCount > 0 ? "inline-flex" : "none";
      }
      if (this.tabWishlistBadge) {
        this.tabWishlistBadge.textContent = String(wishCount);
      }
      if (this.tabBookingsBadge) {
        this.tabBookingsBadge.textContent = isAuth ? String(bookings.length) : "0";
      }
    }
    /**
     * Open the drawer with the specified initial tab
     */
    openDrawer(tab = "wishlist") {
      this.switchTab(tab);
      if (this.drawerOverlay && this.drawerPanel) {
        this.drawerOverlay.classList.add("open");
        document.body.style.overflow = "hidden";
      }
    }
    /**
     * Close the drawer
     */
    closeDrawer() {
      if (this.drawerOverlay) {
        this.drawerOverlay.classList.remove("open");
        document.body.style.overflow = "";
      }
    }
    isDrawerOpen() {
      return Boolean(this.drawerOverlay?.classList.contains("open"));
    }
    /**
     * Switch between Wishlist and Bookings tabs
     */
    switchTab(tab) {
      this.activeTab = tab;
      if (tab === "wishlist") {
        this.tabWishlistBtn?.classList.add("active");
        this.tabBookingsBtn?.classList.remove("active");
        if (this.tabContentWishlist) this.tabContentWishlist.style.display = "block";
        if (this.tabContentBookings) this.tabContentBookings.style.display = "none";
        this.renderWishlist();
      } else {
        this.tabBookingsBtn?.classList.add("active");
        this.tabWishlistBtn?.classList.remove("active");
        if (this.tabContentBookings) this.tabContentBookings.style.display = "block";
        if (this.tabContentWishlist) this.tabContentWishlist.style.display = "none";
        this.renderBookings();
      }
    }
    /**
     * Render the Saved Wishlist items
     */
    renderWishlist() {
      if (!this.wishlistItemsList) return;
      const wishlist = DestinationService.getWishlistDestinations();
      if (wishlist.length === 0) {
        if (this.clearWishlistBtn) this.clearWishlistBtn.style.display = "none";
        this.wishlistItemsList.innerHTML = `
        <div class="drawer-empty-state">
          <div class="empty-icon-wrap">
            <i class="fa-regular fa-heart"></i>
          </div>
          <h4>Your Wishlist is Empty</h4>
          <p>Browse world destinations, find your dream places, and click the heart icon to save them here for later!</p>
          <button type="button" class="drawer-cta-btn" id="drawer-explore-cta">
            <i class="fa-solid fa-compass"></i>
            <span>Explore Destinations</span>
          </button>
        </div>
      `;
        const exploreCta = document.getElementById("drawer-explore-cta");
        exploreCta?.addEventListener("click", () => {
          this.closeDrawer();
          const exploreBtn = document.getElementById("explore-dest-btn");
          if (exploreBtn) {
            exploreBtn.scrollIntoView({ behavior: "smooth", block: "center" });
            if (!exploreBtn.classList.contains("active")) {
              exploreBtn.click();
            }
          }
        });
        return;
      }
      if (this.clearWishlistBtn) this.clearWishlistBtn.style.display = "inline-flex";
      this.wishlistItemsList.innerHTML = wishlist.map((dest) => {
        return `
          <div class="drawer-card wishlist-card" data-id="${dest.id}">
            <div class="card-thumb-wrap">
              <img src="${dest.imageUrl}" alt="${dest.title}" class="card-thumb" onerror="this.src='https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'" />
              <span class="card-rating-tag"><i class="fa-solid fa-star"></i> ${dest.rating.toFixed(1)}</span>
            </div>
            <div class="card-details">
              <div class="card-top-row">
                <h4 class="card-title">${dest.title}</h4>
                <button type="button" class="wishlist-remove-btn" data-id="${dest.id}" title="Remove from wishlist" aria-label="Remove ${dest.title}">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
              <p class="card-subtitle"><i class="fa-solid fa-location-dot"></i> ${dest.subtitle || "Global Destination"}</p>
              <div class="card-meta-row">
                <span class="card-duration"><i class="fa-solid fa-clock"></i> ${dest.duration}</span>
                <span class="card-price">${dest.price}</span>
              </div>
              <div class="card-actions-row">
                <button type="button" class="wishlist-details-btn" data-id="${dest.id}">
                  <span>Details</span>
                </button>
                <button type="button" class="wishlist-book-btn" data-id="${dest.id}">
                  <i class="fa-solid fa-paper-plane"></i>
                  <span>Book Now</span>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join("");
    }
    /**
     * Render My Bookings list
     */
    renderBookings() {
      if (!this.bookingsItemsList) return;
      if (!AuthMiddleware.isAuthenticated()) {
        AuthMiddleware.renderLockedState(this.bookingsItemsList, {
          title: "Sign In to View Your Bookings",
          message: "Your reservations, travel tickets, and electronic boarding passes are protected. Please sign in to your verified account to access them."
        });
        return;
      }
      const bookings = DestinationService.getBookings();
      if (bookings.length === 0) {
        this.bookingsItemsList.innerHTML = `
        <div class="drawer-empty-state">
          <div class="empty-icon-wrap">
            <i class="fa-solid fa-suitcase-rolling"></i>
          </div>
          <h4>No Booked Trips Yet</h4>
          <p>You haven't reserved any travel packages yet. Select any destination and click "Book This Trip" to reserve your spot!</p>
          <button type="button" class="drawer-cta-btn" id="drawer-book-cta">
            <i class="fa-solid fa-earth-americas"></i>
            <span>Browse Top Trips</span>
          </button>
        </div>
      `;
        const bookCta = document.getElementById("drawer-book-cta");
        bookCta?.addEventListener("click", () => {
          this.closeDrawer();
          const destSection = document.getElementById("destinations");
          destSection?.scrollIntoView({ behavior: "smooth" });
        });
        return;
      }
      this.bookingsItemsList.innerHTML = bookings.map((b) => {
        const isCancelled = b.status === "cancelled";
        const statusClass = isCancelled ? "status-cancelled" : "status-confirmed";
        const statusIcon = isCancelled ? "fa-circle-xmark" : "fa-circle-check";
        const statusLabel = isCancelled ? "Cancelled" : "Confirmed";
        return `
          <div class="drawer-card booking-card ${isCancelled ? "cancelled" : ""}" data-booking-id="${b.bookingId}">
            <div class="booking-card-header">
              <div class="booking-ref-block">
                <span class="booking-ref-label">Booking ID</span>
                <strong class="booking-ref-code">${b.bookingId}</strong>
              </div>
              <span class="booking-status-pill ${statusClass}">
                <i class="fa-solid ${statusIcon}"></i> ${statusLabel}
              </span>
            </div>

            <div class="booking-card-main">
              <img src="${b.destinationImage}" alt="${b.destinationTitle}" class="booking-dest-thumb" onerror="this.src='https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'" />
              <div class="booking-dest-info">
                <h4 class="booking-title">${b.destinationTitle}</h4>
                <p class="booking-date"><i class="fa-solid fa-calendar-days"></i> Departs: <strong>${b.departureDate}</strong></p>
                <p class="booking-guests"><i class="fa-solid fa-user-group"></i> ${b.adults} Adult${b.adults > 1 ? "s" : ""}${b.children > 0 ? `, ${b.children} Child${b.children > 1 ? "ren" : ""}` : ""} \u2022 <span class="tier-tag">${b.packageTier.toUpperCase()}</span></p>
                <p class="booking-price"><i class="fa-solid fa-receipt"></i> Paid Total: <strong>$${b.totalPrice.toLocaleString()}</strong></p>
              </div>
            </div>

            <div class="booking-card-footer">
              <button type="button" class="booking-ticket-btn" data-booking-id="${b.bookingId}">
                <i class="fa-solid fa-ticket"></i>
                <span>View E-Ticket</span>
              </button>
              ${!isCancelled ? `
                <button type="button" class="booking-cancel-btn" data-booking-id="${b.bookingId}" title="Cancel this trip">
                  <i class="fa-solid fa-ban"></i>
                  <span>Cancel Trip</span>
                </button>
              ` : `
                <button type="button" class="booking-delete-btn" data-booking-id="${b.bookingId}" title="Remove record">
                  <i class="fa-solid fa-trash-can"></i>
                  <span>Remove</span>
                </button>
              `}
            </div>
          </div>
        `;
      }).join("");
    }
    /**
     * Open Boarding Pass / E-Ticket Modal
     */
    openBoardingPass(record) {
      if (!this.boardingPassModal) return;
      if (this.bpPassengerName) this.bpPassengerName.textContent = record.fullName;
      if (this.bpPassengerPhone) this.bpPassengerPhone.textContent = record.phone ? formatPhoneNumber(record.phone) : "Verified Contact";
      if (this.bpBookingRef) this.bpBookingRef.textContent = record.bookingId;
      if (this.bpDestTitle) this.bpDestTitle.textContent = record.destinationTitle;
      if (this.bpDepartureDate) this.bpDepartureDate.textContent = record.departureDate;
      if (this.bpDuration) this.bpDuration.textContent = "Scheduled Flight & Resort";
      if (this.bpPackageTier) this.bpPackageTier.textContent = `${record.packageTier.toUpperCase()} PACKAGE`;
      if (this.bpGuests) {
        this.bpGuests.textContent = `${record.adults} Adult${record.adults > 1 ? "s" : ""}${record.children > 0 ? ` + ${record.children} Child` : ""}`;
      }
      if (this.bpTotalPrice) this.bpTotalPrice.textContent = `$${record.totalPrice.toLocaleString()} USD`;
      if (this.bpStatusBadge) {
        const isConfirmed = record.status === "confirmed";
        this.bpStatusBadge.className = `bp-status-badge ${isConfirmed ? "confirmed" : "cancelled"}`;
        this.bpStatusBadge.innerHTML = `<i class="fa-solid ${isConfirmed ? "fa-circle-check" : "fa-circle-xmark"}"></i> ${isConfirmed ? "OFFICIALLY CONFIRMED" : "CANCELLED"}`;
      }
      this.boardingPassModal.style.display = "flex";
    }
    /**
     * Close Boarding Pass Modal
     */
    closeBoardingPass() {
      if (this.boardingPassModal) {
        this.boardingPassModal.style.display = "none";
      }
    }
    /**
     * Show notification toast
     */
    showToast(message) {
      const existing = document.querySelector(".dest-toast");
      existing?.remove();
      const toast = document.createElement("div");
      toast.className = "dest-toast";
      toast.setAttribute("role", "alert");
      toast.innerHTML = `
      <i class="fa-solid fa-circle-info"></i>
      <span>${message}</span>
    `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.classList.add("visible");
      }, 10);
      setTimeout(() => {
        toast.classList.remove("visible");
        setTimeout(() => toast.remove(), 300);
      }, 3200);
    }
  };

  // src/services/newsletter.service.ts
  var _NewsletterService = class _NewsletterService {
    static getInstance() {
      if (!_NewsletterService.instance) {
        _NewsletterService.instance = new _NewsletterService();
      }
      return _NewsletterService.instance;
    }
    /**
     * Retrieve all subscribers from localStorage
     */
    getSubscribers() {
      return StorageService.getItem(STORAGE_KEYS.NEWSLETTER_SUBSCRIBERS, []);
    }
    /**
     * Check if an email has already subscribed
     */
    isSubscribed(email) {
      const clean = email.trim().toLowerCase();
      return this.getSubscribers().some((s) => s.email.toLowerCase() === clean);
    }
    /**
     * Save API credentials (e.g. EmailJS or Web3Forms)
     */
    saveApiConfig(config) {
      StorageService.setItem(STORAGE_KEYS.EMAIL_API_CONFIG, config);
    }
    /**
     * Get merged API credentials from localStorage and hardcoded config
     */
    getApiConfig() {
      const stored = StorageService.getItem(STORAGE_KEYS.EMAIL_API_CONFIG, {});
      let templateId = stored.emailjsTemplateId || EMAIL_SERVICE_CONFIG.EMAILJS_TEMPLATE_ID || "";
      if (templateId === "template_sibcqgl") {
        templateId = EMAIL_SERVICE_CONFIG.EMAILJS_TEMPLATE_ID;
        this.saveApiConfig({ ...stored, emailjsTemplateId: templateId });
      }
      return {
        emailjsServiceId: stored.emailjsServiceId || EMAIL_SERVICE_CONFIG.EMAILJS_SERVICE_ID || "",
        emailjsTemplateId: templateId,
        emailjsPublicKey: stored.emailjsPublicKey || EMAIL_SERVICE_CONFIG.EMAILJS_PUBLIC_KEY || "",
        web3formsKey: stored.web3formsKey || EMAIL_SERVICE_CONFIG.WEB3FORMS_ACCESS_KEY || ""
      };
    }
    /**
     * Check if real live email credentials are fully configured
     */
    hasActiveLiveCredentials() {
      const cfg = this.getApiConfig();
      const hasEmailJs = Boolean(cfg.emailjsServiceId && cfg.emailjsTemplateId && cfg.emailjsPublicKey);
      const hasWeb3Forms = Boolean(cfg.web3formsKey);
      return hasEmailJs || hasWeb3Forms;
    }
    /**
     * Generate grateful and poetic welcome message
     */
    generateWelcomeMessage(recipientName, promoCode) {
      return `Dear ${recipientName},

Welcome to the Jadoo Travel family! \u2708\uFE0F\u{1F30D}

The world is full of magical places waiting to be explored, and we are absolutely delighted to have you join our private circle of passionate travelers.

Whether you're dreaming of gliding across Venice's tranquil canals, unraveling the eternal mysteries of Rome, or gazing out from the clifftops of Santorini, Jadoo is here to curate moments that will stay with you forever.

As our personal token of gratitude for joining our travel community, please enjoy an exclusive 15% discount on your first booking with us:

\u{1F381} Your VIP Welcome Voucher: ${promoCode}
(Apply this code at booking checkout for 15% off standard, deluxe, and luxury travel packages)

Pack your curiosity \u2014 your next great adventure begins now!

With warmest regards,
The Jadoo Travel Concierge Team
concierge@jadoo.travel | www.jadoo.travel`;
    }
    /**
     * Subscribe an email and send the welcome greeting
     */
    async subscribe(email, name) {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name?.trim() || cleanEmail.split("@")[0] || "Traveler";
      const promoCode = EMAIL_SERVICE_CONFIG.WELCOME_PROMO_CODE;
      const subscribers = this.getSubscribers();
      const existingIndex = subscribers.findIndex((s) => s.email.toLowerCase() === cleanEmail);
      const subscriberRecord = {
        email: cleanEmail,
        name: cleanName,
        subscribedAt: (/* @__PURE__ */ new Date()).toISOString(),
        promoCode
      };
      if (existingIndex >= 0) {
        subscribers[existingIndex] = subscriberRecord;
      } else {
        subscribers.push(subscriberRecord);
      }
      StorageService.setItem(STORAGE_KEYS.NEWSLETTER_SUBSCRIBERS, subscribers);
      fetch(`${API_CONFIG.BASE_URL}/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, name: cleanName })
      }).catch(() => {
      });
      const cfg = this.getApiConfig();
      const welcomeMsg = this.generateWelcomeMessage(cleanName, promoCode);
      if (cfg.emailjsServiceId && cfg.emailjsTemplateId && cfg.emailjsPublicKey) {
        try {
          const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
                subject: "Welcome to Jadoo \u2014 Your Journey Begins Here! \u{1F30D}\u2708\uFE0F",
                promo_code: promoCode,
                message: welcomeMsg
              }
            })
          });
          if (response.ok) {
            return {
              success: true,
              provider: "emailjs",
              message: `Official welcome email successfully dispatched to ${cleanEmail} via EmailJS!`
            };
          } else {
            const errText = await response.text();
            console.warn("EmailJS dispatch error:", errText);
            return {
              success: false,
              provider: "emailjs",
              message: `EmailJS Error: ${errText || "Delivery rejected"}.`,
              error: errText
            };
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn("Network error reaching EmailJS:", err);
          return {
            success: false,
            provider: "emailjs",
            message: `Network error reaching EmailJS: ${msg}`,
            error: msg
          };
        }
      }
      if (cfg.web3formsKey) {
        try {
          const response = await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              access_key: cfg.web3formsKey,
              email: cleanEmail,
              name: cleanName,
              subject: "New Jadoo Traveler Subscription",
              message: welcomeMsg
            })
          });
          if (response.ok) {
            return {
              success: true,
              provider: "web3forms",
              message: `Welcome greeting registered and dispatched via Web3Forms!`
            };
          }
        } catch (err) {
          console.warn("Network error reaching Web3Forms:", err);
        }
      }
      return {
        success: true,
        provider: "simulated",
        message: `Welcome to Jadoo! Your welcome gift and greeting are ready.`
      };
    }
    /**
     * Test EmailJS connection with specified or saved credentials
     */
    async testEmailJsConnection(serviceId, templateId, publicKey, testEmail = "test@example.com") {
      const cfg = this.getApiConfig();
      const sid = serviceId?.trim() || cfg.emailjsServiceId;
      const tid = templateId?.trim() || cfg.emailjsTemplateId;
      const pkey = publicKey?.trim() || cfg.emailjsPublicKey;
      if (!sid || !tid || !pkey) {
        return {
          success: false,
          message: "Please provide Service ID, Template ID, and Public Key before testing.",
          error: "Missing required credentials"
        };
      }
      try {
        const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
              to_name: "Explorer Test",
              name: "Explorer Test",
              user_name: "Explorer Test",
              subject: "Jadoo Travel \u2014 EmailJS Live Connection Test",
              promo_code: EMAIL_SERVICE_CONFIG.WELCOME_PROMO_CODE,
              message: "Your Jadoo Travel EmailJS integration is active and verified!"
            }
          })
        });
        if (response.ok) {
          return {
            success: true,
            message: "Connection verified! Test email successfully accepted by EmailJS."
          };
        } else {
          const errText = await response.text();
          return {
            success: false,
            message: `EmailJS returned: ${errText || response.statusText}`,
            error: errText
          };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          message: `Network error connecting to EmailJS: ${msg}`,
          error: msg
        };
      }
    }
  };
  __publicField(_NewsletterService, "instance", null);
  var NewsletterService = _NewsletterService;
  var newsletterService = NewsletterService.getInstance();

  // src/modules/newsletter/newsletter.controller.ts
  var NewsletterController = class {
    constructor() {
      __publicField(this, "newsletterService");
      __publicField(this, "authService");
      // Form Elements
      __publicField(this, "form", null);
      __publicField(this, "inputEmail", null);
      __publicField(this, "submitBtn", null);
      __publicField(this, "statusText", null);
      // Modal Elements
      __publicField(this, "modal", null);
      __publicField(this, "modalRecipientEmail", null);
      __publicField(this, "modalRecipientName", null);
      __publicField(this, "modalPromoCode", null);
      __publicField(this, "modalCopyBtn", null);
      __publicField(this, "modalExploreCta", null);
      __publicField(this, "modalApiStatusBadge", null);
      // Alert Elements inside Modal
      __publicField(this, "deliveryAlert", null);
      __publicField(this, "alertTitle", null);
      __publicField(this, "alertMsg", null);
      // API Config Elements inside Modal
      __publicField(this, "toggleApiBtn", null);
      __publicField(this, "apiPanel", null);
      __publicField(this, "inputServiceId", null);
      __publicField(this, "inputTemplateId", null);
      __publicField(this, "inputPublicKey", null);
      __publicField(this, "inputWeb3FormsKey", null);
      __publicField(this, "saveApiBtn", null);
      __publicField(this, "testApiBtn", null);
      __publicField(this, "apiTestStatus", null);
      this.newsletterService = newsletterService;
      this.authService = AuthService.getInstance();
      this.initElements();
      this.bindEvents();
      this.populateApiSettings();
    }
    initElements() {
      this.form = document.getElementById("newsletter-form");
      this.inputEmail = document.getElementById("newsletter-email");
      this.submitBtn = document.getElementById("newsletter-btn");
      this.statusText = document.getElementById("newsletter-status");
      this.modal = document.getElementById("welcome-email-modal");
      this.modalRecipientEmail = document.getElementById("welcome-recipient-email");
      this.modalRecipientName = document.getElementById("welcome-recipient-name");
      this.modalPromoCode = document.getElementById("welcome-promo-code");
      this.modalCopyBtn = document.getElementById("btn-copy-promo");
      this.modalExploreCta = document.getElementById("btn-welcome-explore");
      this.modalApiStatusBadge = document.getElementById("welcome-api-badge");
      this.deliveryAlert = document.getElementById("welcome-delivery-alert");
      this.alertTitle = document.getElementById("welcome-alert-title");
      this.alertMsg = document.getElementById("welcome-alert-msg");
      this.toggleApiBtn = document.getElementById("btn-toggle-email-api");
      this.apiPanel = document.getElementById("email-api-config-panel");
      this.inputServiceId = document.getElementById("api-emailjs-service");
      this.inputTemplateId = document.getElementById("api-emailjs-template");
      this.inputPublicKey = document.getElementById("api-emailjs-public");
      this.inputWeb3FormsKey = document.getElementById("api-web3forms-key");
      this.saveApiBtn = document.getElementById("btn-save-email-api");
      this.testApiBtn = document.getElementById("btn-test-email-api");
      this.apiTestStatus = document.getElementById("api-test-status");
    }
    bindEvents() {
      this.form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.handleSubscribe();
      });
      this.modal?.addEventListener("click", (e) => {
        const target = e.target;
        if (target === this.modal || target.closest("[data-close-welcome-modal]")) {
          this.closeModal();
        }
      });
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.modal?.style.display === "flex") {
          this.closeModal();
        }
      });
      this.modalCopyBtn?.addEventListener("click", () => {
        const code = this.modalPromoCode?.textContent?.trim() || EMAIL_SERVICE_CONFIG.WELCOME_PROMO_CODE;
        navigator.clipboard.writeText(code).then(() => {
          if (this.modalCopyBtn) {
            const original = this.modalCopyBtn.innerHTML;
            this.modalCopyBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Copied!</span>';
            this.modalCopyBtn.classList.add("copied");
            setTimeout(() => {
              if (this.modalCopyBtn) {
                this.modalCopyBtn.innerHTML = original;
                this.modalCopyBtn.classList.remove("copied");
              }
            }, 2e3);
          }
        });
      });
      this.modalExploreCta?.addEventListener("click", () => {
        this.closeModal();
        const destSection = document.getElementById("destinations");
        destSection?.scrollIntoView({ behavior: "smooth" });
      });
      this.toggleApiBtn?.addEventListener("click", () => {
        if (!this.apiPanel) return;
        const isVisible = this.apiPanel.style.display === "block";
        this.apiPanel.style.display = isVisible ? "none" : "block";
        if (this.toggleApiBtn) {
          this.toggleApiBtn.innerHTML = isVisible ? '<i class="fa-solid fa-sliders"></i> <span>Connect Real Inbox API (EmailJS / Web3Forms)</span> <i class="fa-solid fa-chevron-down"></i>' : '<i class="fa-solid fa-sliders"></i> <span>Hide API Settings</span> <i class="fa-solid fa-chevron-up"></i>';
        }
      });
      this.saveApiBtn?.addEventListener("click", () => {
        this.saveApiSettings();
      });
      this.testApiBtn?.addEventListener("click", async () => {
        await this.handleTestConnection();
      });
    }
    async handleSubscribe() {
      const email = this.inputEmail?.value.trim() || "";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        this.showToast("Please enter a valid email address.", "error");
        this.inputEmail?.focus();
        return;
      }
      const session = this.authService.getCurrentSession();
      const travelerName = session?.name || email.split("@")[0].replace(/[._-]/g, " ") || "Explorer";
      if (this.submitBtn) {
        this.submitBtn.disabled = true;
        this.submitBtn.classList.add("is-loading");
        this.submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Sending...</span>';
      }
      try {
        const result = await this.newsletterService.subscribe(email, travelerName);
        if (this.inputEmail) this.inputEmail.value = "";
        if (result.success) {
          if (this.statusText) {
            this.statusText.textContent = `\u{1F389} Welcome to Jadoo! Real email dispatched to ${email}`;
            this.statusText.style.display = "block";
            this.statusText.style.color = "#10b981";
            setTimeout(() => {
              if (this.statusText) this.statusText.style.display = "none";
            }, 6e3);
          }
          this.showToast(`\u2728 Welcome to Jadoo! Real email dispatched to ${email}`, "success");
          this.openModal(email, travelerName, result.provider, true);
        } else {
          if (this.statusText) {
            this.statusText.textContent = `\u26A0\uFE0F Subscribed! Note: EmailJS returned an error: ${result.error || result.message}`;
            this.statusText.style.display = "block";
            this.statusText.style.color = "#d97706";
          }
          this.showToast(`\u26A0\uFE0F EmailJS: ${result.error || result.message}`, "error");
          this.openModal(email, travelerName, result.provider, false, result.error || result.message);
        }
      } catch (err) {
        console.error("Subscription error:", err);
        this.showToast("An error occurred during subscription. Please try again.", "error");
      } finally {
        if (this.submitBtn) {
          this.submitBtn.disabled = false;
          this.submitBtn.classList.remove("is-loading");
          this.submitBtn.innerHTML = "<span>Subscribe</span>";
        }
      }
    }
    /**
     * Open the Welcome Email Modal
     */
    openModal(email, name, provider, isLiveSuccess = true, errorMsg = "") {
      if (!this.modal) return;
      if (this.modalRecipientEmail) {
        this.modalRecipientEmail.textContent = email;
      }
      if (this.modalRecipientName) {
        this.modalRecipientName.textContent = name;
      }
      if (this.modalPromoCode) {
        this.modalPromoCode.textContent = EMAIL_SERVICE_CONFIG.WELCOME_PROMO_CODE;
      }
      const cfg = this.newsletterService.getApiConfig();
      if (this.modalApiStatusBadge) {
        if (!isLiveSuccess) {
          this.modalApiStatusBadge.className = "email-delivery-badge error";
          this.modalApiStatusBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Live Delivery Failed: Template Not Found`;
        } else if (provider === "emailjs") {
          this.modalApiStatusBadge.className = "email-delivery-badge live";
          this.modalApiStatusBadge.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Delivered via EmailJS Live API';
        } else if (provider === "web3forms") {
          this.modalApiStatusBadge.className = "email-delivery-badge live";
          this.modalApiStatusBadge.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Delivered via Web3Forms';
        } else if (cfg.emailjsPublicKey && (!cfg.emailjsServiceId || !cfg.emailjsTemplateId)) {
          this.modalApiStatusBadge.className = "email-delivery-badge live";
          this.modalApiStatusBadge.innerHTML = '<i class="fa-solid fa-key"></i> Public Key Connected (Enter Service & Template ID below)';
        } else {
          this.modalApiStatusBadge.className = "email-delivery-badge preview";
          this.modalApiStatusBadge.innerHTML = '<i class="fa-solid fa-sparkles"></i> Delivered to Virtual Inbox';
        }
      }
      if (this.deliveryAlert) {
        if (!isLiveSuccess) {
          this.deliveryAlert.style.display = "flex";
          this.deliveryAlert.className = "welcome-delivery-alert error-theme";
          if (this.alertTitle) {
            this.alertTitle.textContent = `EmailJS Error: ${errorMsg || "Template Not Found"}`;
          }
          if (this.alertMsg) {
            this.alertMsg.innerHTML = `EmailJS API returned: <strong>${errorMsg || "The template ID not found"}</strong>.<br>The template has not been saved on EmailJS servers yet. Follow the steps below to fix it:`;
          }
          if (this.apiPanel) {
            this.apiPanel.style.display = "block";
            if (this.toggleApiBtn) {
              this.toggleApiBtn.innerHTML = '<i class="fa-solid fa-sliders"></i> <span>Hide API Settings</span> <i class="fa-solid fa-chevron-up"></i>';
            }
          }
        } else {
          this.deliveryAlert.style.display = "none";
        }
      }
      this.modal.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
    closeModal() {
      if (this.modal) {
        this.modal.style.display = "none";
        document.body.style.overflow = "";
      }
    }
    populateApiSettings() {
      const cfg = this.newsletterService.getApiConfig();
      if (this.inputServiceId) this.inputServiceId.value = cfg.emailjsServiceId || "";
      if (this.inputTemplateId) this.inputTemplateId.value = cfg.emailjsTemplateId || "";
      if (this.inputPublicKey) this.inputPublicKey.value = cfg.emailjsPublicKey || "";
      if (this.inputWeb3FormsKey) this.inputWeb3FormsKey.value = cfg.web3formsKey || "";
    }
    saveApiSettings() {
      const serviceId = this.inputServiceId?.value.trim() || "";
      const templateId = this.inputTemplateId?.value.trim() || "";
      const publicKey = this.inputPublicKey?.value.trim() || "";
      const web3formsKey = this.inputWeb3FormsKey?.value.trim() || "";
      this.newsletterService.saveApiConfig({
        emailjsServiceId: serviceId,
        emailjsTemplateId: templateId,
        emailjsPublicKey: publicKey,
        web3formsKey
      });
      this.showToast("\u2705 Email API credentials saved! Live inbox delivery active.", "success");
      if (this.modalApiStatusBadge) {
        this.modalApiStatusBadge.className = "email-delivery-badge live";
        this.modalApiStatusBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Live API Connected';
      }
    }
    /**
     * Test EmailJS connection live
     */
    async handleTestConnection() {
      const serviceId = this.inputServiceId?.value.trim() || "";
      const templateId = this.inputTemplateId?.value.trim() || "";
      const publicKey = this.inputPublicKey?.value.trim() || "";
      if (!this.testApiBtn || !this.apiTestStatus) return;
      if (!serviceId || !templateId || !publicKey) {
        this.apiTestStatus.className = "api-test-status error";
        this.apiTestStatus.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Missing Service, Template, or Public Key';
        return;
      }
      this.testApiBtn.disabled = true;
      this.testApiBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Testing...</span>';
      this.apiTestStatus.className = "api-test-status testing";
      this.apiTestStatus.innerHTML = "Connecting to EmailJS...";
      const session = this.authService.getCurrentSession();
      const testRecipient = session?.email || "traveler@jadoo.travel";
      const testResult = await this.newsletterService.testEmailJsConnection(serviceId, templateId, publicKey, testRecipient);
      this.testApiBtn.disabled = false;
      this.testApiBtn.innerHTML = '<i class="fa-solid fa-vial-circle-check"></i> <span>Test EmailJS Connection</span>';
      if (testResult.success) {
        this.apiTestStatus.className = "api-test-status success";
        this.apiTestStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> Success! Live EmailJS dispatch verified.';
        this.showToast("\u2705 EmailJS connection verified! Test email dispatched.", "success");
        this.newsletterService.saveApiConfig({
          emailjsServiceId: serviceId,
          emailjsTemplateId: templateId,
          emailjsPublicKey: publicKey,
          web3formsKey: this.inputWeb3FormsKey?.value.trim() || ""
        });
        if (this.modalApiStatusBadge) {
          this.modalApiStatusBadge.className = "email-delivery-badge live";
          this.modalApiStatusBadge.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Delivered via EmailJS Live API';
        }
        if (this.deliveryAlert) {
          this.deliveryAlert.style.display = "none";
        }
      } else {
        this.apiTestStatus.className = "api-test-status error";
        this.apiTestStatus.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${testResult.error || testResult.message}`;
        this.showToast(`\u274C Test failed: ${testResult.error || testResult.message}`, "error");
        if (this.deliveryAlert) {
          this.deliveryAlert.style.display = "flex";
          this.deliveryAlert.className = "welcome-delivery-alert error-theme";
          if (this.alertTitle) {
            this.alertTitle.textContent = `EmailJS Error: ${testResult.error || "Connection Failed"}`;
          }
          if (this.alertMsg) {
            this.alertMsg.innerHTML = `EmailJS returned: <strong>${testResult.error || testResult.message}</strong>.<br>Make sure the template is <strong>Saved</strong> in your EmailJS dashboard and <strong>To Email</strong> is set to <code>{{to_email}}</code>.`;
          }
        }
      }
    }
    showToast(message, type = "success") {
      const existing = document.querySelector(".dest-toast");
      existing?.remove();
      const toast = document.createElement("div");
      toast.className = `dest-toast ${type === "error" ? "toast-error" : "toast-success"}`;
      toast.innerHTML = `
      <i class="fa-solid ${type === "error" ? "fa-circle-xmark" : "fa-circle-check"}"></i>
      <span>${message}</span>
    `;
      document.body.appendChild(toast);
      setTimeout(() => toast.classList.add("visible"), 10);
      setTimeout(() => {
        toast.classList.remove("visible");
        setTimeout(() => toast.remove(), 300);
      }, 4500);
    }
  };

  // src/services/theme.service.ts
  var _ThemeService = class _ThemeService {
    constructor() {
      __publicField(this, "currentMode", "light");
      __publicField(this, "listeners", /* @__PURE__ */ new Set());
      __publicField(this, "mediaQuery", window.matchMedia("(prefers-color-scheme: dark)"));
      this.init();
    }
    static getInstance() {
      if (!_ThemeService.instance) {
        _ThemeService.instance = new _ThemeService();
      }
      return _ThemeService.instance;
    }
    init() {
      const saved = StorageService.getString(STORAGE_KEYS.THEME, "");
      if (saved === "dark" || saved === "light") {
        this.currentMode = saved;
      } else {
        this.currentMode = this.mediaQuery.matches ? "dark" : "light";
      }
      this.applyTheme(this.currentMode, false);
      this.mediaQuery.addEventListener("change", (e) => {
        const explicit = StorageService.getString(STORAGE_KEYS.THEME, "");
        if (!explicit) {
          this.setTheme(e.matches ? "dark" : "light", false);
        }
      });
    }
    isDark() {
      return this.currentMode === "dark";
    }
    getTheme() {
      return this.currentMode;
    }
    toggle() {
      const next = this.currentMode === "dark" ? "light" : "dark";
      this.setTheme(next, true);
      return next;
    }
    setTheme(mode, persist = true) {
      this.currentMode = mode;
      if (persist) {
        StorageService.setItem(STORAGE_KEYS.THEME, mode);
      }
      this.applyTheme(mode);
    }
    subscribe(listener) {
      this.listeners.add(listener);
      listener(this.isDark(), this.currentMode);
      return () => {
        this.listeners.delete(listener);
      };
    }
    applyTheme(mode, notify = true) {
      const isDarkMode = mode === "dark";
      document.body.classList.toggle("dark-mode", isDarkMode);
      const toggleButtons = document.querySelectorAll(".theme-toggle");
      toggleButtons.forEach((btn) => {
        const icon = btn.querySelector("i");
        if (icon) {
          icon.className = isDarkMode ? "fa-solid fa-sun" : "fa-solid fa-moon";
        }
        btn.setAttribute("aria-label", isDarkMode ? "Switch to light mode" : "Switch to dark mode");
      });
      const logoSrc = isDarkMode ? ASSET_PATHS.LOGO_DARK : ASSET_PATHS.LOGO_LIGHT;
      const logos = document.querySelectorAll(".Top-Logo, .auth-logo, .profile-logo-img");
      logos.forEach((img) => {
        if (!img.src.endsWith(logoSrc)) {
          img.src = logoSrc;
        }
      });
      if (notify) {
        this.listeners.forEach((listener) => listener(isDarkMode, mode));
      }
    }
    refreshTheme() {
      this.applyTheme(this.currentMode, true);
    }
    bindToggleButtons(selector = ".theme-toggle") {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach((btn) => {
        if (!btn.dataset.themeBound) {
          btn.dataset.themeBound = "true";
          btn.addEventListener("click", () => this.toggle());
        }
      });
      this.applyTheme(this.currentMode, false);
    }
  };
  __publicField(_ThemeService, "instance", null);
  var ThemeService = _ThemeService;
  var themeService = ThemeService.getInstance();

  // src/main.ts
  function initHeartFavorite() {
    const heartBtn = document.querySelector(".tripheart");
    if (!heartBtn) return;
    const updateHeartVisuals = () => {
      const isFav = DestinationService.getFavoriteIds().includes("static-greece");
      const icon = heartBtn.querySelector("i");
      if (icon) {
        icon.className = isFav ? "fa-solid fa-heart" : "fa-regular fa-heart";
        heartBtn.style.color = isFav ? "#ef4444" : "";
        heartBtn.setAttribute("aria-label", isFav ? "Unfavorite Trip to Greece" : "Favorite Trip to Greece");
      }
    };
    updateHeartVisuals();
    heartBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      DestinationService.toggleFavorite("static-greece");
      updateHeartVisuals();
    });
    DestinationService.onWishlistChange(() => {
      updateHeartVisuals();
    });
  }
  function initGreeceCardInteraction() {
    const greeceCard = document.querySelector(".bookcard");
    if (!greeceCard) return;
    greeceCard.style.cursor = "pointer";
    greeceCard.setAttribute("title", "Click to view trip details");
    greeceCard.addEventListener("click", (e) => {
      const target = e.target;
      if (target.closest(".tripheart") || target.closest(".bookactions button")) {
        return;
      }
      const greeceDest = DestinationService.STATIC_TOP_DESTINATIONS["static-greece"];
      if (greeceDest && DestinationModalController.instance) {
        DestinationModalController.instance.openDetailsModal(greeceDest);
      }
    });
    const mapActionBtn = greeceCard.querySelector('.bookactions button[aria-label="Trip map"]');
    mapActionBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const mapSection = document.getElementById("destinations-map-wrapper");
      if (mapSection) {
        mapSection.scrollIntoView({ behavior: "smooth" });
      }
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    themeService.bindToggleButtons();
    new NavbarController();
    new AuthNavController();
    new DestinationModalController();
    new DestinationMapController();
    new DestinationExplorerController();
    new UserPanelController();
    new TestimonialSlider();
    new TestimonialFormController();
    new NewsletterController();
    initHeartFavorite();
    initGreeceCardInteraction();
    DestinationService.syncWithBackend();
    testimonialService.syncWithBackend();
  });
})();
//# sourceMappingURL=script.js.map
