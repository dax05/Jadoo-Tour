import { AuthNavController } from './modules/navigation/auth-nav.controller';
import { NavbarController } from './modules/navigation/navbar.controller';
import { TestimonialSlider } from './modules/testimonials/testimonial-slider';
import { TestimonialFormController } from './modules/testimonials/testimonial-form.controller';
import { DestinationExplorerController } from './modules/destinations/destination-explorer.controller';
import { DestinationModalController } from './modules/destinations/destination-modal.controller';
import { DestinationMapController } from './modules/destinations/destination-map.controller';
import { UserPanelController } from './modules/user/user-panel.controller';
import { NewsletterController } from './modules/newsletter/newsletter.controller';
import { themeService } from './services/theme.service';
import { DestinationService } from './services/destination.service';
import { testimonialService } from './services/testimonial.service';

// Interactive favorites sync for static featured cards
function initHeartFavorite(): void {
  const heartBtn = document.querySelector<HTMLElement>('.tripheart');
  if (!heartBtn) return;

  const updateHeartVisuals = () => {
    const isFav = DestinationService.getFavoriteIds().includes('static-greece');
    const icon = heartBtn.querySelector('i');
    if (icon) {
      icon.className = isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
      heartBtn.style.color = isFav ? '#ef4444' : '';
      heartBtn.setAttribute('aria-label', isFav ? 'Unfavorite Trip to Greece' : 'Favorite Trip to Greece');
    }
  };

  // Sync initial state
  updateHeartVisuals();

  heartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    DestinationService.toggleFavorite('static-greece');
    updateHeartVisuals();
  });

  // Keep synced across wishlist updates
  DestinationService.onWishlistChange(() => {
    updateHeartVisuals();
  });
}

function initGreeceCardInteraction(): void {
  const greeceCard = document.querySelector<HTMLElement>('.bookcard');
  if (!greeceCard) return;

  greeceCard.style.cursor = 'pointer';
  greeceCard.setAttribute('title', 'Click to view trip details');

  greeceCard.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.tripheart') || target.closest('.bookactions button')) {
      return;
    }
    const greeceDest = DestinationService.STATIC_TOP_DESTINATIONS['static-greece'];
    if (greeceDest && DestinationModalController.instance) {
      DestinationModalController.instance.openDetailsModal(greeceDest);
    }
  });

  const mapActionBtn = greeceCard.querySelector<HTMLButtonElement>('.bookactions button[aria-label="Trip map"]');
  mapActionBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const mapSection = document.getElementById('destinations-map-wrapper');
    if (mapSection) {
      mapSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
}



/**
 * Main Application Landing Page Bootstrap
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Theme Service & bind theme toggle buttons
  themeService.bindToggleButtons();

  // 2. Initialize Navigation Controllers
  new NavbarController();
  new AuthNavController();

  // 3. Initialize Destination Explorer, Map & Modals Controllers
  new DestinationModalController();
  new DestinationMapController();
  new DestinationExplorerController();

  // 4. Initialize User Travel Portal (Wishlist & My Bookings Panel)
  new UserPanelController();

  // 5. Initialize Testimonials Slider & Review Submission Controller
  new TestimonialSlider();
  new TestimonialFormController();

  // 6. Initialize Newsletter & Email Welcome Controller
  new NewsletterController();

  // 7. Initialize Simple Micro-interactions
  initHeartFavorite();
  initGreeceCardInteraction();

  // 8. Synchronize bookings, wishlist & testimonials with backend if online
  DestinationService.syncWithBackend();
  testimonialService.syncWithBackend();
});

