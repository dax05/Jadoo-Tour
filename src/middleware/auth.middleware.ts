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
   * Wrap an action function with authentication check
   */
  public static guardAction<T>(actionFn: () => T, options: AuthGuardOptions = {}): T | null {
    if (!this.requireAuth(options)) {
      return null;
    }
    return actionFn();
  }

  /**
   * Display the Authentication Required Modal
   */
  public static showAuthRequiredModal(options: AuthGuardOptions = {}): void {
    let modal = document.getElementById('auth-required-modal');

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

    // Auto-focus the login button
    setTimeout(() => loginLink?.focus(), 50);
  }

  /**
   * Hide the Authentication Required Modal
   */
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
   * Create the DOM structure for the Auth Required Modal if not present
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

    // Bind event listeners
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
