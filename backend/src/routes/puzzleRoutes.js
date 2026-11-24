import { Router } from 'express';
import { puzzleController } from '../controllers/puzzleController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/:saveId/puzzles/solve', puzzleController.solve);

export default router;
