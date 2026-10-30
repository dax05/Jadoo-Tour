import { testimonialService, TestimonialService } from '../../services/testimonial.service';
import { AuthService } from '../../services/auth.service';
import { TestimonialSlider } from './testimonial-slider';

/**
 * Testimonial Form Controller
 * Manages modal interactions, star rating widget, avatar choices, and testimonial submissions.
 */
export class TestimonialFormController {
  private testimonialService: TestimonialService;
  private authService: AuthService;

  // DOM Elements
  private openBtn: HTMLButtonElement | null = null;
  private modal: HTMLElement | null = null;
  private form: HTMLFormElement | null = null;
  private inputName: HTMLInputElement | null = null;
  private inputLocation: HTMLInputElement | null = null;
  private inputDest: HTMLInputElement | null = null;
  private inputQuote: HTMLTextAreaElement | null = null;
  private quoteCounter: HTMLElement | null = null;
  private starContainer: HTMLElement | null = null;
  private avatarOptions: NodeListOf<HTMLElement> | null = null;

  // State
  private selectedRating = 5;
  private selectedAvatar = 'assets/Images/testimonial-section/author-sarah.jpg';

  constructor() {
    this.testimonialService = testimonialService;
    this.authService = AuthService.getInstance();

    this.initElements();
    this.bindEvents();
  }

  private initElements(): void {
    this.openBtn = document.getElementById('btn-open-testimonial-modal') as HTMLButtonElement | null;
    this.modal = document.getElementById('testimonial-modal');
    this.form = document.getElementById('form-add-testimonial') as HTMLFormElement | null;
    this.inputName = document.getElementById('test-input-name') as HTMLInputElement | null;
    this.inputLocation = document.getElementById('test-input-location') as HTMLInputElement | null;
    this.inputDest = document.getElementById('test-input-dest') as HTMLInputElement | null;
    this.inputQuote = document.getElementById('test-input-quote') as HTMLTextAreaElement | null;
    this.quoteCounter = document.getElementById('test-quote-counter');
    this.starContainer = document.getElementById('test-star-picker');
    this.avatarOptions = document.querySelectorAll('.test-avatar-choice');
  }

  private bindEvents(): void {
    // 1. Open modal trigger
    this.openBtn?.addEventListener('click', () => {
      this.openModal();
    });

    // 2. Close modal triggers
    this.modal?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target === this.modal || target.closest('[data-close-testimonial-modal]')) {
        this.closeModal();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.style.display === 'flex') {
        this.closeModal();
      }
    });

    // 3. Interactive Star Rating Picker
    if (this.starContainer) {
      const stars = this.starContainer.querySelectorAll<HTMLElement>('.test-star-item');
      stars.forEach((star) => {
        star.addEventListener('mouseenter', () => {
          const val = Number(star.getAttribute('data-value') || '5');
          this.highlightStars(val);
        });

        star.addEventListener('mouseleave', () => {
          this.highlightStars(this.selectedRating);
        });

        star.addEventListener('click', () => {
          const val = Number(star.getAttribute('data-value') || '5');
          this.selectedRating = val;
          this.highlightStars(val);
        });
      });
    }

    // 4. Avatar Picker Options
    this.avatarOptions?.forEach((opt) => {
      opt.addEventListener('click', () => {
        this.avatarOptions?.forEach((o) => o.classList.remove('selected'));
        opt.classList.add('selected');
        const avatarSrc = opt.getAttribute('data-avatar-src');
        if (avatarSrc) {
          this.selectedAvatar = avatarSrc;
        }
      });
    });

    // 5. Quote character count feedback
    this.inputQuote?.addEventListener('input', () => {
      const len = this.inputQuote?.value.length || 0;
      if (this.quoteCounter) {
        this.quoteCounter.textContent = `${len}/280`;
      }
    });

    // 6. Form Submission
    this.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }

  public openModal(): void {
    if (!this.modal) return;

    // Pre-fill user data if authenticated
    const session = this.authService.getCurrentSession();
    if (session) {
      if (this.inputName && !this.inputName.value) {
        this.inputName.value = session.name;
      }
      if (this.inputLocation && !this.inputLocation.value) {
        this.inputLocation.value = session.country ? `Traveler from ${session.country}` : 'Verified Traveler';
      }
    }

    this.modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    this.highlightStars(this.selectedRating);
    setTimeout(() => this.inputName?.focus(), 80);
  }

  public closeModal(): void {
    if (this.modal) {
      this.modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  private highlightStars(rating: number): void {
    if (!this.starContainer) return;
    const stars = this.starContainer.querySelectorAll<HTMLElement>('.test-star-item');
    stars.forEach((s) => {
      const val = Number(s.getAttribute('data-value') || '1');
      s.classList.toggle('active', val <= rating);
      const icon = s.querySelector('i');
      if (icon) {
        icon.className = val <= rating ? 'fa-solid fa-star' : 'fa-regular fa-star';
      }
    });
  }

  private handleSubmit(): void {
    const name = this.inputName?.value.trim() || '';
    const location = this.inputLocation?.value.trim() || '';
    const destination = this.inputDest?.value.trim() || '';
    const quote = this.inputQuote?.value.trim() || '';

    // Validation
    if (!name || name.length < 2) {
      this.showToast('Please enter your name (at least 2 characters).', 'error');
      this.inputName?.focus();
      return;
    }

    if (!location || location.length < 2) {
      this.showToast('Please specify your location or traveler title.', 'error');
      this.inputLocation?.focus();
      return;
    }

    if (!quote || quote.length < 10) {
      this.showToast('Please share at least a short sentence of feedback (10+ characters).', 'error');
      this.inputQuote?.focus();
      return;
    }

    // Format final quote
    const formattedQuote = quote.startsWith('“') || quote.startsWith('"') ? quote : `“${quote}”`;
    const fullLocation = destination ? `${location} • Visited ${destination}` : location;

    // Save to service
    this.testimonialService.addTestimonial({
      name,
      location: fullLocation,
      quote: formattedQuote,
      avatar: this.selectedAvatar,
      rating: this.selectedRating,
      destinationVisited: destination,
    });

    // Reset form
    if (this.form) this.form.reset();
    if (this.quoteCounter) this.quoteCounter.textContent = '0/280';
    this.selectedRating = 5;

    // Close modal
    this.closeModal();

    // Show celebration toast
    this.showToast(`🎉 Thank you, ${name}! Your review has been published!`);

    // Switch slider to the new testimonial (which was prepended to the array at index 0)
    setTimeout(() => {
      TestimonialSlider.instance?.goTo(0);
      const testSection = document.getElementById('testimonials');
      testSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    const existing = document.querySelector('.dest-toast, .profile-toast');
    existing?.remove();

    const toast = document.createElement('div');
    toast.className = `dest-toast ${type === 'error' ? 'toast-error' : 'toast-success'}`;
    toast.innerHTML = `
      <i class="fa-solid ${type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check'}"></i>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 10);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}
