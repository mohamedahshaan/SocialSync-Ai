import { Router } from 'express';
import {
  createPost,
  getPosts,
  getPostById,
  retryPost,
  cancelScheduledPost,
  reschedulePost,
  handlePublishResultCallback,
  getInternalPostById,
  publishInternalPlatform,
  createPostSchema
} from '../controllers/postController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Internal endpoints for n8n orchestrator (validated by x-socialflow-secret header)
router.get('/internal/:id', getInternalPostById);
router.post('/internal/:id/publish-platform', publishInternalPlatform);
router.post('/:id/publish-result', handlePublishResultCallback);

// Protected routes (require user authentication)
router.use(authenticateToken);

router.post('/', validate({ body: createPostSchema }), createPost);
router.get('/', getPosts);
router.get('/:id', getPostById);
router.post('/:id/retry', retryPost);
router.post('/:id/cancel', cancelScheduledPost);
router.post('/:id/reschedule', reschedulePost);

export default router;
