import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { storageService } from './storageService.js';

const execFileAsync = promisify(execFile);

export class VideoConversionService {
  constructor() {
    this.ffmpegPath = process.env.FFMPEG_PATH || ffmpegInstaller?.path || 'ffmpeg';
    this.tempDir = path.join(os.tmpdir(), 'socialflow-video-conversions');
    if (!fs.existsSync(this.tempDir)) {
      try {
        fs.mkdirSync(this.tempDir, { recursive: true });
      } catch {}
    }
  }

  /**
   * Determine if media is an image based on explicit type or file extension
   */
  isImage(mediaUrl, mediaType) {
    if (mediaType && String(mediaType).toUpperCase() === 'IMAGE') return true;
    if (!mediaUrl) return false;
    const clean = mediaUrl.split('?')[0].toLowerCase();
    return /\.(jpg|jpeg|png|webp|gif|bmp)$/.test(clean);
  }

  /**
   * Determine if media is already a video based on explicit type or file extension
   */
  isVideo(mediaUrl, mediaType) {
    if (mediaType && String(mediaType).toUpperCase() === 'VIDEO') return true;
    if (!mediaUrl) return false;
    const clean = mediaUrl.split('?')[0].toLowerCase();
    return /\.(mp4|mov|webm|avi|mkv)$/.test(clean);
  }

  /**
   * Probe image width and height using fast buffer inspection with fallback to FFmpeg
   */
  async probeImageDimensions(imagePath) {
    try {
      const buffer = await fs.promises.readFile(imagePath);

      // PNG: Check magic 0x89504E47
      if (buffer.length > 24 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        if (width > 0 && height > 0) {
          return { width, height, isPortrait: height > width };
        }
      }

      // JPEG: Scan for SOF markers (0xFFC0, 0xFFC1, 0xFFC2)
      if (buffer.length > 10 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
        let offset = 2;
        while (offset < buffer.length - 8) {
          if (buffer[offset] === 0xFF) {
            const marker = buffer[offset + 1];
            // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
            if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
              const height = buffer.readUInt16BE(offset + 5);
              const width = buffer.readUInt16BE(offset + 7);
              if (width > 0 && height > 0) {
                return { width, height, isPortrait: height > width };
              }
              break;
            } else if (marker === 0xD9 || marker === 0xDA) {
              break; // Start of scan or end of image
            } else {
              const length = buffer.readUInt16BE(offset + 2);
              offset += 2 + length;
              continue;
            }
          }
          offset++;
        }
      }
    } catch {}

    // Fallback: Probe using FFmpeg
    try {
      await execFileAsync(this.ffmpegPath, ['-i', imagePath]);
    } catch (err) {
      const output = (err.stderr || '') + (err.stdout || '');
      const match = output.match(/Stream.*Video:.*, (\d+)x(\d+)/);
      if (match) {
        const width = parseInt(match[1], 10);
        const height = parseInt(match[2], 10);
        return { width, height, isPortrait: height > width };
      }
    }

    // Default to landscape
    return { width: 1920, height: 1080, isPortrait: false };
  }

  /**
   * Validate that the generated MP4 file is valid and non-empty
   */
  async validateGeneratedMp4(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error('Generated MP4 file does not exist on disk.');
    }

    const stats = await fs.promises.stat(filePath);
    if (stats.size < 500) {
      throw new Error(`Generated MP4 file is too small or truncated (${stats.size} bytes).`);
    }

    // Read initial 32 bytes to confirm standard MP4 'ftyp' box
    const buffer = Buffer.alloc(32);
    const fd = await fs.promises.open(filePath, 'r');
    try {
      await fd.read(buffer, 0, 32, 0);
    } finally {
      await fd.close();
    }

    // Check for 'ftyp' marker in first 16 bytes
    const ftypIndex = buffer.indexOf('ftyp');
    if (ftypIndex === -1) {
      throw new Error('Generated file does not have a valid MP4 ftyp container header.');
    }

    return true;
  }

  /**
   * Convert an image (JPG/PNG/etc.) into a 5-second MP4 video suitable for YouTube
   * @param {string} mediaUrlOrPath - Local path or remote URL to the image
   * @param {Object} [options]
   * @param {number} [options.durationSeconds=5]
   * @returns {Promise<{ videoPath: string, isTemporary: boolean, cleanup: () => Promise<void> }>}
   */
  async convertImageToVideo(mediaUrlOrPath, options = {}) {
    const duration = options.durationSeconds || 5;
    const tempFilesToDelete = [];

    let inputImagePath = storageService.getLocalFilePath(mediaUrlOrPath);

    // If not on local disk and is a remote URL, download temporarily
    if (!inputImagePath || !fs.existsSync(inputImagePath)) {
      if (mediaUrlOrPath.startsWith('http://') || mediaUrlOrPath.startsWith('https://')) {
        const tempInput = path.join(this.tempDir, `download_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.img`);
        const res = await axios.get(mediaUrlOrPath, {
          responseType: 'arraybuffer',
          maxContentLength: 100 * 1024 * 1024
        });
        await fs.promises.writeFile(tempInput, Buffer.from(res.data));
        inputImagePath = tempInput;
        tempFilesToDelete.push(tempInput);
      } else {
        throw new Error(`Cannot locate or read source image for conversion: ${mediaUrlOrPath}`);
      }
    }

    // Determine dimensions and aspect ratio
    const { isPortrait } = await this.probeImageDimensions(inputImagePath);

    // Portrait -> 1080x1920 (9:16 vertical canvas)
    // Landscape -> 1920x1080 (16:9 landscape canvas)
    const canvasWidth = isPortrait ? 1080 : 1920;
    const canvasHeight = isPortrait ? 1920 : 1080;

    // Output temporary video path
    const outputVideoPath = path.join(
      this.tempDir,
      `yt_conv_${Date.now()}_${crypto.randomBytes(8).toString('hex')}.mp4`
    );
    tempFilesToDelete.push(outputVideoPath);

    // FFmpeg video filter:
    // Scale image proportionally so it fits completely within the canvas without stretching
    // Pad any remaining letterbox/pillarbox space with black, centering the image
    const videoFilter = `scale=${canvasWidth}:${canvasHeight}:force_original_aspect_ratio=decrease,pad=${canvasWidth}:${canvasHeight}:(ow-iw)/2:(oh-ih)/2:black`;

    const ffmpegArgs = [
      '-y',
      '-loop', '1',
      '-i', inputImagePath,
      '-f', 'lavfi',
      '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-c:v', 'libx264',
      '-t', String(duration),
      '-pix_fmt', 'yuv420p',
      '-vf', videoFilter,
      '-c:a', 'aac',
      '-shortest',
      '-movflags', '+faststart',
      outputVideoPath
    ];

    try {
      await execFileAsync(this.ffmpegPath, ffmpegArgs);
    } catch (ffmpegErr) {
      // Clean up files immediately on failure
      for (const f of tempFilesToDelete) {
        try { if (fs.existsSync(f)) await fs.promises.unlink(f); } catch {}
      }
      const errMsg = (ffmpegErr.stderr || '') + (ffmpegErr.stdout || '') || ffmpegErr.message;
      throw new Error(`Image-to-video conversion for YouTube failed: ${errMsg}`);
    }

    // Verify output video file validity
    try {
      await this.validateGeneratedMp4(outputVideoPath);
    } catch (valErr) {
      for (const f of tempFilesToDelete) {
        try { if (fs.existsSync(f)) await fs.promises.unlink(f); } catch {}
      }
      throw new Error(`Generated YouTube video validation failed: ${valErr.message}`);
    }

    const cleanup = async () => {
      for (const f of tempFilesToDelete) {
        try {
          if (fs.existsSync(f)) {
            await fs.promises.unlink(f);
          }
        } catch {}
      }
    };

    return {
      videoPath: outputVideoPath,
      isTemporary: true,
      canvas: { width: canvasWidth, height: canvasHeight, isPortrait },
      cleanup
    };
  }
}

export const videoConversionService = new VideoConversionService();
