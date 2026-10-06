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
