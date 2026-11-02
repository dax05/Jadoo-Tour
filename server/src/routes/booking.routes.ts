import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Guest or Authenticated travelers can create bookings
router.post('/', optionalAuth, BookingController.create);

// Authenticated users can access their bookings and cancel
router.get('/', requireAuth, BookingController.getUserBookings);
router.get('/my-bookings', requireAuth, BookingController.getUserBookings);
router.patch('/:id/cancel', requireAuth, BookingController.cancel);

export default router;
