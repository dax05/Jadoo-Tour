import { STORAGE_KEYS } from '../constants/storage-keys';
import { API_CONFIG } from '../constants/config';
import { AuthResponse, UserAccount, UserSession } from '../types/auth.types';
import { StorageService } from './storage.service';

/**
 * Authentication and Session Management Service
 */
export class AuthService {
  private static instance: AuthService | null = null;
  private currentSession: UserSession | null = null;
  private sessionListeners: Set<(session: UserSession | null) => void> = new Set();

  private constructor() {
    this.initSession();
    this.listenToStorageEvents();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private initSession(): void {
    this.currentSession = StorageService.getItem<UserSession | null>(STORAGE_KEYS.USER_SESSION, null);
  }

  private listenToStorageEvents(): void {
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.USER_SESSION) {
        this.initSession();
        this.notifyListeners();
      }
    });
  }

  public getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  public isAuthenticated(): boolean {
    return this.currentSession !== null;
  }

  private static DEFAULT_USER: UserAccount = {
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@example.com',
    password: 'Password123!',
    registeredAt: '2024-01-15T08:00:00.000Z',
    phone: '+1 (555) 749-2810',
    avatar: 'avatar-1',
    bio: 'Passionate globetrotter seeking sunset vistas, historic cobblestones, and local street cuisine.',
    country: 'United States',
    loyaltyTier: 'Gold Adventurer',
    loyaltyPoints: 1450,
    preferences: {
      currency: 'USD',
      language: 'English',
      mealPreference: 'Standard',
      seatPreference: 'Window',
      homeAirport: 'JFK — New York International',
      emailAlerts: true,
      smsAlerts: true,
    },
  };

  public getUsers(): UserAccount[] {
    const users = StorageService.getItem<UserAccount[]>(STORAGE_KEYS.USERS_DB, []);
    if (users.length === 0) {
      const seeded = [AuthService.DEFAULT_USER];
      StorageService.setItem(STORAGE_KEYS.USERS_DB, seeded);
      return seeded;
    }
    return users;
  }

  public async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // 1. Attempt API Registration with Express + PostgreSQL
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, email: cleanEmail, password }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.token) {
          StorageService.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
        }
        const session: UserSession = {
          name: data.user.name,
          email: data.user.email,
          loggedInAt: new Date().toISOString(),
          avatar: data.user.avatarUrl || 'avatar-1',
          loyaltyTier: 'Gold Adventurer',
          loyaltyPoints: data.user.points || 1250,
        };
        this.setSession(session);
        return { success: true, user: session };
      } else if (!response.ok && data.message) {
        return { success: false, error: data.message };
      }
    } catch {
      // Backend not running, proceed to local storage fallback
    }

    // 2. Local Fallback
    const users = this.getUsers();
    const exists = users.some((u) => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      return {
        success: false,
        error: 'An account with this email already exists. Please log in.',
      };
    }

    const newUser: UserAccount = {
      name: cleanName,
      email: cleanEmail,
      password,
      registeredAt: new Date().toISOString(),
      loyaltyTier: 'Gold Adventurer',
      loyaltyPoints: 1250,
      avatar: 'avatar-1',
      preferences: {
        currency: 'USD',
        language: 'English',
        mealPreference: 'Standard',
        seatPreference: 'Window',
        emailAlerts: true,
        smsAlerts: true,
      },
    };

    users.push(newUser);
    StorageService.setItem(STORAGE_KEYS.USERS_DB, users);

    const session: UserSession = {
      name: cleanName,
      email: cleanEmail,
      loggedInAt: new Date().toISOString(),
      avatar: newUser.avatar,
      loyaltyTier: newUser.loyaltyTier,
      loyaltyPoints: newUser.loyaltyPoints,
      preferences: newUser.preferences,
    };

    this.setSession(session);
    return { success: true, user: session };
  }

  public async login(email: string, password: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Attempt API Login with Express + PostgreSQL
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.token) {
          StorageService.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
        }
        const session: UserSession = {
          name: data.user.name,
          email: data.user.email,
          loggedInAt: new Date().toISOString(),
          phone: data.user.phone,
          avatar: data.user.avatarUrl || 'avatar-1',
          bio: data.user.bio,
          country: data.user.homeCity,
          passportNumber: data.user.passportNumber,
          loyaltyTier: 'Gold Adventurer',
          loyaltyPoints: data.user.points || 1250,
        };
        this.setSession(session);
        return { success: true, user: session };
      } else if (!response.ok && data.message) {
        return { success: false, error: data.message };
      }
    } catch {
      // Backend not running, proceed to local storage fallback
    }

    // 2. Local Fallback
    const users = this.getUsers();
    const account = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!account) {
      return {
        success: false,
        error: 'No account found with this email. Please check your email or sign up.',
      };
    }

    if (account.password !== password) {
      return {
        success: false,
        error: 'Incorrect password. Please verify your credentials and try again.',
      };
    }

    const session: UserSession = {
      name: account.name,
      email: account.email,
      loggedInAt: new Date().toISOString(),
      phone: account.phone,
      avatar: account.avatar || 'avatar-1',
      bio: account.bio,
      country: account.country,
      passportNumber: account.passportNumber,
      emergencyContact: account.emergencyContact,
      loyaltyTier: account.loyaltyTier || 'Gold Adventurer',
      loyaltyPoints: account.loyaltyPoints ?? 1250,
      preferences: account.preferences,
    };

    this.setSession(session);
    return { success: true, user: session };
  }

  public getUserAccount(email?: string): UserAccount | undefined {
    const targetEmail = (email || this.currentSession?.email || '').toLowerCase().trim();
    if (!targetEmail) return undefined;
    return this.getUsers().find((u) => u.email.toLowerCase() === targetEmail);
  }

  public updateProfile(updatedData: Partial<UserAccount>): { success: boolean; user?: UserSession; error?: string } {
    if (!this.currentSession) {
      return { success: false, error: 'User is not logged in.' };
    }

    const users = this.getUsers();
    const index = users.findIndex((u) => u.email.toLowerCase() === this.currentSession!.email.toLowerCase());
    if (index === -1) {
      return { success: false, error: 'User account not found.' };
    }

    const currentAcc = users[index];
    const newName = updatedData.name ? updatedData.name.trim() : currentAcc.name;
    const newEmail = updatedData.email ? updatedData.email.trim().toLowerCase() : currentAcc.email;

    if (newEmail !== currentAcc.email.toLowerCase()) {
      const emailTaken = users.some((u, i) => i !== index && u.email.toLowerCase() === newEmail);
      if (emailTaken) {
        return { success: false, error: 'This email is already in use by another account.' };
      }
    }

    const updatedAcc: UserAccount = {
      ...currentAcc,
      ...updatedData,
      name: newName,
      email: newEmail,
      preferences: {
        ...(currentAcc.preferences || {}),
        ...(updatedData.preferences || {}),
      },
    };

    users[index] = updatedAcc;
    StorageService.setItem(STORAGE_KEYS.USERS_DB, users);

    const updatedSession: UserSession = {
      ...this.currentSession,
      name: updatedAcc.name,
      email: updatedAcc.email,
      phone: updatedAcc.phone,
      avatar: updatedAcc.avatar,
      bio: updatedAcc.bio,
      country: updatedAcc.country,
      passportNumber: updatedAcc.passportNumber,
      emergencyContact: updatedAcc.emergencyContact,
      loyaltyTier: updatedAcc.loyaltyTier || 'Gold Adventurer',
      loyaltyPoints: updatedAcc.loyaltyPoints ?? 1250,
      preferences: updatedAcc.preferences,
    };

    this.setSession(updatedSession);
    return { success: true, user: updatedSession };
  }

  public changePassword(oldPassword: string, newPassword: string): { success: boolean; error?: string } {
    if (!this.currentSession) {
      return { success: false, error: 'User is not logged in.' };
    }

    const users = this.getUsers();
    const index = users.findIndex((u) => u.email.toLowerCase() === this.currentSession!.email.toLowerCase());
    if (index === -1) {
      return { success: false, error: 'User account not found.' };
    }

    if (users[index].password !== oldPassword) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    users[index].password = newPassword;
    StorageService.setItem(STORAGE_KEYS.USERS_DB, users);
    return { success: true };
  }

  public getToken(): string | null {
    return StorageService.getItem<string | null>(STORAGE_KEYS.AUTH_TOKEN, null);
  }

  public logout(): void {
    this.currentSession = null;
    StorageService.removeItem(STORAGE_KEYS.USER_SESSION);
    StorageService.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    this.notifyListeners();
  }

  public subscribe(listener: (session: UserSession | null) => void): () => void {
    this.sessionListeners.add(listener);
    listener(this.currentSession);
    return () => {
      this.sessionListeners.delete(listener);
    };
  }

  private setSession(session: UserSession): void {
    this.currentSession = session;
    StorageService.setItem(STORAGE_KEYS.USER_SESSION, session);
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.sessionListeners.forEach((listener) => listener(this.currentSession));
  }
}

export const authService = AuthService.getInstance();
