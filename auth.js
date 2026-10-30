"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

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
  var VALIDATION_RULES = {
    NAME_MIN_LENGTH: 2,
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_LOGIN_MIN_LENGTH: 6,
    NAME_REGEX: /^[a-zA-Z\s'-]+$/,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  };

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

  // src/modules/auth/password-validator.ts
  var PasswordValidator = class {
    static evaluate(password) {
      const criteria = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
      };
      const passedCount = Object.values(criteria).filter(Boolean).length;
      if (!password) {
        return {
          criteria,
          passedCount: 0,
          level: "weak",
          label: "Too weak"
        };
      }
      if (!criteria.length) {
        return {
          criteria,
          passedCount,
          level: "weak",
          label: "Too short (min 8 chars)"
        };
      }
      let level = "weak";
      let label = "Weak";
      if (passedCount >= 5) {
        level = "strong";
        label = "Strong password";
      } else if (passedCount >= 4) {
        level = "good";
        label = "Good";
      } else if (passedCount >= 3) {
        level = "fair";
        label = "Fair";
      }
      return {
        criteria,
        passedCount,
        level,
        label
      };
    }
  };

  // src/modules/auth/form-validator.ts
  var FormValidator = class {
    static validateName(name) {
      const value = name.trim();
      if (!value) {
        return { isValid: false, message: "Please enter your full name" };
      }
      if (value.length < VALIDATION_RULES.NAME_MIN_LENGTH) {
        return { isValid: false, message: `Name must be at least ${VALIDATION_RULES.NAME_MIN_LENGTH} characters` };
      }
      if (!VALIDATION_RULES.NAME_REGEX.test(value)) {
        return { isValid: false, message: "Name can only contain letters, spaces, hyphens, and apostrophes" };
      }
      return { isValid: true };
    }
    static validateEmail(email) {
      const value = email.trim();
      if (!value) {
        return { isValid: false, message: "Email address is required" };
      }
      if (!VALIDATION_RULES.EMAIL_REGEX.test(value)) {
        return { isValid: false, message: "Please enter a valid email address" };
      }
      return { isValid: true };
    }
    static validatePassword(password, mode) {
      if (!password) {
        return { isValid: false, message: "Password is required" };
      }
      if (mode === "signup") {
        const report = PasswordValidator.evaluate(password);
        if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
          return { isValid: false, message: `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters` };
        }
        if (report.passedCount < 4) {
          return { isValid: false, message: "Password must meet at least 4 security criteria" };
        }
      } else {
        if (password.length < VALIDATION_RULES.PASSWORD_LOGIN_MIN_LENGTH) {
          return { isValid: false, message: `Password must be at least ${VALIDATION_RULES.PASSWORD_LOGIN_MIN_LENGTH} characters` };
        }
      }
      return { isValid: true };
    }
    static validateConfirmPassword(password, confirmPassword) {
      if (!confirmPassword) {
        return { isValid: false, message: "Please confirm your password" };
      }
      if (password !== confirmPassword) {
        return { isValid: false, message: "Passwords do not match" };
      }
      return { isValid: true };
    }
  };

  // src/modules/auth/auth-form.controller.ts
  var AuthFormController = class {
    constructor() {
      __publicField(this, "form");
      __publicField(this, "mode", "login");
      // Headings & Text
      __publicField(this, "titleEl");
      __publicField(this, "subtitleEl");
      __publicField(this, "submitTextEl");
      __publicField(this, "promptTextEl");
      __publicField(this, "inlineSwitchBtn");
      // Tabs & Groups
      __publicField(this, "tabsContainer");
      __publicField(this, "tabLoginBtn");
      __publicField(this, "tabSignupBtn");
      __publicField(this, "nameGroup");
      __publicField(this, "confirmGroup");
      __publicField(this, "helpersRow");
      __publicField(this, "submitBtn");
      // Inputs
      __publicField(this, "nameInput");
      __publicField(this, "emailInput");
      __publicField(this, "passwordInput");
      __publicField(this, "confirmPasswordInput");
      // Strength Meter
      __publicField(this, "strengthContainer");
      __publicField(this, "strengthStatus");
      __publicField(this, "critLength");
      __publicField(this, "critUpper");
      __publicField(this, "critLower");
      __publicField(this, "critNum");
      __publicField(this, "critSpecial");
      // Feedback Alert
      __publicField(this, "alertEl");
      __publicField(this, "alertTextEl");
      this.form = document.getElementById("auth-form");
      this.titleEl = document.getElementById("auth-title");
      this.subtitleEl = document.getElementById("auth-subtitle");
      this.submitTextEl = document.getElementById("submit-text");
      this.promptTextEl = document.getElementById("prompt-text");
      this.inlineSwitchBtn = document.getElementById("auth-inline-switch");
      this.tabsContainer = document.querySelector(".auth-tabs");
      this.tabLoginBtn = document.getElementById("tab-login");
      this.tabSignupBtn = document.getElementById("tab-signup");
      this.nameGroup = document.getElementById("group-name");
      this.confirmGroup = document.getElementById("group-confirm");
      this.helpersRow = document.getElementById("auth-helpers");
      this.submitBtn = document.getElementById("auth-submit-btn");
      this.nameInput = document.getElementById("name");
      this.emailInput = document.getElementById("email");
      this.passwordInput = document.getElementById("password");
      this.confirmPasswordInput = document.getElementById("confirm-password");
      this.strengthContainer = document.getElementById("password-strength-container");
      this.strengthStatus = document.getElementById("strength-status");
      this.critLength = document.getElementById("crit-length");
      this.critUpper = document.getElementById("crit-uppercase");
      this.critLower = document.getElementById("crit-lowercase");
      this.critNum = document.getElementById("crit-number");
      this.critSpecial = document.getElementById("crit-special");
      this.alertEl = document.getElementById("auth-alert");
      this.alertTextEl = document.getElementById("alert-text");
      this.init();
    }
    init() {
      if (!this.form) return;
      this.bindTabEvents();
      this.bindValidationEvents();
      this.bindEyeToggles();
      this.bindHelperEvents();
      this.bindSubmitEvent();
      const urlParams = new URLSearchParams(window.location.search);
      const initialMode = urlParams.get("mode") === "signup" ? "signup" : "login";
      this.setMode(initialMode, false);
      this.syncBackButton();
    }
    getReturnUrl() {
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get("returnUrl") || urlParams.get("redirect") || urlParams.get("next");
      if (!returnUrl) return "index.html";
      try {
        const decoded = decodeURIComponent(returnUrl);
        if (/^(?:[a-z]+:)?\/\//i.test(decoded) || decoded.startsWith("javascript:")) {
          return "index.html";
        }
        return decoded;
      } catch {
        return "index.html";
      }
    }
    syncBackButton() {
      const backBtn = document.getElementById("auth-back-btn");
      const targetUrl = this.getReturnUrl();
      if (backBtn && targetUrl !== "index.html") {
        backBtn.href = targetUrl;
        const backSpan = backBtn.querySelector("span");
        if (backSpan) {
          backSpan.textContent = targetUrl.includes("profile") ? "Back to Profile" : "Back";
        }
      }
    }
    setMode(mode, updateUrl = true) {
      this.mode = mode;
      this.clearAllErrors();
      this.hideAlert();
      const isSignup = mode === "signup";
      this.tabLoginBtn?.classList.toggle("active", !isSignup);
      this.tabLoginBtn?.setAttribute("aria-selected", String(!isSignup));
      this.tabSignupBtn?.classList.toggle("active", isSignup);
      this.tabSignupBtn?.setAttribute("aria-selected", String(isSignup));
      this.tabsContainer?.classList.toggle("signup-active", isSignup);
      this.nameGroup?.classList.toggle("is-visible", isSignup);
      this.confirmGroup?.classList.toggle("is-visible", isSignup);
      if (isSignup) {
        if (this.titleEl) this.titleEl.textContent = "Start your journey";
        if (this.subtitleEl) this.subtitleEl.textContent = "Create an account to book your dream destinations";
        if (this.submitTextEl) this.submitTextEl.textContent = "Create Account";
        if (this.promptTextEl) this.promptTextEl.textContent = "Already have an account?";
        if (this.inlineSwitchBtn) this.inlineSwitchBtn.textContent = "Log In";
        if (this.helpersRow) this.helpersRow.style.display = "none";
        const demoHint = document.getElementById("auth-demo-hint");
        if (demoHint) demoHint.style.display = "none";
        if (this.passwordInput?.value) {
          this.strengthContainer?.classList.add("is-visible");
          this.renderPasswordStrength(this.passwordInput.value);
        }
      } else {
        if (this.titleEl) this.titleEl.textContent = "Welcome back!";
        if (this.subtitleEl) this.subtitleEl.textContent = "Log in to manage your bookings and explore the world";
        if (this.submitTextEl) this.submitTextEl.textContent = "Log In";
        if (this.promptTextEl) this.promptTextEl.textContent = "Don't have an account?";
        if (this.inlineSwitchBtn) this.inlineSwitchBtn.textContent = "Sign Up";
        if (this.helpersRow) this.helpersRow.style.display = "flex";
        const demoHint = document.getElementById("auth-demo-hint");
        if (demoHint) demoHint.style.display = "flex";
        this.strengthContainer?.classList.remove("is-visible");
      }
      if (updateUrl) {
        const url = new URL(window.location.href);
        url.searchParams.set("mode", mode);
        window.history.replaceState({}, "", url.toString());
      }
    }
    bindTabEvents() {
      this.tabLoginBtn?.addEventListener("click", () => this.setMode("login"));
      this.tabSignupBtn?.addEventListener("click", () => this.setMode("signup"));
      this.inlineSwitchBtn?.addEventListener("click", () => {
        this.setMode(this.mode === "login" ? "signup" : "login");
      });
    }
    bindValidationEvents() {
      this.nameInput?.addEventListener("blur", () => this.validateNameField());
      this.nameInput?.addEventListener("input", () => {
        if (this.isFieldInvalid(this.nameInput)) this.validateNameField();
      });
      this.emailInput?.addEventListener("blur", () => this.validateEmailField());
      this.emailInput?.addEventListener("input", () => {
        if (this.isFieldInvalid(this.emailInput)) this.validateEmailField();
      });
      this.passwordInput?.addEventListener("focus", () => {
        if (this.mode === "signup") {
          this.strengthContainer?.classList.add("is-visible");
          this.renderPasswordStrength(this.passwordInput?.value || "");
        }
      });
      this.passwordInput?.addEventListener("input", () => {
        const val = this.passwordInput?.value || "";
        if (this.mode === "signup") {
          this.strengthContainer?.classList.add("is-visible");
          this.renderPasswordStrength(val);
          if (this.confirmPasswordInput?.value) {
            this.validateConfirmPasswordField();
          }
        }
        if (this.isFieldInvalid(this.passwordInput)) {
          this.validatePasswordField();
        }
      });
      this.passwordInput?.addEventListener("blur", () => this.validatePasswordField());
      this.confirmPasswordInput?.addEventListener("input", () => {
        if (this.confirmPasswordInput && (this.isFieldInvalid(this.confirmPasswordInput) || this.confirmPasswordInput.value)) {
          this.validateConfirmPasswordField();
        }
      });
      this.confirmPasswordInput?.addEventListener("blur", () => this.validateConfirmPasswordField());
    }
    validateNameField() {
      if (this.mode !== "signup" || !this.nameInput) return true;
      const res = FormValidator.validateName(this.nameInput.value);
      return this.applyFieldStatus(this.nameInput, "name-error", res.isValid, res.message);
    }
    validateEmailField() {
      if (!this.emailInput) return false;
      const res = FormValidator.validateEmail(this.emailInput.value);
      return this.applyFieldStatus(this.emailInput, "email-error", res.isValid, res.message);
    }
    validatePasswordField() {
      if (!this.passwordInput) return false;
      const res = FormValidator.validatePassword(this.passwordInput.value, this.mode);
      return this.applyFieldStatus(this.passwordInput, "password-error", res.isValid, res.message);
    }
    validateConfirmPasswordField() {
      if (this.mode !== "signup" || !this.confirmPasswordInput || !this.passwordInput) return true;
      const res = FormValidator.validateConfirmPassword(this.passwordInput.value, this.confirmPasswordInput.value);
      return this.applyFieldStatus(this.confirmPasswordInput, "confirm-error", res.isValid, res.message);
    }
    applyFieldStatus(input, errorId, isValid, message = "") {
      const group = input.closest(".auth-group");
      const errorEl = document.getElementById(errorId);
      if (isValid) {
        group?.classList.remove("is-invalid");
        group?.classList.add("is-valid");
        if (errorEl) errorEl.textContent = "";
        return true;
      } else {
        group?.classList.add("is-invalid");
        group?.classList.remove("is-valid");
        if (errorEl) errorEl.textContent = message;
        return false;
      }
    }
    isFieldInvalid(input) {
      return input?.closest(".auth-group")?.classList.contains("is-invalid") ?? false;
    }
    clearAllErrors() {
      [this.nameInput, this.emailInput, this.passwordInput, this.confirmPasswordInput].forEach((input) => {
        input?.closest(".auth-group")?.classList.remove("is-invalid", "is-valid");
      });
      ["name-error", "email-error", "password-error", "confirm-error"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = "";
      });
    }
    renderPasswordStrength(password) {
      const report = PasswordValidator.evaluate(password);
      this.updateCriterionElement(this.critLength, report.criteria.length);
      this.updateCriterionElement(this.critUpper, report.criteria.uppercase);
      this.updateCriterionElement(this.critLower, report.criteria.lowercase);
      this.updateCriterionElement(this.critNum, report.criteria.number);
      this.updateCriterionElement(this.critSpecial, report.criteria.special);
      if (!password) {
        this.strengthContainer?.removeAttribute("data-level");
        if (this.strengthStatus) this.strengthStatus.textContent = "Too weak";
        return;
      }
      this.strengthContainer?.setAttribute("data-level", report.level);
      if (this.strengthStatus) this.strengthStatus.textContent = report.label;
    }
    updateCriterionElement(el, met) {
      if (!el) return;
      el.classList.toggle("met", met);
      const icon = el.querySelector("i");
      if (icon) {
        icon.className = met ? "fa-solid fa-circle-check crit-icon" : "fa-solid fa-circle-xmark crit-icon";
      }
    }
    bindEyeToggles() {
      this.setupEyeButton("toggle-password", this.passwordInput);
      this.setupEyeButton("toggle-confirm", this.confirmPasswordInput);
    }
    setupEyeButton(btnId, input) {
      const btn = document.getElementById(btnId);
      btn?.addEventListener("click", () => {
        if (!input) return;
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        const icon = btn.querySelector("i");
        if (icon) {
          icon.className = isPassword ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
        }
      });
    }
    showAlert(message, type = "success") {
      if (!this.alertEl || !this.alertTextEl) return;
      this.alertTextEl.textContent = message;
      this.alertEl.className = `auth-alert is-visible ${type}`;
      const icon = this.alertEl.querySelector("i");
      if (icon) {
        icon.className = type === "success" ? "fa-solid fa-circle-check alert-icon" : "fa-solid fa-circle-exclamation alert-icon";
      }
    }
    hideAlert() {
      if (this.alertEl) {
        this.alertEl.className = "auth-alert";
      }
    }
    bindSubmitEvent() {
      this.form?.addEventListener("submit", (e) => {
        e.preventDefault();
        const isNameValid = this.validateNameField();
        const isEmailValid = this.validateEmailField();
        const isPasswordValid = this.validatePasswordField();
        const isConfirmValid = this.validateConfirmPasswordField();
        if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmValid) {
          this.form?.querySelector(".auth-group.is-invalid .auth-input")?.focus();
          return;
        }
        if (!this.emailInput || !this.passwordInput || !this.submitBtn) return;
        this.submitBtn.classList.add("is-loading");
        this.submitBtn.disabled = true;
        setTimeout(async () => {
          const email = this.emailInput?.value || "";
          const password = this.passwordInput?.value || "";
          try {
            if (this.mode === "signup") {
              const name = this.nameInput?.value || "";
              const result = await authService.register(name, email, password);
              this.submitBtn?.classList.remove("is-loading");
              if (this.submitBtn) this.submitBtn.disabled = false;
              if (!result.success) {
                this.applyFieldStatus(this.emailInput, "email-error", false, result.error || "Registration failed");
                this.showAlert(result.error || "Registration failed", "error");
                return;
              }
              const targetUrl = this.getReturnUrl();
              const targetName = targetUrl.includes("profile") ? "your profile" : targetUrl.includes("bookings") ? "your bookings" : "home";
              this.showAlert(`Welcome aboard, ${result.user?.name}! Redirecting to ${targetName}...`, "success");
              setTimeout(() => {
                window.location.href = targetUrl;
              }, UI_CONFIG.AUTH_REDIRECT_DELAY_MS);
            } else {
              const result = await authService.login(email, password);
              this.submitBtn?.classList.remove("is-loading");
              if (this.submitBtn) this.submitBtn.disabled = false;
              if (!result.success) {
                this.applyFieldStatus(this.passwordInput, "password-error", false, result.error || "Login failed");
                this.showAlert(result.error || "Login failed", "error");
                return;
              }
              const rememberCheckbox = document.getElementById("remember-me");
              if (rememberCheckbox?.checked) {
                StorageService.setItem("jadoo_remembered_email", email);
              } else {
                StorageService.removeItem("jadoo_remembered_email");
              }
              const targetUrl = this.getReturnUrl();
              const targetName = targetUrl.includes("profile") ? "your profile" : targetUrl.includes("bookings") ? "your bookings" : "home";
              this.showAlert(`Welcome back, ${result.user?.name}! Redirecting to ${targetName}...`, "success");
              setTimeout(() => {
                window.location.href = targetUrl;
              }, UI_CONFIG.AUTH_REDIRECT_DELAY_MS);
            }
          } catch (err) {
            this.submitBtn?.classList.remove("is-loading");
            if (this.submitBtn) this.submitBtn.disabled = false;
            const msg = err instanceof Error ? err.message : "Authentication failed";
            this.showAlert(msg, "error");
          }
        }, UI_CONFIG.FORM_SUBMIT_SIMULATED_LATENCY_MS);
      });
    }
    bindHelperEvents() {
      const forgotLink = document.getElementById("auth-forgot-link");
      forgotLink?.addEventListener("click", (e) => {
        e.preventDefault();
        const email = this.emailInput?.value.trim() || "";
        if (!email) {
          this.applyFieldStatus(this.emailInput, "email-error", false, "Please enter your registered email address to receive reset instructions.");
          this.showAlert("Please enter your email address above to receive reset instructions.", "error");
          this.emailInput?.focus();
          return;
        }
        const emailRes = FormValidator.validateEmail(email);
        if (!emailRes.isValid) {
          const errorMsg = emailRes.message || "Please enter a valid email address.";
          this.applyFieldStatus(this.emailInput, "email-error", false, errorMsg);
          this.showAlert(errorMsg, "error");
          this.emailInput?.focus();
          return;
        }
        this.clearAllErrors();
        this.showAlert(`Password reset link sent to ${email} (demo preview).`, "success");
      });
      const demoFillBtn = document.getElementById("btn-demo-fill");
      demoFillBtn?.addEventListener("click", () => {
        if (this.mode === "signup") {
          this.setMode("login");
        }
        if (this.emailInput) this.emailInput.value = "sarah.jenkins@example.com";
        if (this.passwordInput) this.passwordInput.value = "Password123!";
        this.validateEmailField();
        this.validatePasswordField();
        this.showAlert("Demo credentials filled! Click Log In to continue.", "success");
      });
      const socialButtons = document.querySelectorAll(".auth-social-btn");
      socialButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          this.showAlert("Social login is a demo preview. Please sign in with email & password.", "error");
        });
      });
      const rememberCheckbox = document.getElementById("remember-me");
      const savedEmail = StorageService.getString("jadoo_remembered_email", "");
      if (savedEmail && this.emailInput && rememberCheckbox) {
        this.emailInput.value = savedEmail;
        rememberCheckbox.checked = true;
      }
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

  // src/auth.ts
  document.addEventListener("DOMContentLoaded", () => {
    themeService.bindToggleButtons();
    new AuthFormController();
  });
})();
//# sourceMappingURL=auth.js.map
