import { UI_CONFIG } from '../../constants/config';
import { authService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';
import { AuthMode } from '../../types/auth.types';
import { FormValidator } from './form-validator';
import { PasswordValidator } from './password-validator';

/**
 * Auth Form UI Controller
 * Orchestrates login/signup interactions, validation feedback, password strength, and submissions.
 */
export class AuthFormController {
  private form: HTMLFormElement | null;
  private mode: AuthMode = 'login';

  // Headings & Text
  private titleEl: HTMLElement | null;
  private subtitleEl: HTMLElement | null;
  private submitTextEl: HTMLElement | null;
  private promptTextEl: HTMLElement | null;
  private inlineSwitchBtn: HTMLElement | null;

  // Tabs & Groups
  private tabsContainer: HTMLElement | null;
  private tabLoginBtn: HTMLElement | null;
  private tabSignupBtn: HTMLElement | null;
  private nameGroup: HTMLElement | null;
  private confirmGroup: HTMLElement | null;
  private helpersRow: HTMLElement | null;
  private submitBtn: HTMLButtonElement | null;

  // Inputs
  private nameInput: HTMLInputElement | null;
  private emailInput: HTMLInputElement | null;
  private passwordInput: HTMLInputElement | null;
  private confirmPasswordInput: HTMLInputElement | null;

  // Strength Meter
  private strengthContainer: HTMLElement | null;
  private strengthStatus: HTMLElement | null;
  private critLength: HTMLElement | null;
  private critUpper: HTMLElement | null;
  private critLower: HTMLElement | null;
  private critNum: HTMLElement | null;
  private critSpecial: HTMLElement | null;

  // Feedback Alert
  private alertEl: HTMLElement | null;
  private alertTextEl: HTMLElement | null;

  constructor() {
    this.form = document.getElementById('auth-form') as HTMLFormElement | null;
    this.titleEl = document.getElementById('auth-title');
    this.subtitleEl = document.getElementById('auth-subtitle');
    this.submitTextEl = document.getElementById('submit-text');
    this.promptTextEl = document.getElementById('prompt-text');
    this.inlineSwitchBtn = document.getElementById('auth-inline-switch');

    this.tabsContainer = document.querySelector('.auth-tabs');
    this.tabLoginBtn = document.getElementById('tab-login');
    this.tabSignupBtn = document.getElementById('tab-signup');
    this.nameGroup = document.getElementById('group-name');
    this.confirmGroup = document.getElementById('group-confirm');
    this.helpersRow = document.getElementById('auth-helpers');
    this.submitBtn = document.getElementById('auth-submit-btn') as HTMLButtonElement | null;

    this.nameInput = document.getElementById('name') as HTMLInputElement | null;
    this.emailInput = document.getElementById('email') as HTMLInputElement | null;
    this.passwordInput = document.getElementById('password') as HTMLInputElement | null;
    this.confirmPasswordInput = document.getElementById('confirm-password') as HTMLInputElement | null;

    this.strengthContainer = document.getElementById('password-strength-container');
    this.strengthStatus = document.getElementById('strength-status');
    this.critLength = document.getElementById('crit-length');
    this.critUpper = document.getElementById('crit-uppercase');
    this.critLower = document.getElementById('crit-lowercase');
    this.critNum = document.getElementById('crit-number');
    this.critSpecial = document.getElementById('crit-special');

    this.alertEl = document.getElementById('auth-alert');
    this.alertTextEl = document.getElementById('alert-text');

    this.init();
  }

  private init(): void {
    if (!this.form) return;

    this.bindTabEvents();
    this.bindValidationEvents();
    this.bindEyeToggles();
    this.bindHelperEvents();
    this.bindSubmitEvent();

    // Init mode from query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const initialMode: AuthMode = urlParams.get('mode') === 'signup' ? 'signup' : 'login';
    this.setMode(initialMode, false);

    // Sync back button to returnUrl if provided
    this.syncBackButton();
  }

  private getReturnUrl(): string {
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get('returnUrl') || urlParams.get('redirect') || urlParams.get('next');
    if (!returnUrl) return 'index.html';

    try {
      const decoded = decodeURIComponent(returnUrl);
      // Disallow external domains/protocols to prevent open redirect vulnerabilities
      if (/^(?:[a-z]+:)?\/\//i.test(decoded) || decoded.startsWith('javascript:')) {
        return 'index.html';
      }
      return decoded;
    } catch {
      return 'index.html';
    }
  }

  private syncBackButton(): void {
    const backBtn = document.getElementById('auth-back-btn') as HTMLAnchorElement | null;
    const targetUrl = this.getReturnUrl();
    if (backBtn && targetUrl !== 'index.html') {
      backBtn.href = targetUrl;
      const backSpan = backBtn.querySelector('span');
      if (backSpan) {
        backSpan.textContent = targetUrl.includes('profile') ? 'Back to Profile' : 'Back';
      }
    }
  }

  public setMode(mode: AuthMode, updateUrl = true): void {
    this.mode = mode;
    this.clearAllErrors();
    this.hideAlert();

    const isSignup = mode === 'signup';

    this.tabLoginBtn?.classList.toggle('active', !isSignup);
    this.tabLoginBtn?.setAttribute('aria-selected', String(!isSignup));
    this.tabSignupBtn?.classList.toggle('active', isSignup);
    this.tabSignupBtn?.setAttribute('aria-selected', String(isSignup));
    this.tabsContainer?.classList.toggle('signup-active', isSignup);

    this.nameGroup?.classList.toggle('is-visible', isSignup);
    this.confirmGroup?.classList.toggle('is-visible', isSignup);

    if (isSignup) {
      if (this.titleEl) this.titleEl.textContent = 'Start your journey';
      if (this.subtitleEl) this.subtitleEl.textContent = 'Create an account to book your dream destinations';
      if (this.submitTextEl) this.submitTextEl.textContent = 'Create Account';
      if (this.promptTextEl) this.promptTextEl.textContent = 'Already have an account?';
      if (this.inlineSwitchBtn) this.inlineSwitchBtn.textContent = 'Log In';
      if (this.helpersRow) this.helpersRow.style.display = 'none';
      const demoHint = document.getElementById('auth-demo-hint');
      if (demoHint) demoHint.style.display = 'none';

      if (this.passwordInput?.value) {
        this.strengthContainer?.classList.add('is-visible');
        this.renderPasswordStrength(this.passwordInput.value);
      }
    } else {
      if (this.titleEl) this.titleEl.textContent = 'Welcome back!';
      if (this.subtitleEl) this.subtitleEl.textContent = 'Log in to manage your bookings and explore the world';
      if (this.submitTextEl) this.submitTextEl.textContent = 'Log In';
      if (this.promptTextEl) this.promptTextEl.textContent = "Don't have an account?";
      if (this.inlineSwitchBtn) this.inlineSwitchBtn.textContent = 'Sign Up';
      if (this.helpersRow) this.helpersRow.style.display = 'flex';
      const demoHint = document.getElementById('auth-demo-hint');
      if (demoHint) demoHint.style.display = 'flex';
      this.strengthContainer?.classList.remove('is-visible');
    }

    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', mode);
      window.history.replaceState({}, '', url.toString());
    }
  }

  private bindTabEvents(): void {
    this.tabLoginBtn?.addEventListener('click', () => this.setMode('login'));
    this.tabSignupBtn?.addEventListener('click', () => this.setMode('signup'));
    this.inlineSwitchBtn?.addEventListener('click', () => {
      this.setMode(this.mode === 'login' ? 'signup' : 'login');
    });
  }

  private bindValidationEvents(): void {
    this.nameInput?.addEventListener('blur', () => this.validateNameField());
    this.nameInput?.addEventListener('input', () => {
      if (this.isFieldInvalid(this.nameInput)) this.validateNameField();
    });

    this.emailInput?.addEventListener('blur', () => this.validateEmailField());
    this.emailInput?.addEventListener('input', () => {
      if (this.isFieldInvalid(this.emailInput)) this.validateEmailField();
    });

    this.passwordInput?.addEventListener('focus', () => {
      if (this.mode === 'signup') {
        this.strengthContainer?.classList.add('is-visible');
        this.renderPasswordStrength(this.passwordInput?.value || '');
      }
    });

    this.passwordInput?.addEventListener('input', () => {
      const val = this.passwordInput?.value || '';
      if (this.mode === 'signup') {
        this.strengthContainer?.classList.add('is-visible');
        this.renderPasswordStrength(val);
        if (this.confirmPasswordInput?.value) {
          this.validateConfirmPasswordField();
        }
      }
      if (this.isFieldInvalid(this.passwordInput)) {
        this.validatePasswordField();
      }
    });

    this.passwordInput?.addEventListener('blur', () => this.validatePasswordField());

    this.confirmPasswordInput?.addEventListener('input', () => {
      if (this.confirmPasswordInput && (this.isFieldInvalid(this.confirmPasswordInput) || this.confirmPasswordInput.value)) {
        this.validateConfirmPasswordField();
      }
    });
    this.confirmPasswordInput?.addEventListener('blur', () => this.validateConfirmPasswordField());
  }

  private validateNameField(): boolean {
    if (this.mode !== 'signup' || !this.nameInput) return true;
    const res = FormValidator.validateName(this.nameInput.value);
    return this.applyFieldStatus(this.nameInput, 'name-error', res.isValid, res.message);
  }

  private validateEmailField(): boolean {
    if (!this.emailInput) return false;
    const res = FormValidator.validateEmail(this.emailInput.value);
    return this.applyFieldStatus(this.emailInput, 'email-error', res.isValid, res.message);
  }

  private validatePasswordField(): boolean {
    if (!this.passwordInput) return false;
    const res = FormValidator.validatePassword(this.passwordInput.value, this.mode);
    return this.applyFieldStatus(this.passwordInput, 'password-error', res.isValid, res.message);
  }

  private validateConfirmPasswordField(): boolean {
    if (this.mode !== 'signup' || !this.confirmPasswordInput || !this.passwordInput) return true;
    const res = FormValidator.validateConfirmPassword(this.passwordInput.value, this.confirmPasswordInput.value);
    return this.applyFieldStatus(this.confirmPasswordInput, 'confirm-error', res.isValid, res.message);
  }

  private applyFieldStatus(input: HTMLInputElement, errorId: string, isValid: boolean, message = ''): boolean {
    const group = input.closest('.auth-group');
    const errorEl = document.getElementById(errorId);

    if (isValid) {
      group?.classList.remove('is-invalid');
      group?.classList.add('is-valid');
      if (errorEl) errorEl.textContent = '';
      return true;
    } else {
      group?.classList.add('is-invalid');
      group?.classList.remove('is-valid');
      if (errorEl) errorEl.textContent = message;
      return false;
    }
  }

  private isFieldInvalid(input: HTMLInputElement | null): boolean {
    return input?.closest('.auth-group')?.classList.contains('is-invalid') ?? false;
  }

  private clearAllErrors(): void {
    [this.nameInput, this.emailInput, this.passwordInput, this.confirmPasswordInput].forEach((input) => {
      input?.closest('.auth-group')?.classList.remove('is-invalid', 'is-valid');
    });
    ['name-error', 'email-error', 'password-error', 'confirm-error'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  }

  private renderPasswordStrength(password: string): void {
    const report = PasswordValidator.evaluate(password);

    this.updateCriterionElement(this.critLength, report.criteria.length);
    this.updateCriterionElement(this.critUpper, report.criteria.uppercase);
    this.updateCriterionElement(this.critLower, report.criteria.lowercase);
    this.updateCriterionElement(this.critNum, report.criteria.number);
    this.updateCriterionElement(this.critSpecial, report.criteria.special);

    if (!password) {
      this.strengthContainer?.removeAttribute('data-level');
      if (this.strengthStatus) this.strengthStatus.textContent = 'Too weak';
      return;
    }

    this.strengthContainer?.setAttribute('data-level', report.level);
    if (this.strengthStatus) this.strengthStatus.textContent = report.label;
  }

  private updateCriterionElement(el: HTMLElement | null, met: boolean): void {
    if (!el) return;
    el.classList.toggle('met', met);
    const icon = el.querySelector('i');
    if (icon) {
      icon.className = met ? 'fa-solid fa-circle-check crit-icon' : 'fa-solid fa-circle-xmark crit-icon';
    }
  }

  private bindEyeToggles(): void {
    this.setupEyeButton('toggle-password', this.passwordInput);
    this.setupEyeButton('toggle-confirm', this.confirmPasswordInput);
  }

  private setupEyeButton(btnId: string, input: HTMLInputElement | null): void {
    const btn = document.getElementById(btnId);
    btn?.addEventListener('click', () => {
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = isPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
      }
    });
  }

  public showAlert(message: string, type: 'success' | 'error' = 'success'): void {
    if (!this.alertEl || !this.alertTextEl) return;
    this.alertTextEl.textContent = message;
    this.alertEl.className = `auth-alert is-visible ${type}`;
    const icon = this.alertEl.querySelector('i');
    if (icon) {
      icon.className = type === 'success' ? 'fa-solid fa-circle-check alert-icon' : 'fa-solid fa-circle-exclamation alert-icon';
    }
  }

  public hideAlert(): void {
    if (this.alertEl) {
      this.alertEl.className = 'auth-alert';
    }
  }

  private bindSubmitEvent(): void {
    this.form?.addEventListener('submit', (e: Event) => {
      e.preventDefault();

      const isNameValid = this.validateNameField();
      const isEmailValid = this.validateEmailField();
      const isPasswordValid = this.validatePasswordField();
      const isConfirmValid = this.validateConfirmPasswordField();

      if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmValid) {
        this.form?.querySelector<HTMLInputElement>('.auth-group.is-invalid .auth-input')?.focus();
        return;
      }

      if (!this.emailInput || !this.passwordInput || !this.submitBtn) return;

      this.submitBtn.classList.add('is-loading');
      this.submitBtn.disabled = true;

      // Network round-trip with live backend / offline fallback
      setTimeout(async () => {
        const email = this.emailInput?.value || '';
        const password = this.passwordInput?.value || '';

        try {
          if (this.mode === 'signup') {
            const name = this.nameInput?.value || '';
            const result = await authService.register(name, email, password);

            this.submitBtn?.classList.remove('is-loading');
            if (this.submitBtn) this.submitBtn.disabled = false;

            if (!result.success) {
              this.applyFieldStatus(this.emailInput!, 'email-error', false, result.error || 'Registration failed');
              this.showAlert(result.error || 'Registration failed', 'error');
              return;
            }

            const targetUrl = this.getReturnUrl();
            const targetName = targetUrl.includes('profile') ? 'your profile' : targetUrl.includes('bookings') ? 'your bookings' : 'home';
            this.showAlert(`Welcome aboard, ${result.user?.name}! Redirecting to ${targetName}...`, 'success');
            setTimeout(() => {
              window.location.href = targetUrl;
            }, UI_CONFIG.AUTH_REDIRECT_DELAY_MS);
          } else {
            const result = await authService.login(email, password);

            this.submitBtn?.classList.remove('is-loading');
            if (this.submitBtn) this.submitBtn.disabled = false;

            if (!result.success) {
              this.applyFieldStatus(this.passwordInput!, 'password-error', false, result.error || 'Login failed');
              this.showAlert(result.error || 'Login failed', 'error');
              return;
            }

            // Remember me handling
            const rememberCheckbox = document.getElementById('remember-me') as HTMLInputElement | null;
            if (rememberCheckbox?.checked) {
              StorageService.setItem('jadoo_remembered_email', email);
            } else {
              StorageService.removeItem('jadoo_remembered_email');
            }

            const targetUrl = this.getReturnUrl();
            const targetName = targetUrl.includes('profile') ? 'your profile' : targetUrl.includes('bookings') ? 'your bookings' : 'home';
            this.showAlert(`Welcome back, ${result.user?.name}! Redirecting to ${targetName}...`, 'success');
            setTimeout(() => {
              window.location.href = targetUrl;
            }, UI_CONFIG.AUTH_REDIRECT_DELAY_MS);
          }
        } catch (err: unknown) {
          this.submitBtn?.classList.remove('is-loading');
          if (this.submitBtn) this.submitBtn.disabled = false;
          const msg = err instanceof Error ? err.message : 'Authentication failed';
          this.showAlert(msg, 'error');
        }
      }, UI_CONFIG.FORM_SUBMIT_SIMULATED_LATENCY_MS);
    });
  }

  private bindHelperEvents(): void {
    // Forgot password handler with real-time email validation
    const forgotLink = document.getElementById('auth-forgot-link');
    forgotLink?.addEventListener('click', (e) => {
      e.preventDefault();
      const email = this.emailInput?.value.trim() || '';
      if (!email) {
        this.applyFieldStatus(this.emailInput!, 'email-error', false, 'Please enter your registered email address to receive reset instructions.');
        this.showAlert('Please enter your email address above to receive reset instructions.', 'error');
        this.emailInput?.focus();
        return;
      }
      const emailRes = FormValidator.validateEmail(email);
      if (!emailRes.isValid) {
        const errorMsg = emailRes.message || 'Please enter a valid email address.';
        this.applyFieldStatus(this.emailInput!, 'email-error', false, errorMsg);
        this.showAlert(errorMsg, 'error');
        this.emailInput?.focus();
        return;
      }

      this.clearAllErrors();
      this.showAlert(`Password reset link sent to ${email} (demo preview).`, 'success');
    });

    // Demo account autofill button
    const demoFillBtn = document.getElementById('btn-demo-fill');
    demoFillBtn?.addEventListener('click', () => {
      if (this.mode === 'signup') {
        this.setMode('login');
      }
      if (this.emailInput) this.emailInput.value = 'sarah.jenkins@example.com';
      if (this.passwordInput) this.passwordInput.value = 'Password123!';
      this.validateEmailField();
      this.validatePasswordField();
      this.showAlert('Demo credentials filled! Click Log In to continue.', 'success');
    });

    // Social login buttons
    const socialButtons = document.querySelectorAll('.auth-social-btn');
    socialButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.showAlert('Social login is a demo preview. Please sign in with email & password.', 'error');
      });
    });

    // Pre-fill remembered email
    const rememberCheckbox = document.getElementById('remember-me') as HTMLInputElement | null;
    const savedEmail = StorageService.getString('jadoo_remembered_email', '');
    if (savedEmail && this.emailInput && rememberCheckbox) {
      this.emailInput.value = savedEmail;
      rememberCheckbox.checked = true;
    }
  }
}
