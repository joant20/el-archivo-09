import { Router } from 'express';
import { investigationController } from '../controllers/investigationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/:saveId/investigation', investigationController.recordEntry);
router.patch('/:saveId/investigation/:entryKey/resolve', investigationController.resolveClue);
router.post('/:saveId/rooms/visit', investigationController.recordRoomVisit);

export default router;
