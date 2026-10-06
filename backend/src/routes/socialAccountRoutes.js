import { Router } from 'express';
import { getSocialAccounts, getPlatformStatus, disconnectAccount } from '../controllers/socialAccountController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getSocialAccounts);
router.get('/status', getPlatformStatus);
router.delete('/:id', disconnectAccount);

export default router;
