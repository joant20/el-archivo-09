import { Router } from 'express';
import { saveController } from '../controllers/saveController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', saveController.list);
router.post('/', saveController.create);
router.get('/:saveId', saveController.getOne);
router.patch('/:saveId/meta', saveController.updateMeta);
router.delete('/:saveId', saveController.remove);

export default router;
