import { Router } from 'express';
import {
  createPost,
  getPosts,
  getPostById,
  retryPost,
  cancelScheduledPost,
  reschedulePost,
  updateScheduledPost,
  publishNow,
  deletePost,
  batchDeletePosts,
  saveDraft,
  getLatestDraft,
  createPostSchema,
  saveDraftSchema
} from '../controllers/postController.js';
import { authenticateToken, requireProfessionalPlan, requireCollageStudioPlan, requireSchedulingPlan } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

import { generateImageCaption } from '../controllers/aiController.js';
import { uploadMedia } from '../controllers/uploadController.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// Protected routes (require user authentication)
router.use(authenticateToken);

// Professional Plan exclusive: AI vision caption generation
router.post('/generate-caption', requireProfessionalPlan, upload.single('image'), generateImageCaption);
// Creator & Professional Plan: Collage studio template upload
router.post('/collage', requireCollageStudioPlan, upload.single('media'), uploadMedia);

// Drafts Management (explicit routes before parameterized /:id routes)
router.post('/draft', validate({ body: saveDraftSchema }), saveDraft);
router.put('/:id/draft', validate({ body: saveDraftSchema }), saveDraft);
router.get('/drafts/latest', getLatestDraft);
router.get('/drafts', (req, res, next) => {
  req.query.status = 'DRAFT';
  return getPosts(req, res, next);
});

router.post('/', validate({ body: createPostSchema }), createPost);
router.get('/', getPosts);
router.get('/:id', getPostById);
router.post('/:id/retry', retryPost);
router.post('/:id/cancel', cancelScheduledPost);
router.post('/:id/reschedule', requireSchedulingPlan, reschedulePost);
router.put('/:id/scheduled', requireSchedulingPlan, updateScheduledPost);
router.post('/:id/publish', publishNow);
router.delete('/:id', deletePost);
router.post('/batch-delete', batchDeletePosts);

export default router;
