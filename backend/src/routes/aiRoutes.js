import { Router } from 'express';
import { generateImageCaption } from '../controllers/aiController.js';
import { authenticateToken, requireProfessionalPlan } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(authenticateToken);

// POST /api/ai/generate-caption (Professional Plan exclusive)
router.post('/generate-caption', requireProfessionalPlan, upload.single('image'), generateImageCaption);

export default router;
