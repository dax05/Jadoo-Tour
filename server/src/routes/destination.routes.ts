import { Router } from 'express';
import { DestinationController } from '../controllers/destination.controller';

const router = Router();

router.get('/', DestinationController.getAll);
router.get('/:id', DestinationController.getById);

export default router;
