import { Destination } from '../../types/destination.types';
import { DestinationService } from '../../services/destination.service';
import { DestinationMapController } from './destination-map.controller';

export class DestinationExplorerController {
  private exploreBtn: HTMLButtonElement | null = null;
  private explorerSection: HTMLElement | null = null;
  private searchForm: HTMLFormElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private clearBtn: HTMLButtonElement | null = null;
  private gridContainer: HTMLElement | null = null;
  private statusText: HTMLElement | null = null;
  private filterPills: NodeListOf<HTMLButtonElement> | null = null;

  private isLoaded = false;
  private isExpanded = false;
  private currentDestinations: Destination[] = [];
  private debounceTimer: number | null = null;

  constructor() {
    this.initElements();
    if (this.exploreBtn && this.explorerSection) {
      this.bindEvents();
    }
  }

  private initElements(): void {
    this.exploreBtn = document.getElementById('explore-dest-btn') as HTMLButtonElement | null;
    this.explorerSection = document.getElementById('destination-explorer');
    this.searchForm = document.getElementById('dest-search-form') as HTMLFormElement | null;
    this.searchInput = document.getElementById('dest-search-input') as HTMLInputElement | null;
    this.clearBtn = document.getElementById('dest-search-clear') as HTMLButtonElement | null;
    this.gridContainer = document.getElementById('dest-dynamic-grid');
    this.statusText = document.getElementById('dest-status-text');
    this.filterPills = document.querySelectorAll('.dest-filter-pill');
  }

  private bindEvents(): void {
    // 1. Explore Destination Button Click
    this.exploreBtn?.addEventListener('click', () => {
      this.toggleExplorer();
    });

    // 2. Search Form Submit
    this.searchForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = this.searchInput?.value.trim() || '';
      this.executeSearch(query);
    });

    // 3. Search Input Live Typing (with debounce)
    this.searchInput?.addEventListener('input', () => {
      const val = this.searchInput?.value || '';
      this.toggleClearButton(val.length > 0);

      if (this.debounceTimer) {
        window.clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = window.setTimeout(() => {
        this.executeSearch(val.trim());
      }, 400);
    });

    // 4. Clear Search Button
    this.clearBtn?.addEventListener('click', () => {
      if (this.searchInput) {
        this.searchInput.value = '';
        this.searchInput.focus();
      }
      this.toggleClearButton(false);
      this.resetActivePills();
      this.executeSearch('');
    });

    // 5. Category Filter Pills
    this.filterPills?.forEach((pill) => {
      pill.addEventListener('click', () => {
        const category = pill.getAttribute('data-category');
        this.setActivePill(pill);
        this.handleCategoryFilter(category);
      });
    });

    // 6. Dynamic Card Grid delegation (Favorite heart toggle)
    this.gridContainer?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Handle Favorite Button Click
      const favBtn = target.closest<HTMLButtonElement>('.dest-fav-btn');
      if (favBtn) {
        e.stopPropagation();
        const destId = favBtn.getAttribute('data-id');
        if (destId) {
          const dest = DestinationService.getDestinationById(destId);
          const isNowFav = DestinationService.toggleFavorite(dest || destId);
          favBtn.classList.toggle('active', isNowFav);
          favBtn.setAttribute('aria-label', isNowFav ? 'Remove from favorites' : 'Add to favorites');
          const heartIcon = favBtn.querySelector('i');
          if (heartIcon) {
            heartIcon.className = isNowFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
          }
          this.showToast(isNowFav ? 'Saved to your wishlist! ❤️' : 'Removed from wishlist.');
        }
        return;
      }
    });
  }

  /**
   * Toggle the explorer section open/closed
   */
  private toggleExplorer(): void {
    this.isExpanded = !this.isExpanded;

    if (this.explorerSection) {
      if (this.isExpanded) {
        this.explorerSection.style.display = 'block';
        this.exploreBtn?.classList.add('active');
        this.exploreBtn?.setAttribute('aria-expanded', 'true');
        const span = this.exploreBtn?.querySelector('span');
        if (span) span.textContent = 'Hide Explorer';

        // Load destinations if first time opening
        if (!this.isLoaded) {
          this.loadInitialDestinations();
        }

        // Smooth scroll so the explorer is visible
        setTimeout(() => {
          this.explorerSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          this.searchInput?.focus();
        }, 100);
      } else {
        this.explorerSection.style.display = 'none';
        this.exploreBtn?.classList.remove('active');
        this.exploreBtn?.setAttribute('aria-expanded', 'false');
        const span = this.exploreBtn?.querySelector('span');
        if (span) span.textContent = 'Explore Destination';
      }
    }
  }

  /**
   * Fetch and render the 8 initial destinations
   */
  private async loadInitialDestinations(): Promise<void> {
    this.renderSkeletons(8);
    this.updateStatus('Fetching 8 featured world destinations from free Wikipedia API...');

    try {
      const destinations = await DestinationService.getInitialDestinations();
      this.currentDestinations = destinations;
      this.isLoaded = true;
      this.renderCards(destinations);
      this.updateStatus(`Showing 8 featured destinations around the world`);
    } catch (err) {
      console.error('[DestinationExplorer] Error loading initial destinations:', err);
      this.renderError('Unable to load live destinations right now. Please try again.');
    }
  }

  /**
   * Search method: query the free Wikipedia API for what the user wants
   */
  private async executeSearch(query: string): Promise<void> {
    if (!query) {
      this.updateStatus('Showing 8 featured destinations around the world');
      await this.loadInitialDestinations();
      return;
    }

    this.renderSkeletons(4);
    this.updateStatus(`Searching live destinations for "${query}"...`);

    try {
      const results = await DestinationService.searchDestinations(query);
      this.currentDestinations = results;

      if (results.length === 0) {
        this.renderEmptyState(query);
        this.updateStatus(`No destinations found for "${query}"`);
      } else {
        this.renderCards(results);
        this.updateStatus(`Found ${results.length} destination${results.length > 1 ? 's' : ''} for "${query}"`);
      }
    } catch (err) {
      console.error('[DestinationExplorer] Search failed:', err);
      this.renderError(`Search error while fetching "${query}". Please try again.`);
    }
  }

  /**
   * Filter initial destinations by category
   */
  private handleCategoryFilter(category: string | null): void {
    if (!category || category === 'all') {
      this.loadInitialDestinations();
      return;
    }

    if (!this.isLoaded) {
      this.loadInitialDestinations().then(() => {
        this.filterLoadedByCategory(category);
      });
    } else {
      this.filterLoadedByCategory(category);
    }
  }

  private filterLoadedByCategory(category: string): void {
    const filtered = this.currentDestinations.filter((d) => d.category === category);
    if (filtered.length > 0) {
      this.renderCards(filtered);
      this.updateStatus(`Showing ${filtered.length} destinations in ${category.toUpperCase()}`);
    } else {
      // If none in the 8 seeds, execute a targeted search
      if (this.searchInput) {
        this.searchInput.value = category;
        this.toggleClearButton(true);
      }
      this.executeSearch(category);
    }
  }

  /**
   * Render destination cards into the grid
   */
  private renderCards(destinations: Destination[]): void {
    if (!this.gridContainer) return;

    // Register destinations for immediate modal lookup
    destinations.forEach((d) => DestinationService.registerDestination(d));
    DestinationMapController.getInstance()?.updateDestinations(destinations);

    this.gridContainer.innerHTML = destinations
      .map((dest) => {
        const heartClass = dest.isFavorite ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        const activeClass = dest.isFavorite ? 'active' : '';

        return `
          <article class="destcards dynamic-destcard" data-id="${dest.id}" data-dest-id="${dest.id}" tabindex="0" role="button" aria-label="View details for ${dest.title}">
            <div class="dest-img-wrap">
              <img 
                src="${dest.imageUrl}" 
                class="dest-img" 
                alt="${dest.title}" 
                loading="lazy" 
                onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';"
              />
              <button 
                type="button" 
                class="dest-fav-btn ${activeClass}" 
                data-id="${dest.id}" 
                aria-label="${dest.isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
                title="Save destination"
              >
                <i class="${heartClass}"></i>
              </button>
              <div class="dest-badge">
                <i class="fa-solid fa-star"></i>
                <span>${dest.rating.toFixed(1)}</span>
              </div>
            </div>

            <div class="d-card-ut">
              <div class="d-card-row">
                <h4 class="ct-name" title="${dest.title}">${dest.title}</h4>
                <span class="ct-price">${dest.price}</span>
              </div>

              <div class="d-card-sub">
                <i class="fa-solid fa-location-arrow"></i>
                <span class="dest-dz">${dest.duration}</span>
              </div>

              <p class="dest-desc">${dest.description}</p>

              <div class="dest-card-actions">
                <button 
                  type="button" 
                  class="dest-book-btn" 
                  data-dest-id="${dest.id}"
                  data-title="${dest.title}"
                >
                  <span>Book This Trip</span>
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }

  /**
   * Render shimmer skeleton loading cards
   */
  private renderSkeletons(count = 8): void {
    if (!this.gridContainer) return;

    const skeletonsHtml = Array.from({ length: count })
      .map(
        () => `
        <article class="destcards dynamic-destcard skeleton-card" aria-hidden="true">
          <div class="skeleton-img skeleton-pulse"></div>
          <div class="d-card-ut">
            <div class="skeleton-line title skeleton-pulse"></div>
            <div class="skeleton-line sub skeleton-pulse"></div>
            <div class="skeleton-line desc skeleton-pulse"></div>
            <div class="skeleton-line desc short skeleton-pulse"></div>
            <div class="skeleton-btn skeleton-pulse"></div>
          </div>
        </article>
      `
      )
      .join('');

    this.gridContainer.innerHTML = skeletonsHtml;
  }

  /**
   * Render empty state when search produces no results
   */
  private renderEmptyState(query: string): void {
    if (!this.gridContainer) return;

    this.gridContainer.innerHTML = `
      <div class="dest-empty-state">
        <div class="empty-icon"><i class="fa-solid fa-magnifying-glass-location"></i></div>
        <h3>No Destinations Found</h3>
        <p>We couldn't find any destination matches for "<strong>${this.escapeHtml(query)}</strong>". Try searching for iconic cities like <em>Tokyo, Paris, Rome, Bali, Cairo</em> or <em>Sydney</em>.</p>
        <button type="button" class="empty-reset-btn" id="empty-reset-btn">
          <i class="fa-solid fa-rotate-left"></i>
          <span>Reset Search</span>
        </button>
      </div>
    `;

    document.getElementById('empty-reset-btn')?.addEventListener('click', () => {
      if (this.searchInput) {
        this.searchInput.value = '';
        this.searchInput.focus();
      }
      this.toggleClearButton(false);
      this.resetActivePills();
      this.executeSearch('');
    });
  }

  /**
   * Render error message
   */
  private renderError(message: string): void {
    if (!this.gridContainer) return;

    this.gridContainer.innerHTML = `
      <div class="dest-empty-state dest-error-state">
        <div class="empty-icon error"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <h3>Connection Issue</h3>
        <p>${this.escapeHtml(message)}</p>
        <button type="button" class="empty-reset-btn" id="error-retry-btn">
          <i class="fa-solid fa-arrow-rotate-right"></i>
          <span>Try Again</span>
        </button>
      </div>
    `;

    document.getElementById('error-retry-btn')?.addEventListener('click', () => {
      this.loadInitialDestinations();
    });
  }

  private updateStatus(msg: string): void {
    if (this.statusText) {
      this.statusText.textContent = msg;
    }
  }

  private toggleClearButton(visible: boolean): void {
    if (this.clearBtn) {
      this.clearBtn.style.display = visible ? 'flex' : 'none';
    }
  }

  private setActivePill(activePill: HTMLButtonElement): void {
    this.filterPills?.forEach((pill) => pill.classList.remove('active'));
    activePill.classList.add('active');
  }

  private resetActivePills(): void {
    this.filterPills?.forEach((pill, idx) => {
      if (idx === 0) pill.classList.add('active');
      else pill.classList.remove('active');
    });
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Show a smooth floating toast notification
   */
  private showToast(message: string): void {
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
    }, 3000);
  }
}
