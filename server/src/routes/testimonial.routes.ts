import { Router } from 'express';
import { TestimonialController } from '../controllers/testimonial.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/', TestimonialController.getAll);
router.post('/', optionalAuth, TestimonialController.create);

export default router;
