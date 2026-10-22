import { Router } from 'express';
import { generateImageCaption } from '../controllers/aiController.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(authenticateToken);

// POST /api/ai/generate-caption
router.post('/generate-caption', upload.single('image'), generateImageCaption);

export default router;
