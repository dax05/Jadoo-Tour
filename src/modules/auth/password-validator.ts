import { PasswordCriteria, PasswordStrengthLevel, PasswordStrengthReport } from '../../types/auth.types';

/**
 * Pure Password Strength Evaluator
 */
export class PasswordValidator {
  public static evaluate(password: string): PasswordStrengthReport {
    const criteria: PasswordCriteria = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };

    const passedCount = Object.values(criteria).filter(Boolean).length;

    if (!password) {
      return {
        criteria,
        passedCount: 0,
        level: 'weak',
        label: 'Too weak',
      };
    }

    if (!criteria.length) {
      return {
        criteria,
        passedCount,
        level: 'weak',
        label: 'Too short (min 8 chars)',
      };
    }

    let level: PasswordStrengthLevel = 'weak';
    let label = 'Weak';

    if (passedCount >= 5) {
      level = 'strong';
      label = 'Strong password';
    } else if (passedCount >= 4) {
      level = 'good';
      label = 'Good';
    } else if (passedCount >= 3) {
      level = 'fair';
      label = 'Fair';
    }

    return {
      criteria,
      passedCount,
      level,
      label,
    };
  }
}
