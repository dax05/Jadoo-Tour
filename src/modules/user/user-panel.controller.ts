import { BookingRecord } from '../../types/destination.types';
import { DestinationService } from '../../services/destination.service';
import { DestinationModalController } from '../destinations/destination-modal.controller';

import { AuthMiddleware } from '../../middleware/auth.middleware';
import { AuthService } from '../../services/auth.service';
import { formatPhoneNumber } from '../../utils/validation.utils';

export class UserPanelController {
  // Navigation trigger buttons
  private navWishlistBtn: HTMLButtonElement | null = null;
  private navBookingsBtn: HTMLButtonElement | null = null;
  private navWishlistBadge: HTMLElement | null = null;
  private navBookingsBadge: HTMLElement | null = null;

  // Drawer Elements
  private drawerOverlay: HTMLElement | null = null;
  private drawerPanel: HTMLElement | null = null;
  private drawerCloseBtn: HTMLButtonElement | null = null;
  private tabWishlistBtn: HTMLButtonElement | null = null;
  private tabBookingsBtn: HTMLButtonElement | null = null;
  private tabWishlistBadge: HTMLElement | null = null;
  private tabBookingsBadge: HTMLElement | null = null;
  private tabContentWishlist: HTMLElement | null = null;
  private tabContentBookings: HTMLElement | null = null;
  private wishlistItemsList: HTMLElement | null = null;
  private bookingsItemsList: HTMLElement | null = null;
  private clearWishlistBtn: HTMLButtonElement | null = null;

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

  private activeTab: 'wishlist' | 'bookings' = 'wishlist';

  constructor() {
    this.initElements();
    this.bindEvents();
    this.syncBadges();
    this.listenToServiceUpdates();
    this.initUrlDrawerState();
  }

  private initUrlDrawerState(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const drawerParam = urlParams.get('drawer') || (window.location.hash === '#drawer-bookings' ? 'bookings' : window.location.hash === '#drawer-wishlist' ? 'wishlist' : null);
    if (drawerParam === 'wishlist' || drawerParam === 'bookings') {
      if (drawerParam === 'bookings' && !AuthMiddleware.isAuthenticated()) {
        // Leave drawer closed or open locked view
      } else {
        setTimeout(() => this.openDrawer(drawerParam), 120);
      }
    }
  }

  private initElements(): void {
    // Nav triggers
    this.navWishlistBtn = document.getElementById('nav-wishlist-btn') as HTMLButtonElement | null;
    this.navBookingsBtn = document.getElementById('nav-bookings-btn') as HTMLButtonElement | null;
    this.navWishlistBadge = document.getElementById('nav-wishlist-badge');
    this.navBookingsBadge = document.getElementById('nav-bookings-badge');

    // Drawer container & tabs
    this.drawerOverlay = document.getElementById('user-travel-drawer-overlay');
    this.drawerPanel = document.getElementById('user-travel-drawer');
    this.drawerCloseBtn = document.getElementById('drawer-close-btn') as HTMLButtonElement | null;
    this.tabWishlistBtn = document.getElementById('drawer-tab-wishlist') as HTMLButtonElement | null;
    this.tabBookingsBtn = document.getElementById('drawer-tab-bookings') as HTMLButtonElement | null;
    this.tabWishlistBadge = document.getElementById('drawer-wishlist-count');
    this.tabBookingsBadge = document.getElementById('drawer-bookings-count');
    this.tabContentWishlist = document.getElementById('drawer-view-wishlist');
    this.tabContentBookings = document.getElementById('drawer-view-bookings');
    this.wishlistItemsList = document.getElementById('drawer-wishlist-list');
    this.bookingsItemsList = document.getElementById('drawer-bookings-list');
    this.clearWishlistBtn = document.getElementById('drawer-clear-wishlist') as HTMLButtonElement | null;

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

  private bindEvents(): void {
    // Nav open triggers
    this.navWishlistBtn?.addEventListener('click', () => {
      this.openDrawer('wishlist');
    });

    this.navBookingsBtn?.addEventListener('click', () => {
      if (
        !AuthMiddleware.requireAuth({
          actionName: 'view your trip bookings and boarding passes',
          customMessage:
            'You must be signed in to access your booked trips, reservation references, and electronic boarding passes.',
          redirectUrl: 'index.html?drawer=bookings',
        })
      ) {
        return;
      }
      this.openDrawer('bookings');
    });

    // Close drawer
    this.drawerCloseBtn?.addEventListener('click', () => {
      this.closeDrawer();
    });

    this.drawerOverlay?.addEventListener('click', (e) => {
      if (e.target === this.drawerOverlay) {
        this.closeDrawer();
      }
    });

    // Tab switching
    this.tabWishlistBtn?.addEventListener('click', () => {
      this.switchTab('wishlist');
    });

    this.tabBookingsBtn?.addEventListener('click', () => {
      if (
        !AuthMiddleware.requireAuth({
          actionName: 'access your bookings tab',
          customMessage:
            'Please log in or create an account to view and manage confirmed travel reservations.',
          redirectUrl: 'index.html?drawer=bookings',
        })
      ) {
        return;
      }
      this.switchTab('bookings');
    });

    // Clear wishlist
    this.clearWishlistBtn?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your saved wishlist?')) {
        DestinationService.clearWishlist();
        this.showToast('Wishlist cleared.');
      }
    });

    // Boarding pass print button
    this.bpPrintBtn?.addEventListener('click', () => {
      window.print();
    });

    // Boarding pass close buttons
    this.boardingPassModal?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target === this.boardingPassModal || target.closest('[data-close-bp]')) {
        this.closeBoardingPass();
      }
    });

    // Keyboard ESC
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.boardingPassModal && this.boardingPassModal.style.display === 'flex') {
          this.closeBoardingPass();
        } else if (this.drawerOverlay && this.drawerOverlay.classList.contains('open')) {
          this.closeDrawer();
        }
      }
    });

    // Wishlist list action delegation
    this.wishlistItemsList?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Remove from wishlist
      const removeBtn = target.closest<HTMLButtonElement>('.wishlist-remove-btn');
      if (removeBtn) {
        const destId = removeBtn.getAttribute('data-id');
        if (destId) {
          DestinationService.removeFromWishlist(destId);
          this.showToast('Removed from wishlist.');
        }
        return;
      }

      // Book Now
      const bookBtn = target.closest<HTMLButtonElement>('.wishlist-book-btn');
      if (bookBtn) {
        const destId = bookBtn.getAttribute('data-id');
        if (destId) {
          const dest = DestinationService.getDestinationById(destId);
          if (dest) {
            this.closeDrawer();
            setTimeout(() => {
              DestinationModalController.instance?.openBookingModal(dest);
            }, 250);
          }
        }
        return;
      }

      // View Details
      const detailsBtn = target.closest<HTMLButtonElement>('.wishlist-details-btn');
      if (detailsBtn) {
        const destId = detailsBtn.getAttribute('data-id');
        if (destId) {
          const dest = DestinationService.getDestinationById(destId);
          if (dest) {
            this.closeDrawer();
            setTimeout(() => {
              DestinationModalController.instance?.openDetailsModal(dest);
            }, 250);
          }
        }
        return;
      }
    });

    // Bookings list action delegation
    this.bookingsItemsList?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // View Boarding Pass
      const ticketBtn = target.closest<HTMLButtonElement>('.booking-ticket-btn');
      if (ticketBtn) {
        const bookingId = ticketBtn.getAttribute('data-booking-id');
        if (bookingId) {
          const record = DestinationService.getBookings().find((b) => b.bookingId === bookingId);
          if (record) {
            this.openBoardingPass(record);
          }
        }
        return;
      }

      // Cancel Booking
      const cancelBtn = target.closest<HTMLButtonElement>('.booking-cancel-btn');
      if (cancelBtn) {
        const bookingId = cancelBtn.getAttribute('data-booking-id');
        if (bookingId) {
          if (confirm(`Are you sure you want to cancel reservation ${bookingId}?`)) {
            DestinationService.cancelBooking(bookingId);
            this.showToast(`Booking ${bookingId} has been cancelled.`);
          }
        }
        return;
      }

      // Delete Record
      const deleteBtn = target.closest<HTMLButtonElement>('.booking-delete-btn');
      if (deleteBtn) {
        const bookingId = deleteBtn.getAttribute('data-booking-id');
        if (bookingId) {
          if (confirm(`Remove this booking record from your device?`)) {
            DestinationService.deleteBooking(bookingId);
            this.showToast('Booking record removed.');
          }
        }
        return;
      }
    });
  }

  /**
   * Listen to reactive storage events from DestinationService
   */
  private listenToServiceUpdates(): void {
    DestinationService.onWishlistChange(() => {
      this.syncBadges();
      if (this.activeTab === 'wishlist' && this.isDrawerOpen()) {
        this.renderWishlist();
      }
    });

    DestinationService.onBookingsChange(() => {
      this.syncBadges();
      if (this.activeTab === 'bookings' && this.isDrawerOpen()) {
        this.renderBookings();
      }
    });

    // Reactive subscription to auth state changes for real-time badge and drawer view updates
    AuthService.getInstance().subscribe(() => {
      this.syncBadges();
      if (this.activeTab === 'bookings' && this.isDrawerOpen()) {
        this.renderBookings();
      }
    });
  }

  /**
   * Sync badge numbers on nav buttons and drawer tabs
   */
  public syncBadges(): void {
    const wishlist = DestinationService.getWishlistDestinations();
    const bookings = DestinationService.getBookings();

    const wishCount = wishlist.length;
    const isAuth = AuthMiddleware.isAuthenticated();
    const bookCount = isAuth ? bookings.filter((b) => b.status === 'confirmed').length : 0;

    // Nav wishlist badge
    if (this.navWishlistBadge) {
      this.navWishlistBadge.textContent = String(wishCount);
      this.navWishlistBadge.style.display = wishCount > 0 ? 'inline-flex' : 'none';
    }

    // Nav bookings badge (authenticated only)
    if (this.navBookingsBadge) {
      this.navBookingsBadge.textContent = String(bookCount);
      this.navBookingsBadge.style.display = bookCount > 0 ? 'inline-flex' : 'none';
    }

    // Drawer tabs badges
    if (this.tabWishlistBadge) {
      this.tabWishlistBadge.textContent = String(wishCount);
    }
    if (this.tabBookingsBadge) {
      this.tabBookingsBadge.textContent = isAuth ? String(bookings.length) : '0';
    }
  }

  /**
   * Open the drawer with the specified initial tab
   */
  public openDrawer(tab: 'wishlist' | 'bookings' = 'wishlist'): void {
    this.switchTab(tab);
    if (this.drawerOverlay && this.drawerPanel) {
      this.drawerOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * Close the drawer
   */
  public closeDrawer(): void {
    if (this.drawerOverlay) {
      this.drawerOverlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  private isDrawerOpen(): boolean {
    return Boolean(this.drawerOverlay?.classList.contains('open'));
  }

  /**
   * Switch between Wishlist and Bookings tabs
   */
  public switchTab(tab: 'wishlist' | 'bookings'): void {
    this.activeTab = tab;

    if (tab === 'wishlist') {
      this.tabWishlistBtn?.classList.add('active');
      this.tabBookingsBtn?.classList.remove('active');
      if (this.tabContentWishlist) this.tabContentWishlist.style.display = 'block';
      if (this.tabContentBookings) this.tabContentBookings.style.display = 'none';
      this.renderWishlist();
    } else {
      this.tabBookingsBtn?.classList.add('active');
      this.tabWishlistBtn?.classList.remove('active');
      if (this.tabContentBookings) this.tabContentBookings.style.display = 'block';
      if (this.tabContentWishlist) this.tabContentWishlist.style.display = 'none';
      this.renderBookings();
    }
  }

  /**
   * Render the Saved Wishlist items
   */
  private renderWishlist(): void {
    if (!this.wishlistItemsList) return;

    const wishlist = DestinationService.getWishlistDestinations();

    if (wishlist.length === 0) {
      if (this.clearWishlistBtn) this.clearWishlistBtn.style.display = 'none';
      this.wishlistItemsList.innerHTML = `
        <div class="drawer-empty-state">
          <div class="empty-icon-wrap">
            <i class="fa-regular fa-heart"></i>
          </div>
          <h4>Your Wishlist is Empty</h4>
          <p>Browse world destinations, find your dream places, and click the heart icon to save them here for later!</p>
          <button type="button" class="drawer-cta-btn" id="drawer-explore-cta">
            <i class="fa-solid fa-compass"></i>
            <span>Explore Destinations</span>
          </button>
        </div>
      `;

      const exploreCta = document.getElementById('drawer-explore-cta');
      exploreCta?.addEventListener('click', () => {
        this.closeDrawer();
        const exploreBtn = document.getElementById('explore-dest-btn');
        if (exploreBtn) {
          exploreBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (!exploreBtn.classList.contains('active')) {
            exploreBtn.click();
          }
        }
      });
      return;
    }

    if (this.clearWishlistBtn) this.clearWishlistBtn.style.display = 'inline-flex';

    this.wishlistItemsList.innerHTML = wishlist
      .map((dest) => {
        return `
          <div class="drawer-card wishlist-card" data-id="${dest.id}">
            <div class="card-thumb-wrap">
              <img src="${dest.imageUrl}" alt="${dest.title}" class="card-thumb" onerror="this.src='https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'" />
              <span class="card-rating-tag"><i class="fa-solid fa-star"></i> ${dest.rating.toFixed(1)}</span>
            </div>
            <div class="card-details">
              <div class="card-top-row">
                <h4 class="card-title">${dest.title}</h4>
                <button type="button" class="wishlist-remove-btn" data-id="${dest.id}" title="Remove from wishlist" aria-label="Remove ${dest.title}">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
              <p class="card-subtitle"><i class="fa-solid fa-location-dot"></i> ${dest.subtitle || 'Global Destination'}</p>
              <div class="card-meta-row">
                <span class="card-duration"><i class="fa-solid fa-clock"></i> ${dest.duration}</span>
                <span class="card-price">${dest.price}</span>
              </div>
              <div class="card-actions-row">
                <button type="button" class="wishlist-details-btn" data-id="${dest.id}">
                  <span>Details</span>
                </button>
                <button type="button" class="wishlist-book-btn" data-id="${dest.id}">
                  <i class="fa-solid fa-paper-plane"></i>
                  <span>Book Now</span>
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * Render My Bookings list
   */
  private renderBookings(): void {
    if (!this.bookingsItemsList) return;

    if (!AuthMiddleware.isAuthenticated()) {
      AuthMiddleware.renderLockedState(this.bookingsItemsList, {
        title: 'Sign In to View Your Bookings',
        message:
          'Your reservations, travel tickets, and electronic boarding passes are protected. Please sign in to your verified account to access them.',
      });
      return;
    }

    const bookings = DestinationService.getBookings();

    if (bookings.length === 0) {
      this.bookingsItemsList.innerHTML = `
        <div class="drawer-empty-state">
          <div class="empty-icon-wrap">
            <i class="fa-solid fa-suitcase-rolling"></i>
          </div>
          <h4>No Booked Trips Yet</h4>
          <p>You haven't reserved any travel packages yet. Select any destination and click "Book This Trip" to reserve your spot!</p>
          <button type="button" class="drawer-cta-btn" id="drawer-book-cta">
            <i class="fa-solid fa-earth-americas"></i>
            <span>Browse Top Trips</span>
          </button>
        </div>
      `;

      const bookCta = document.getElementById('drawer-book-cta');
      bookCta?.addEventListener('click', () => {
        this.closeDrawer();
        const destSection = document.getElementById('destinations');
        destSection?.scrollIntoView({ behavior: 'smooth' });
      });
      return;
    }

    this.bookingsItemsList.innerHTML = bookings
      .map((b) => {
        const isCancelled = b.status === 'cancelled';
        const statusClass = isCancelled ? 'status-cancelled' : 'status-confirmed';
        const statusIcon = isCancelled ? 'fa-circle-xmark' : 'fa-circle-check';
        const statusLabel = isCancelled ? 'Cancelled' : 'Confirmed';

        return `
          <div class="drawer-card booking-card ${isCancelled ? 'cancelled' : ''}" data-booking-id="${b.bookingId}">
            <div class="booking-card-header">
              <div class="booking-ref-block">
                <span class="booking-ref-label">Booking ID</span>
                <strong class="booking-ref-code">${b.bookingId}</strong>
              </div>
              <span class="booking-status-pill ${statusClass}">
                <i class="fa-solid ${statusIcon}"></i> ${statusLabel}
              </span>
            </div>

            <div class="booking-card-main">
              <img src="${b.destinationImage}" alt="${b.destinationTitle}" class="booking-dest-thumb" onerror="this.src='https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'" />
              <div class="booking-dest-info">
                <h4 class="booking-title">${b.destinationTitle}</h4>
                <p class="booking-date"><i class="fa-solid fa-calendar-days"></i> Departs: <strong>${b.departureDate}</strong></p>
                <p class="booking-guests"><i class="fa-solid fa-user-group"></i> ${b.adults} Adult${b.adults > 1 ? 's' : ''}${b.children > 0 ? `, ${b.children} Child${b.children > 1 ? 'ren' : ''}` : ''} • <span class="tier-tag">${b.packageTier.toUpperCase()}</span></p>
                <p class="booking-price"><i class="fa-solid fa-receipt"></i> Paid Total: <strong>$${b.totalPrice.toLocaleString()}</strong></p>
              </div>
            </div>

            <div class="booking-card-footer">
              <button type="button" class="booking-ticket-btn" data-booking-id="${b.bookingId}">
                <i class="fa-solid fa-ticket"></i>
                <span>View E-Ticket</span>
              </button>
              ${
                !isCancelled
                  ? `
                <button type="button" class="booking-cancel-btn" data-booking-id="${b.bookingId}" title="Cancel this trip">
                  <i class="fa-solid fa-ban"></i>
                  <span>Cancel Trip</span>
                </button>
              `
                  : `
                <button type="button" class="booking-delete-btn" data-booking-id="${b.bookingId}" title="Remove record">
                  <i class="fa-solid fa-trash-can"></i>
                  <span>Remove</span>
                </button>
              `
              }
            </div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * Open Boarding Pass / E-Ticket Modal
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
      this.bpGuests.textContent = `${record.adults} Adult${record.adults > 1 ? 's' : ''}${
        record.children > 0 ? ` + ${record.children} Child` : ''
      }`;
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
   * Close Boarding Pass Modal
   */
  public closeBoardingPass(): void {
    if (this.boardingPassModal) {
      this.boardingPassModal.style.display = 'none';
    }
  }

  /**
   * Show notification toast
   */
  private showToast(message: string): void {
    const existing = document.querySelector('.dest-toast');
    existing?.remove();

    const toast = document.createElement('div');
    toast.className = 'dest-toast';
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <i class="fa-solid fa-circle-info"></i>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}
