import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { config } from '../config/index.js';
import { storageService } from './storageService.js';

class AiCaptionService {
  /**
   * Helper: Determine MIME type from file extension
   */
  getMimeTypeFromExtension(ext) {
    const cleanExt = (ext || '').toLowerCase().replace(/^\./, '');
    switch (cleanExt) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      case 'mp4':
      case 'mov':
      case 'webm':
      case 'avi':
        return 'video/' + cleanExt;
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Resolve and validate image buffer and mime type
   */
  async resolveImageBuffer({ mediaUrl, imageUrl, buffer, mimeType }) {
    let finalBuffer = buffer;
    let finalMimeType = mimeType;

    // 1. If mediaUrl is provided, resolve the image file
    if (!finalBuffer && mediaUrl) {
      // Check for video extensions first
      const ext = path.extname(mediaUrl.split('?')[0]).toLowerCase();
      if (['.mp4', '.mov', '.webm', '.avi', '.mkv'].includes(ext)) {
        const err = new Error('AI Image Captioning requires an image file (JPG, PNG, or WEBP). Video files are not supported.');
        err.code = 'UNSUPPORTED_MEDIA_TYPE';
        err.status = 400;
        throw err;
      }

      const localPath = storageService.getLocalFilePath(mediaUrl);
      if (localPath && fs.existsSync(localPath)) {
        finalBuffer = await fs.promises.readFile(localPath);
        finalMimeType = this.getMimeTypeFromExtension(path.extname(localPath));
      } else if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
        try {
          const res = await axios.get(mediaUrl, {
            responseType: 'arraybuffer',
            timeout: 12000
          });
          finalBuffer = Buffer.from(res.data);
          finalMimeType = res.headers['content-type'] || this.getMimeTypeFromExtension(ext);
        } catch (fetchErr) {
          const err = new Error(`Failed to load image from remote URL: ${fetchErr.message}`);
          err.code = 'IMAGE_FETCH_FAILED';
          err.status = 400;
          throw err;
        }
      } else {
        const err = new Error('The specified image file could not be found on the server.');
        err.code = 'IMAGE_NOT_FOUND';
        err.status = 404;
        throw err;
      }
    }

    // 2. If imageUrl is provided directly
    if (!finalBuffer && imageUrl) {
      try {
        const res = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 12000
        });
        finalBuffer = Buffer.from(res.data);
        finalMimeType = res.headers['content-type'] || 'image/jpeg';
      } catch (fetchErr) {
        const err = new Error(`Failed to fetch image from imageUrl: ${fetchErr.message}`);
        err.code = 'IMAGE_FETCH_FAILED';
        err.status = 400;
        throw err;
      }
    }

    // 3. Validation: Ensure we have an image buffer
    if (!finalBuffer) {
      const err = new Error('No image provided. Please upload or specify an image to generate an AI caption.');
      err.code = 'IMAGE_REQUIRED';
      err.status = 400;
      throw err;
    }

    // Validate that it is an image
    if (!finalMimeType || !finalMimeType.startsWith('image/')) {
      const err = new Error(`Unsupported media type (${finalMimeType}). Please provide a valid JPG, PNG, or WEBP image.`);
      err.code = 'INVALID_IMAGE_FORMAT';
      err.status = 400;
      throw err;
    }

    // Normalize mime type
    if (finalMimeType.includes(';')) {
      finalMimeType = finalMimeType.split(';')[0].trim();
    }

    return { buffer: finalBuffer, mimeType: finalMimeType };
  }

  /**
   * Generate caption using Google Gemini Vision API
   */
  async generateWithGemini({ buffer, mimeType, style, language, customPrompt }) {
    const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const err = new Error('AI Vision API key is not configured on the server. Please check your environment configuration.');
      err.code = 'GEMINI_API_KEY_MISSING';
      err.status = 503;
      throw err;
    }

    const visionModel = config.geminiVisionModel || 'gemini-3.5-flash';
    const base64Data = buffer.toString('base64');

    const promptText = [
      'You are an expert social media manager and creative copywriter.',
      'Analyze the provided image and generate an authentic, context-aware social media caption strictly grounded in the visual elements (subjects, clothing, activities, setting, mood, text, products).',
      `Caption Style: ${style}`,
      `Language: ${language}`,
      customPrompt?.trim() ? `Additional Direction: ${customPrompt.trim()}` : '',
      'Guidelines:',
      '- Keep the caption natural, engaging, and suitable for social media platforms (Instagram, Facebook, LinkedIn, X).',
      '- Include 1-3 natural emojis fitting the scene.',
      '- Include 2-4 appropriate hashtags at the end.',
      '- Return ONLY the final caption text. Do NOT wrap the text in quotes, do NOT add markdown code fences, and do NOT include meta-explanations like "Here is your caption:".'
    ].filter(Boolean).join('\n');

    const body = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            },
            {
              text: promptText
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    };

    const candidateModels = Array.from(new Set([
      config.geminiVisionModel || 'gemini-3-flash-preview',
      'gemini-3-flash-preview',
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash'
    ].filter(Boolean)));

    let lastError = null;

    for (const visionModel of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await axios.post(url, body, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 45000
          });

          let caption = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

          // Clean up surrounding quotes or markdown code blocks
          if (
            (caption.startsWith('"') && caption.endsWith('"')) ||
            (caption.startsWith('“') && caption.endsWith('”'))
          ) {
            caption = caption.slice(1, -1).trim();
          }
          if (caption.startsWith('```') && caption.endsWith('```')) {
            caption = caption.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
          }

          if (!caption) {
            throw new Error('AI Vision returned an empty caption response. Please try again.');
          }

          return {
            success: true,
            caption,
            model: visionModel,
            provider: 'google-gemini',
            style,
            language
          };
        } catch (apiError) {
          lastError = apiError;
          const status = apiError.response?.status;

          // If temporary server error (503), wait and retry once
          if (status === 503 && attempt < 1) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }

          // If this model hits quota limit (429), high demand (503), or not found (404),
          // fallback immediately to the next candidate model
          if ((status === 429 || status === 503 || status === 404) && visionModel !== candidateModels[candidateModels.length - 1]) {
            break;
          }

          if (apiError.response) {
            const apiErrorMsg = apiError.response.data?.error?.message || apiError.message;

            if (status === 400) {
              const err = new Error(`AI Vision could not process the image: ${apiErrorMsg}`);
              err.code = 'GEMINI_INVALID_IMAGE';
              err.status = 400;
              throw err;
            }

            if (status === 401 || status === 403) {
              const err = new Error('Invalid or unauthorized AI API key. Please check your server configuration.');
              err.code = 'GEMINI_AUTH_ERROR';
              err.status = 401;
              throw err;
            }

            if (status === 404) {
              const err = new Error(`Configured AI model was not found or is unavailable.`);
              err.code = 'GEMINI_MODEL_NOT_FOUND';
              err.status = 404;
              throw err;
            }

            if (status === 429) {
              const err = new Error('AI service rate limit or quota exceeded. Please wait a moment and try again.');
              err.code = 'GEMINI_RATE_LIMIT';
              err.status = 429;
              throw err;
            }

            const err = new Error(`AI API error (${status}): ${apiErrorMsg}`);
            err.code = 'GEMINI_API_ERROR';
            err.status = status;
            throw err;
          }

          if (apiError.code === 'ECONNABORTED' || apiError.message?.includes('timeout')) {
            const err = new Error('Image analysis timed out. Please try again.');
            err.code = 'GEMINI_TIMEOUT';
            err.status = 504;
            throw err;
          }

          throw apiError;
      }
    }
  }

  if (lastError) throw lastError;
}

  /**
   * Generate an intelligent social media caption by analyzing an image
   * Primary: Google Gemini Vision API (if GEMINI_API_KEY configured)
   * Fallback: OpenAI Vision (if OPENAI_API_KEY configured and requested)
   *
   * @param {Object} options
   * @param {string} [options.mediaUrl] - Relative or absolute URL of uploaded media
   * @param {string} [options.imageUrl] - Remote image URL
   * @param {Buffer} [options.buffer] - Raw file buffer if directly uploaded
   * @param {string} [options.mimeType] - Mime type of file buffer
   * @param {string} [options.style] - Style (e.g. Engaging & Casual, Professional & Informative)
   * @param {string} [options.tone] - Alias for style
   * @param {string} [options.language] - Target language (e.g. English, Spanish, Tamil, French)
   * @param {string} [options.customPrompt] - Custom prompt direction or topic
   * @param {string} [options.provider] - 'gemini' (default) or 'openai'
   * @returns {Promise<{ success: boolean, caption: string, model: string, provider: string }>}
   */
  async generateImageCaption({
    mediaUrl,
    imageUrl,
    buffer,
    mimeType,
    style,
    tone,
    language = 'English',
    customPrompt,
    provider
  } = {}) {
    // 1. Resolve image buffer and MIME type
    const { buffer: finalBuffer, mimeType: finalMimeType } = await this.resolveImageBuffer({
      mediaUrl,
      imageUrl,
      buffer,
      mimeType
    });

    const selectedStyle = style || tone || 'Engaging & Casual';
    const selectedLanguage = language || 'English';

    // 2. Select Provider
    // Prioritize Gemini if GEMINI_API_KEY is configured or explicitly requested
    const hasGeminiKey = Boolean(config.geminiApiKey || process.env.GEMINI_API_KEY);
    const hasOpenAiKey = Boolean(config.openaiApiKey || process.env.OPENAI_API_KEY);

    if (provider === 'gemini' || hasGeminiKey || !hasOpenAiKey) {
      if (!hasGeminiKey && !hasOpenAiKey) {
        const err = new Error('AI vision service is not configured on the server. Please check your backend configuration.');
        err.code = 'GEMINI_API_KEY_MISSING';
        err.status = 503;
        throw err;
      }

      if (hasGeminiKey) {
        return this.generateWithGemini({
          buffer: finalBuffer,
          mimeType: finalMimeType,
          style: selectedStyle,
          language: selectedLanguage,
          customPrompt
        });
      }
    }

    // Fallback to OpenAI Vision if OpenAI is specifically requested or Gemini key is absent
    const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const err = new Error('AI vision service is not configured on the server. Please check your backend configuration.');
      err.code = 'AI_API_KEY_MISSING';
      err.status = 503;
      throw err;
    }

    const base64Data = finalBuffer.toString('base64');
    const dataUrl = `data:${finalMimeType};base64,${base64Data}`;
    const visionModel = config.openaiVisionModel || 'gpt-4o-mini';

    const systemPrompt = `You are an expert social media manager and creative copywriter.
Analyze the user's uploaded image and generate a single, highly engaging social media caption grounded strictly in visible details.
Style: ${selectedStyle}
Language: ${selectedLanguage}
Guidelines:
- Grounded: Accurately reflect subjects, activity, setting, objects, mood, and context.
- Length: 1-2 concise, punchy sentences.
- Emojis: 1-3 natural emojis.
- Hashtags: 2-4 hashtags at the end.
- Return ONLY the caption text without quotes or meta-explanations.`;

    const userInstruction = customPrompt?.trim()
      ? `Analyze this image and create a caption with this direction: ${customPrompt.trim()}`
      : 'Analyze this image and create a compelling, natural social media caption tailored to what is shown.';

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: visionModel,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: userInstruction },
                { type: 'image_url', image_url: { url: dataUrl, detail: 'auto' } }
              ]
            }
          ],
          max_tokens: 300,
          temperature: 0.7
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 45000
        }
      );

      let caption = response.data?.choices?.[0]?.message?.content?.trim() || '';
      if ((caption.startsWith('"') && caption.endsWith('"')) || (caption.startsWith('“') && caption.endsWith('”'))) {
        caption = caption.slice(1, -1).trim();
      }

      if (!caption) {
        throw new Error('AI vision model returned an empty response. Please try again.');
      }

      return {
        success: true,
        caption,
        model: visionModel,
        provider: 'openai',
        style: selectedStyle,
        language: selectedLanguage
      };
    } catch (apiError) {
      if (apiError.response) {
        const status = apiError.response.status;
        const oaiMessage = apiError.response.data?.error?.message || apiError.message;
        const err = new Error(`AI API error (${status}): ${oaiMessage}`);
        err.code = status === 429 ? 'OPENAI_RATE_LIMIT' : 'OPENAI_API_ERROR';
        err.status = status;
        throw err;
      }
      throw apiError;
    }
  }
}

export const aiCaptionService = new AiCaptionService();
