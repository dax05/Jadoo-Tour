import { Response } from 'express';
import { pool } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

function generateBookingRef(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `BK-${num}`;
}

export const BookingController = {
  /**
   * Create a new trip reservation
   */
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required to make a booking.' });
        return;
      }

      const {
        destinationId,
        departureDate,
        adults,
        children,
        packageTier,
        fullName,
        email,
        phone,
        specialRequests,
        promoCode,
      } = req.body;

      if (!destinationId || !departureDate || !fullName || !email || !phone) {
        res.status(400).json({ success: false, message: 'Missing required booking fields.' });
        return;
      }

      // 1. Phone number validation (ITU E.164: 7 to 15 digits)
      const phoneDigits = String(phone || '').replace(/\D/g, '');
      const phoneRegex = /^(\+)?[\d\s\-().]{7,25}$/;
      if (!phoneRegex.test(String(phone).trim()) || phoneDigits.length < 7 || phoneDigits.length > 15) {
        res.status(400).json({
          success: false,
          message: 'Invalid contact phone number. Please enter a valid telephone number (7-15 digits).',
        });
        return;
      }

      // Check for garbage single-character repetitions like "0000000" or "11111111"
      if (/^(\d)\1+$/.test(phoneDigits)) {
        res.status(400).json({
          success: false,
          message: 'Invalid contact phone number. Phone number cannot consist of repeated identical digits.',
        });
        return;
      }

      // 2. Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailRegex.test(String(email).trim())) {
        res.status(400).json({ success: false, message: 'Invalid passenger contact email address.' });
        return;
      }

      // 3. Departure date validation (must be valid and not in the past)
      const depDate = new Date(`${departureDate}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(depDate.getTime()) || depDate < today) {
        res.status(400).json({ success: false, message: 'Departure date must be a valid future or current date.' });
        return;
      }

      // Fetch destination to get price and title or fallback to provided details
      let destTitle = req.body.destinationTitle || 'Selected Destination';
      let basePrice = 2200;

      const destRes = await pool.query('SELECT title, price_usd FROM destinations WHERE id = $1', [destinationId]);
      if (destRes.rows.length > 0) {
        destTitle = destRes.rows[0].title;
        basePrice = Number(destRes.rows[0].price_usd);
      } else if (req.body.totalPrice) {
        basePrice = Number(req.body.totalPrice);
      }

      const validDestId = destRes.rows.length > 0 ? destinationId : null;
      const adultCount = Number(adults) || 1;
      const childCount = Number(children) || 0;

      // Tier multiplier
      let tierMultiplier = 1;
      const cleanTier = String(packageTier || 'standard').toLowerCase();
      if (cleanTier === 'deluxe') tierMultiplier = 1.35;
      if (cleanTier === 'luxury') tierMultiplier = 1.85;

      let subtotal = (basePrice * adultCount + basePrice * 0.5 * childCount) * tierMultiplier;

      // Promo discount (15% if EXPLORE15)
      if (promoCode && String(promoCode).toUpperCase().trim() === 'EXPLORE15') {
        subtotal = subtotal * 0.85;
      }

      const totalPrice = Math.round(subtotal);
      const bookingId = generateBookingRef();

      const result = await pool.query(
        `INSERT INTO bookings (
          id, user_id, destination_id, destination_title, full_name, email, phone,
          departure_date, adults, children, package_tier, total_price, promo_code,
          status, special_requests
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'confirmed', $14)
        RETURNING *`,
        [
          bookingId,
          req.user.id,
          validDestId,
          destTitle,
          fullName.trim(),
          email.trim().toLowerCase(),
          phone.trim(),
          departureDate,
          adultCount,
          childCount,
          cleanTier,
          totalPrice,
          promoCode ? String(promoCode).toUpperCase().trim() : null,
          specialRequests || null,
        ]
      );

      // Award 250 loyalty points to user
      await pool.query('UPDATE users SET points = points + 250 WHERE id = $1', [req.user.id]);

      const record = result.rows[0];

      res.status(201).json({
        success: true,
        message: 'Your trip reservation has been officially confirmed!',
        booking: {
          id: record.id,
          bookingId: record.id,
          destinationId: record.destination_id,
          destinationTitle: record.destination_title,
          fullName: record.full_name,
          email: record.email,
          phone: record.phone,
          departureDate: record.departure_date,
          adults: record.adults,
          children: record.children,
          packageTier: record.package_tier,
          totalPrice: Number(record.total_price),
          promoCode: record.promo_code,
          status: record.status,
          createdAt: record.created_at,
        },
      });
    } catch (err: unknown) {
      console.error('[BookingController.create] Error:', err);
      res.status(500).json({ success: false, message: 'Failed to create booking reservation.' });
    }
  },

  /**
   * Get all bookings for the authenticated user
   */
  async getUserBookings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const result = await pool.query(
        `SELECT b.*, d.image_url, d.country, d.duration_days
         FROM bookings b
         LEFT JOIN destinations d ON b.destination_id = d.id
         WHERE b.user_id = $1
         ORDER BY b.created_at DESC`,
        [req.user.id]
      );

      res.status(200).json({
        success: true,
        count: result.rows.length,
        bookings: result.rows.map((row) => ({
          id: row.id,
          bookingId: row.id,
          destinationId: row.destination_id,
          destinationTitle: row.destination_title,
          country: row.country || 'International',
          durationDays: row.duration_days || 7,
          imageUrl: row.image_url || 'assets/Images/destination-section/dest-1-rome.jpg',
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
          departureDate: row.departure_date,
          adults: row.adults,
          children: row.children,
          packageTier: row.package_tier,
          totalPrice: Number(row.total_price),
          promoCode: row.promo_code,
          status: row.status,
          createdAt: row.created_at,
        })),
      });
    } catch (err: unknown) {
      console.error('[BookingController.getUserBookings] Error:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve bookings.' });
    }
  },

  /**
   * Cancel a booking reservation
   */
  async cancel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const checkRes = await pool.query('SELECT user_id, status FROM bookings WHERE id = $1', [id]);
      if (checkRes.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Booking reservation not found.' });
        return;
      }

      if (checkRes.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
        res.status(403).json({ success: false, message: 'You do not have permission to cancel this booking.' });
        return;
      }

      await pool.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [id]);

      res.status(200).json({
        success: true,
        message: `Reservation ${id} has been successfully cancelled.`,
        booking: { id, status: 'cancelled' },
      });
    } catch (err: unknown) {
      console.error('[BookingController.cancel] Error:', err);
      res.status(500).json({ success: false, message: 'Failed to cancel booking.' });
    }
  },
};
