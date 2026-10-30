import { ProfileController } from './modules/profile/profile.controller';
import { themeService } from './services/theme.service';
import { DestinationService } from './services/destination.service';

/**
 * Profile Page Bootstrap
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Theme Service & bind theme toggle buttons
  themeService.bindToggleButtons();

  // 2. Synchronize bookings and wishlist from PostgreSQL backend
  DestinationService.syncWithBackend();

  // 3. Initialize Profile Controller
  new ProfileController();
});

