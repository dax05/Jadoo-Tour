import { AuthService } from '../../services/auth.service';
import { DestinationService } from '../../services/destination.service';
import { BookingRecord } from '../../types/destination.types';
import { UserSession } from '../../types/auth.types';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { validatePhoneNumber, sanitizePhoneInput, formatPhoneNumber } from '../../utils/validation.utils';

export class ProfileController {
  private authService: AuthService;
  private currentSession: UserSession | null = null;
  private isDemoMode = false;

  // Header Elements
  private userAvatarText: HTMLElement | null = null;
  private userAvatarWrapper: HTMLElement | null = null;
  private userNameHeading: HTMLElement | null = null;
  private userEmailSub: HTMLElement | null = null;
  private userLoyaltyBadge: HTMLElement | null = null;
  private userMemberSince: HTMLElement | null = null;

  // Stats Elements
  private statTripsCount: HTMLElement | null = null;
  private statWishlistCount: HTMLElement | null = null;
  private statPointsCount: HTMLElement | null = null;
  private guestNotice: HTMLElement | null = null;
  private navLoginLink: HTMLElement | null = null;
  private navLogoutBtn: HTMLElement | null = null;
  private badgeVerified: HTMLElement | null = null;

  // Tab Buttons & Panels
  private tabBtns: NodeListOf<HTMLButtonElement> | null = null;
  private tabPanels: NodeListOf<HTMLElement> | null = null;

  // Personal Details Form
  private formDetails: HTMLFormElement | null = null;
  private inputName: HTMLInputElement | null = null;
  private inputEmail: HTMLInputElement | null = null;
  private inputPhone: HTMLInputElement | null = null;
  private inputHomeAirport: HTMLInputElement | null = null;
  private inputBio: HTMLTextAreaElement | null = null;

  // Travel Preferences Form
  private formPreferences: HTMLFormElement | null = null;
  private selectCurrency: HTMLSelectElement | null = null;
  private selectLanguage: HTMLSelectElement | null = null;
  private selectMeal: HTMLSelectElement | null = null;
  private selectSeat: HTMLSelectElement | null = null;
  private checkEmailAlerts: HTMLInputElement | null = null;
  private checkSmsAlerts: HTMLInputElement | null = null;

  // Security Form
  private formSecurity: HTMLFormElement | null = null;
  private inputOldPassword: HTMLInputElement | null = null;
  private inputNewPassword: HTMLInputElement | null = null;
  private inputConfirmNewPassword: HTMLInputElement | null = null;

  // Lists Containers
  private bookingsListEl: HTMLElement | null = null;
  private wishlistListEl: HTMLElement | null = null;

  // Boarding Pass Modal Elements
  private boardingPassModal: HTMLElement | null = null;
  private bpPassengerName: HTMLElement | null = null;
  private bpPassengerPhone: HTMLElement | null = null;
  private bpBookingRef: HTMLElement | null = null;
  private bpDestTitle: HTMLElement | null = null;
  private bpDepartureDate: HTMLElement | null = null;
  private bpDuration: HTMLElement | null = null;
  private bpPackageTier: HTMLElement | null = null;
  private bpGuests: HTMLElement | null = null;
  private bpTotalPrice: HTMLElement | null = null;
  private bpStatusBadge: HTMLElement | null = null;
  private bpPrintBtn: HTMLButtonElement | null = null;

  // Avatar Modal Elements
  private avatarModal: HTMLElement | null = null;
  private openAvatarBtn: HTMLButtonElement | null = null;

  constructor() {
    this.authService = AuthService.getInstance();
    this.initElements();
    this.initSessionData();
    this.bindEvents();
    this.renderProfile();
    this.renderBookings();
    this.renderWishlist();

    // Check URL parameters & hash for initial tab (e.g. profile.html?tab=bookings)
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab') || window.location.hash.replace('#', '');
    const validTabs = ['details', 'preferences', 'bookings', 'wishlist', 'security'];
    if (tabParam && validTabs.includes(tabParam)) {
      this.switchTab(tabParam);
    }
  }

  private initElements(): void {
    // Header & identity
    this.userAvatarText = document.getElementById('profile-avatar-text');
    this.userAvatarWrapper = document.getElementById('profile-avatar-display');
    this.userNameHeading = document.getElementById('profile-name-heading');
    this.userEmailSub = document.getElementById('profile-email-sub');
    this.userLoyaltyBadge = document.getElementById('profile-loyalty-badge');
    this.userMemberSince = document.getElementById('profile-member-since');
    this.guestNotice = document.getElementById('profile-guest-notice');
    this.navLoginLink = document.getElementById('profile-nav-login');
    this.navLogoutBtn = document.getElementById('profile-nav-logout');
    this.badgeVerified = document.querySelector('.profile-badge-verified');

    // Stats
    this.statTripsCount = document.getElementById('stat-trips-count');
    this.statWishlistCount = document.getElementById('stat-wishlist-count');
    this.statPointsCount = document.getElementById('stat-points-count');

    // Tabs
    this.tabBtns = document.querySelectorAll('.profile-nav-tab');
    this.tabPanels = document.querySelectorAll('.profile-tab-panel');

    // Forms
    this.formDetails = document.getElementById('form-profile-details') as HTMLFormElement | null;
    this.inputName = document.getElementById('input-profile-name') as HTMLInputElement | null;
    this.inputEmail = document.getElementById('input-profile-email') as HTMLInputElement | null;
    this.inputPhone = document.getElementById('input-profile-phone') as HTMLInputElement | null;
    this.inputHomeAirport = document.getElementById('input-profile-airport') as HTMLInputElement | null;
    this.inputBio = document.getElementById('input-profile-bio') as HTMLTextAreaElement | null;

    this.formPreferences = document.getElementById('form-profile-preferences') as HTMLFormElement | null;
    this.selectCurrency = document.getElementById('select-pref-currency') as HTMLSelectElement | null;
    this.selectLanguage = document.getElementById('select-pref-language') as HTMLSelectElement | null;
    this.selectMeal = document.getElementById('select-pref-meal') as HTMLSelectElement | null;
    this.selectSeat = document.getElementById('select-pref-seat') as HTMLSelectElement | null;
    this.checkEmailAlerts = document.getElementById('check-email-alerts') as HTMLInputElement | null;
    this.checkSmsAlerts = document.getElementById('check-sms-alerts') as HTMLInputElement | null;

    this.formSecurity = document.getElementById('form-profile-security') as HTMLFormElement | null;
    this.inputOldPassword = document.getElementById('input-old-password') as HTMLInputElement | null;
    this.inputNewPassword = document.getElementById('input-new-password') as HTMLInputElement | null;
    this.inputConfirmNewPassword = document.getElementById('input-confirm-password') as HTMLInputElement | null;

    // Lists
    this.bookingsListEl = document.getElementById('profile-bookings-list');
    this.wishlistListEl = document.getElementById('profile-wishlist-grid');

    // Avatar Modal
    this.avatarModal = document.getElementById('avatar-picker-modal');
    this.openAvatarBtn = document.getElementById('btn-change-avatar') as HTMLButtonElement | null;

    // Boarding Pass Modal
    this.boardingPassModal = document.getElementById('boarding-pass-modal');
    this.bpPassengerName = document.getElementById('bp-passenger-name');
    this.bpPassengerPhone = document.getElementById('bp-passenger-phone');
    this.bpBookingRef = document.getElementById('bp-booking-ref');
    this.bpDestTitle = document.getElementById('bp-dest-title');
    this.bpDepartureDate = document.getElementById('bp-departure-date');
    this.bpDuration = document.getElementById('bp-duration');
    this.bpPackageTier = document.getElementById('bp-package-tier');
    this.bpGuests = document.getElementById('bp-guests');
    this.bpTotalPrice = document.getElementById('bp-total-price');
    this.bpStatusBadge = document.getElementById('bp-status-badge');
    this.bpPrintBtn = document.getElementById('bp-print-btn') as HTMLButtonElement | null;
  }

  private initSessionData(): void {
    const session = this.authService.getCurrentSession();
    if (session) {
      this.currentSession = session;
      this.isDemoMode = false;
      if (this.guestNotice) this.guestNotice.style.display = 'none';
      if (this.navLoginLink) this.navLoginLink.style.display = 'none';
      if (this.navLogoutBtn) this.navLogoutBtn.style.display = 'inline-flex';
      if (this.badgeVerified) {
        this.badgeVerified.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verified Member';
        this.badgeVerified.classList.remove('is-guest');
      }
    } else {
      // Default Demo Traveler Preview
      this.isDemoMode = true;
      this.currentSession = {
        name: 'Sarah Jenkins',
        email: 'sarah.jenkins@example.com',
        loggedInAt: new Date().toISOString(),
        phone: '+1 (555) 749-2810',
        avatar: 'avatar-1',
        bio: 'Passionate globetrotter seeking sunset vistas, historic cobblestones, and local street cuisine.',
        country: 'United States',
        loyaltyTier: 'Gold Adventurer',
        loyaltyPoints: 1450,
        preferences: {
          currency: 'USD',
          language: 'English',
          mealPreference: 'Standard',
          seatPreference: 'Window',
          homeAirport: 'JFK — New York International',
          emailAlerts: true,
          smsAlerts: true,
        },
      };
      if (this.guestNotice) this.guestNotice.style.display = 'flex';
      if (this.navLoginLink) this.navLoginLink.style.display = 'inline-flex';
      if (this.navLogoutBtn) this.navLogoutBtn.style.display = 'none';
      if (this.badgeVerified) {
        this.badgeVerified.innerHTML = '<i class="fa-solid fa-user-astronaut"></i> Guest Preview';
        this.badgeVerified.classList.add('is-guest');
      }
    }
  }

  private bindEvents(): void {
    // 1. Tab switching
    this.tabBtns?.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (targetTab) {
          if (targetTab === 'bookings' && this.isDemoMode) {
            AuthMiddleware.requireAuth({
              actionName: 'access your travel bookings',
              customMessage:
                'You are currently in guest preview mode. Please log in or create an account to view and manage your travel bookings.',
              returnToTab: 'bookings',
            });
          }
          this.switchTab(targetTab);
        }
      });
    });

    // 2. Personal Details form submit
    this.formDetails?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.savePersonalDetails();
    });

    // Live Phone Input Sanitization & Real-time Validation for profile
    this.inputPhone?.addEventListener('input', () => {
      if (this.inputPhone) {
        this.inputPhone.value = sanitizePhoneInput(this.inputPhone.value);
        const err = document.getElementById('input-profile-phone-error');
        if (err && err.textContent) {
          const res = validatePhoneNumber(this.inputPhone.value);
          if (res.isValid || !this.inputPhone.value.trim()) {
            err.textContent = '';
            this.inputPhone.classList.remove('input-error');
          }
        }
      }
    });

    this.inputPhone?.addEventListener('blur', () => {
      if (this.inputPhone && this.inputPhone.value.trim()) {
        const res = validatePhoneNumber(this.inputPhone.value);
        const err = document.getElementById('input-profile-phone-error');
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

    // 3. Travel Preferences form submit
    this.formPreferences?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.savePreferences();
    });

    // 4. Security Password update
    this.formSecurity?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.updatePassword();
    });

    // 5. Logout buttons
    const logoutBtns = document.querySelectorAll('.profile-logout-action');
    logoutBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.authService.logout();
        window.location.href = 'index.html';
      });
    });

    // 6. Avatar picker modal triggers
    this.openAvatarBtn?.addEventListener('click', () => {
      if (this.avatarModal) this.avatarModal.style.display = 'flex';
    });

    this.avatarModal?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target === this.avatarModal || target.closest('[data-close-avatar]')) {
        if (this.avatarModal) this.avatarModal.style.display = 'none';
      }

      const avatarOption = target.closest<HTMLElement>('.avatar-choice-card');
      if (avatarOption) {
        const avatarKey = avatarOption.getAttribute('data-avatar');
        if (avatarKey) {
          this.selectAvatar(avatarKey);
        }
      }
    });

    // 7. Boarding Pass Modal Print & Close
    this.bpPrintBtn?.addEventListener('click', () => {
      window.print();
    });

    this.boardingPassModal?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target === this.boardingPassModal || target.closest('[data-close-bp]')) {
        if (this.boardingPassModal) this.boardingPassModal.style.display = 'none';
      }
    });

    // 8. ESC Key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.avatarModal) this.avatarModal.style.display = 'none';
        if (this.boardingPassModal) this.boardingPassModal.style.display = 'none';
      }
    });

    // 9. Wishlist & Bookings reactivity
    DestinationService.onWishlistChange(() => {
      this.renderWishlist();
      this.updateStats();
    });

    DestinationService.onBookingsChange(() => {
      this.renderBookings();
      this.updateStats();
    });

    // 10. Reactive auth listener
    this.authService.subscribe(() => {
      this.initSessionData();
      this.renderProfile();
      this.renderBookings();
      this.renderWishlist();
    });
  }

  /**
   * Switch between Profile Tabs
   */
  public switchTab(tabId: string): void {
    this.tabBtns?.forEach((btn) => {
      const isActive = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });

    this.tabPanels?.forEach((panel) => {
      const isTarget = panel.id === `tab-panel-${tabId}`;
      panel.style.display = isTarget ? 'block' : 'none';
    });

    // Update URL query parameter
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    history.replaceState(null, '', url.toString());
  }

  /**
   * Render User Info into the Profile UI
   */
  private renderProfile(): void {
    if (!this.currentSession) return;

    const session = this.currentSession;
    const displayName = session.name || 'Traveler';
    const initial = displayName.charAt(0).toUpperCase();

    if (this.userNameHeading) this.userNameHeading.textContent = displayName;
    if (this.userEmailSub) this.userEmailSub.textContent = session.email;
    if (this.userAvatarText) this.userAvatarText.textContent = initial;
    if (this.userAvatarWrapper) {
      this.userAvatarWrapper.setAttribute('data-avatar', session.avatar || 'avatar-1');
    }

    if (this.userLoyaltyBadge) {
      this.userLoyaltyBadge.innerHTML = `<i class="fa-solid fa-crown"></i> ${session.loyaltyTier || 'Gold Adventurer'}`;
    }

    if (this.userMemberSince) {
      const year = new Date().getFullYear();
      this.userMemberSince.textContent = `Member since ${year}`;
    }

    // Populate Personal Details Form
    if (this.inputName) this.inputName.value = session.name || '';
    if (this.inputEmail) this.inputEmail.value = session.email || '';
    if (this.inputPhone) this.inputPhone.value = session.phone || '';
    if (this.inputHomeAirport) this.inputHomeAirport.value = session.preferences?.homeAirport || '';
    if (this.inputBio) this.inputBio.value = session.bio || '';

    // Populate Preferences Form
    const prefs = session.preferences;
    if (this.selectCurrency && prefs?.currency) this.selectCurrency.value = prefs.currency;
    if (this.selectLanguage && prefs?.language) this.selectLanguage.value = prefs.language;
    if (this.selectMeal && prefs?.mealPreference) this.selectMeal.value = prefs.mealPreference;
    if (this.selectSeat && prefs?.seatPreference) this.selectSeat.value = prefs.seatPreference;
    if (this.checkEmailAlerts) this.checkEmailAlerts.checked = prefs?.emailAlerts ?? true;
    if (this.checkSmsAlerts) this.checkSmsAlerts.checked = prefs?.smsAlerts ?? true;

    this.updateStats();
  }

  /**
   * Update Quick Travel Stats
   */
  private updateStats(): void {
    const bookings = DestinationService.getBookings();
    const wishlist = DestinationService.getWishlistDestinations();
    const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;

    if (this.statTripsCount) this.statTripsCount.textContent = String(confirmedCount);
    if (this.statWishlistCount) this.statWishlistCount.textContent = String(wishlist.length);
    if (this.statPointsCount) {
      const points = (this.currentSession?.loyaltyPoints ?? 1250) + confirmedCount * 350;
      this.statPointsCount.textContent = points.toLocaleString();
    }
  }

  /**
   * Save Personal Details
   */
  private savePersonalDetails(): void {
    const name = this.inputName?.value.trim() || '';
    const email = this.inputEmail?.value.trim().toLowerCase() || '';
    const phone = this.inputPhone?.value.trim() || '';
    const homeAirport = this.inputHomeAirport?.value.trim() || '';
    const bio = this.inputBio?.value.trim() || '';

    // Clear previous errors
    const phoneErr = document.getElementById('input-profile-phone-error');
    if (phoneErr) phoneErr.textContent = '';
    this.inputPhone?.classList.remove('input-error');

    if (!name || name.length < 2) {
      this.showToast('Please enter a valid full name (at least 2 characters).', 'error');
      return;
    }

    if (!email || !email.includes('@')) {
      this.showToast('Please enter a valid email address.', 'error');
      return;
    }

    let formattedPhone = phone;
    if (phone) {
      const phoneRes = validatePhoneNumber(phone);
      if (!phoneRes.isValid) {
        if (phoneErr) phoneErr.textContent = phoneRes.error || 'Please enter a valid phone number.';
        this.inputPhone?.classList.add('input-error', 'shake-animation');
        setTimeout(() => this.inputPhone?.classList.remove('shake-animation'), 350);
        this.inputPhone?.focus();
        this.showToast(phoneRes.error || 'Please enter a valid phone number.', 'error');
        return;
      }
      formattedPhone = phoneRes.formatted || phone;
      if (this.inputPhone) this.inputPhone.value = formattedPhone;
    }

    if (!this.isDemoMode) {
      const res = this.authService.updateProfile({
        name,
        email,
        phone: formattedPhone,
        bio,
        preferences: {
          ...this.currentSession?.preferences,
          homeAirport,
        },
      });

      if (!res.success) {
        this.showToast(res.error || 'Failed to update profile.', 'error');
        return;
      }

      this.currentSession = res.user || null;
    } else {
      if (this.currentSession) {
        this.currentSession.name = name;
        this.currentSession.email = email;
        this.currentSession.phone = phone;
        this.currentSession.bio = bio;
        if (!this.currentSession.preferences) this.currentSession.preferences = {};
        this.currentSession.preferences.homeAirport = homeAirport;
      }
    }

    this.renderProfile();
    this.showToast('Profile information successfully saved! 🎉');
  }

  /**
   * Save Travel Preferences
   */
  private savePreferences(): void {
    const currency = this.selectCurrency?.value;
    const language = this.selectLanguage?.value;
    const mealPreference = this.selectMeal?.value;
    const seatPreference = this.selectSeat?.value;
    const emailAlerts = this.checkEmailAlerts?.checked ?? true;
    const smsAlerts = this.checkSmsAlerts?.checked ?? true;

    const newPreferences = {
      ...this.currentSession?.preferences,
      currency,
      language,
      mealPreference,
      seatPreference,
      emailAlerts,
      smsAlerts,
    };

    if (!this.isDemoMode) {
      this.authService.updateProfile({
        preferences: newPreferences,
      });
    }

    if (this.currentSession) {
      this.currentSession.preferences = newPreferences;
    }

    this.showToast('Travel preferences saved! ✈️');
  }

  /**
   * Change Password
   */
  private updatePassword(): void {
    const oldPass = this.inputOldPassword?.value || '';
    const newPass = this.inputNewPassword?.value || '';
    const confirmPass = this.inputConfirmNewPassword?.value || '';

    if (this.isDemoMode) {
      AuthMiddleware.requireAuth({
        actionName: 'update your security password',
        customMessage:
          'You are viewing in guest preview mode. Please sign in or create an account to manage security credentials.',
      });
      if (this.formSecurity) this.formSecurity.reset();
      return;
    }

    if (!oldPass) {
      this.showToast('Please enter your current password.', 'error');
      return;
    }

    if (!newPass || newPass.length < 8) {
      this.showToast('New password must be at least 8 characters.', 'error');
      return;
    }

    if (newPass !== confirmPass) {
      this.showToast('New passwords do not match.', 'error');
      return;
    }

    const res = this.authService.changePassword(oldPass, newPass);
    if (!res.success) {
      this.showToast(res.error || 'Failed to update password.', 'error');
      return;
    }

    if (this.formSecurity) this.formSecurity.reset();
    this.showToast('Password successfully updated! 🔒');
  }

  /**
   * Avatar selection
   */
  private selectAvatar(avatarKey: string): void {
    if (this.userAvatarWrapper) {
      this.userAvatarWrapper.setAttribute('data-avatar', avatarKey);
    }

    if (!this.isDemoMode) {
      this.authService.updateProfile({ avatar: avatarKey });
    }

    if (this.currentSession) {
      this.currentSession.avatar = avatarKey;
    }

    if (this.avatarModal) this.avatarModal.style.display = 'none';
    this.showToast('Avatar updated! 📸');
  }

  /**
   * Render User Bookings in Profile Tab
   */
  private renderBookings(): void {
    if (!this.bookingsListEl) return;

    if (this.isDemoMode) {
      AuthMiddleware.renderLockedState(this.bookingsListEl, {
        title: 'Sign In to Access Your Bookings',
        message:
          'You are currently viewing in guest preview mode. Confirmed reservations, itinerary details, and digital boarding passes require a verified Jadoo account.',
      });
      return;
    }

    const bookings = DestinationService.getBookings();

    if (bookings.length === 0) {
      this.bookingsListEl.innerHTML = `
        <div class="profile-empty-state">
          <div class="empty-icon"><i class="fa-solid fa-plane-slash"></i></div>
          <h3>No Trip Reservations Yet</h3>
          <p>You haven't reserved any travel packages yet. Explore our curated destinations and confirm your next vacation!</p>
          <a href="index.html#destinations" class="profile-cta-btn">
            <i class="fa-solid fa-compass"></i>
            <span>Browse Destinations</span>
          </a>
        </div>
      `;
      return;
    }

    this.bookingsListEl.innerHTML = bookings
      .map((b) => {
        const isCancelled = b.status === 'cancelled';
        return `
          <div class="profile-booking-card ${isCancelled ? 'cancelled' : ''}">
            <div class="pb-header">
              <div class="pb-ref">
                <span class="pb-ref-label">Booking Reference</span>
                <strong class="pb-ref-code">${b.bookingId}</strong>
              </div>
              <span class="pb-status ${isCancelled ? 'cancelled' : 'confirmed'}">
                <i class="fa-solid ${isCancelled ? 'fa-circle-xmark' : 'fa-circle-check'}"></i>
                ${isCancelled ? 'Cancelled' : 'Confirmed'}
              </span>
            </div>

            <div class="pb-body">
              <img src="${b.destinationImage}" alt="${b.destinationTitle}" class="pb-thumb" onerror="this.src='https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'" />
              <div class="pb-info">
                <h4 class="pb-title">${b.destinationTitle}</h4>
                <div class="pb-meta">
                  <span><i class="fa-solid fa-calendar-days"></i> Departs: <strong>${b.departureDate}</strong></span>
                  <span><i class="fa-solid fa-user-group"></i> ${b.adults} Adults${b.children > 0 ? `, ${b.children} Children` : ''}</span>
                  <span><i class="fa-solid fa-gem"></i> ${b.packageTier.toUpperCase()} Package</span>
                  <span><i class="fa-solid fa-wallet"></i> Total: <strong>$${b.totalPrice.toLocaleString()}</strong></span>
                </div>
              </div>
            </div>

            <div class="pb-footer">
              <button type="button" class="pb-btn-ticket" data-booking-id="${b.bookingId}">
                <i class="fa-solid fa-ticket"></i>
                <span>View Boarding Pass</span>
              </button>
              ${
                !isCancelled
                  ? `
                <button type="button" class="pb-btn-cancel" data-booking-id="${b.bookingId}">
                  <i class="fa-solid fa-ban"></i>
                  <span>Cancel Trip</span>
                </button>
              `
                  : ''
              }
            </div>
          </div>
        `;
      })
      .join('');

    // Attach listeners
    this.bookingsListEl.querySelectorAll('.pb-btn-ticket').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-booking-id');
        const booking = bookings.find((b) => b.bookingId === id);
        if (booking) this.openBoardingPass(booking);
      });
    });

    this.bookingsListEl.querySelectorAll('.pb-btn-cancel').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-booking-id');
        if (id && confirm(`Are you sure you want to cancel booking ${id}?`)) {
          DestinationService.cancelBooking(id);
          this.showToast(`Booking ${id} cancelled.`);
        }
      });
    });
  }

  /**
   * Render User Wishlist in Profile Tab
   */
  private renderWishlist(): void {
    if (!this.wishlistListEl) return;

    const wishlist = DestinationService.getWishlistDestinations();

    if (wishlist.length === 0) {
      this.wishlistListEl.innerHTML = `
        <div class="profile-empty-state full-width">
          <div class="empty-icon"><i class="fa-regular fa-heart"></i></div>
          <h3>Your Wishlist is Empty</h3>
          <p>Explore world destinations on Jadoo and click the heart icon on any destination to save it here!</p>
          <a href="index.html#destinations" class="profile-cta-btn">
            <i class="fa-solid fa-earth-americas"></i>
            <span>Discover Top Places</span>
          </a>
        </div>
      `;
      return;
    }

    this.wishlistListEl.innerHTML = wishlist
      .map((dest) => {
        return `
          <div class="profile-wish-card">
            <div class="pw-thumb-wrap">
              <img src="${dest.imageUrl}" alt="${dest.title}" class="pw-thumb" onerror="this.src='https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'" />
              <button type="button" class="pw-remove-btn" data-id="${dest.id}" title="Remove from wishlist" aria-label="Remove">
                <i class="fa-solid fa-trash-can"></i>
              </button>
              <span class="pw-rating"><i class="fa-solid fa-star"></i> ${dest.rating.toFixed(1)}</span>
            </div>
            <div class="pw-content">
              <h4 class="pw-title">${dest.title}</h4>
              <p class="pw-sub"><i class="fa-solid fa-location-dot"></i> ${dest.subtitle || 'Global Destination'}</p>
              <div class="pw-meta">
                <span class="pw-dur"><i class="fa-solid fa-clock"></i> ${dest.duration}</span>
                <span class="pw-price">${dest.price}</span>
              </div>
              <a href="index.html#destinations" class="pw-book-btn">
                <span>Book on Jadoo</span>
                <i class="fa-solid fa-arrow-right"></i>
              </a>
            </div>
          </div>
        `;
      })
      .join('');

    this.wishlistListEl.querySelectorAll('.pw-remove-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-id');
        if (id) {
          DestinationService.removeFromWishlist(id);
          this.showToast('Destination removed from wishlist.');
        }
      });
    });
  }

  /**
   * Open Boarding Pass Modal
   */
  public openBoardingPass(record: BookingRecord): void {
    if (!this.boardingPassModal) return;

    if (this.bpPassengerName) this.bpPassengerName.textContent = record.fullName;
    if (this.bpPassengerPhone) this.bpPassengerPhone.textContent = record.phone ? formatPhoneNumber(record.phone) : 'Verified Contact';
    if (this.bpBookingRef) this.bpBookingRef.textContent = record.bookingId;
    if (this.bpDestTitle) this.bpDestTitle.textContent = record.destinationTitle;
    if (this.bpDepartureDate) this.bpDepartureDate.textContent = record.departureDate;
    if (this.bpDuration) this.bpDuration.textContent = 'Scheduled Flight & Resort';
    if (this.bpPackageTier) this.bpPackageTier.textContent = `${record.packageTier.toUpperCase()} PACKAGE`;
    if (this.bpGuests) {
      this.bpGuests.textContent = `${record.adults} Adults${record.children > 0 ? ` + ${record.children} Child` : ''}`;
    }
    if (this.bpTotalPrice) this.bpTotalPrice.textContent = `$${record.totalPrice.toLocaleString()} USD`;

    if (this.bpStatusBadge) {
      const isConfirmed = record.status === 'confirmed';
      this.bpStatusBadge.className = `bp-status-badge ${isConfirmed ? 'confirmed' : 'cancelled'}`;
      this.bpStatusBadge.innerHTML = `<i class="fa-solid ${isConfirmed ? 'fa-circle-check' : 'fa-circle-xmark'}"></i> ${
        isConfirmed ? 'OFFICIALLY CONFIRMED' : 'CANCELLED'
      }`;
    }

    this.boardingPassModal.style.display = 'flex';
  }

  /**
   * Toast notification
   */
  private showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    const existing = document.querySelector('.profile-toast');
    existing?.remove();

    const toast = document.createElement('div');
    toast.className = `profile-toast ${type}`;
    const icon = type === 'error' ? 'fa-circle-xmark' : type === 'info' ? 'fa-circle-info' : 'fa-circle-check';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 10);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}
