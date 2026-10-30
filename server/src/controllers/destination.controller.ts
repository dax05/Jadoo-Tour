import { Request, Response } from 'express';
import { pool } from '../config/db';

export const DestinationController = {
  /**
   * List all destinations with filtering, search, and sorting
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { category, maxPrice, search, sortBy } = req.query;

      let query = `
        SELECT id, title, country, price_usd, duration_days, rating, reviews_count, image_url, category, description, highlights, latitude, longitude, is_featured
        FROM destinations
        WHERE 1=1
      `;
      const params: (string | number)[] = [];
      let paramIndex = 1;

      // Category filter
      if (category && category !== 'all') {
        query += ` AND LOWER(category) = LOWER($${paramIndex++})`;
        params.push(String(category));
      }

      // Max Price filter
      if (maxPrice && !isNaN(Number(maxPrice))) {
        query += ` AND price_usd <= $${paramIndex++}`;
        params.push(Number(maxPrice));
      }

      // Search query (title, country, description)
      if (search && String(search).trim()) {
        const term = `%${String(search).trim()}%`;
        query += ` AND (title ILIKE $${paramIndex} OR country ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        paramIndex++;
        params.push(term);
      }

      // Sorting
      switch (sortBy) {
        case 'price-asc':
          query += ` ORDER BY price_usd ASC`;
          break;
        case 'price-desc':
          query += ` ORDER BY price_usd DESC`;
          break;
        case 'rating-desc':
          query += ` ORDER BY rating DESC, reviews_count DESC`;
          break;
        case 'duration-asc':
          query += ` ORDER BY duration_days ASC`;
          break;
        case 'duration-desc':
          query += ` ORDER BY duration_days DESC`;
          break;
        default:
          query += ` ORDER BY is_featured DESC, rating DESC`;
          break;
      }

      const result = await pool.query(query, params);

      res.status(200).json({
        success: true,
        count: result.rows.length,
        destinations: result.rows.map((row) => ({
          id: row.id,
          title: row.title,
          country: row.country,
          price: Number(row.price_usd),
          duration: `${row.duration_days} Days Trip`,
          durationDays: row.duration_days,
          rating: Number(row.rating),
          reviewsCount: row.reviews_count,
          imageUrl: row.image_url,
          category: row.category,
          description: row.description,
          highlights: row.highlights || [],
          lat: Number(row.latitude),
          lng: Number(row.longitude),
          isFeatured: row.is_featured,
        })),
      });
    } catch (err: unknown) {
      console.error('[DestinationController.getAll] Error:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve destinations.' });
    }
  },

  /**
   * Get single destination by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await pool.query('SELECT * FROM destinations WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Destination not found.' });
        return;
      }

      const row = result.rows[0];
      res.status(200).json({
        success: true,
        destination: {
          id: row.id,
          title: row.title,
          country: row.country,
          price: Number(row.price_usd),
          duration: `${row.duration_days} Days Trip`,
          durationDays: row.duration_days,
          rating: Number(row.rating),
          reviewsCount: row.reviews_count,
          imageUrl: row.image_url,
          category: row.category,
          description: row.description,
          highlights: row.highlights || [],
          lat: Number(row.latitude),
          lng: Number(row.longitude),
          isFeatured: row.is_featured,
        },
      });
    } catch (err: unknown) {
      console.error('[DestinationController.getById] Error:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve destination.' });
    }
  },
};
