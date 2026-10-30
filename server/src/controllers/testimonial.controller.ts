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
          location: row.location,
          quote: row.quote,
          rating: Number(row.rating),
          avatarUrl: row.avatar_url || 'assets/Images/testimonial-section/author-mike.jpg',
        })),
      });
    } catch (err: unknown) {
      console.error('[TestimonialController.getAll] Error:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve testimonials.' });
    }
  },

  /**
   * Submit a new traveler testimonial
   */
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const author = req.body.authorName || req.body.name;
      const { location, quote, rating } = req.body;

      if (!author || !location || !quote) {
        res.status(400).json({ success: false, message: 'Author name, location, and quote are required.' });
        return;
      }

      const cleanRating = Math.min(5, Math.max(1, Number(rating) || 5));
      const userId = req.user ? req.user.id : null;
      const avatarUrl = req.user ? 'assets/Images/testimonial-section/author-mike.jpg' : null;

      const result = await pool.query(
        `INSERT INTO testimonials (user_id, author_name, location, quote, rating, avatar_url, is_approved)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         RETURNING id, author_name, location, quote, rating, avatar_url, created_at`,
        [userId, author.trim(), location.trim(), quote.trim(), cleanRating, avatarUrl]
      );

      const row = result.rows[0];

      res.status(201).json({
        success: true,
        message: 'Thank you! Your travel testimonial has been published.',
        testimonial: {
          id: String(row.id),
          authorName: row.author_name,
          location: row.location,
          quote: row.quote,
          rating: Number(row.rating),
          avatarUrl: row.avatar_url || 'assets/Images/testimonial-section/author-mike.jpg',
        },
      });
    } catch (err: unknown) {
      console.error('[TestimonialController.create] Error:', err);
      res.status(500).json({ success: false, message: 'Failed to submit testimonial.' });
    }
  },
};
