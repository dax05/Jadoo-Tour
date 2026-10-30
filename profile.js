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

  // src/modules/profile/profile.controller.ts
  var ProfileController = class {
    constructor() {
      __publicField(this, "authService");
      __publicField(this, "currentSession", null);
      __publicField(this, "isDemoMode", false);
      // Header Elements
      __publicField(this, "userAvatarText", null);
      __publicField(this, "userAvatarWrapper", null);
      __publicField(this, "userNameHeading", null);
      __publicField(this, "userEmailSub", null);
      __publicField(this, "userLoyaltyBadge", null);
      __publicField(this, "userMemberSince", null);
      // Stats Elements
      __publicField(this, "statTripsCount", null);
      __publicField(this, "statWishlistCount", null);
      __publicField(this, "statPointsCount", null);
      __publicField(this, "guestNotice", null);
      __publicField(this, "navLoginLink", null);
      __publicField(this, "navLogoutBtn", null);
      __publicField(this, "badgeVerified", null);
      // Tab Buttons & Panels
      __publicField(this, "tabBtns", null);
      __publicField(this, "tabPanels", null);
      // Personal Details Form
      __publicField(this, "formDetails", null);
      __publicField(this, "inputName", null);
      __publicField(this, "inputEmail", null);
      __publicField(this, "inputPhone", null);
      __publicField(this, "inputHomeAirport", null);
      __publicField(this, "inputBio", null);
      // Travel Preferences Form
      __publicField(this, "formPreferences", null);
      __publicField(this, "selectCurrency", null);
      __publicField(this, "selectLanguage", null);
      __publicField(this, "selectMeal", null);
      __publicField(this, "selectSeat", null);
      __publicField(this, "checkEmailAlerts", null);
      __publicField(this, "checkSmsAlerts", null);
      // Security Form
      __publicField(this, "formSecurity", null);
      __publicField(this, "inputOldPassword", null);
      __publicField(this, "inputNewPassword", null);
      __publicField(this, "inputConfirmNewPassword", null);
      // Lists Containers
      __publicField(this, "bookingsListEl", null);
      __publicField(this, "wishlistListEl", null);
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
      // Avatar Modal Elements
      __publicField(this, "avatarModal", null);
      __publicField(this, "openAvatarBtn", null);
      this.authService = AuthService.getInstance();
      this.initElements();
      this.initSessionData();
      this.bindEvents();
      this.renderProfile();
      this.renderBookings();
      this.renderWishlist();
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab") || window.location.hash.replace("#", "");
      const validTabs = ["details", "preferences", "bookings", "wishlist", "security"];
      if (tabParam && validTabs.includes(tabParam)) {
        this.switchTab(tabParam);
      }
    }
    initElements() {
      this.userAvatarText = document.getElementById("profile-avatar-text");
      this.userAvatarWrapper = document.getElementById("profile-avatar-display");
      this.userNameHeading = document.getElementById("profile-name-heading");
      this.userEmailSub = document.getElementById("profile-email-sub");
      this.userLoyaltyBadge = document.getElementById("profile-loyalty-badge");
      this.userMemberSince = document.getElementById("profile-member-since");
      this.guestNotice = document.getElementById("profile-guest-notice");
      this.navLoginLink = document.getElementById("profile-nav-login");
      this.navLogoutBtn = document.getElementById("profile-nav-logout");
      this.badgeVerified = document.querySelector(".profile-badge-verified");
      this.statTripsCount = document.getElementById("stat-trips-count");
      this.statWishlistCount = document.getElementById("stat-wishlist-count");
      this.statPointsCount = document.getElementById("stat-points-count");
      this.tabBtns = document.querySelectorAll(".profile-nav-tab");
      this.tabPanels = document.querySelectorAll(".profile-tab-panel");
      this.formDetails = document.getElementById("form-profile-details");
      this.inputName = document.getElementById("input-profile-name");
      this.inputEmail = document.getElementById("input-profile-email");
      this.inputPhone = document.getElementById("input-profile-phone");
      this.inputHomeAirport = document.getElementById("input-profile-airport");
      this.inputBio = document.getElementById("input-profile-bio");
      this.formPreferences = document.getElementById("form-profile-preferences");
      this.selectCurrency = document.getElementById("select-pref-currency");
      this.selectLanguage = document.getElementById("select-pref-language");
      this.selectMeal = document.getElementById("select-pref-meal");
      this.selectSeat = document.getElementById("select-pref-seat");
      this.checkEmailAlerts = document.getElementById("check-email-alerts");
      this.checkSmsAlerts = document.getElementById("check-sms-alerts");
      this.formSecurity = document.getElementById("form-profile-security");
      this.inputOldPassword = document.getElementById("input-old-password");
      this.inputNewPassword = document.getElementById("input-new-password");
      this.inputConfirmNewPassword = document.getElementById("input-confirm-password");
      this.bookingsListEl = document.getElementById("profile-bookings-list");
      this.wishlistListEl = document.getElementById("profile-wishlist-grid");
      this.avatarModal = document.getElementById("avatar-picker-modal");
      this.openAvatarBtn = document.getElementById("btn-change-avatar");
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
    initSessionData() {
      const session = this.authService.getCurrentSession();
      if (session) {
        this.currentSession = session;
        this.isDemoMode = false;
        if (this.guestNotice) this.guestNotice.style.display = "none";
        if (this.navLoginLink) this.navLoginLink.style.display = "none";
        if (this.navLogoutBtn) this.navLogoutBtn.style.display = "inline-flex";
        if (this.badgeVerified) {
          this.badgeVerified.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verified Member';
          this.badgeVerified.classList.remove("is-guest");
        }
      } else {
        this.isDemoMode = true;
        this.currentSession = {
          name: "Sarah Jenkins",
          email: "sarah.jenkins@example.com",
          loggedInAt: (/* @__PURE__ */ new Date()).toISOString(),
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
        };
        if (this.guestNotice) this.guestNotice.style.display = "flex";
        if (this.navLoginLink) this.navLoginLink.style.display = "inline-flex";
        if (this.navLogoutBtn) this.navLogoutBtn.style.display = "none";
        if (this.badgeVerified) {
          this.badgeVerified.innerHTML = '<i class="fa-solid fa-user-astronaut"></i> Guest Preview';
          this.badgeVerified.classList.add("is-guest");
        }
      }
    }
    bindEvents() {
      this.tabBtns?.forEach((btn) => {
        btn.addEventListener("click", () => {
          const targetTab = btn.getAttribute("data-tab");
          if (targetTab) {
            if (targetTab === "bookings" && this.isDemoMode) {
              AuthMiddleware.requireAuth({
                actionName: "access your travel bookings",
                customMessage: "You are currently in guest preview mode. Please log in or create an account to view and manage your travel bookings.",
                returnToTab: "bookings"
              });
            }
            this.switchTab(targetTab);
          }
        });
      });
      this.formDetails?.addEventListener("submit", (e) => {
        e.preventDefault();
        this.savePersonalDetails();
      });
      this.inputPhone?.addEventListener("input", () => {
        if (this.inputPhone) {
          this.inputPhone.value = sanitizePhoneInput(this.inputPhone.value);
          const err = document.getElementById("input-profile-phone-error");
          if (err && err.textContent) {
            const res = validatePhoneNumber(this.inputPhone.value);
            if (res.isValid || !this.inputPhone.value.trim()) {
              err.textContent = "";
              this.inputPhone.classList.remove("input-error");
            }
          }
        }
      });
      this.inputPhone?.addEventListener("blur", () => {
        if (this.inputPhone && this.inputPhone.value.trim()) {
          const res = validatePhoneNumber(this.inputPhone.value);
          const err = document.getElementById("input-profile-phone-error");
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
      this.formPreferences?.addEventListener("submit", (e) => {
        e.preventDefault();
        this.savePreferences();
      });
      this.formSecurity?.addEventListener("submit", (e) => {
        e.preventDefault();
        this.updatePassword();
      });
      const logoutBtns = document.querySelectorAll(".profile-logout-action");
      logoutBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          this.authService.logout();
          window.location.href = "index.html";
        });
      });
      this.openAvatarBtn?.addEventListener("click", () => {
        if (this.avatarModal) this.avatarModal.style.display = "flex";
      });
      this.avatarModal?.addEventListener("click", (e) => {
        const target = e.target;
        if (target === this.avatarModal || target.closest("[data-close-avatar]")) {
          if (this.avatarModal) this.avatarModal.style.display = "none";
        }
        const avatarOption = target.closest(".avatar-choice-card");
        if (avatarOption) {
          const avatarKey = avatarOption.getAttribute("data-avatar");
          if (avatarKey) {
            this.selectAvatar(avatarKey);
          }
        }
      });
      this.bpPrintBtn?.addEventListener("click", () => {
        window.print();
      });
      this.boardingPassModal?.addEventListener("click", (e) => {
        const target = e.target;
        if (target === this.boardingPassModal || target.closest("[data-close-bp]")) {
          if (this.boardingPassModal) this.boardingPassModal.style.display = "none";
        }
      });
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if (this.avatarModal) this.avatarModal.style.display = "none";
          if (this.boardingPassModal) this.boardingPassModal.style.display = "none";
        }
      });
      DestinationService.onWishlistChange(() => {
        this.renderWishlist();
        this.updateStats();
      });
      DestinationService.onBookingsChange(() => {
        this.renderBookings();
        this.updateStats();
      });
      this.authService.subscribe(() => {
        this.initSessionData();
        this.renderProfile();
        this.renderBookings();
        this.renderWishlist();
      });
    }
    /**
     * Switch between Profile Tabs
     */
    switchTab(tabId) {
      this.tabBtns?.forEach((btn) => {
        const isActive = btn.getAttribute("data-tab") === tabId;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-selected", String(isActive));
      });
      this.tabPanels?.forEach((panel) => {
        const isTarget = panel.id === `tab-panel-${tabId}`;
        panel.style.display = isTarget ? "block" : "none";
      });
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabId);
      history.replaceState(null, "", url.toString());
    }
    /**
     * Render User Info into the Profile UI
     */
    renderProfile() {
      if (!this.currentSession) return;
      const session = this.currentSession;
      const displayName = session.name || "Traveler";
      const initial = displayName.charAt(0).toUpperCase();
      if (this.userNameHeading) this.userNameHeading.textContent = displayName;
      if (this.userEmailSub) this.userEmailSub.textContent = session.email;
      if (this.userAvatarText) this.userAvatarText.textContent = initial;
      if (this.userAvatarWrapper) {
        this.userAvatarWrapper.setAttribute("data-avatar", session.avatar || "avatar-1");
      }
      if (this.userLoyaltyBadge) {
        this.userLoyaltyBadge.innerHTML = `<i class="fa-solid fa-crown"></i> ${session.loyaltyTier || "Gold Adventurer"}`;
      }
      if (this.userMemberSince) {
        const year = (/* @__PURE__ */ new Date()).getFullYear();
        this.userMemberSince.textContent = `Member since ${year}`;
      }
      if (this.inputName) this.inputName.value = session.name || "";
      if (this.inputEmail) this.inputEmail.value = session.email || "";
      if (this.inputPhone) this.inputPhone.value = session.phone || "";
      if (this.inputHomeAirport) this.inputHomeAirport.value = session.preferences?.homeAirport || "";
      if (this.inputBio) this.inputBio.value = session.bio || "";
      const prefs = session.preferences;
      if (this.selectCurrency && prefs?.currency) this.selectCurrency.value = prefs.currency;
      if (this.selectLanguage && prefs?.language) this.selectLanguage.value = prefs.language;
      if (this.selectMeal && prefs?.mealPreference) this.selectMeal.value = prefs.mealPreference;
      if (this.selectSeat && prefs?.seatPreference) this.selectSeat.value = prefs.seatPreference;
      if (this.checkEmailAlerts) this.checkEmailAlerts.checked = prefs?.emailAlerts ?? true;
      if (this.checkSmsAlerts) this.checkSmsAlerts.checked = prefs?.smsAlerts ?? true;
      this.updateStats();
    }
    /**
     * Update Quick Travel Stats
     */
    updateStats() {
      const bookings = DestinationService.getBookings();
      const wishlist = DestinationService.getWishlistDestinations();
      const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
      if (this.statTripsCount) this.statTripsCount.textContent = String(confirmedCount);
      if (this.statWishlistCount) this.statWishlistCount.textContent = String(wishlist.length);
      if (this.statPointsCount) {
        const points = (this.currentSession?.loyaltyPoints ?? 1250) + confirmedCount * 350;
        this.statPointsCount.textContent = points.toLocaleString();
      }
    }
    /**
     * Save Personal Details
     */
    savePersonalDetails() {
      const name = this.inputName?.value.trim() || "";
      const email = this.inputEmail?.value.trim().toLowerCase() || "";
      const phone = this.inputPhone?.value.trim() || "";
      const homeAirport = this.inputHomeAirport?.value.trim() || "";
      const bio = this.inputBio?.value.trim() || "";
      const phoneErr = document.getElementById("input-profile-phone-error");
      if (phoneErr) phoneErr.textContent = "";
      this.inputPhone?.classList.remove("input-error");
      if (!name || name.length < 2) {
        this.showToast("Please enter a valid full name (at least 2 characters).", "error");
        return;
      }
      if (!email || !email.includes("@")) {
        this.showToast("Please enter a valid email address.", "error");
        return;
      }
      let formattedPhone = phone;
      if (phone) {
        const phoneRes = validatePhoneNumber(phone);
        if (!phoneRes.isValid) {
          if (phoneErr) phoneErr.textContent = phoneRes.error || "Please enter a valid phone number.";
          this.inputPhone?.classList.add("input-error", "shake-animation");
          setTimeout(() => this.inputPhone?.classList.remove("shake-animation"), 350);
          this.inputPhone?.focus();
          this.showToast(phoneRes.error || "Please enter a valid phone number.", "error");
          return;
        }
        formattedPhone = phoneRes.formatted || phone;
        if (this.inputPhone) this.inputPhone.value = formattedPhone;
      }
      if (!this.isDemoMode) {
        const res = this.authService.updateProfile({
          name,
          email,
          phone: formattedPhone,
          bio,
          preferences: {
            ...this.currentSession?.preferences,
            homeAirport
          }
        });
        if (!res.success) {
          this.showToast(res.error || "Failed to update profile.", "error");
          return;
        }
        this.currentSession = res.user || null;
      } else {
        if (this.currentSession) {
          this.currentSession.name = name;
          this.currentSession.email = email;
          this.currentSession.phone = phone;
          this.currentSession.bio = bio;
          if (!this.currentSession.preferences) this.currentSession.preferences = {};
          this.currentSession.preferences.homeAirport = homeAirport;
        }
      }
      this.renderProfile();
      this.showToast("Profile information successfully saved! \u{1F389}");
    }
    /**
     * Save Travel Preferences
     */
    savePreferences() {
      const currency = this.selectCurrency?.value;
      const language = this.selectLanguage?.value;
      const mealPreference = this.selectMeal?.value;
      const seatPreference = this.selectSeat?.value;
      const emailAlerts = this.checkEmailAlerts?.checked ?? true;
      const smsAlerts = this.checkSmsAlerts?.checked ?? true;
      const newPreferences = {
        ...this.currentSession?.preferences,
        currency,
        language,
        mealPreference,
        seatPreference,
        emailAlerts,
        smsAlerts
      };
      if (!this.isDemoMode) {
        this.authService.updateProfile({
          preferences: newPreferences
        });
      }
      if (this.currentSession) {
        this.currentSession.preferences = newPreferences;
      }
      this.showToast("Travel preferences saved! \u2708\uFE0F");
    }
    /**
     * Change Password
     */
    updatePassword() {
      const oldPass = this.inputOldPassword?.value || "";
      const newPass = this.inputNewPassword?.value || "";
      const confirmPass = this.inputConfirmNewPassword?.value || "";
      if (this.isDemoMode) {
        AuthMiddleware.requireAuth({
          actionName: "update your security password",
          customMessage: "You are viewing in guest preview mode. Please sign in or create an account to manage security credentials."
        });
        if (this.formSecurity) this.formSecurity.reset();
        return;
      }
      if (!oldPass) {
        this.showToast("Please enter your current password.", "error");
        return;
      }
      if (!newPass || newPass.length < 8) {
        this.showToast("New password must be at least 8 characters.", "error");
        return;
      }
      if (newPass !== confirmPass) {
        this.showToast("New passwords do not match.", "error");
        return;
      }
      const res = this.authService.changePassword(oldPass, newPass);
      if (!res.success) {
        this.showToast(res.error || "Failed to update password.", "error");
        return;
      }
      if (this.formSecurity) this.formSecurity.reset();
      this.showToast("Password successfully updated! \u{1F512}");
    }
    /**
     * Avatar selection
     */
    selectAvatar(avatarKey) {
      if (this.userAvatarWrapper) {
        this.userAvatarWrapper.setAttribute("data-avatar", avatarKey);
      }
      if (!this.isDemoMode) {
        this.authService.updateProfile({ avatar: avatarKey });
      }
      if (this.currentSession) {
        this.currentSession.avatar = avatarKey;
      }
      if (this.avatarModal) this.avatarModal.style.display = "none";
      this.showToast("Avatar updated! \u{1F4F8}");
    }
    /**
     * Render User Bookings in Profile Tab
     */
    renderBookings() {
      if (!this.bookingsListEl) return;
      if (this.isDemoMode) {
        AuthMiddleware.renderLockedState(this.bookingsListEl, {
          title: "Sign In to Access Your Bookings",
          message: "You are currently viewing in guest preview mode. Confirmed reservations, itinerary details, and digital boarding passes require a verified Jadoo account."
        });
        return;
      }
      const bookings = DestinationService.getBookings();
      if (bookings.length === 0) {
        this.bookingsListEl.innerHTML = `
        <div class="profile-empty-state">
          <div class="empty-icon"><i class="fa-solid fa-plane-slash"></i></div>
          <h3>No Trip Reservations Yet</h3>
          <p>You haven't reserved any travel packages yet. Explore our curated destinations and confirm your next vacation!</p>
          <a href="index.html#destinations" class="profile-cta-btn">
            <i class="fa-solid fa-compass"></i>
            <span>Browse Destinations</span>
          </a>
        </div>
      `;
        return;
      }
      this.bookingsListEl.innerHTML = bookings.map((b) => {
        const isCancelled = b.status === "cancelled";
        return `
          <div class="profile-booking-card ${isCancelled ? "cancelled" : ""}">
            <div class="pb-header">
              <div class="pb-ref">
                <span class="pb-ref-label">Booking Reference</span>
                <strong class="pb-ref-code">${b.bookingId}</strong>
              </div>
              <span class="pb-status ${isCancelled ? "cancelled" : "confirmed"}">
                <i class="fa-solid ${isCancelled ? "fa-circle-xmark" : "fa-circle-check"}"></i>
                ${isCancelled ? "Cancelled" : "Confirmed"}
              </span>
            </div>

            <div class="pb-body">
              <img src="${b.destinationImage}" alt="${b.destinationTitle}" class="pb-thumb" onerror="this.src='https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'" />
              <div class="pb-info">
                <h4 class="pb-title">${b.destinationTitle}</h4>
                <div class="pb-meta">
                  <span><i class="fa-solid fa-calendar-days"></i> Departs: <strong>${b.departureDate}</strong></span>
                  <span><i class="fa-solid fa-user-group"></i> ${b.adults} Adults${b.children > 0 ? `, ${b.children} Children` : ""}</span>
                  <span><i class="fa-solid fa-gem"></i> ${b.packageTier.toUpperCase()} Package</span>
                  <span><i class="fa-solid fa-wallet"></i> Total: <strong>$${b.totalPrice.toLocaleString()}</strong></span>
                </div>
              </div>
            </div>

            <div class="pb-footer">
              <button type="button" class="pb-btn-ticket" data-booking-id="${b.bookingId}">
                <i class="fa-solid fa-ticket"></i>
                <span>View Boarding Pass</span>
              </button>
              ${!isCancelled ? `
                <button type="button" class="pb-btn-cancel" data-booking-id="${b.bookingId}">
                  <i class="fa-solid fa-ban"></i>
                  <span>Cancel Trip</span>
                </button>
              ` : ""}
            </div>
          </div>
        `;
      }).join("");
      this.bookingsListEl.querySelectorAll(".pb-btn-ticket").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-booking-id");
          const booking = bookings.find((b) => b.bookingId === id);
          if (booking) this.openBoardingPass(booking);
        });
      });
      this.bookingsListEl.querySelectorAll(".pb-btn-cancel").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-booking-id");
          if (id && confirm(`Are you sure you want to cancel booking ${id}?`)) {
            DestinationService.cancelBooking(id);
            this.showToast(`Booking ${id} cancelled.`);
          }
        });
      });
    }
    /**
     * Render User Wishlist in Profile Tab
     */
    renderWishlist() {
      if (!this.wishlistListEl) return;
      const wishlist = DestinationService.getWishlistDestinations();
      if (wishlist.length === 0) {
        this.wishlistListEl.innerHTML = `
        <div class="profile-empty-state full-width">
          <div class="empty-icon"><i class="fa-regular fa-heart"></i></div>
          <h3>Your Wishlist is Empty</h3>
          <p>Explore world destinations on Jadoo and click the heart icon on any destination to save it here!</p>
          <a href="index.html#destinations" class="profile-cta-btn">
            <i class="fa-solid fa-earth-americas"></i>
            <span>Discover Top Places</span>
          </a>
        </div>
      `;
        return;
      }
      this.wishlistListEl.innerHTML = wishlist.map((dest) => {
        return `
          <div class="profile-wish-card">
            <div class="pw-thumb-wrap">
              <img src="${dest.imageUrl}" alt="${dest.title}" class="pw-thumb" onerror="this.src='https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'" />
              <button type="button" class="pw-remove-btn" data-id="${dest.id}" title="Remove from wishlist" aria-label="Remove">
                <i class="fa-solid fa-trash-can"></i>
              </button>
              <span class="pw-rating"><i class="fa-solid fa-star"></i> ${dest.rating.toFixed(1)}</span>
            </div>
            <div class="pw-content">
              <h4 class="pw-title">${dest.title}</h4>
              <p class="pw-sub"><i class="fa-solid fa-location-dot"></i> ${dest.subtitle || "Global Destination"}</p>
              <div class="pw-meta">
                <span class="pw-dur"><i class="fa-solid fa-clock"></i> ${dest.duration}</span>
                <span class="pw-price">${dest.price}</span>
              </div>
              <a href="index.html#destinations" class="pw-book-btn">
                <span>Book on Jadoo</span>
                <i class="fa-solid fa-arrow-right"></i>
              </a>
            </div>
          </div>
        `;
      }).join("");
      this.wishlistListEl.querySelectorAll(".pw-remove-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const id = btn.getAttribute("data-id");
          if (id) {
            DestinationService.removeFromWishlist(id);
            this.showToast("Destination removed from wishlist.");
          }
        });
      });
    }
    /**
     * Open Boarding Pass Modal
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
        this.bpGuests.textContent = `${record.adults} Adults${record.children > 0 ? ` + ${record.children} Child` : ""}`;
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
     * Toast notification
     */
    showToast(message, type = "success") {
      const existing = document.querySelector(".profile-toast");
      existing?.remove();
      const toast = document.createElement("div");
      toast.className = `profile-toast ${type}`;
      const icon = type === "error" ? "fa-circle-xmark" : type === "info" ? "fa-circle-info" : "fa-circle-check";
      toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
      document.body.appendChild(toast);
      setTimeout(() => toast.classList.add("visible"), 10);
      setTimeout(() => {
        toast.classList.remove("visible");
        setTimeout(() => toast.remove(), 300);
      }, 3200);
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

  // src/profile.ts
  document.addEventListener("DOMContentLoaded", () => {
    themeService.bindToggleButtons();
    DestinationService.syncWithBackend();
    new ProfileController();
  });
})();
//# sourceMappingURL=profile.js.map
