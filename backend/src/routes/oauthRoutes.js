import { Router } from 'express';
import {
  initiateOAuth,
  handleOAuthCallback,
  getAvailableFacebookPages,
  selectFacebookPage
} from '../controllers/oauthController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Facebook multi-page selection endpoints (Specific routes must precede dynamic :platform)
router.get('/facebook/pages', getAvailableFacebookPages);
router.post('/facebook/select-page', authenticateToken, selectFacebookPage);

// Initiation requires authentication to bind the state to the user
router.get('/:platform', authenticateToken, initiateOAuth);

// Callback is called by the platform's OAuth redirect
router.get('/:platform/callback', handleOAuthCallback);

export default router;
