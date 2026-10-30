import { Testimonial } from '../../types/testimonial.types';
import { testimonialService, TestimonialService } from '../../services/testimonial.service';

/**
 * Testimonial Slider Controller
 * Manages active index, transitions, pagination dots, dynamic testimonials, and arrow navigation.
 */
export class TestimonialSlider {
  public static instance: TestimonialSlider | null = null;
  private testimonialService: TestimonialService;
  private testimonials: Testimonial[] = [];
  private currentIndex = 0;

  // DOM Elements
  private mainCard: HTMLElement | null = null;
  private mainAvatar: HTMLImageElement | null = null;
  private mainQuote: HTMLElement | null = null;
  private mainName: HTMLElement | null = null;
  private mainLocation: HTMLElement | null = null;
  private mainRating: HTMLElement | null = null;

  private backQuote: HTMLElement | null = null;
  private backName: HTMLElement | null = null;
  private backLocation: HTMLElement | null = null;

  private prevBtn: HTMLElement | null = null;
  private nextBtn: HTMLElement | null = null;
  private dotsContainer: HTMLElement | null = null;
  private dots: NodeListOf<HTMLElement> | null = null;

  constructor() {
    TestimonialSlider.instance = this;
    this.testimonialService = testimonialService;
    this.testimonials = this.testimonialService.getAllTestimonials();

    this.mainCard = document.getElementById('test-main-card');
    this.mainAvatar = document.getElementById('test-main-avatar') as HTMLImageElement | null;
    this.mainQuote = document.getElementById('test-main-quote');
    this.mainName = document.getElementById('test-main-name');
    this.mainLocation = document.getElementById('test-main-location');
    this.mainRating = document.getElementById('test-main-rating');

    this.backQuote = document.getElementById('test-back-quote');
    this.backName = document.getElementById('test-back-name');
    this.backLocation = document.getElementById('test-back-location');

    this.prevBtn = document.getElementById('test-prev');
    this.nextBtn = document.getElementById('test-next');
    this.dotsContainer = document.getElementById('test-dots');

    this.init();
  }

  private init(): void {
    if (this.testimonials.length === 0) return;

    this.prevBtn?.addEventListener('click', () => this.prev());
    this.nextBtn?.addEventListener('click', () => this.next());

    this.renderDots();
    this.render(this.currentIndex);

    // Reactive subscription to new reviews added
    this.testimonialService.subscribe((updated) => {
      this.testimonials = updated;
      this.renderDots();
      this.render(this.currentIndex);
    });
  }

  public next(): void {
    this.goTo(this.currentIndex + 1);
  }

  public prev(): void {
    this.goTo(this.currentIndex - 1);
  }

  public goTo(index: number): void {
    const total = this.testimonials.length;
    if (total === 0) return;
    this.currentIndex = ((index % total) + total) % total;
    this.render(this.currentIndex);
  }

  private renderDots(): void {
    if (!this.dotsContainer) return;

    this.dotsContainer.innerHTML = this.testimonials
      .map(
        (_, i) =>
          `<button type="button" class="test-dot ${
            i === this.currentIndex ? 'active' : ''
          }" data-index="${i}" aria-label="Testimonial ${i + 1}"></button>`
      )
      .join('');

    this.dots = this.dotsContainer.querySelectorAll<HTMLElement>('.test-dot');
    this.dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const idx = Number(dot.dataset.index);
        if (!isNaN(idx)) {
          this.goTo(idx);
        }
      });
    });
  }

  private render(index: number): void {
    const total = this.testimonials.length;
    if (total === 0) return;

    const nextIndex = (index + 1) % total;
    const current = this.testimonials[index];
    const next = this.testimonials[nextIndex];

    if (!current) return;

    // Trigger re-animation cleanly without unsafe hacks
    if (this.mainCard) {
      this.mainCard.classList.remove('animating');
      requestAnimationFrame(() => {
        this.mainCard?.classList.add('animating');
      });
    }

    // Populate Foreground Card
    if (this.mainAvatar) {
      this.mainAvatar.src = current.avatar;
      this.mainAvatar.alt = current.name;
    }
    if (this.mainQuote) this.mainQuote.textContent = current.quote;
    if (this.mainName) this.mainName.textContent = current.name;
    if (this.mainLocation) this.mainLocation.textContent = current.location;

    // Star rating rendering
    if (this.mainRating) {
      const rating = current.rating || 5;
      this.mainRating.innerHTML = Array.from({ length: 5 })
        .map(
          (_, starIdx) =>
            `<i class="fa-solid fa-star ${starIdx < rating ? 'star-gold' : 'star-muted'}"></i>`
        )
        .join('');
    }

    // Populate Background Stack Card (Previewing next item)
    if (next) {
      if (this.backQuote) this.backQuote.textContent = next.quote;
      if (this.backName) this.backName.textContent = next.name;
      if (this.backLocation) this.backLocation.textContent = next.location;
    }

    // Update Pagination Dots
    this.dots?.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
      dot.setAttribute('aria-current', i === index ? 'true' : 'false');
    });
  }
}
