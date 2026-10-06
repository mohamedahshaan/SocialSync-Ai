import { Router } from 'express';
import {
  createPost,
  getPosts,
  getPostById,
  retryPost,
  cancelScheduledPost,
  reschedulePost,
  createPostSchema
} from '../controllers/postController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Protected routes (require user authentication)
router.use(authenticateToken);

router.post('/', validate({ body: createPostSchema }), createPost);
router.get('/', getPosts);
router.get('/:id', getPostById);
router.post('/:id/retry', retryPost);
router.post('/:id/cancel', cancelScheduledPost);
router.post('/:id/reschedule', reschedulePost);

export default router;
