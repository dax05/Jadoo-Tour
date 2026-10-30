import { Destination } from '../../types/destination.types';
import { DestinationModalController } from './destination-modal.controller';

// Declare Leaflet global loaded via CDN
declare const L: any;

export class DestinationMapController {
  private static instance: DestinationMapController | null = null;

  // View toggle buttons
  private gridViewBtn: HTMLButtonElement | null = null;
  private mapViewBtn: HTMLButtonElement | null = null;
  private gridContainer: HTMLElement | null = null;
  private mapContainer: HTMLElement | null = null;
  private mapElement: HTMLElement | null = null;
  private mapFitBtn: HTMLButtonElement | null = null;

  // Leaflet map instances
  private map: any = null;
  private markerLayerGroup: any = null;
  private isMapInitialized = false;
  private currentDestinations: Destination[] = [];
  private activeView: 'grid' | 'map' = 'grid';

  constructor() {
    DestinationMapController.instance = this;
    this.initElements();
    this.bindEvents();
  }

  public static getInstance(): DestinationMapController | null {
    return DestinationMapController.instance;
  }

  private initElements(): void {
    this.gridViewBtn = document.getElementById('dest-view-grid-btn') as HTMLButtonElement | null;
    this.mapViewBtn = document.getElementById('dest-view-map-btn') as HTMLButtonElement | null;
    this.gridContainer = document.getElementById('dest-dynamic-grid');
    this.mapContainer = document.getElementById('dest-map-container');
    this.mapElement = document.getElementById('dest-leaflet-map');
    this.mapFitBtn = document.getElementById('dest-map-fit-btn') as HTMLButtonElement | null;
  }

  private bindEvents(): void {
    this.gridViewBtn?.addEventListener('click', () => {
      this.switchView('grid');
    });

    this.mapViewBtn?.addEventListener('click', () => {
      this.switchView('map');
    });

    this.mapFitBtn?.addEventListener('click', () => {
      this.fitMapToMarkers();
    });

    // Delegate clicks inside Leaflet Popups
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      const detailsBtn = target.closest<HTMLButtonElement>('.popup-btn-details');
      if (detailsBtn) {
        const destId = detailsBtn.getAttribute('data-id');
        const dest = this.currentDestinations.find((d) => d.id === destId);
        if (dest) {
          DestinationModalController.instance?.openDetailsModal(dest);
        }
        return;
      }

      const bookBtn = target.closest<HTMLButtonElement>('.popup-btn-book');
      if (bookBtn) {
        const destId = bookBtn.getAttribute('data-id');
        const dest = this.currentDestinations.find((d) => d.id === destId);
        if (dest) {
          DestinationModalController.instance?.openBookingModal(dest);
        }
        return;
      }
    });
  }

  /**
   * Switch between Grid View and Interactive World Map View
   */
  public switchView(view: 'grid' | 'map'): void {
    this.activeView = view;

    if (view === 'grid') {
      this.gridViewBtn?.classList.add('active');
      this.mapViewBtn?.classList.remove('active');
      this.gridViewBtn?.setAttribute('aria-pressed', 'true');
      this.mapViewBtn?.setAttribute('aria-pressed', 'false');

      if (this.gridContainer) this.gridContainer.style.display = 'grid';
      if (this.mapContainer) this.mapContainer.style.display = 'none';
    } else {
      this.mapViewBtn?.classList.add('active');
      this.gridViewBtn?.classList.remove('active');
      this.mapViewBtn?.setAttribute('aria-pressed', 'true');
      this.gridViewBtn?.setAttribute('aria-pressed', 'false');

      if (this.gridContainer) this.gridContainer.style.display = 'none';
      if (this.mapContainer) this.mapContainer.style.display = 'block';

      this.ensureMapInitialized();

      // Invalidate map size so Leaflet recalculates dimensions after becoming visible
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
          this.fitMapToMarkers();
        }
      }, 150);
    }
  }

  /**
   * Initialize Leaflet map and tile layer
   */
  private ensureMapInitialized(): void {
    if (this.isMapInitialized || !this.mapElement || typeof L === 'undefined') {
      return;
    }

    try {
      this.map = L.map(this.mapElement, {
        center: [25, 10],
        zoom: 2.3,
        minZoom: 2,
        maxZoom: 18,
        worldCopyJump: true,
        scrollWheelZoom: true,
      });

      // CartoDB Voyager tiles for modern travel aesthetic
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(this.map);

      this.markerLayerGroup = L.layerGroup().addTo(this.map);
      this.isMapInitialized = true;

      // Plot any pending destinations
      if (this.currentDestinations.length > 0) {
        this.plotMarkers();
      }
    } catch (err) {
      console.error('[DestinationMapController] Error initializing Leaflet map:', err);
    }
  }

  /**
   * Update the current destinations list and update map pins
   */
  public updateDestinations(destinations: Destination[]): void {
    this.currentDestinations = destinations;

    if (this.isMapInitialized) {
      this.plotMarkers();
      if (this.activeView === 'map') {
        setTimeout(() => this.fitMapToMarkers(), 200);
      }
    }
  }

  /**
   * Render custom markers on the Leaflet map
   */
  private plotMarkers(): void {
    if (!this.map || !this.markerLayerGroup || typeof L === 'undefined') return;

    this.markerLayerGroup.clearLayers();

    const withCoords = this.currentDestinations.filter((d) => d.coordinates?.lat && d.coordinates?.lon);

    withCoords.forEach((dest) => {
      const { lat, lon } = dest.coordinates!;
      const shortTitle = dest.title.split(',')[0].trim();

      // Custom HTML Pin DivIcon
      const pinIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="map-pin-container" title="${dest.title}">
            <div class="map-pin-pulse"></div>
            <div class="map-pin-head">
              <i class="fa-solid fa-location-dot"></i>
            </div>
            <div class="map-pin-label">
              <span class="pin-title">${shortTitle}</span>
              <span class="pin-price">${dest.price}</span>
            </div>
          </div>
        `,
        iconSize: [120, 42],
        iconAnchor: [18, 40],
        popupAnchor: [42, -36],
      });

      // Custom Glassmorphic Popup
      const popupHtml = `
        <div class="map-popup-card">
          <div class="popup-cover-wrap">
            <img src="${dest.imageUrl}" alt="${dest.title}" class="popup-cover" onerror="this.src='https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'" />
            <span class="popup-star-tag"><i class="fa-solid fa-star"></i> ${dest.rating.toFixed(1)}</span>
          </div>
          <div class="popup-content">
            <h4 class="popup-title">${dest.title}</h4>
            <div class="popup-badges">
              <span class="popup-duration"><i class="fa-solid fa-clock"></i> ${dest.duration}</span>
              <span class="popup-price">${dest.price}</span>
            </div>
            <p class="popup-summary">${dest.description.slice(0, 110)}...</p>
            <div class="popup-btns">
              <button type="button" class="popup-btn-details" data-id="${dest.id}">
                <i class="fa-solid fa-circle-info"></i>
                <span>Details</span>
              </button>
              <button type="button" class="popup-btn-book" data-id="${dest.id}">
                <i class="fa-solid fa-paper-plane"></i>
                <span>Book Now</span>
              </button>
            </div>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lon], { icon: pinIcon }).bindPopup(popupHtml, {
        maxWidth: 290,
        className: 'jadoo-leaflet-popup',
      });

      this.markerLayerGroup.addLayer(marker);
    });
  }

  /**
   * Fit map viewport smoothly to cover all currently plotted pins
   */
  public fitMapToMarkers(): void {
    if (!this.map || !this.markerLayerGroup || typeof L === 'undefined') return;

    const layers = this.markerLayerGroup.getLayers();
    if (layers.length === 0) {
      this.map.flyTo([25, 10], 2.3, { duration: 1 });
      return;
    }

    if (layers.length === 1) {
      const latLng = layers[0].getLatLng();
      this.map.flyTo(latLng, 6, { duration: 1.2 });
      return;
    }

    const bounds = L.latLngBounds(layers.map((layer: any) => layer.getLatLng()));
    this.map.flyToBounds(bounds.pad(0.25), {
      duration: 1.2,
      maxZoom: 7,
    });
  }
}
