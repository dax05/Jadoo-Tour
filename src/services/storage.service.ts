/**
 * Safe, strongly typed local storage wrapper service
 */

export class StorageService {
  private static isAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  public static getItem<T>(key: string, fallback: T): T {
    if (!this.isAvailable()) return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  public static getString(key: string, fallback = ''): string {
    if (!this.isAvailable()) return fallback;
    try {
      const val = window.localStorage.getItem(key);
      return val !== null ? val : fallback;
    } catch {
      return fallback;
    }
  }

  public static setItem<T>(key: string, value: T): boolean {
    if (!this.isAvailable()) return false;
    try {
      const payload = typeof value === 'string' ? value : JSON.stringify(value);
      window.localStorage.setItem(key, payload);
      return true;
    } catch (err) {
      console.warn(`[StorageService] Failed to set item "${key}":`, err);
      return false;
    }
  }

  public static removeItem(key: string): boolean {
    if (!this.isAvailable()) return false;
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
}
