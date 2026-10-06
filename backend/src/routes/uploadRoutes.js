import { Router } from 'express';
import { uploadMedia } from '../controllers/uploadController.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(authenticateToken);

// Support both /api/uploads/media and /api/uploads/
router.post('/media', upload.single('media'), uploadMedia);
router.post('/', upload.single('media'), uploadMedia);

export default router;
