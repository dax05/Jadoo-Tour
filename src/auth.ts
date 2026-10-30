import { AuthFormController } from './modules/auth/auth-form.controller';
import { themeService } from './services/theme.service';

/**
 * Authentication Page Bootstrap
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Theme Service & bind theme toggle buttons
  themeService.bindToggleButtons();

  // 2. Initialize Auth Form Controller
  new AuthFormController();
});
