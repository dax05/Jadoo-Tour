/**
 * Destination Explorer Types and Interfaces
 */

export interface Destination {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  imageUrl: string;
  price: string;
  duration: string;
  rating: number;
  category?: string;
  isFavorite?: boolean;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

export interface WikipediaSummaryResponse {
  type?: string;
  title: string;
  displaytitle?: string;
  extract?: string;
  description?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  originalimage?: {
    source: string;
    width: number;
    height: number;
  };
  content_urls?: {
    desktop?: {
      page: string;
    };
  };
}

export interface WikipediaPageSearchItem {
  pageid: number;
  ns: number;
  title: string;
  index?: number;
  description?: string;
  coordinates?: Array<{
    lat: number;
    lon: number;
  }>;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  extract?: string;
}

export interface WikipediaQuerySearchResponse {
  query?: {
    pages?: Record<string, WikipediaPageSearchItem>;
  };
}

export type PackageTier = 'standard' | 'deluxe' | 'luxury';

export interface BookingRequest {
  destinationId: string;
  destinationTitle: string;
  destinationImage: string;
  fullName: string;
  email: string;
  phone: string;
  departureDate: string;
  adults: number;
  children: number;
  packageTier: PackageTier;
  notes?: string;
  specialRequests?: string;
  promoCode?: string;
  basePricePerPerson: number;
  totalPrice: number;
}

export interface BookingRecord extends BookingRequest {
  bookingId: string;
  createdAt: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

