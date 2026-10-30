import { Response } from 'express';
import { pool } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const WishlistController = {
  /**
   * Get all wishlist destination items for user
   */
  async getWishlist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const result = await pool.query(
        `SELECT w.id as wishlist_id, w.saved_at, d.*
         FROM wishlists w
         JOIN destinations d ON w.destination_id = d.id
         WHERE w.user_id = $1
         ORDER BY w.saved_at DESC`,
        [req.user.id]
      );

      const items = result.rows.map((row) => ({
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
        savedAt: row.saved_at,
      }));

      const favoriteIds = items.map((i) => i.id);

      res.status(200).json({
        success: true,
        count: items.length,
        favoriteIds,
        items,
      });
    } catch (err: unknown) {
      console.error('[WishlistController.getWishlist] Error:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve wishlist.' });
    }
  },

  /**
   * Toggle a destination in user wishlist (add if missing, remove if present)
   */
  async toggle(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Please sign in to save trips to your wishlist.' });
        return;
      }

      const { destinationId } = req.body;
      if (!destinationId) {
        res.status(400).json({ success: false, message: 'Destination ID is required.' });
        return;
      }

      // Ensure destination exists in destinations table so FK constraint passes
      const destCheck = await pool.query('SELECT id FROM destinations WHERE id = $1', [destinationId]);
      if (destCheck.rows.length === 0) {
        await pool.query(
          `INSERT INTO destinations (id, title, country, price_usd, duration_days, rating, image_url, description, latitude, longitude)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO NOTHING`,
          [
            destinationId,
            req.body.title || destinationId.replace(/^(dest-|static-)/, '').replace(/-/g, ' ').toUpperCase(),
            req.body.country || 'Global',
            Number(req.body.price) || 2200,
            Number(req.body.durationDays) || 7,
            4.9,
            req.body.imageUrl || 'assets/Images/destination-section/dest-1-rome.jpg',
            'Curated global destination',
            0,
            0,
          ]
        );
      }

      // Check if already in wishlist
      const checkRes = await pool.query(
        'SELECT id FROM wishlists WHERE user_id = $1 AND destination_id = $2',
        [req.user.id, destinationId]
      );

      if (checkRes.rows.length > 0) {
        // Remove from wishlist
        await pool.query('DELETE FROM wishlists WHERE id = $1', [checkRes.rows[0].id]);
        res.status(200).json({
          success: true,
          action: 'removed',
          isFavorite: false,
          destinationId,
          message: 'Destination removed from your saved wishlist.',
        });
      } else {
        // Add to wishlist
        await pool.query('INSERT INTO wishlists (user_id, destination_id) VALUES ($1, $2)', [
          req.user.id,
          destinationId,
        ]);
        res.status(200).json({
          success: true,
          action: 'added',
          isFavorite: true,
          destinationId,
          message: 'Destination saved to your personal wishlist!',
        });
      }
    } catch (err: unknown) {
      console.error('[WishlistController.toggle] Error:', err);
      res.status(500).json({ success: false, message: 'Failed to update wishlist.' });
    }
  },

  /**
   * Clear all wishlist items for user
   */
  async clear(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      await pool.query('DELETE FROM wishlists WHERE user_id = $1', [req.user.id]);
      res.status(200).json({ success: true, message: 'Your wishlist has been cleared.' });
    } catch (err: unknown) {
      console.error('[WishlistController.clear] Error:', err);
      res.status(500).json({ success: false, message: 'Failed to clear wishlist.' });
    }
  },
};
