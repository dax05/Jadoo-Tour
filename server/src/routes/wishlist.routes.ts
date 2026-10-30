import { Router } from 'express';
import { WishlistController } from '../controllers/wishlist.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', WishlistController.getWishlist);
router.post('/toggle', WishlistController.toggle);
router.delete('/', WishlistController.clear);

export default router;
