import { Request, Response } from 'express';
import { pool } from '../config/db';

export const NewsletterController = {
  /**
   * Subscribe an email address to the newsletter
   */
  async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const { email, name, promoCode } = req.body;

      if (!email) {
        res.status(400).json({ success: false, message: 'Email address is required.' });
        return;
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const cleanName = name ? String(name).trim() : cleanEmail.split('@')[0];
      const code = promoCode || 'EXPLORE15';

      // Insert or update subscriber
      const result = await pool.query(
        `INSERT INTO subscribers (email, name, promo_code)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET promo_code = EXCLUDED.promo_code
         RETURNING *`,
        [cleanEmail, cleanName, code]
      );

      res.status(200).json({
        success: true,
        message: 'Successfully registered for Jadoo Travel newsletter and welcome gift!',
        subscriber: result.rows[0],
      });
    } catch (err: unknown) {
      console.error('[NewsletterController.subscribe] Error:', err);
      res.status(500).json({ success: false, message: 'Failed to record newsletter subscription.' });
    }
  },
};
