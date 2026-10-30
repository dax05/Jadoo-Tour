import { Destination, WikipediaSummaryResponse, BookingRequest, BookingRecord } from '../types/destination.types';
import { StorageService } from './storage.service';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { API_CONFIG } from '../constants/config';
import { authService } from './auth.service';

interface CuratedDestinationSeed {
  slug: string;
  title: string;
  country: string;
  price: string;
  duration: string;
  rating: number;
  category: 'europe' | 'asia' | 'americas' | 'africa' | 'oceania';
  fallbackImage: string;
  fallbackDesc: string;
  coordinates: {
    lat: number;
    lon: number;
  };
}

const INITIAL_DESTINATIONS_SEED: CuratedDestinationSeed[] = [
  {
    slug: 'Paris',
    title: 'Paris, France',
    country: 'France',
    price: '$2,450',
    duration: '7 Days Trip',
    rating: 4.9,
    category: 'europe',
    fallbackImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
    fallbackDesc: 'The City of Light captivates travelers with the Eiffel Tower, world-class art at the Louvre, and charming romantic cafés along the Seine.',
    coordinates: { lat: 48.8566, lon: 2.3522 },
  },
  {
    slug: 'Tokyo',
    title: 'Tokyo, Japan',
    country: 'Japan',
    price: '$3,100',
    duration: '10 Days Trip',
    rating: 4.95,
    category: 'asia',
    fallbackImage: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
    fallbackDesc: 'A mesmerizing contrast of neon-lit skyscrapers and historic temples, celebrated for culinary mastery and cutting-edge culture.',
    coordinates: { lat: 35.6762, lon: 139.6503 },
  },
  {
    slug: 'Bali',
    title: 'Bali, Indonesia',
    country: 'Indonesia',
    price: '$1,680',
    duration: '8 Days Trip',
    rating: 4.88,
    category: 'asia',
    fallbackImage: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
    fallbackDesc: 'Tropical paradise renowned for volcanic mountains, lush terraced rice paddies, serene beaches, and sacred ancient shrines.',
    coordinates: { lat: -8.4095, lon: 115.1889 },
  },
  {
    slug: 'Rome',
    title: 'Rome, Italy',
    country: 'Italy',
    price: '$2,200',
    duration: '6 Days Trip',
    rating: 4.92,
    category: 'europe',
    fallbackImage: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80',
    fallbackDesc: 'Step back through millennia of civilization amid the majestic Colosseum, Vatican treasures, and exquisite Italian cuisine.',
    coordinates: { lat: 41.9028, lon: 12.4964 },
  },
  {
    slug: 'New_York_City',
    title: 'New York City, USA',
    country: 'United States',
    price: '$2,890',
    duration: '5 Days Trip',
    rating: 4.85,
    category: 'americas',
    fallbackImage: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80',
    fallbackDesc: 'The exhilarating metropolis of Broadway, Central Park, and the Statue of Liberty, pulsing with boundless energy and culture.',
    coordinates: { lat: 40.7128, lon: -74.0060 },
  },
  {
    slug: 'Cairo',
    title: 'Cairo, Egypt',
    country: 'Egypt',
    price: '$1,950',
    duration: '9 Days Trip',
    rating: 4.79,
    category: 'africa',
    fallbackImage: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=800&q=80',
    fallbackDesc: 'Home of the timeless Great Pyramids of Giza, the Nile River, and centuries of vibrant bazaars and Pharaonic wonders.',
    coordinates: { lat: 30.0444, lon: 31.2357 },
  },
  {
    slug: 'Santorini',
    title: 'Santorini, Greece',
    country: 'Greece',
    price: '$2,650',
    duration: '7 Days Trip',
    rating: 4.96,
    category: 'europe',
    fallbackImage: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80',
    fallbackDesc: 'Iconic whitewashed cliffside villas, cobalt-blue domes, and world-famous golden sunsets overlooking the Aegean caldera.',
    coordinates: { lat: 36.3932, lon: 25.4615 },
  },
  {
    slug: 'Sydney',
    title: 'Sydney, Australia',
    country: 'Australia',
    price: '$3,400',
    duration: '12 Days Trip',
    rating: 4.87,
    category: 'oceania',
    fallbackImage: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=80',
    fallbackDesc: 'A sun-drenched coastal capital boasting the architectural jewel of the Sydney Opera House, Harbour Bridge, and Bondi Beach.',
    coordinates: { lat: -33.8688, lon: 151.2093 },
  },
];

export class DestinationService {
  private static searchCache: Map<string, Destination[]> = new Map();
  private static initialCache: Destination[] | null = null;

  /**
   * Helper to determine if an image url is a valid photographic thumbnail
   */
  private static isScenicPhoto(url: string | undefined): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    // Exclude maps, coats of arms, flags, or icons
    if (lower.includes('flag') || lower.includes('map') || lower.includes('coat_of_arms') || lower.includes('symbol') || lower.includes('.svg')) {
      return false;
    }
    return true;
  }

  /**
   * Cleans Wikipedia summary extracts to concise readable sentences
   */
  private static cleanExtract(extract: string | undefined, maxChars = 140): string {
    if (!extract) return 'Discover picturesque views, unique heritage, and unforgettable travel experiences.';
    const sanitized = extract.replace(/\s*\([^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim();
    if (sanitized.length <= maxChars) return sanitized;
    const truncated = sanitized.slice(0, maxChars);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 60 ? truncated.slice(0, lastSpace) : truncated) + '...';
  }

  /**
   * Generate an estimated travel package price deterministically based on title
   */
  private static estimatePrice(seedStr: string): string {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash << 5) - hash + seedStr.charCodeAt(i);
      hash |= 0;
    }
    const val = 1200 + (Math.abs(hash) % 2800);
    return `$${(val / 1000).toFixed(2)}k`;
  }

  /**
   * Generate an estimated trip duration
   */
  private static estimateDuration(seedStr: string): string {
    const days = 5 + (seedStr.length % 10);
    return `${days} Days Trip`;
  }

  private static wishlistListeners: Array<(items: Destination[]) => void> = [];
  private static bookingsListeners: Array<(records: BookingRecord[]) => void> = [];

  /**
   * Subscribe to wishlist changes (favorites added/removed)
   */
  public static onWishlistChange(cb: (items: Destination[]) => void): () => void {
    this.wishlistListeners.push(cb);
    return () => {
      this.wishlistListeners = this.wishlistListeners.filter((l) => l !== cb);
    };
  }

  /**
   * Subscribe to bookings changes (trips booked/cancelled)
   */
  public static onBookingsChange(cb: (records: BookingRecord[]) => void): () => void {
    this.bookingsListeners.push(cb);
    return () => {
      this.bookingsListeners = this.bookingsListeners.filter((l) => l !== cb);
    };
  }

  private static notifyWishlistChange(): void {
    const items = this.getWishlistDestinations();
    this.wishlistListeners.forEach((cb) => {
      try { cb(items); } catch (e) { console.error('[DestinationService] Wishlist listener error:', e); }
    });
  }

  private static notifyBookingsChange(): void {
    const records = this.getBookings();
    this.bookingsListeners.forEach((cb) => {
      try { cb(records); } catch (e) { console.error('[DestinationService] Bookings listener error:', e); }
    });
  }

  /**
   * Get list of favorited destination IDs from local storage
   */
  public static getFavoriteIds(): string[] {
    return StorageService.getItem<string[]>(STORAGE_KEYS.FAVORITES, []);
  }

  /**
   * Retrieve all saved wishlist destination objects
   */
  public static getWishlistDestinations(): Destination[] {
    return StorageService.getItem<Destination[]>(STORAGE_KEYS.WISHLIST_ITEMS, []);
  }

  /**
   * Toggle favorite state for a destination (supports either full Destination object or string ID)
   */
  public static toggleFavorite(destOrId: Destination | string): boolean {
    const id = typeof destOrId === 'string' ? destOrId : destOrId.id;
    const favorites = this.getFavoriteIds();
    const wishlistItems = this.getWishlistDestinations();
    const index = favorites.indexOf(id);
    let isNowFavorite = false;

    if (index >= 0) {
      favorites.splice(index, 1);
      isNowFavorite = false;
      const itemIdx = wishlistItems.findIndex((d) => d.id === id);
      if (itemIdx >= 0) {
        wishlistItems.splice(itemIdx, 1);
      }
    } else {
      favorites.push(id);
      isNowFavorite = true;

      // Find or build full destination object to persist in wishlist
      const resolved = typeof destOrId === 'string' ? this.getDestinationById(id) : destOrId;
      if (resolved && !wishlistItems.some((d) => d.id === id)) {
        wishlistItems.push({
          ...resolved,
          isFavorite: true,
        });
      }
    }

    StorageService.setItem(STORAGE_KEYS.FAVORITES, favorites);
    StorageService.setItem(STORAGE_KEYS.WISHLIST_ITEMS, wishlistItems);
    this.notifyWishlistChange();
    this.syncWishlistToBackend(id);
    return isNowFavorite;
  }

  /**
   * Remove a destination from wishlist
   */
  public static removeFromWishlist(id: string): void {
    const favorites = this.getFavoriteIds().filter((favId) => favId !== id);
    const wishlistItems = this.getWishlistDestinations().filter((d) => d.id !== id);
    StorageService.setItem(STORAGE_KEYS.FAVORITES, favorites);
    StorageService.setItem(STORAGE_KEYS.WISHLIST_ITEMS, wishlistItems);
    this.notifyWishlistChange();
  }

  /**
   * Clear all wishlist destinations
   */
  public static clearWishlist(): void {
    StorageService.setItem(STORAGE_KEYS.FAVORITES, []);
    StorageService.setItem(STORAGE_KEYS.WISHLIST_ITEMS, []);
    this.notifyWishlistChange();
  }

  /**
   * Fetch the initial 8 featured destinations using the free Wikipedia Summary API
   */
  public static async getInitialDestinations(): Promise<Destination[]> {
    if (this.initialCache && this.initialCache.length === 8) {
      const favs = this.getFavoriteIds();
      return this.initialCache.map((d) => ({
        ...d,
        isFavorite: favs.includes(d.id),
      }));
    }

    const favs = this.getFavoriteIds();

    const fetchPromises = INITIAL_DESTINATIONS_SEED.map(async (seed): Promise<Destination> => {
      try {
        const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(seed.slug)}`, {
          headers: {
            'User-Agent': 'JadooTravel/1.0 (Travel Website Destination Explorer)',
          },
        });

        if (response.ok) {
          const data: WikipediaSummaryResponse = await response.json();
          const imgUrl = (this.isScenicPhoto(data.thumbnail?.source) ? data.thumbnail?.source : null) || seed.fallbackImage;
          const desc = data.extract ? this.cleanExtract(data.extract) : seed.fallbackDesc;

          return {
            id: `dest-${seed.slug.toLowerCase()}`,
            title: seed.title,
            subtitle: seed.country,
            description: desc,
            imageUrl: imgUrl,
            price: seed.price,
            duration: seed.duration,
            rating: seed.rating,
            category: seed.category,
            coordinates: data.coordinates || seed.coordinates,
            isFavorite: favs.includes(`dest-${seed.slug.toLowerCase()}`),
          };
        }
      } catch (err) {
        console.warn(`[DestinationService] Wikipedia API fetch error for ${seed.slug}, using fallback:`, err);
      }

      // Safe resilient fallback
      return {
        id: `dest-${seed.slug.toLowerCase()}`,
        title: seed.title,
        subtitle: seed.country,
        description: seed.fallbackDesc,
        imageUrl: seed.fallbackImage,
        price: seed.price,
        duration: seed.duration,
        rating: seed.rating,
        category: seed.category,
        coordinates: seed.coordinates,
        isFavorite: favs.includes(`dest-${seed.slug.toLowerCase()}`),
      };
    });

    try {
      const results = await Promise.all(fetchPromises);
      this.initialCache = results;
      return results;
    } catch {
      // Emergency fallback in case Promise.all failed unexpectedly
      return INITIAL_DESTINATIONS_SEED.map((seed) => ({
        id: `dest-${seed.slug.toLowerCase()}`,
        title: seed.title,
        subtitle: seed.country,
        description: seed.fallbackDesc,
        imageUrl: seed.fallbackImage,
        price: seed.price,
        duration: seed.duration,
        rating: seed.rating,
        category: seed.category,
        coordinates: seed.coordinates,
        isFavorite: favs.includes(`dest-${seed.slug.toLowerCase()}`),
      }));
    }
  }

  private static readonly POSITIVE_GEO_TERMS = [
    'country', 'sovereign state', 'city', 'capital', 'island', 'town', 'village', 'province', 'state',
    'municipality', 'territory', 'region', 'continent', 'peninsula', 'archipelago',
    'beach', 'mountain', 'mount ', 'lake', 'river', 'valley', 'waterfall', 'canyon',
    'national park', 'monument', 'resort', 'temple', 'castle', 'palace',
    'cathedral', 'sanctuary', 'landmark', 'tourist attraction', 'attraction', 'tourist', 'destination',
    'ruins', 'archaeological site', 'historic site', 'world heritage site', 'atoll',
    'settlement', 'oasis', 'volcano', 'coast', 'coastal'
  ];

  private static readonly NEGATIVE_ENTITY_TERMS = [
    'container', 'bag', 'handbag', 'accessory', 'clothing', 'footwear', 'shoe', 'garment',
    'edible', 'fruit', 'vegetable', 'dish', 'food', 'recipe', 'species', 'breed',
    'canid', 'mammal', 'insect', 'animal', 'plant', 'machine', 'device',
    'vehicle', 'automobile', 'car model', 'aircraft', 'tool', 'instrument',
    'film', 'movie', 'television series', 'actor', 'actress', 'singer',
    'musician', 'band', 'album', 'song', 'video game', 'software', 'programming',
    'novel', 'book', 'magazine', 'company', 'corporation', 'brand', 'chemical',
    'disease', 'disaster', 'attack', 'bombing', 'battle', 'war', 'treaty',
    'politician', 'political party', 'legislature', 'parliament', 'court', 'law',
    'railway station', 'station', 'football', 'sports club', 'satire', 'slang',
    'mythological', 'concept', 'philosophy', 'euthanasia', 'crime', 'murder',
    'suicide', 'airline', 'airport', 'cycling', 'tournament'
  ];

  private static readonly EXCLUDED_TITLES = [
    '(disambiguation)', 'list of', 'demographics of', 'economy of', 'history of',
    'politics of', 'geography of', 'foreign relations', 'commune', 'airport', 'railway'
  ];

  /**
   * Strictly validates whether a Wikipedia article represents a genuine travel/geographic destination
   */
  private static isTravelDestination(item: {
    title?: string;
    description?: string;
    extract?: string;
    hasCoordinates?: boolean;
  }): boolean {
    const title = (item.title || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const extract = (item.extract || '').toLowerCase().slice(0, 350);
    const combined = `${desc} ${extract}`;

    // 1. Exclude invalid titles (disambiguations, lists, meta pages)
    if (this.EXCLUDED_TITLES.some((term) => title.includes(term))) {
      return false;
    }

    // 2. Exclude common non-destination entities (objects, bags, animals, movies, devices)
    for (const neg of this.NEGATIVE_ENTITY_TERMS) {
      if (desc.includes(neg)) return false;
      if (
        extract.startsWith(`a ${neg}`) ||
        extract.startsWith(`an ${neg}`) ||
        extract.startsWith(`the ${neg}`) ||
        extract.startsWith(`${neg} `)
      ) {
        return false;
      }
    }

    // 3. Positive check
    const hasGeogKeyword = this.POSITIVE_GEO_TERMS.some((pos) => combined.includes(pos));
    const hasInLocationDesc =
      /\b(in|of|near)\s+[A-Z]/.test(item.description || '') &&
      !desc.includes('born in') &&
      !desc.includes('founded in') &&
      !desc.includes('manufactured in');

    if (item.hasCoordinates) {
      return hasGeogKeyword || hasInLocationDesc;
    }

    // If no coordinates, require strong geographic definition in extract or description
    const strongPlaceDef =
      extract.includes('is a country') ||
      extract.includes('is a sovereign state') ||
      extract.includes('is an island') ||
      extract.includes('is a city') ||
      extract.includes('is a province') ||
      extract.includes('is a capital') ||
      extract.includes('is a region') ||
      desc.startsWith('country in') ||
      desc.startsWith('island in') ||
      desc.startsWith('city in') ||
      desc.startsWith('capital of');

    return strongPlaceDef;
  }

  /**
   * Search destinations live via the free Wikipedia search and summary API
   */
  public static async searchDestinations(query: string): Promise<Destination[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return this.getInitialDestinations();
    }

    const cacheKey = trimmed.toLowerCase();
    if (this.searchCache.has(cacheKey)) {
      const favs = this.getFavoriteIds();
      return (this.searchCache.get(cacheKey) || []).map((d) => ({
        ...d,
        isFavorite: favs.includes(d.id),
      }));
    }

    const favs = this.getFavoriteIds();
    const results: Destination[] = [];
    const seenTitles = new Set<string>();

    // 1. Direct match attempt for exact place/city name
    try {
      const directRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(trimmed)}`, {
        headers: {
          'Api-User-Agent': 'JadooTravelApp/1.0 (https://jadoo.travel; contact@jadoo.travel)',
        },
      });

      if (directRes.ok) {
        const directData: WikipediaSummaryResponse = await directRes.json();
        const isDestination = this.isTravelDestination({
          title: directData.title,
          description: directData.description,
          extract: directData.extract,
          hasCoordinates: Boolean(directData.coordinates),
        });

        if (directData.type === 'standard' && directData.title && directData.extract && isDestination) {
          const directImg = (this.isScenicPhoto(directData.thumbnail?.source) ? directData.thumbnail?.source : null) ||
            'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';

          const id = `dest-search-${directData.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          seenTitles.add(directData.title.toLowerCase());

          results.push({
            id,
            title: directData.title,
            subtitle: directData.description || 'Global Destination',
            description: this.cleanExtract(directData.extract),
            imageUrl: directImg,
            price: this.estimatePrice(directData.title),
            duration: this.estimateDuration(directData.title),
            rating: 4.9,
            coordinates: directData.coordinates,
            isFavorite: favs.includes(id),
          });
        }
      }
    } catch {
      // Non-blocking: continue to general search
    }

    // 2. Query Search for related destination articles
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        trimmed
      )}&gsrlimit=16&prop=pageimages|extracts|coordinates|description&exintro=1&explaintext=1&exchars=180&piprop=thumbnail&pithumbsize=600&pilimit=16&format=json&origin=*`;

      const searchRes = await fetch(searchUrl, {
        headers: {
          'Api-User-Agent': 'JadooTravelApp/1.0 (https://jadoo.travel; contact@jadoo.travel)',
        },
      });

      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        const pages = Object.values(searchJson.query?.pages || {}) as Array<{
          title: string;
          extract?: string;
          description?: string;
          coordinates?: Array<{ lat: number; lon: number }>;
          thumbnail?: { source: string };
        }>;

        for (const page of pages) {
          if (!page.title || seenTitles.has(page.title.toLowerCase())) continue;

          const isDestination = this.isTravelDestination({
            title: page.title,
            description: page.description,
            extract: page.extract,
            hasCoordinates: Boolean(page.coordinates && page.coordinates.length > 0),
          });

          if (!isDestination) continue;

          // Prefer entries that have a scenic thumbnail
          const hasPhoto = this.isScenicPhoto(page.thumbnail?.source);
          const imgUrl = (hasPhoto ? page.thumbnail?.source : null) ||
            'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';

          const id = `dest-search-${page.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          seenTitles.add(page.title.toLowerCase());

          results.push({
            id,
            title: page.title,
            subtitle: page.description || 'Travel Destination',
            description: this.cleanExtract(page.extract),
            imageUrl: imgUrl,
            price: this.estimatePrice(page.title),
            duration: this.estimateDuration(page.title),
            rating: 4.8 + Number(((page.title.length % 3) * 0.05).toFixed(2)),
            coordinates: page.coordinates && page.coordinates.length > 0 ? page.coordinates[0] : undefined,
            isFavorite: favs.includes(id),
          });

          if (results.length >= 8) break;
        }
      }
    } catch (err) {
      console.warn('[DestinationService] Search query error:', err);
    }

    // Limit to 8 items max
    const finalResults = results.slice(0, 8);
    this.searchCache.set(cacheKey, finalResults);
    return finalResults;
  }

  /**
   * Static Top Selling Destinations shown in the initial landing page section
   */
  public static readonly STATIC_TOP_DESTINATIONS: Record<string, Destination> = {
    'static-rome': {
      id: 'static-rome',
      title: 'Rome, Italy',
      subtitle: 'Italy',
      description: 'Rome, the Eternal City, showcases the Colosseum, Pantheon, Vatican City, and incredible Italian culinary traditions spanning millennia of history.',
      imageUrl: 'assets/Images/destination-section/destination-1-rome.png',
      price: '$5.42k',
      duration: '10 Days Trip',
      rating: 4.9,
      coordinates: { lat: 41.9028, lon: 12.4964 },
    },
    'static-london': {
      id: 'static-london',
      title: 'London, UK',
      subtitle: 'United Kingdom',
      description: 'London combines royal heritage with cosmopolitan energy, featuring Big Ben, the Tower of London, world-class West End shows, and charming Thames walks.',
      imageUrl: 'assets/Images/destination-section/destination-2-london.jpg',
      price: '$4.2k',
      duration: '12 Days Trip',
      rating: 4.88,
      coordinates: { lat: 51.5074, lon: -0.1278 },
    },
    'static-europe': {
      id: 'static-europe',
      title: 'Full Europe',
      subtitle: 'Western & Central Europe',
      description: 'The grand European expedition covering Paris, the Swiss Alps, Vienna, Venice, and Barcelona in a curated 28-day luxury travel adventure.',
      imageUrl: 'assets/Images/destination-section/destination-3-europe.png',
      price: '$15k',
      duration: '28 Days Trip',
      rating: 4.96,
      coordinates: { lat: 48.8566, lon: 2.3522 },
    },
    'static-greece': {
      id: 'static-greece',
      title: 'Trip to Greece',
      subtitle: 'Greece',
      description: 'Immerse yourself in Greek history, Aegean turquoise waters, ancient ruins of Athens, and Mediterranean cuisine in this curated 15-day voyage.',
      imageUrl: 'assets/Images/book-section/card-trip-greece.jpeg',
      price: '$2,650',
      duration: '15 Days Trip',
      rating: 4.95,
      coordinates: { lat: 37.9838, lon: 23.7275 },
    },
  };

  /**
   * Convert formatted price string to numeric value (e.g. "$5.42k" -> 5420, "$2,450" -> 2450)
   */
  public static parsePriceToNumber(priceStr: string): number {
    const clean = priceStr.replace(/[$,]/g, '').trim().toLowerCase();
    if (clean.endsWith('k')) {
      const num = parseFloat(clean.replace('k', ''));
      return Math.round(num * 1000);
    }
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 2200 : parsed;
  }

  /**
   * Find a destination by ID across static, initial seeds, and search caches
   */
  public static getDestinationById(id: string): Destination | undefined {
    if (this.STATIC_TOP_DESTINATIONS[id]) {
      return this.STATIC_TOP_DESTINATIONS[id];
    }

    if (this.initialCache) {
      const match = this.initialCache.find((d) => d.id === id);
      if (match) return match;
    }

    // Check initial seeds directly if initialCache has not been populated yet
    const seed = INITIAL_DESTINATIONS_SEED.find((s) => `dest-${s.slug.toLowerCase()}` === id);
    if (seed) {
      return {
        id: `dest-${seed.slug.toLowerCase()}`,
        title: seed.title,
        subtitle: seed.country,
        description: seed.fallbackDesc,
        imageUrl: seed.fallbackImage,
        price: seed.price,
        duration: seed.duration,
        rating: seed.rating,
        category: seed.category,
        coordinates: seed.coordinates,
        isFavorite: this.getFavoriteIds().includes(id),
      };
    }

    // Check saved wishlist items in case it was a search result from a previous session
    const wishlist = this.getWishlistDestinations();
    const wishMatch = wishlist.find((d) => d.id === id);
    if (wishMatch) return wishMatch;

    for (const cachedList of this.searchCache.values()) {
      const match = cachedList.find((d) => d.id === id);
      if (match) return match;
    }

    return undefined;
  }

  /**
   * Register a new destination in search cache so details can be resolved immediately
   */
  public static registerDestination(dest: Destination): void {
    if (!this.searchCache.has('__registered__')) {
      this.searchCache.set('__registered__', []);
    }
    const list = this.searchCache.get('__registered__')!;
    if (!list.some((d) => d.id === dest.id)) {
      list.push(dest);
    }
  }

  /**
   * Save a completed trip booking
   */
  public static saveBooking(req: BookingRequest): BookingRecord {
    const bookings = StorageService.getItem<BookingRecord[]>(STORAGE_KEYS.BOOKINGS, []);
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    const bookingRecord: BookingRecord = {
      ...req,
      bookingId: `JAD-${randomCode}`,
      createdAt: new Date().toISOString(),
      status: 'confirmed',
    };

    bookings.unshift(bookingRecord);
    StorageService.setItem(STORAGE_KEYS.BOOKINGS, bookings);
    this.notifyBookingsChange();

    // Async sync with PostgreSQL backend if authenticated
    this.syncBookingToBackend(req);

    return bookingRecord;
  }

  /**
   * Retrieve all saved bookings
   */
  public static getBookings(): BookingRecord[] {
    return StorageService.getItem<BookingRecord[]>(STORAGE_KEYS.BOOKINGS, []);
  }

  /**
   * Cancel an existing booking
   */
  public static cancelBooking(bookingId: string): boolean {
    const bookings = this.getBookings();
    const target = bookings.find((b) => b.bookingId === bookingId);
    if (target) {
      target.status = 'cancelled';
      StorageService.setItem(STORAGE_KEYS.BOOKINGS, bookings);
      this.notifyBookingsChange();
      this.syncCancelToBackend(bookingId);
      return true;
    }
    return false;
  }

  /**
   * Delete an existing booking record permanently
   */
  public static deleteBooking(bookingId: string): boolean {
    const bookings = this.getBookings().filter((b) => b.bookingId !== bookingId);
    StorageService.setItem(STORAGE_KEYS.BOOKINGS, bookings);
    this.notifyBookingsChange();
    return true;
  }

  /**
   * Backend Sync Helpers (Gracefully degrade to offline LocalStorage)
   */
  public static async syncBookingToBackend(req: BookingRequest): Promise<void> {
    try {
      const token = authService.getToken();
      if (!token) return;

      await fetch(`${API_CONFIG.BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          destinationId: req.destinationId,
          destinationTitle: req.destinationTitle,
          departureDate: req.departureDate,
          adults: req.adults,
          children: req.children,
          packageTier: req.packageTier,
          fullName: req.fullName,
          email: req.email,
          phone: req.phone,
          specialRequests: req.specialRequests,
          promoCode: req.promoCode,
          totalPrice: req.totalPrice,
        }),
      });
    } catch {
      // Backend offline or unreachable
    }
  }

  public static async syncCancelToBackend(bookingId: string): Promise<void> {
    try {
      const token = authService.getToken();
      if (!token) return;

      await fetch(`${API_CONFIG.BASE_URL}/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Backend offline or unreachable
    }
  }

  public static async syncWishlistToBackend(destinationId: string): Promise<void> {
    try {
      const token = authService.getToken();
      if (!token) return;

      await fetch(`${API_CONFIG.BASE_URL}/wishlist/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ destinationId }),
      });
    } catch {
      // Backend offline or unreachable
    }
  }

  public static async syncWithBackend(): Promise<void> {
    try {
      const token = authService.getToken();
      if (!token) return;

      // 1. Fetch remote bookings from PostgreSQL
      const bookingsRes = await fetch(`${API_CONFIG.BASE_URL}/bookings/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        if (data.success && Array.isArray(data.bookings) && data.bookings.length > 0) {
          const remoteRecords: BookingRecord[] = data.bookings.map((b: any) => ({
            bookingId: b.id,
            destinationId: b.destination_id || 'dest-custom',
            destinationTitle: b.destination_title,
            departureDate: b.departure_date,
            adults: b.adults,
            children: b.children,
            packageTier: b.package_tier,
            fullName: b.full_name,
            email: b.email,
            phone: b.phone,
            specialRequests: b.special_requests,
            promoCode: b.promo_code,
            totalPrice: Number(b.total_price),
            createdAt: b.created_at,
            status: b.status,
          }));

          StorageService.setItem(STORAGE_KEYS.BOOKINGS, remoteRecords);
          this.notifyBookingsChange();
        }
      }

      // 2. Fetch remote wishlist from PostgreSQL
      const wishRes = await fetch(`${API_CONFIG.BASE_URL}/wishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (wishRes.ok) {
        const wishData = await wishRes.json();
        if (wishData.success && Array.isArray(wishData.wishlist) && wishData.wishlist.length > 0) {
          const ids = wishData.wishlist.map((w: any) => w.id || w.destination_id);
          StorageService.setItem(STORAGE_KEYS.FAVORITES, ids);
          this.notifyWishlistChange();
        }
      }
    } catch {
      // Backend offline or unreachable
    }
  }
}
