import { Router } from 'express';
import {
  getSocialAccounts,
  getPlatformStatus,
  disconnectAccount,
  linkAdminAllAccounts,
  linkAdminPlatformAccount
} from '../controllers/socialAccountController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getSocialAccounts);
router.get('/status', getPlatformStatus);
router.delete('/:id', disconnectAccount);

// Super Admin social account direct linking endpoints
router.post('/admin/link-all', linkAdminAllAccounts);
router.post('/admin/link-platform', linkAdminPlatformAccount);

export default router;
