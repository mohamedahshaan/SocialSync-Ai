import { storageService } from '../services/storageService.js';

/**
 * Handle media file upload
 */
export async function uploadMedia(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No media file provided for upload',
        error: 'FILE_REQUIRED'
      });
    }

    const savedFile = await storageService.saveFile(req.file);

    const mediaTypeLower = savedFile.mediaType.toLowerCase();

    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully',
      mediaUrl: savedFile.mediaUrl,
      fullUrl: savedFile.fullUrl,
      mediaType: mediaTypeLower,
      mimeType: savedFile.mimetype,
      originalName: savedFile.originalName,
      data: {
        url: savedFile.mediaUrl,
        mediaUrl: savedFile.mediaUrl,
        fullUrl: savedFile.fullUrl,
        mediaType: savedFile.mediaType,
        filename: savedFile.filename,
        originalName: savedFile.originalName,
        mimetype: savedFile.mimetype,
        mimeType: savedFile.mimetype,
        size: savedFile.size
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadMultipleMedia(req, res, next) {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No media files provided for upload',
        error: 'FILES_REQUIRED'
      });
    }

    const savedFiles = [];
    for (const file of files) {
      const saved = await storageService.saveFile(file);
      savedFiles.push({
        url: saved.mediaUrl,
        mediaUrl: saved.mediaUrl,
        fullUrl: saved.fullUrl,
        mediaType: saved.mediaType.toLowerCase(),
        filename: saved.filename,
        originalName: saved.originalName,
        mimetype: saved.mimetype,
        size: saved.size
      });
    }

    return res.status(201).json({
      success: true,
      message: `${savedFiles.length} media file(s) uploaded successfully`,
      data: savedFiles,
      files: savedFiles,
      // Provide backwards-compatible top-level properties pointing to first file
      mediaUrl: savedFiles[0].mediaUrl,
      mediaType: savedFiles[0].mediaType
    });
  } catch (error) {
    next(error);
  }
}
