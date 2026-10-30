/**
 * Authentication and User Session Type Definitions
 */

export interface UserPreferences {
  currency?: string;
  language?: string;
  mealPreference?: string;
  seatPreference?: string;
  homeAirport?: string;
  emailAlerts?: boolean;
  smsAlerts?: boolean;
}

export interface UserAccount {
  name: string;
  email: string;
  password?: string;
  registeredAt: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  country?: string;
  passportNumber?: string;
  emergencyContact?: string;
  loyaltyTier?: 'Silver Explorer' | 'Gold Adventurer' | 'Platinum Voyager';
  loyaltyPoints?: number;
  preferences?: UserPreferences;
}

export interface UserSession {
  name: string;
  email: string;
  loggedInAt: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  country?: string;
  passportNumber?: string;
  emergencyContact?: string;
  loyaltyTier?: 'Silver Explorer' | 'Gold Adventurer' | 'Platinum Voyager';
  loyaltyPoints?: number;
  preferences?: UserPreferences;
}

export type AuthMode = 'login' | 'signup';

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export type PasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordCriteria {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

export interface PasswordStrengthReport {
  criteria: PasswordCriteria;
  passedCount: number;
  level: PasswordStrengthLevel;
  label: string;
}

export interface AuthResponse {
  success: boolean;
  user?: UserSession;
  error?: string;
}
