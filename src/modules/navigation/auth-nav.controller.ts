import { authService } from '../../services/auth.service';
import { UserSession } from '../../types/auth.types';

/**
 * Auth Navigation Controller
 * Manages the UI state of guest vs authenticated user in the main navbar.
 */
export class AuthNavController {
  private guestItems: NodeListOf<HTMLElement>;
  private userItems: NodeListOf<HTMLElement>;
  private userNameEl: HTMLElement | null;
  private userAvatarEl: HTMLElement | null;
  private logoutBtn: HTMLElement | null;

  constructor() {
    this.guestItems = document.querySelectorAll<HTMLElement>('.auth-guest-item');
    this.userItems = document.querySelectorAll<HTMLElement>('.auth-user-item');
    this.userNameEl = document.getElementById('nav-user-name');
    this.userAvatarEl = document.getElementById('nav-user-avatar');
    this.logoutBtn = document.getElementById('nav-logout-btn');

    this.init();
  }

  private init(): void {
    // Bind logout button
    this.logoutBtn?.addEventListener('click', () => {
      authService.logout();
    });

    // Reactive subscription to auth state changes
    authService.subscribe((session) => {
      this.render(session);
    });
  }

  private render(session: UserSession | null): void {
    if (session) {
      const displayName = session.name || session.email.split('@')[0] || 'Traveler';
      const initial = displayName.charAt(0).toUpperCase();

      if (this.userNameEl) {
        this.userNameEl.textContent = `Hi, ${displayName}`;
      }

      if (this.userAvatarEl) {
        this.userAvatarEl.textContent = initial;
      }

      this.guestItems.forEach((el) => {
        el.style.display = 'none';
      });

      this.userItems.forEach((el) => {
        el.style.display = el.tagName === 'BUTTON' ? 'inline-flex' : '';
      });
    } else {
      this.guestItems.forEach((el) => {
        el.style.display = '';
      });

      this.userItems.forEach((el) => {
        el.style.display = 'none';
      });
    }
  }
}
