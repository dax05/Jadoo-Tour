"use strict";
// Jadoo Travel - Auth Page Script (Login & Signup)
document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
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
    // Inputs
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirm-password");
    // Password strength elements
    const strengthContainer = document.getElementById("password-strength-container");
    const strengthStatus = document.getElementById("strength-status");
    const critLength = document.getElementById("crit-length");
    const critUpper = document.getElementById("crit-uppercase");
    const critLower = document.getElementById("crit-lowercase");
    const critNum = document.getElementById("crit-number");
    const critSpecial = document.getElementById("crit-special");
    // Theme elements
    const themeToggle = document.getElementById("theme-toggle");
    const logo = document.querySelector(".auth-logo");
    let currentMode = "login";
    // Mode switcher (login vs signup)
    function setMode(mode, updateUrl = true) {
        currentMode = mode;
        clearErrors();
        hideAlert();
        const isSignup = mode === "signup";
        tabLogin?.classList.toggle("active", !isSignup);
        tabLogin?.setAttribute("aria-selected", String(!isSignup));
        tabSignup?.classList.toggle("active", isSignup);
        tabSignup?.setAttribute("aria-selected", String(isSignup));
        authTabs?.classList.toggle("signup-active", isSignup);
        groupName?.classList.toggle("is-visible", isSignup);
        groupConfirm?.classList.toggle("is-visible", isSignup);
        if (isSignup) {
            if (authTitle)
                authTitle.textContent = "Start your journey";
            if (authSubtitle)
                authSubtitle.textContent = "Create an account to book your dream destinations";
            if (submitText)
                submitText.textContent = "Create Account";
            if (promptText)
                promptText.textContent = "Already have an account?";
            if (inlineSwitch)
                inlineSwitch.textContent = "Log In";
            if (authHelpers)
                authHelpers.style.display = "none";
            if (strengthContainer && passwordInput && passwordInput.value) {
                strengthContainer.classList.add("is-visible");
                checkPasswordStrength(passwordInput.value);
            }
        }
        else {
            if (authTitle)
                authTitle.textContent = "Welcome back!";
            if (authSubtitle)
                authSubtitle.textContent = "Log in to manage your bookings and explore the world";
            if (submitText)
                submitText.textContent = "Log In";
            if (promptText)
                promptText.textContent = "Don't have an account?";
            if (inlineSwitch)
                inlineSwitch.textContent = "Sign Up";
            if (authHelpers)
                authHelpers.style.display = "flex";
            strengthContainer?.classList.remove("is-visible");
        }
        if (updateUrl) {
            const url = new URL(window.location.href);
            url.searchParams.set("mode", mode);
            window.history.replaceState({}, "", url.toString());
        }
    }
    tabLogin?.addEventListener("click", () => setMode("login"));
    tabSignup?.addEventListener("click", () => setMode("signup"));
    inlineSwitch?.addEventListener("click", () => {
        setMode(currentMode === "login" ? "signup" : "login");
    });
    // Check URL query param on load
    const urlMode = new URLSearchParams(window.location.search).get("mode");
    setMode(urlMode === "signup" ? "signup" : "login", false);
    // Field validation helpers
    function setError(input, errorId, message) {
        if (!input)
            return false;
        const group = input.closest(".auth-group");
        const errorEl = document.getElementById(errorId);
        group?.classList.add("is-invalid");
        group?.classList.remove("is-valid");
        if (errorEl)
            errorEl.textContent = message;
        return false;
    }
    function setValid(input, errorId) {
        if (!input)
            return true;
        const group = input.closest(".auth-group");
        const errorEl = document.getElementById(errorId);
        group?.classList.remove("is-invalid");
        group?.classList.add("is-valid");
        if (errorEl)
            errorEl.textContent = "";
        return true;
    }
    function clearErrors() {
        [nameInput, emailInput, passwordInput, confirmPasswordInput].forEach((input) => {
            input?.closest(".auth-group")?.classList.remove("is-invalid", "is-valid");
        });
        ["name-error", "email-error", "password-error", "confirm-error"].forEach((id) => {
            const el = document.getElementById(id);
            if (el)
                el.textContent = "";
        });
    }
    // Validators
    function validateName() {
        if (currentMode !== "signup" || !nameInput)
            return true;
        const value = nameInput.value.trim();
        if (!value)
            return setError(nameInput, "name-error", "Please enter your full name");
        if (value.length < 2)
            return setError(nameInput, "name-error", "Name must be at least 2 characters");
        if (!/^[a-zA-Z\s'-]+$/.test(value))
            return setError(nameInput, "name-error", "Name can only contain letters");
        return setValid(nameInput, "name-error");
    }
    function validateEmail() {
        if (!emailInput)
            return false;
        const value = emailInput.value.trim();
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value)
            return setError(emailInput, "email-error", "Email is required");
        if (!regex.test(value))
            return setError(emailInput, "email-error", "Please enter a valid email address");
        return setValid(emailInput, "email-error");
    }
    // Password strength engine
    function checkPasswordStrength(password) {
        const checks = {
            length: password.length >= 8,
            upper: /[A-Z]/.test(password),
            lower: /[a-z]/.test(password),
            num: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };
        function updateCriterion(el, passed) {
            if (!el)
                return;
            el.classList.toggle("met", passed);
            const icon = el.querySelector("i");
            if (icon) {
                icon.className = passed
                    ? "fa-solid fa-circle-check crit-icon"
                    : "fa-solid fa-circle-xmark crit-icon";
            }
        }
        updateCriterion(critLength, checks.length);
        updateCriterion(critUpper, checks.upper);
        updateCriterion(critLower, checks.lower);
        updateCriterion(critNum, checks.num);
        updateCriterion(critSpecial, checks.special);
        const passedCount = Object.values(checks).filter(Boolean).length;
        if (!password) {
            strengthContainer?.removeAttribute("data-level");
            if (strengthStatus)
                strengthStatus.textContent = "Too weak";
            return 0;
        }
        let level = "weak";
        let text = "Weak";
        if (checks.length) {
            if (passedCount >= 5) {
                level = "strong";
                text = "Strong password";
            }
            else if (passedCount >= 4) {
                level = "good";
                text = "Good";
            }
            else if (passedCount >= 3) {
                level = "fair";
                text = "Fair";
            }
        }
        else {
            text = "Too short (min 8 chars)";
        }
        strengthContainer?.setAttribute("data-level", level);
        if (strengthStatus)
            strengthStatus.textContent = text;
        return passedCount;
    }
    function validatePassword() {
        if (!passwordInput)
            return false;
        const value = passwordInput.value;
        if (!value)
            return setError(passwordInput, "password-error", "Password is required");
        if (currentMode === "signup") {
            const passed = checkPasswordStrength(value);
            if (value.length < 8) {
                return setError(passwordInput, "password-error", "Password must be at least 8 characters");
            }
            if (passed < 4) {
                return setError(passwordInput, "password-error", "Must meet at least 4 security criteria above");
            }
        }
        else {
            if (value.length < 6) {
                return setError(passwordInput, "password-error", "Password must be at least 6 characters");
            }
        }
        return setValid(passwordInput, "password-error");
    }
    function validateConfirmPassword() {
        if (currentMode !== "signup" || !confirmPasswordInput || !passwordInput)
            return true;
        const value = confirmPasswordInput.value;
        if (!value)
            return setError(confirmPasswordInput, "confirm-error", "Please confirm your password");
        if (value !== passwordInput.value)
            return setError(confirmPasswordInput, "confirm-error", "Passwords do not match");
        return setValid(confirmPasswordInput, "confirm-error");
    }
    // Live validation listeners
    nameInput?.addEventListener("blur", validateName);
    nameInput?.addEventListener("input", () => {
        if (nameInput.closest(".auth-group")?.classList.contains("is-invalid"))
            validateName();
    });
    emailInput?.addEventListener("blur", validateEmail);
    emailInput?.addEventListener("input", () => {
        if (emailInput.closest(".auth-group")?.classList.contains("is-invalid"))
            validateEmail();
    });
    passwordInput?.addEventListener("focus", () => {
        if (currentMode === "signup" && strengthContainer) {
            strengthContainer.classList.add("is-visible");
            checkPasswordStrength(passwordInput.value);
        }
    });
    passwordInput?.addEventListener("input", () => {
        if (currentMode === "signup") {
            strengthContainer?.classList.add("is-visible");
            checkPasswordStrength(passwordInput.value);
        }
        if (passwordInput.closest(".auth-group")?.classList.contains("is-invalid")) {
            validatePassword();
        }
        if (currentMode === "signup" && confirmPasswordInput?.value) {
            validateConfirmPassword();
        }
    });
    passwordInput?.addEventListener("blur", validatePassword);
    confirmPasswordInput?.addEventListener("input", () => {
        if (confirmPasswordInput.closest(".auth-group")?.classList.contains("is-invalid") || confirmPasswordInput.value) {
            validateConfirmPassword();
        }
    });
    confirmPasswordInput?.addEventListener("blur", validateConfirmPassword);
    // Eye toggles for passwords
    function setupEyeToggle(btnId, input) {
        const btn = document.getElementById(btnId);
        btn?.addEventListener("click", () => {
            if (!input)
                return;
            const isPass = input.type === "password";
            input.type = isPass ? "text" : "password";
            const icon = btn.querySelector("i");
            if (icon)
                icon.className = isPass ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
        });
    }
    setupEyeToggle("toggle-password", passwordInput);
    setupEyeToggle("toggle-confirm", confirmPasswordInput);
    // Alerts
    function showAlert(msg, type = "success") {
        if (!authAlert || !alertText)
            return;
        alertText.textContent = msg;
        authAlert.className = `auth-alert is-visible ${type}`;
        const icon = authAlert.querySelector("i");
        if (icon) {
            icon.className = type === "success" ? "fa-solid fa-circle-check alert-icon" : "fa-solid fa-circle-exclamation alert-icon";
        }
    }
    function hideAlert() {
        if (authAlert)
            authAlert.className = "auth-alert";
    }
    // LocalStorage accounts
    function getUsers() {
        try {
            const data = localStorage.getItem("jadoo_users");
            return data ? JSON.parse(data) : [];
        }
        catch {
            return [];
        }
    }
    function saveUser(user) {
        const users = getUsers();
        users.push(user);
        localStorage.setItem("jadoo_users", JSON.stringify(users));
    }
    // Form submit
    authForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        const isNameOk = validateName();
        const isEmailOk = validateEmail();
        const isPassOk = validatePassword();
        const isConfirmOk = validateConfirmPassword();
        if (!isNameOk || !isEmailOk || !isPassOk || !isConfirmOk) {
            authForm.querySelector(".auth-group.is-invalid .auth-input")?.focus();
            return;
        }
        if (!emailInput || !passwordInput || !authSubmitBtn)
            return;
        authSubmitBtn.classList.add("is-loading");
        setTimeout(() => {
            const email = emailInput.value.trim().toLowerCase();
            const users = getUsers();
            if (currentMode === "signup") {
                const name = nameInput?.value.trim() || "";
                const password = passwordInput.value;
                const exists = users.some((u) => u.email.toLowerCase() === email);
                if (exists) {
                    authSubmitBtn.classList.remove("is-loading");
                    setError(emailInput, "email-error", "An account with this email already exists.");
                    showAlert("An account with this email already exists. Please log in.", "error");
                    return;
                }
                saveUser({ name, email, password, registeredAt: new Date().toISOString() });
                const session = { name, email, loggedInAt: new Date().toISOString() };
                localStorage.setItem("jadoo_user", JSON.stringify(session));
                authSubmitBtn.classList.remove("is-loading");
                showAlert(`Welcome aboard, ${name}! Redirecting...`, "success");
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1200);
            }
            else {
                // Login mode
                const password = passwordInput.value;
                const found = users.find((u) => u.email.toLowerCase() === email);
                if (found) {
                    if (found.password !== password) {
                        authSubmitBtn.classList.remove("is-loading");
                        setError(passwordInput, "password-error", "Incorrect password. Please try again.");
                        showAlert("Incorrect password.", "error");
                        return;
                    }
                    const session = { name: found.name, email, loggedInAt: new Date().toISOString() };
                    localStorage.setItem("jadoo_user", JSON.stringify(session));
                    authSubmitBtn.classList.remove("is-loading");
                    showAlert(`Welcome back, ${found.name}! Redirecting...`, "success");
                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 1200);
                }
                else {
                    // New guest instant login fallback
                    const raw = email.split("@")[0].replace(/[._-]/g, " ");
                    const name = raw.charAt(0).toUpperCase() + raw.slice(1);
                    saveUser({ name, email, password, registeredAt: new Date().toISOString() });
                    const session = { name, email, loggedInAt: new Date().toISOString() };
                    localStorage.setItem("jadoo_user", JSON.stringify(session));
                    authSubmitBtn.classList.remove("is-loading");
                    showAlert(`Welcome, ${name}! Redirecting...`, "success");
                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 1200);
                }
            }
        }, 600);
    });
    // Dark mode
    function updateTheme(isDark) {
        document.body.classList.toggle("dark-mode", isDark);
        const icon = themeToggle?.querySelector("i");
        if (icon)
            icon.className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
        if (logo) {
            logo.src = isDark ? "assets/Images/navigation-section/Logo-dark.svg" : "assets/Images/navigation-section/Logo.svg";
        }
    }
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    updateTheme(savedTheme === "dark" || (!savedTheme && prefersDark));
    themeToggle?.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark-mode");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        updateTheme(isDark);
    });
});
