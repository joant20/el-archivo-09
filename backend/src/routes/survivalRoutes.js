import { Router } from 'express';
import { survivalController } from '../controllers/survivalController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.put('/:saveId/survival', survivalController.updateSurvival);
router.put('/:saveId/checkpoint', survivalController.saveCheckpoint);
router.post('/:saveId/death', survivalController.registerDeath);

export default router;
