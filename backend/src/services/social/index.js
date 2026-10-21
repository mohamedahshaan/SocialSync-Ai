import { facebookProvider } from './facebook.js';
import { instagramProvider } from './instagram.js';
import { linkedinProvider } from './linkedin.js';
import { threadsProvider } from './threads.js';
import { tiktokProvider } from './tiktok.js';
import { youtubeProvider } from './youtube.js';

export const providers = {
  FACEBOOK: facebookProvider,
  INSTAGRAM: instagramProvider,
  LINKEDIN: linkedinProvider,
  THREADS: threadsProvider,
  TIKTOK: tiktokProvider,
  YOUTUBE: youtubeProvider
};

export function getProvider(platform) {
  const upper = platform.toUpperCase();
  const provider = providers[upper];
  if (!provider) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return provider;
}
