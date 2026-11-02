import { Router } from 'express';
import { TestimonialController } from '../controllers/testimonial.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/', TestimonialController.getAll);
router.post('/', requireAuth, TestimonialController.create);

export default router;
