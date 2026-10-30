/**
 * Testimonial Type Definitions
 */

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  location: string;
  avatar: string;
  rating?: number;
  destinationVisited?: string;
  createdAt?: string;
  isUserSubmitted?: boolean;
}
