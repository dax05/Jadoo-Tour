import { Testimonial } from '../types/testimonial.types';
import { TESTIMONIALS_DATA } from '../modules/testimonials/testimonials.data';
import { StorageService } from './storage.service';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { API_CONFIG } from '../constants/config';
import { authService } from './auth.service';

type TestimonialsListener = (testimonials: Testimonial[]) => void;

/**
 * Testimonial Service
 * Manages official seed testimonials merged with traveler-submitted reviews.
 */
export class TestimonialService {
  private static instance: TestimonialService | null = null;
  private listeners: Set<TestimonialsListener> = new Set();

  private constructor() {
    this.listenToStorage();
  }

  public static getInstance(): TestimonialService {
    if (!TestimonialService.instance) {
      TestimonialService.instance = new TestimonialService();
    }
    return TestimonialService.instance;
  }

  private listenToStorage(): void {
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.TESTIMONIALS) {
        this.notifyListeners();
      }
    });
  }

  /**
   * Get user-submitted testimonials saved in localStorage
   */
  public getUserTestimonials(): Testimonial[] {
    return StorageService.getItem<Testimonial[]>(STORAGE_KEYS.TESTIMONIALS, []);
  }

  /**
   * Get all testimonials (default seeds + user submitted)
   */
  public getAllTestimonials(): Testimonial[] {
    const userSubmitted = this.getUserTestimonials();
    // User-submitted testimonials appear first or right alongside seeds
    return [...userSubmitted, ...TESTIMONIALS_DATA];
  }

  /**
   * Add a new traveler testimonial
   */
  public addTestimonial(data: Omit<Testimonial, 'id' | 'createdAt'>): Testimonial {
    const userSubmitted = this.getUserTestimonials();
    const newTestimonial: Testimonial = {
      ...data,
      id: `test-user-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isUserSubmitted: true,
      rating: data.rating || 5,
    };

    userSubmitted.unshift(newTestimonial);
    StorageService.setItem(STORAGE_KEYS.TESTIMONIALS, userSubmitted);
    this.notifyListeners();

    // Async sync with PostgreSQL backend
    const token = authService.getToken();
    fetch(`${API_CONFIG.BASE_URL}/testimonials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        name: newTestimonial.name,
        role: newTestimonial.destinationVisited || 'Traveler',
        location: newTestimonial.location,
        quote: newTestimonial.quote,
        rating: newTestimonial.rating,
      }),
    }).catch(() => {});

    return newTestimonial;
  }

  public async syncWithBackend(): Promise<void> {
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/testimonials`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.testimonials)) {
          const userSubmitted = data.testimonials.map((t: any) => ({
            id: `test-pg-${t.id}`,
            name: t.name,
            destinationVisited: t.role || 'Traveler',
            location: t.location,
            avatar: t.avatar_url || 'assets/Images/testimonials-section/author-image.png',
            quote: t.quote,
            rating: Number(t.rating) || 5,
            createdAt: t.created_at,
            isUserSubmitted: true,
          }));
          StorageService.setItem(STORAGE_KEYS.TESTIMONIALS, userSubmitted);
          this.notifyListeners();
        }
      }
    } catch {
      // Offline fallback: rely on local storage
    }
  }

  /**
   * Delete a user-submitted testimonial
   */
  public deleteTestimonial(id: string): boolean {
    const userSubmitted = this.getUserTestimonials();
    const filtered = userSubmitted.filter((t) => t.id !== id);
    if (filtered.length !== userSubmitted.length) {
      StorageService.setItem(STORAGE_KEYS.TESTIMONIALS, filtered);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Subscribe to testimonial updates
   */
  public subscribe(listener: TestimonialsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const all = this.getAllTestimonials();
    this.listeners.forEach((listener) => {
      try {
        listener(all);
      } catch (err) {
        console.error('[TestimonialService] Listener error:', err);
      }
    });
  }
}

export const testimonialService = TestimonialService.getInstance();
