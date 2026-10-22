import { Router } from 'express';
import { uploadMedia, uploadMultipleMedia } from '../controllers/uploadController.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(authenticateToken);

// Support both /api/uploads/media and /api/uploads/
// Handles single or multiple files seamlessly
router.post('/multiple', upload.array('media', 10), uploadMultipleMedia);

router.post('/media', upload.array('media', 10), (req, res, next) => {
  if (req.files && req.files.length > 1) {
    return uploadMultipleMedia(req, res, next);
  }
  req.file = req.files && req.files[0] ? req.files[0] : req.file;
  return uploadMedia(req, res, next);
});

router.post('/', upload.array('media', 10), (req, res, next) => {
  if (req.files && req.files.length > 1) {
    return uploadMultipleMedia(req, res, next);
  }
  req.file = req.files && req.files[0] ? req.files[0] : req.file;
  return uploadMedia(req, res, next);
});

export default router;
