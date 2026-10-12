// ==========================================================================
// JADOO AUTHENTICATION JAVASCRIPT (LOGIN & SIGN UP)
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // ------------------------------------------------------------------------
  // 1. DOM Elements
  // ------------------------------------------------------------------------
  const authForm = document.getElementById("auth-form");
  const authTitle = document.getElementById("auth-title");
  const authSubtitle = document.getElementById("auth-subtitle");
  const authTabs = document.querySelector(".auth-tabs");
  const tabLogin = document.getElementById("tab-login");
  const tabSignup = document.getElementById("tab-signup");
  const groupName = document.getElementById("group-name");
  const groupConfirm = document.getElementById("group-confirm");
  const authHelpers = document.getElementById("auth-helpers");
  const authSubmitBtn = document.getElementById("auth-submit-btn");
  const submitText = document.getElementById("submit-text");
  const promptText = document.getElementById("prompt-text");
  const inlineSwitch = document.getElementById("auth-inline-switch");
  const authAlert = document.getElementById("auth-alert");
  const alertText = document.getElementById("alert-text");

  // Input Fields
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirm-password");

  // Eye Toggles
  const togglePasswordBtn = document.getElementById("toggle-password");
  const toggleConfirmBtn = document.getElementById("toggle-confirm");

  // Theme Toggle & Logo
  const themeToggleBtn = document.getElementById("theme-toggle");
  const logoImg = document.querySelector(".auth-logo");

  // Current State
  let currentMode = "login"; // 'login' or 'signup'

  // ------------------------------------------------------------------------
  // 2. Mode Switcher (Login vs Sign Up)
  // ------------------------------------------------------------------------
  function setMode(mode, updateUrl = true) {
    currentMode = mode;
    clearAllErrors();
    hideAlert();

    const isSignup = mode === "signup";

    // Toggle Tab Active States
    tabLogin.classList.toggle("active", !isSignup);
    tabLogin.setAttribute("aria-selected", !isSignup);
    tabSignup.classList.toggle("active", isSignup);
    tabSignup.setAttribute("aria-selected", isSignup);
    authTabs.classList.toggle("signup-active", isSignup);

    // Toggle Form Groups
    groupName.classList.toggle("is-visible", isSignup);
    groupConfirm.classList.toggle("is-visible", isSignup);

    // Update Headings & Texts
    if (isSignup) {
      authTitle.textContent = "Start your journey";
      authSubtitle.textContent = "Create an account to book your dream destinations";
      submitText.textContent = "Create Account";
      promptText.textContent = "Already have an account?";
      inlineSwitch.textContent = "Log In";
      if (authHelpers) authHelpers.style.display = "none";
    } else {
      authTitle.textContent = "Welcome back!";
      authSubtitle.textContent = "Log in to manage your bookings and explore the world";
      submitText.textContent = "Log In";
      promptText.textContent = "Don't have an account?";
      inlineSwitch.textContent = "Sign Up";
      if (authHelpers) authHelpers.style.display = "flex";
    }

    // Update URL query parameter without full reload
    if (updateUrl) {
      const newUrl = new URL(window.location);
      newUrl.searchParams.set("mode", mode);
      window.history.replaceState({}, "", newUrl);
    }
  }

  // Tab button click events
  if (tabLogin) tabLogin.addEventListener("click", () => setMode("login"));
  if (tabSignup) tabSignup.addEventListener("click", () => setMode("signup"));
  if (inlineSwitch) {
    inlineSwitch.addEventListener("click", () => {
      setMode(currentMode === "login" ? "signup" : "login");
    });
  }

  // ------------------------------------------------------------------------
  // 3. URL Query Parameter Detection
  // ------------------------------------------------------------------------
  const urlParams = new URLSearchParams(window.location.search);
  const initialMode = urlParams.get("mode") === "signup" ? "signup" : "login";
  setMode(initialMode, false);

  // ------------------------------------------------------------------------
  // 4. Form Validation Logic
  // ------------------------------------------------------------------------
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;

  function setFieldError(input, errorElementId, message) {
    const group = input.closest(".auth-group");
    const errorEl = document.getElementById(errorElementId);
    if (group) {
      group.classList.add("is-invalid");
      group.classList.remove("is-valid");
    }
    if (errorEl) {
      errorEl.textContent = message;
    }
    return false;
  }

  function setFieldValid(input, errorElementId) {
    const group = input.closest(".auth-group");
    const errorEl = document.getElementById(errorElementId);
    if (group) {
      group.classList.remove("is-invalid");
      group.classList.add("is-valid");
    }
    if (errorEl) {
      errorEl.textContent = "";
    }
    return true;
  }

  function clearFieldError(input, errorElementId) {
    const group = input.closest(".auth-group");
    const errorEl = document.getElementById(errorElementId);
    if (group) {
      group.classList.remove("is-invalid");
      group.classList.remove("is-valid");
    }
    if (errorEl) {
      errorEl.textContent = "";
    }
  }

  function clearAllErrors() {
    [nameInput, emailInput, passwordInput, confirmPasswordInput].forEach((input) => {
      if (input) {
        const group = input.closest(".auth-group");
        if (group) {
          group.classList.remove("is-invalid");
          group.classList.remove("is-valid");
        }
      }
    });
    ["name-error", "email-error", "password-error", "confirm-error"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "";
    });
  }

  // Individual Field Validators
  function validateName() {
    if (currentMode !== "signup") return true;
    const value = nameInput.value.trim();
    if (!value) {
      return setFieldError(nameInput, "name-error", "Please enter your full name");
    }
    if (value.length < 2) {
      return setFieldError(nameInput, "name-error", "Name must be at least 2 characters");
    }
    if (!/^[a-zA-Z\s'-]+$/.test(value)) {
      return setFieldError(nameInput, "name-error", "Name can only contain letters");
    }
    return setFieldValid(nameInput, "name-error");
  }

  function validateEmail() {
    const value = emailInput.value.trim();
    if (!value) {
      return setFieldError(emailInput, "email-error", "Email address is required");
    }
    if (!emailRegex.test(value)) {
      return setFieldError(emailInput, "email-error", "Please enter a valid email address");
    }
    return setFieldValid(emailInput, "email-error");
  }

  function validatePassword() {
    const value = passwordInput.value;
    if (!value) {
      return setFieldError(passwordInput, "password-error", "Password is required");
    }
    if (value.length < 6) {
      return setFieldError(passwordInput, "password-error", "Password must be at least 6 characters");
    }
    return setFieldValid(passwordInput, "password-error");
  }

  function validateConfirmPassword() {
    if (currentMode !== "signup") return true;
    const value = confirmPasswordInput.value;
    if (!value) {
      return setFieldError(confirmPasswordInput, "confirm-error", "Please confirm your password");
    }
    if (value !== passwordInput.value) {
      return setFieldError(confirmPasswordInput, "confirm-error", "Passwords do not match");
    }
    return setFieldValid(confirmPasswordInput, "confirm-error");
  }

  // Live validation on blur & input
  if (nameInput) {
    nameInput.addEventListener("blur", validateName);
    nameInput.addEventListener("input", () => {
      if (nameInput.closest(".auth-group").classList.contains("is-invalid")) validateName();
    });
  }

  if (emailInput) {
    emailInput.addEventListener("blur", validateEmail);
    emailInput.addEventListener("input", () => {
      if (emailInput.closest(".auth-group").classList.contains("is-invalid")) validateEmail();
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("blur", validatePassword);
    passwordInput.addEventListener("input", () => {
      if (passwordInput.closest(".auth-group").classList.contains("is-invalid")) validatePassword();
      if (currentMode === "signup" && confirmPasswordInput.value) validateConfirmPassword();
    });
  }

  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener("blur", validateConfirmPassword);
    confirmPasswordInput.addEventListener("input", () => {
      if (confirmPasswordInput.closest(".auth-group").classList.contains("is-invalid")) {
        validateConfirmPassword();
      }
    });
  }

  // ------------------------------------------------------------------------
  // 5. Password Visibility Toggles
  // ------------------------------------------------------------------------
  function setupEyeToggle(toggleBtn, input) {
    if (!toggleBtn || !input) return;
    toggleBtn.addEventListener("click", () => {
      const isPassword = input.getAttribute("type") === "password";
      input.setAttribute("type", isPassword ? "text" : "password");
      const icon = toggleBtn.querySelector("i");
      if (icon) {
        icon.className = isPassword ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
      }
    });
  }

  setupEyeToggle(togglePasswordBtn, passwordInput);
  setupEyeToggle(toggleConfirmBtn, confirmPasswordInput);

  // ------------------------------------------------------------------------
  // 6. Alert Toast Helpers
  // ------------------------------------------------------------------------
  function showAlert(message, type = "success") {
    if (!authAlert || !alertText) return;
    alertText.textContent = message;
    authAlert.className = `auth-alert is-visible ${type}`;
    const icon = authAlert.querySelector(".alert-icon");
    if (icon) {
      icon.className = type === "success"
        ? "fa-solid fa-circle-check alert-icon"
        : "fa-solid fa-circle-exclamation alert-icon";
    }
  }

  function hideAlert() {
    if (!authAlert) return;
    authAlert.className = "auth-alert";
  }

  // ------------------------------------------------------------------------
  // 7. Form Submission Handler
  // ------------------------------------------------------------------------
  if (authForm) {
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();

      // Run all validations for active mode
      const isNameValid = validateName();
      const isEmailValid = validateEmail();
      const isPasswordValid = validatePassword();
      const isConfirmValid = validateConfirmPassword();

      const isValid = isNameValid && isEmailValid && isPasswordValid && isConfirmValid;

      if (!isValid) {
        // Focus first invalid field
        const firstInvalid = authForm.querySelector(".auth-group.is-invalid .auth-input");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Simulate Authentication API Call
      authSubmitBtn.classList.add("is-loading");

      setTimeout(() => {
        authSubmitBtn.classList.remove("is-loading");

        const userEmail = emailInput.value.trim();
        const userName = currentMode === "signup" ? nameInput.value.trim() : userEmail.split("@")[0];

        // Store active session in localStorage
        localStorage.setItem(
          "jadoo_user",
          JSON.stringify({
            name: userName,
            email: userEmail,
            loggedInAt: new Date().toISOString()
          })
        );

        if (currentMode === "signup") {
          showAlert(`Welcome aboard, ${userName}! Account created successfully. Redirecting...`, "success");
        } else {
          showAlert(`Welcome back, ${userName}! Redirecting to home...`, "success");
        }

        // Redirect back to main page after 1.5 seconds
        setTimeout(() => {
          window.location.href = "index.html";
        }, 1500);
      }, 900);
    });
  }

  // ------------------------------------------------------------------------
  // 8. Theme Toggle & Dark Mode Sync
  // ------------------------------------------------------------------------
  function updateLogo(isDark) {
    if (!logoImg) return;
    logoImg.src = isDark
      ? "assets/Images/navigation-section/Logo-dark.svg"
      : "assets/Images/navigation-section/Logo.svg";
  }

  function updateThemeIcon(isDark) {
    if (!themeToggleBtn) return;
    const icon = themeToggleBtn.querySelector("i");
    if (!icon) return;
    icon.className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
  }

  // Initialize theme from localStorage or OS preference
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isInitialDark = savedTheme === "dark" || (!savedTheme && prefersDark);

  if (isInitialDark) {
    document.body.classList.add("dark-mode");
    updateThemeIcon(true);
    updateLogo(true);
  } else {
    document.body.classList.remove("dark-mode");
    updateThemeIcon(false);
    updateLogo(false);
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const isDark = document.body.classList.toggle("dark-mode");
      localStorage.setItem("theme", isDark ? "dark" : "light");
      updateThemeIcon(isDark);
      updateLogo(isDark);
    });
  }
});
