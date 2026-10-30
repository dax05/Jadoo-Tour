import { UI_CONFIG } from '../../constants/config';

/**
 * Navbar UI Controller
 * Manages sticky scroll state, mobile drawer, backdrop, and keyboard accessibility.
 */
export class NavbarController {
  private navbar: HTMLElement | null;
  private burgerMenu: HTMLElement | null;
  private navDrawer: HTMLElement | null;
  private closeDrawerBtn: HTMLElement | null;
  private navBackdrop: HTMLElement | null;
  private navLinks: NodeListOf<HTMLAnchorElement>;
  private isTicking = false;

  constructor() {
    this.navbar = document.getElementById('navibar');
    this.burgerMenu = document.getElementById('burger-menu');
    this.navDrawer = document.getElementById('nav-drawer');
    this.closeDrawerBtn = document.getElementById('close-drawer');
    this.navBackdrop = document.getElementById('nav-backdrop');
    this.navLinks = document.querySelectorAll<HTMLAnchorElement>('.links');

    this.init();
  }

  private init(): void {
    this.initStickyScroll();
    this.initDrawerEvents();
  }

  private initStickyScroll(): void {
    if (!this.navbar) return;

    window.addEventListener('scroll', () => {
      if (!this.isTicking) {
        window.requestAnimationFrame(() => {
          if (this.navbar) {
            const isScrolled = window.scrollY >= UI_CONFIG.NAVBAR_SCROLL_THRESHOLD_PX;
            this.navbar.classList.toggle('scrolled', isScrolled);
          }
          this.isTicking = false;
        });
        this.isTicking = true;
      }
    }, { passive: true });
  }

  private initDrawerEvents(): void {
    this.burgerMenu?.addEventListener('click', () => this.toggleDrawer());
    this.closeDrawerBtn?.addEventListener('click', () => this.closeDrawer());
    this.navBackdrop?.addEventListener('click', () => this.closeDrawer());

    this.navLinks.forEach((link) => {
      link.addEventListener('click', () => this.closeDrawer());
    });

    // Close on Escape key press
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isDrawerOpen()) {
        this.closeDrawer();
      }
    });
  }

  public isDrawerOpen(): boolean {
    return this.navDrawer?.classList.contains('is-active') ?? false;
  }

  public openDrawer(): void {
    this.burgerMenu?.classList.add('is-active');
    this.burgerMenu?.setAttribute('aria-expanded', 'true');
    this.navDrawer?.classList.add('is-active');
    this.navBackdrop?.classList.add('is-active');
    document.body.classList.add('overflow-hidden');
  }

  public closeDrawer(): void {
    this.burgerMenu?.classList.remove('is-active');
    this.burgerMenu?.setAttribute('aria-expanded', 'false');
    this.navDrawer?.classList.remove('is-active');
    this.navBackdrop?.classList.remove('is-active');
    document.body.classList.remove('overflow-hidden');
  }

  public toggleDrawer(): void {
    if (this.isDrawerOpen()) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  }
}
