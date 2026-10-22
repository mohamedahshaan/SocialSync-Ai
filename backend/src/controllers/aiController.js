import fs from 'fs';
import { aiCaptionService } from '../services/aiCaptionService.js';

/**
 * POST /api/posts/generate-caption
 * or POST /api/ai/generate-caption
 * Generates an intelligent social media caption by analyzing an uploaded image using Gemini Vision
 */
export async function generateImageCaption(req, res, next) {
  try {
    const { mediaUrl, imageUrl, style, tone, language, prompt, provider } = req.body || {};

    let buffer = null;
    let mimeType = null;

    if (req.file) {
      if (req.file.buffer) {
        buffer = req.file.buffer;
      } else if (req.file.path) {
        buffer = await fs.promises.readFile(req.file.path);
      }
      mimeType = req.file.mimetype;
    }

    if (!buffer && !mediaUrl && !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an uploaded image (mediaUrl or file) to generate an AI caption.',
        error: 'IMAGE_REQUIRED'
      });
    }

    const result = await aiCaptionService.generateImageCaption({
      mediaUrl,
      imageUrl,
      buffer,
      mimeType,
      style: style || tone,
      language: language || 'English',
      customPrompt: prompt,
      provider
    });

    return res.status(200).json({
      success: true,
      message: 'AI caption generated successfully from image',
      caption: result.caption,
      data: {
        caption: result.caption,
        model: result.model,
        provider: result.provider,
        style: result.style,
        language: result.language,
        mediaUrl: mediaUrl || imageUrl || null
      }
    });
  } catch (err) {
    const isKeyMissing = err.code === 'GEMINI_API_KEY_MISSING' ||
                         err.code === 'OPENAI_API_KEY_MISSING' ||
                         err.code === 'AI_API_KEY_MISSING';
    const status = err.status || (isKeyMissing ? 503 : 400);

    const cleanMessage = (err.message || 'Failed to generate AI caption for image.')
      .replace(/Gemini Vision|Google Gemini|Gemini/gi, 'AI');

    return res.status(status).json({
      success: false,
      message: cleanMessage,
      error: err.code || 'AI_CAPTION_FAILED'
    });
  }
}
