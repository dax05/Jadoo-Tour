import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/', BookingController.create);
router.get('/', BookingController.getUserBookings);
router.get('/my-bookings', BookingController.getUserBookings);
router.patch('/:id/cancel', BookingController.cancel);

export default router;
