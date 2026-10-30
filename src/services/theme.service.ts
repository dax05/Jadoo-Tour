import { ASSET_PATHS } from '../constants/config';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { ThemeChangeListener, ThemeMode } from '../types/theme.types';
import { StorageService } from './storage.service';

/**
 * Centralized Reactive Theme Management Service
 */
export class ThemeService {
  private static instance: ThemeService | null = null;
  private currentMode: ThemeMode = 'light';
  private listeners: Set<ThemeChangeListener> = new Set();
  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  private constructor() {
    this.init();
  }

  public static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  private init(): void {
    const saved = StorageService.getString(STORAGE_KEYS.THEME, '');
    if (saved === 'dark' || saved === 'light') {
      this.currentMode = saved;
    } else {
      this.currentMode = this.mediaQuery.matches ? 'dark' : 'light';
    }

    this.applyTheme(this.currentMode, false);

    // Listen for OS scheme adjustments when no explicit storage exists
    this.mediaQuery.addEventListener('change', (e) => {
      const explicit = StorageService.getString(STORAGE_KEYS.THEME, '');
      if (!explicit) {
        this.setTheme(e.matches ? 'dark' : 'light', false);
      }
    });
  }

  public isDark(): boolean {
    return this.currentMode === 'dark';
  }

  public getTheme(): ThemeMode {
    return this.currentMode;
  }

  public toggle(): ThemeMode {
    const next = this.currentMode === 'dark' ? 'light' : 'dark';
    this.setTheme(next, true);
    return next;
  }

  public setTheme(mode: ThemeMode, persist = true): void {
    this.currentMode = mode;
    if (persist) {
      StorageService.setItem(STORAGE_KEYS.THEME, mode);
    }
    this.applyTheme(mode);
  }

  public subscribe(listener: ThemeChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.isDark(), this.currentMode);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private applyTheme(mode: ThemeMode, notify = true): void {
    const isDarkMode = mode === 'dark';

    // 1. Toggle class on body
    document.body.classList.toggle('dark-mode', isDarkMode);

    // 2. Update all toggle button icons
    const toggleButtons = document.querySelectorAll('.theme-toggle');
    toggleButtons.forEach((btn) => {
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = isDarkMode ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      }
      btn.setAttribute('aria-label', isDarkMode ? 'Switch to light mode' : 'Switch to dark mode');
    });

    // 3. Update all logo images
    const logoSrc = isDarkMode ? ASSET_PATHS.LOGO_DARK : ASSET_PATHS.LOGO_LIGHT;
    const logos = document.querySelectorAll<HTMLImageElement>('.Top-Logo, .auth-logo, .profile-logo-img');
    logos.forEach((img) => {
      if (!img.src.endsWith(logoSrc)) {
        img.src = logoSrc;
      }
    });

    // 4. Notify subscribers
    if (notify) {
      this.listeners.forEach((listener) => listener(isDarkMode, mode));
    }
  }

  public refreshTheme(): void {
    this.applyTheme(this.currentMode, true);
  }

  public bindToggleButtons(selector = '.theme-toggle'): void {
    const buttons = document.querySelectorAll<HTMLElement>(selector);
    buttons.forEach((btn) => {
      if (!btn.dataset.themeBound) {
        btn.dataset.themeBound = 'true';
        btn.addEventListener('click', () => this.toggle());
      }
    });

    // Synchronize DOM elements (logos, body class, toggle icons) upon binding
    this.applyTheme(this.currentMode, false);
  }
}

export const themeService = ThemeService.getInstance();
