import { Request, Response } from 'express';
import { pool } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const TestimonialController = {
  /**
   * Get all approved testimonials for carousel
   */
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const result = await pool.query(
        `SELECT id, author_name, location, quote, rating, avatar_url, created_at
         FROM testimonials
         WHERE is_approved = TRUE
         ORDER BY created_at DESC
         LIMIT 20`
      );

      res.status(200).json({
        success: true,
        count: result.rows.length,
        testimonials: result.rows.map((row) => ({
          id: String(row.id),
          authorName: row.author_name,
          name: row.author_name,
          location: row.location,
          quote: row.quote,
          rating: Number(row.rating),
          avatarUrl: row.avatar_url || 'assets/Images/testimonial-section/author-sarah.jpg',
          avatar_url: row.avatar_url || 'assets/Images/testimonial-section/author-sarah.jpg',
          createdAt: row.created_at,
          created_at: row.created_at,
        })),
      });
    } catch (err: unknown) {
      console.error('[TestimonialController.getAll] Error:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve testimonials.' });
    }
  },

  /**
   * Submit a new traveler testimonial (Verified Bookings Only)
   */
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required to post a review.' });
        return;
      }

      const author = req.body.authorName || req.body.name || req.user.name;
      const { location, quote, rating } = req.body;

      if (!author || !location || !quote) {
        res.status(400).json({ success: false, message: 'Author name, location, and quote are required.' });
        return;
      }

      const userId = req.user.id;

      // Enforce Verified Reviews Only: Check that the user has at least one confirmed booking
      const bookingCheck = await pool.query(
        "SELECT id, destination_title FROM bookings WHERE user_id = $1 LIMIT 1",
        [userId]
      );

      if (bookingCheck.rows.length === 0) {
        res.status(403).json({
          success: false,
          message: 'Verified reviews only: You must have a confirmed booking with Jadoo before submitting a testimonial.',
        });
        return;
      }

      const cleanRating = Math.min(5, Math.max(1, Number(rating) || 5));
      const rawAvatar = req.body.avatarUrl || req.body.avatar;
      const avatarUrl =
        rawAvatar ||
        (req.user as any).avatarUrl ||
        'assets/Images/testimonial-section/author-sarah.jpg';

      const result = await pool.query(
        `INSERT INTO testimonials (user_id, author_name, location, quote, rating, avatar_url, is_approved)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         RETURNING id, author_name, location, quote, rating, avatar_url, created_at`,
        [userId, author.trim(), location.trim(), quote.trim(), cleanRating, avatarUrl]
      );

      const row = result.rows[0];

      res.status(201).json({
        success: true,
        message: 'Thank you! Your verified travel testimonial has been published.',
        testimonial: {
          id: String(row.id),
          authorName: row.author_name,
          name: row.author_name,
          location: row.location,
          quote: row.quote,
          rating: Number(row.rating),
          avatarUrl: row.avatar_url || 'assets/Images/testimonial-section/author-sarah.jpg',
          avatar_url: row.avatar_url || 'assets/Images/testimonial-section/author-sarah.jpg',
          createdAt: row.created_at,
          created_at: row.created_at,
        },
      });
    } catch (err: unknown) {
      console.error('[TestimonialController.create] Error:', err);
      res.status(500).json({ success: false, message: 'Failed to submit testimonial.' });
    }
  },
};
