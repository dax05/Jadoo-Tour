import { VALIDATION_RULES } from '../../constants/config';
import { AuthMode, ValidationResult } from '../../types/auth.types';
import { PasswordValidator } from './password-validator';

/**
 * Pure Form Validation Helpers
 */
export class FormValidator {
  public static validateName(name: string): ValidationResult {
    const value = name.trim();
    if (!value) {
      return { isValid: false, message: 'Please enter your full name' };
    }
    if (value.length < VALIDATION_RULES.NAME_MIN_LENGTH) {
      return { isValid: false, message: `Name must be at least ${VALIDATION_RULES.NAME_MIN_LENGTH} characters` };
    }
    if (!VALIDATION_RULES.NAME_REGEX.test(value)) {
      return { isValid: false, message: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
    }
    return { isValid: true };
  }

  public static validateEmail(email: string): ValidationResult {
    const value = email.trim();
    if (!value) {
      return { isValid: false, message: 'Email address is required' };
    }
    if (!VALIDATION_RULES.EMAIL_REGEX.test(value)) {
      return { isValid: false, message: 'Please enter a valid email address' };
    }
    return { isValid: true };
  }

  public static validatePassword(password: string, mode: AuthMode): ValidationResult {
    if (!password) {
      return { isValid: false, message: 'Password is required' };
    }

    if (mode === 'signup') {
      const report = PasswordValidator.evaluate(password);
      if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
        return { isValid: false, message: `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters` };
      }
      if (report.passedCount < 4) {
        return { isValid: false, message: 'Password must meet at least 4 security criteria' };
      }
    } else {
      if (password.length < VALIDATION_RULES.PASSWORD_LOGIN_MIN_LENGTH) {
        return { isValid: false, message: `Password must be at least ${VALIDATION_RULES.PASSWORD_LOGIN_MIN_LENGTH} characters` };
      }
    }

    return { isValid: true };
  }

  public static validateConfirmPassword(password: string, confirmPassword: string): ValidationResult {
    if (!confirmPassword) {
      return { isValid: false, message: 'Please confirm your password' };
    }
    if (password !== confirmPassword) {
      return { isValid: false, message: 'Passwords do not match' };
    }
    return { isValid: true };
  }
}
