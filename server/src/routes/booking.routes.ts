import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Only Authenticated travelers can create and manage bookings
router.post('/', requireAuth, BookingController.create);
router.get('/', requireAuth, BookingController.getUserBookings);
router.get('/my-bookings', requireAuth, BookingController.getUserBookings);
router.patch('/:id/cancel', requireAuth, BookingController.cancel);

export default router;
