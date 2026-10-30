import { Destination, PackageTier, BookingRequest } from '../../types/destination.types';
import { DestinationService } from '../../services/destination.service';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { AuthService } from '../../services/auth.service';
import {
  validatePhoneNumber,
  sanitizePhoneInput,
  formatPhoneNumber,
  validateDepartureDate,
  validateEmail,
  validatePassengerName,
} from '../../utils/validation.utils';

export class DestinationModalController {
  public static instance: DestinationModalController | null = null;

  // Details Modal Elements
  private detailsModal: HTMLElement | null = null;
  private modalCoverImg: HTMLImageElement | null = null;
  private modalRating: HTMLElement | null = null;
  private modalDuration: HTMLElement | null = null;
  private modalTitle: HTMLElement | null = null;
  private modalSubtitle: HTMLElement | null = null;
  private modalPrice: HTMLElement | null = null;
  private modalDesc: HTMLElement | null = null;
  private modalFavBtn: HTMLButtonElement | null = null;
  private modalBookCta: HTMLButtonElement | null = null;

  // Booking Modal Elements
  private bookingModal: HTMLElement | null = null;
  private bookingFormScreen: HTMLElement | null = null;
  private bookingSuccessScreen: HTMLElement | null = null;
  private bookingBannerImg: HTMLImageElement | null = null;
  private bookingDestName: HTMLElement | null = null;
  private bookingDuration: HTMLElement | null = null;
  private bookingBasePrice: HTMLElement | null = null;

  // Booking Form Fields
  private bookingForm: HTMLFormElement | null = null;
  private inputName: HTMLInputElement | null = null;
  private inputEmail: HTMLInputElement | null = null;
  private inputPhone: HTMLInputElement | null = null;
  private inputDate: HTMLInputElement | null = null;
  private inputAdults: HTMLInputElement | null = null;
  private inputChildren: HTMLInputElement | null = null;
  private inputNotes: HTMLTextAreaElement | null = null;
  private btnAdultsMinus: HTMLButtonElement | null = null;
  private btnAdultsPlus: HTMLButtonElement | null = null;
  private btnChildrenMinus: HTMLButtonElement | null = null;
  private btnChildrenPlus: HTMLButtonElement | null = null;
  private btnBackDetails: HTMLButtonElement | null = null;

  // Promo Elements
  private inputPromo: HTMLInputElement | null = null;
  private btnApplyPromo: HTMLButtonElement | null = null;
  private badgePromo: HTMLElement | null = null;
  private priceDiscountRow: HTMLElement | null = null;
  private priceDiscountVal: HTMLElement | null = null;

  // Live Price Elements
  private priceBreakdown: HTMLElement | null = null;
  private priceSubtotal: HTMLElement | null = null;
  private priceTax: HTMLElement | null = null;
  private priceTotal: HTMLElement | null = null;

  // Receipt Elements
  private receiptBookingId: HTMLElement | null = null;
  private receiptDestName: HTMLElement | null = null;
  private receiptTravelerName: HTMLElement | null = null;
  private receiptTravelerPhone: HTMLElement | null = null;
  private receiptTravelerEmail: HTMLElement | null = null;
  private receiptTravelDate: HTMLElement | null = null;
  private receiptGuests: HTMLElement | null = null;
  private receiptDiscountRow: HTMLElement | null = null;
  private receiptDiscountVal: HTMLElement | null = null;
  private receiptTotalPrice: HTMLElement | null = null;

  // State
  private currentDestination: Destination | null = null;
  private appliedPromoCode: string = '';
  private appliedDiscountPercent: number = 0;

  constructor() {
    DestinationModalController.instance = this;
    this.initElements();
    this.bindEvents();
    this.initDefaultMinDate();
  }

  private initElements(): void {
    // Details Modal
    this.detailsModal = document.getElementById('dest-details-modal');
    this.modalCoverImg = document.getElementById('modal-dest-img') as HTMLImageElement | null;
    this.modalRating = document.getElementById('modal-dest-rating');
    this.modalDuration = document.getElementById('modal-dest-duration');
    this.modalTitle = document.getElementById('modal-dest-title');
    this.modalSubtitle = document.getElementById('modal-dest-subtitle');
    this.modalPrice = document.getElementById('modal-dest-price');
    this.modalDesc = document.getElementById('modal-dest-desc');
    this.modalFavBtn = document.getElementById('modal-fav-toggle') as HTMLButtonElement | null;
    this.modalBookCta = document.getElementById('modal-book-cta') as HTMLButtonElement | null;

    // Booking Modal
    this.bookingModal = document.getElementById('dest-booking-modal');
    this.bookingFormScreen = document.getElementById('booking-form-screen');
    this.bookingSuccessScreen = document.getElementById('booking-success-screen');
    this.bookingBannerImg = document.getElementById('booking-banner-img') as HTMLImageElement | null;
    this.bookingDestName = document.getElementById('booking-dest-name');
    this.bookingDuration = document.getElementById('booking-banner-duration');
    this.bookingBasePrice = document.getElementById('booking-banner-base-price');

    // Form inputs
    this.bookingForm = document.getElementById('destination-booking-form') as HTMLFormElement | null;
    this.inputName = document.getElementById('book-name') as HTMLInputElement | null;
    this.inputEmail = document.getElementById('book-email') as HTMLInputElement | null;
    this.inputPhone = document.getElementById('book-phone') as HTMLInputElement | null;
    this.inputDate = document.getElementById('book-date') as HTMLInputElement | null;
    this.inputAdults = document.getElementById('book-adults') as HTMLInputElement | null;
    this.inputChildren = document.getElementById('book-children') as HTMLInputElement | null;
    this.inputNotes = document.getElementById('book-notes') as HTMLTextAreaElement | null;

    this.btnAdultsMinus = document.getElementById('btn-adults-minus') as HTMLButtonElement | null;
    this.btnAdultsPlus = document.getElementById('btn-adults-plus') as HTMLButtonElement | null;
    this.btnChildrenMinus = document.getElementById('btn-children-minus') as HTMLButtonElement | null;
    this.btnChildrenPlus = document.getElementById('btn-children-plus') as HTMLButtonElement | null;
    this.btnBackDetails = document.getElementById('btn-back-details') as HTMLButtonElement | null;

    // Promo elements
    this.inputPromo = document.getElementById('book-promo') as HTMLInputElement | null;
    this.btnApplyPromo = document.getElementById('btn-apply-promo') as HTMLButtonElement | null;
    this.badgePromo = document.getElementById('promo-applied-badge');
    this.priceDiscountRow = document.getElementById('price-discount-row');
    this.priceDiscountVal = document.getElementById('price-calc-discount');

    // Price
    this.priceBreakdown = document.getElementById('price-calc-breakdown');
    this.priceSubtotal = document.getElementById('price-calc-subtotal');
    this.priceTax = document.getElementById('price-calc-tax');
    this.priceTotal = document.getElementById('price-calc-total');

    // Receipt
    this.receiptBookingId = document.getElementById('receipt-booking-id');
    this.receiptDestName = document.getElementById('receipt-dest-name');
    this.receiptTravelerName = document.getElementById('receipt-traveler-name');
    this.receiptTravelerPhone = document.getElementById('receipt-traveler-phone');
    this.receiptTravelerEmail = document.getElementById('receipt-traveler-email');
    this.receiptTravelDate = document.getElementById('receipt-travel-date');
    this.receiptGuests = document.getElementById('receipt-guests');
    this.receiptDiscountRow = document.getElementById('receipt-discount-row');
    this.receiptDiscountVal = document.getElementById('receipt-discount-val');
    this.receiptTotalPrice = document.getElementById('receipt-total-price');
  }

  private initDefaultMinDate(): void {
    if (this.inputDate) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      this.inputDate.min = `${yyyy}-${mm}-${dd}`;
    }
  }

  private bindEvents(): void {
    // 1. Global Click delegation for Static and Dynamic Destination Cards
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Handle direct "Book This Trip" button clicks
      const bookBtn = target.closest<HTMLButtonElement>('.dest-book-btn');
      if (bookBtn) {
        e.preventDefault();
        e.stopPropagation();
        const destId = bookBtn.getAttribute('data-dest-id') || bookBtn.closest('[data-id]')?.getAttribute('data-id') || '';
        const dest = this.resolveDestination(destId, bookBtn.getAttribute('data-title'));
        if (dest) {
          this.openBookingModal(dest);
        }
        return;
      }

      // Ignore favorite button clicks so they don't open the modal
      if (target.closest('.dest-fav-btn')) {
        return;
      }

      // Handle Card clicks: static cards or dynamic explorer cards
      const card = target.closest<HTMLElement>('.destcards');
      if (card) {
        const destId = card.getAttribute('data-dest-id') || card.getAttribute('data-id') || '';
        const cardTitle = card.querySelector('.ct-name')?.textContent || '';
        const dest = this.resolveDestination(destId, cardTitle);
        if (dest) {
          this.openDetailsModal(dest);
        }
        return;
      }

      // Handle close modal triggers (backdrop and close buttons)
      if (target.hasAttribute('data-close-modal') || target.closest('[data-close-modal]')) {
        this.closeAllModals();
        return;
      }
    });

    // 2. Keyboard Escape to close modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });

    // 3. Details Modal Action Buttons
    this.modalBookCta?.addEventListener('click', () => {
      if (this.currentDestination) {
        this.openBookingModal(this.currentDestination);
      }
    });

    this.modalFavBtn?.addEventListener('click', () => {
      if (!this.currentDestination) return;
      const isNowFav = DestinationService.toggleFavorite(this.currentDestination.id);
      this.updateDetailsFavBtn(isNowFav);

      // Also sync active state on the card in the grid if present
      const cardFavBtn = document.querySelector(`.dest-fav-btn[data-id="${this.currentDestination.id}"]`);
      if (cardFavBtn) {
        cardFavBtn.classList.toggle('active', isNowFav);
        const icon = cardFavBtn.querySelector('i');
        if (icon) {
          icon.className = isNowFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        }
      }

      this.showToast(isNowFav ? 'Saved to your wishlist! â¤ï¸' : 'Removed from wishlist.');
    });

    // 4. Booking Modal Back Button
    this.btnBackDetails?.addEventListener('click', () => {
      if (this.currentDestination) {
        this.openDetailsModal(this.currentDestination);
      }
    });

    // 5. Guest Counters (+ / -)
    this.btnAdultsMinus?.addEventListener('click', () => this.adjustGuestCount('adults', -1));
    this.btnAdultsPlus?.addEventListener('click', () => this.adjustGuestCount('adults', 1));
    this.btnChildrenMinus?.addEventListener('click', () => this.adjustGuestCount('children', -1));
    this.btnChildrenPlus?.addEventListener('click', () => this.adjustGuestCount('children', 1));

    // 6. Experience Tier selection cards
    const tierRadios = document.querySelectorAll<HTMLInputElement>('input[name="package-tier"]');
    tierRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        document.querySelectorAll('.package-tier-card').forEach((card) => card.classList.remove('active'));
        radio.closest('.package-tier-card')?.classList.add('active');
        this.updateLivePrice();
      });
    });

    // 7. Live Phone Input Sanitization & Real-time Validation
    this.inputPhone?.addEventListener('input', () => {
      if (this.inputPhone) {
        this.inputPhone.value = sanitizePhoneInput(this.inputPhone.value);
        const err = document.getElementById('book-phone-error');
        if (err && err.textContent) {
          const res = validatePhoneNumber(this.inputPhone.value);
          if (res.isValid) {
            err.textContent = '';
            this.inputPhone.classList.remove('input-error');
          }
        }
      }
    });

    this.inputPhone?.addEventListener('blur', () => {
      if (this.inputPhone && this.inputPhone.value.trim()) {
        const res = validatePhoneNumber(this.inputPhone.value);
        const err = document.getElementById('book-phone-error');
        if (res.isValid && res.formatted) {
          this.inputPhone.value = res.formatted;
          if (err) err.textContent = '';
          this.inputPhone.classList.remove('input-error');
        } else if (err && res.error) {
          err.textContent = res.error;
          this.inputPhone.classList.add('input-error');
        }
      }
    });

    // 8. Live Name Validation clearing
    this.inputName?.addEventListener('input', () => {
      const err = document.getElementById('book-name-error');
      if (err && err.textContent && this.inputName) {
        const res = validatePassengerName(this.inputName.value);
        if (res.isValid) {
          err.textContent = '';
          this.inputName.classList.remove('input-error');
        }
      }
    });

    // 9. Live Email Validation clearing
    this.inputEmail?.addEventListener('input', () => {
      const err = document.getElementById('book-email-error');
      if (err && err.textContent && this.inputEmail) {
        const res = validateEmail(this.inputEmail.value);
        if (res.isValid) {
          err.textContent = '';
          this.inputEmail.classList.remove('input-error');
        }
      }
    });

    // 10. Live Date Validation clearing
    this.inputDate?.addEventListener('input', () => {
      const err = document.getElementById('book-date-error');
      if (err && err.textContent && this.inputDate) {
        const res = validateDepartureDate(this.inputDate.value);
        if (res.isValid) {
          err.textContent = '';
          this.inputDate.classList.remove('input-error');
        }
      }
    });

    // 11. Promo Code Application
    this.btnApplyPromo?.addEventListener('click', () => {
      const code = this.inputPromo?.value.trim().toUpperCase() || '';
      if (!code) {
        this.showToast('Please enter a voucher code before applying.', 'error');
        return;
      }
      if (code === 'EXPLORE15') {
        this.appliedPromoCode = 'EXPLORE15';
        this.appliedDiscountPercent = 15;
        if (this.badgePromo) {
          this.badgePromo.style.display = 'inline-flex';
          this.badgePromo.innerHTML = '<i class="fa-solid fa-circle-check"></i> 15% VIP Welcome Voucher Applied!';
        }
        this.updateLivePrice();
        this.showToast('ðŸŽ‰ Promo code EXPLORE15 applied! 15% discount activated.');
      } else {
        this.showToast('Invalid or expired promo code. Try EXPLORE15!', 'error');
      }
    });

    // 12. Booking Form Submission
    this.bookingForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleBookingSubmit();
    });
  }

  /**
   * Resolve a destination object from its ID or fallback title
   */
  private resolveDestination(id: string, fallbackTitle?: string | null): Destination | null {
    if (!id && !fallbackTitle) return null;

    const matched = DestinationService.getDestinationById(id);
    if (matched) return matched;

    // Fallback: construct default destination object from card attributes
    if (id.includes('rome') || (fallbackTitle && fallbackTitle.toLowerCase().includes('rome'))) {
      return DestinationService.STATIC_TOP_DESTINATIONS['static-rome'];
    }
    if (id.includes('london') || (fallbackTitle && fallbackTitle.toLowerCase().includes('london'))) {
      return DestinationService.STATIC_TOP_DESTINATIONS['static-london'];
    }
    if (id.includes('europe') || (fallbackTitle && fallbackTitle.toLowerCase().includes('europe'))) {
      return DestinationService.STATIC_TOP_DESTINATIONS['static-europe'];
    }
    if (id.includes('greece') || (fallbackTitle && fallbackTitle.toLowerCase().includes('greece'))) {
      return DestinationService.STATIC_TOP_DESTINATIONS['static-greece'];
    }

    return null;
  }

  /**
   * Open Details Popup Modal for a destination
   */
  public openDetailsModal(dest: Destination): void {
    this.currentDestination = dest;
    this.closeAllModals();

    if (!this.detailsModal) return;

    if (this.modalCoverImg) {
      this.modalCoverImg.src = dest.imageUrl;
      this.modalCoverImg.alt = dest.title;
      this.modalCoverImg.onerror = () => {
        if (this.modalCoverImg) {
          this.modalCoverImg.src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';
        }
      };
    }

    if (this.modalRating) {
      this.modalRating.innerHTML = `<i class="fa-solid fa-star"></i> ${dest.rating.toFixed(1)}`;
    }

    if (this.modalDuration) {
      this.modalDuration.innerHTML = `<i class="fa-solid fa-location-arrow"></i> ${dest.duration}`;
    }

    if (this.modalTitle) {
      this.modalTitle.textContent = dest.title;
    }

    if (this.modalSubtitle) {
      this.modalSubtitle.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${dest.subtitle || 'Global Destination'}`;
    }

    if (this.modalPrice) {
      this.modalPrice.textContent = dest.price;
    }

    if (this.modalDesc) {
      this.modalDesc.textContent = dest.description;
    }

    const isFav = DestinationService.getFavoriteIds().includes(dest.id);
    this.updateDetailsFavBtn(isFav);

    this.detailsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  /**
   * Open Booking Form Popup Modal for a destination
   */
  public openBookingModal(dest: Destination): void {
    this.currentDestination = dest;
    this.closeAllModals();

    if (!this.bookingModal) return;

    // Reset views: show form, hide success receipt
    if (this.bookingFormScreen) this.bookingFormScreen.style.display = 'block';
    if (this.bookingSuccessScreen) this.bookingSuccessScreen.style.display = 'none';

    // Populate banner
    if (this.bookingBannerImg) {
      this.bookingBannerImg.src = dest.imageUrl;
      this.bookingBannerImg.alt = dest.title;
    }

    if (this.bookingDestName) {
      this.bookingDestName.textContent = dest.title;
    }

    if (this.bookingDuration) {
      this.bookingDuration.innerHTML = `<i class="fa-solid fa-clock"></i> ${dest.duration}`;
    }

    const basePriceNum = DestinationService.parsePriceToNumber(dest.price);
    if (this.bookingBasePrice) {
      this.bookingBasePrice.innerHTML = `<i class="fa-solid fa-tag"></i> $${basePriceNum.toLocaleString()} base`;
    }

    // Reset form errors, promo & values
    this.appliedPromoCode = '';
    this.appliedDiscountPercent = 0;
    if (this.inputPromo) this.inputPromo.value = '';
    if (this.badgePromo) this.badgePromo.style.display = 'none';
    if (this.priceDiscountRow) this.priceDiscountRow.style.display = 'none';

    this.clearFormErrors();
    this.resetFormCounters();
    this.updateLivePrice();

    // Pre-fill user data if logged in
    const session = AuthService.getInstance().getCurrentSession();
    if (session) {
      if (this.inputName && !this.inputName.value) this.inputName.value = session.name;
      if (this.inputEmail && !this.inputEmail.value) this.inputEmail.value = session.email;
      if (this.inputPhone && !this.inputPhone.value && session.phone) {
        this.inputPhone.value = formatPhoneNumber(session.phone);
      }
    }

    this.bookingModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Focus on full name input for immediate accessibility
    setTimeout(() => {
      this.inputName?.focus();
    }, 100);
  }

  /**
   * Close all active dialog modals
   */
  public closeAllModals(): void {
    if (this.detailsModal) this.detailsModal.style.display = 'none';
    if (this.bookingModal) this.bookingModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  private updateDetailsFavBtn(isFav: boolean): void {
    if (!this.modalFavBtn) return;
    this.modalFavBtn.classList.toggle('active', isFav);
    const icon = this.modalFavBtn.querySelector('i');
    const span = this.modalFavBtn.querySelector('span');

    if (icon) {
      icon.className = isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    }
    if (span) {
      span.textContent = isFav ? 'Saved to Wishlist' : 'Add to Wishlist';
    }
  }

  private adjustGuestCount(type: 'adults' | 'children', delta: number): void {
    if (type === 'adults' && this.inputAdults) {
      const cur = parseInt(this.inputAdults.value || '1', 10);
      const next = Math.max(1, Math.min(10, (isNaN(cur) ? 1 : cur) + delta));
      this.inputAdults.value = String(next);
    } else if (type === 'children' && this.inputChildren) {
      const cur = parseInt(this.inputChildren.value || '0', 10);
      const next = Math.max(0, Math.min(6, (isNaN(cur) ? 0 : cur) + delta));
      this.inputChildren.value = String(next);
    }

    this.updateLivePrice();
  }

  private getSelectedTier(): PackageTier {
    const checked = document.querySelector<HTMLInputElement>('input[name="package-tier"]:checked');
    return (checked?.value as PackageTier) || 'standard';
  }

  /**
   * Recalculate live prices in the booking summary with promo discount support
   */
  private updateLivePrice(): void {
    if (!this.currentDestination) return;

    const basePerPerson = DestinationService.parsePriceToNumber(this.currentDestination.price);
    const adults = Math.max(1, parseInt(this.inputAdults?.value || '1', 10) || 1);
    const children = Math.max(0, parseInt(this.inputChildren?.value || '0', 10) || 0);
    const tier = this.getSelectedTier();

    let tierMultiplier = 1.0;
    if (tier === 'deluxe') tierMultiplier = 1.2;
    if (tier === 'luxury') tierMultiplier = 1.4;

    const grossSubtotal = Math.round((adults * basePerPerson + children * (basePerPerson * 0.5)) * tierMultiplier);
    const discount = this.appliedDiscountPercent > 0 ? Math.round(grossSubtotal * (this.appliedDiscountPercent / 100)) : 0;
    const subtotal = grossSubtotal - discount;
    const taxAndFees = Math.round(subtotal * 0.05);
    const total = subtotal + taxAndFees;

    if (this.priceBreakdown) {
      const adultLabel = `${adults} Adult${adults > 1 ? 's' : ''}`;
      const childLabel = children > 0 ? `, ${children} Child${children > 1 ? 'ren' : ''}` : '';
      const tierLabel = tier !== 'standard' ? ` (${tier.toUpperCase()})` : '';
      this.priceBreakdown.textContent = `${adultLabel}${childLabel}${tierLabel}`;
    }

    if (this.priceSubtotal) {
      this.priceSubtotal.textContent = `$${grossSubtotal.toLocaleString()}`;
    }

    if (this.priceDiscountRow && this.priceDiscountVal) {
      if (discount > 0) {
        this.priceDiscountRow.style.display = 'flex';
        this.priceDiscountVal.textContent = `-$${discount.toLocaleString()}`;
      } else {
        this.priceDiscountRow.style.display = 'none';
      }
    }

    if (this.priceTax) {
      this.priceTax.textContent = `$${taxAndFees.toLocaleString()}`;
    }

    if (this.priceTotal) {
      this.priceTotal.textContent = `$${total.toLocaleString()}`;
    }
  }

  private resetFormCounters(): void {
    if (this.inputAdults) this.inputAdults.value = '1';
    if (this.inputChildren) this.inputChildren.value = '0';
    const standardRadio = document.querySelector<HTMLInputElement>('input[name="package-tier"][value="standard"]');
    if (standardRadio) {
      standardRadio.checked = true;
      document.querySelectorAll('.package-tier-card').forEach((c) => c.classList.remove('active'));
      standardRadio.closest('.package-tier-card')?.classList.add('active');
    }
  }

  private clearFormErrors(): void {
    document.querySelectorAll('.field-error').forEach((el) => {
      el.textContent = '';
    });
    document.querySelectorAll('.input-error').forEach((el) => {
      el.classList.remove('input-error', 'shake-animation');
    });
  }

  /**
   * Validate and submit booking with strict phone, email, name, and departure date verification
   */
  private handleBookingSubmit(): void {
    if (
      !AuthMiddleware.requireAuth({
        actionName: 'confirm this flight reservation and book your vacation',
        customMessage:
          'You must be signed in to finalize and record travel bookings to your verified Jadoo profile.',
      })
    ) {
      return;
    }

    this.clearFormErrors();

    const name = this.inputName?.value.trim() || '';
    const email = this.inputEmail?.value.trim() || '';
    const phone = this.inputPhone?.value.trim() || '';
    const date = this.inputDate?.value || '';

    let isValid = true;
    let firstErrorField: HTMLElement | null = null;

    // 1. Legal Name Validation
    const nameRes = validatePassengerName(name);
    if (!nameRes.isValid) {
      const err = document.getElementById('book-name-error');
      if (err) err.textContent = nameRes.error || 'Please provide your full legal name.';
      this.inputName?.classList.add('input-error', 'shake-animation');
      setTimeout(() => this.inputName?.classList.remove('shake-animation'), 350);
      if (!firstErrorField) firstErrorField = this.inputName;
      isValid = false;
    }

    // 2. Email Validation
    const emailRes = validateEmail(email);
    if (!emailRes.isValid) {
      const err = document.getElementById('book-email-error');
      if (err) err.textContent = emailRes.error || 'Please enter a valid email address.';
      this.inputEmail?.classList.add('input-error', 'shake-animation');
      setTimeout(() => this.inputEmail?.classList.remove('shake-animation'), 350);
      if (!firstErrorField) firstErrorField = this.inputEmail;
      isValid = false;
    }

    // 3. Strict Phone Number Validation (ITU E.164 standard, 7-15 digits, no letters)
    const phoneRes = validatePhoneNumber(phone);
    if (!phoneRes.isValid) {
      const err = document.getElementById('book-phone-error');
      if (err) err.textContent = phoneRes.error || 'Please provide a valid contact phone number.';
      this.inputPhone?.classList.add('input-error', 'shake-animation');
      setTimeout(() => this.inputPhone?.classList.remove('shake-animation'), 350);
      if (!firstErrorField) firstErrorField = this.inputPhone;
      isValid = false;
    }

    // 4. Departure Date Validation (cannot be in the past)
    const dateRes = validateDepartureDate(date);
    if (!dateRes.isValid) {
      const err = document.getElementById('book-date-error');
      if (err) err.textContent = dateRes.error || 'Please select your preferred departure date.';
      this.inputDate?.classList.add('input-error', 'shake-animation');
      setTimeout(() => this.inputDate?.classList.remove('shake-animation'), 350);
      if (!firstErrorField) firstErrorField = this.inputDate;
      isValid = false;
    }

    if (!isValid || !this.currentDestination) {
      firstErrorField?.focus();
      return;
    }

    const adults = Math.max(1, parseInt(this.inputAdults?.value || '1', 10) || 1);
    const children = Math.max(0, parseInt(this.inputChildren?.value || '0', 10) || 0);
    const tier = this.getSelectedTier();
    const basePerPerson = DestinationService.parsePriceToNumber(this.currentDestination.price);

    let tierMultiplier = 1.0;
    if (tier === 'deluxe') tierMultiplier = 1.2;
    if (tier === 'luxury') tierMultiplier = 1.4;

    const grossSubtotal = Math.round((adults * basePerPerson + children * (basePerPerson * 0.5)) * tierMultiplier);
    const discount = this.appliedDiscountPercent > 0 ? Math.round(grossSubtotal * (this.appliedDiscountPercent / 100)) : 0;
    const subtotal = grossSubtotal - discount;
    const total = subtotal + Math.round(subtotal * 0.05);

    const formattedPhone = phoneRes.formatted || phone;

    const bookingReq: BookingRequest = {
      destinationId: this.currentDestination.id,
      destinationTitle: this.currentDestination.title,
      destinationImage: this.currentDestination.imageUrl,
      fullName: name,
      email,
      phone: formattedPhone,
      departureDate: date,
      adults,
      children,
      packageTier: tier,
      notes: this.inputNotes?.value.trim(),
      basePricePerPerson: basePerPerson,
      totalPrice: total,
      promoCode: this.appliedPromoCode || undefined,
    };

    // Save to storage & sync with backend
    const record = DestinationService.saveBooking(bookingReq);

    // Present Success Screen Receipt
    if (this.receiptBookingId) this.receiptBookingId.textContent = `#${record.bookingId}`;
    if (this.receiptDestName) this.receiptDestName.textContent = record.destinationTitle;
    if (this.receiptTravelerName) this.receiptTravelerName.textContent = record.fullName;
    if (this.receiptTravelerPhone) this.receiptTravelerPhone.textContent = formattedPhone;
    if (this.receiptTravelerEmail) this.receiptTravelerEmail.textContent = email;
    if (this.receiptTravelDate) {
      try {
        const d = new Date(record.departureDate + 'T00:00:00');
        this.receiptTravelDate.textContent = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {
        this.receiptTravelDate.textContent = record.departureDate;
      }
    }
    if (this.receiptGuests) {
      const guestText = `${adults} Adult${adults > 1 ? 's' : ''}${children > 0 ? `, ${children} Child${children > 1 ? 'ren' : ''}` : ''}`;
      this.receiptGuests.textContent = `${guestText} (${tier.toUpperCase()})`;
    }
    if (this.receiptDiscountRow && this.receiptDiscountVal) {
      if (this.appliedDiscountPercent > 0) {
        this.receiptDiscountRow.style.display = 'flex';
        this.receiptDiscountVal.textContent = `-${this.appliedDiscountPercent}% (${this.appliedPromoCode})`;
      } else {
        this.receiptDiscountRow.style.display = 'none';
      }
    }
    if (this.receiptTotalPrice) {
      this.receiptTotalPrice.textContent = `$${record.totalPrice.toLocaleString()}`;
    }

    // Switch view
    if (this.bookingFormScreen) this.bookingFormScreen.style.display = 'none';
    if (this.bookingSuccessScreen) {
      this.bookingSuccessScreen.style.display = 'block';
    }

    this.showToast(`ðŸŽ‰ Reservation confirmed for ${record.destinationTitle}!`);
  }

  private showToast(message: string, _type?: 'success' | 'error'): void {
    let toast = document.getElementById('jadoo-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'jadoo-toast';
      toast.className = 'jadoo-toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
      toast?.classList.remove('show');
    }, 3200);
  }
}
