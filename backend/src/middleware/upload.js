import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime' // .mov
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `media-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new Error(`Unsupported file type: ${file.mimetype} (${ext}). Supported formats: JPG, JPEG, PNG, WEBP, MP4, MOV.`),
      false
    );
  }
  
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB upper ceiling (supports video)
  }
});
