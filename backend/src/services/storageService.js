import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class StorageService {
  constructor() {
    this.type = config.storageType;
    this.uploadDir = path.resolve(__dirname, '../../uploads');
    
    // Ensure directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Save file and generate public URL
   * @param {Object} file - Multer file object
   * @returns {Promise<{ url: string, filename: string, mimetype: string, size: number, mediaType: 'IMAGE'|'VIDEO' }>}
   */
  async saveFile(file) {
    if (!file) {
      throw new Error('No file provided to storage service');
    }

    const isVideo = file.mimetype.startsWith('video/');
    const mediaType = isVideo ? 'VIDEO' : 'IMAGE';
    const relativeUrl = `/uploads/${file.filename}`;
    const publicUrl = `${config.backendUrl}/uploads/${file.filename}`;

    return {
      url: relativeUrl,
      mediaUrl: relativeUrl,
      fullUrl: publicUrl,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      mimeType: file.mimetype,
      size: file.size,
      mediaType
    };
  }

  /**
   * Resolve an absolute file path on disk for a local upload
   * Handles relative paths (/uploads/xxx), full URLs (http://localhost:5002/uploads/xxx), or plain filenames (xxx)
   * @param {string} mediaUrlOrFilename
   * @returns {string|null} Absolute file path if found on disk, null otherwise
   */
  getLocalFilePath(mediaUrlOrFilename) {
    if (!mediaUrlOrFilename) return null;

    // 1. If it's already a valid path on disk
    try {
      if (fs.existsSync(mediaUrlOrFilename) && fs.statSync(mediaUrlOrFilename).isFile()) {
        return path.resolve(mediaUrlOrFilename);
      }
    } catch {}

    let filename = mediaUrlOrFilename;
    try {
      if (mediaUrlOrFilename.startsWith('http://') || mediaUrlOrFilename.startsWith('https://')) {
        const parsed = new URL(mediaUrlOrFilename);
        filename = path.basename(parsed.pathname);
      } else {
        filename = path.basename(mediaUrlOrFilename.split('?')[0]);
      }
    } catch {
      filename = path.basename(mediaUrlOrFilename.split('?')[0]);
    }

    try {
      filename = decodeURIComponent(filename);
    } catch {}

    const candidate = path.join(this.uploadDir, filename);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const altCandidate = path.resolve('uploads', filename);
    if (fs.existsSync(altCandidate)) {
      return altCandidate;
    }

    return null;
  }

  /**
   * Delete file
   * @param {string} filename 
   */
  async deleteFile(filename) {
    if (this.type === 'local') {
      const filePath = path.join(this.uploadDir, filename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    }
  }
}

export const storageService = new StorageService();
