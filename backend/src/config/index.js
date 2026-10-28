import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Helper to sanitize URLs and strip markdown link syntax (e.g., [url](url)), quotes, brackets, or trailing slashes
export function cleanUrl(val) {
  if (!val || typeof val !== 'string') return '';
  let trimmed = val.trim();
  trimmed = trimmed.replace(/\[.*?\]\((https?:\/\/[^\s)]+)\)/g, '$1');
  return trimmed.replace(/^[<"'\`\[]+|[>"'\`\]]+$/g, '').trim().replace(/\/+$/, '');
}

export const config = {
  port: parseInt(process.env.PORT || '5002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_change_in_production_2026',
  frontendUrl: (cleanUrl(process.env.FRONTEND_URL) || 'http://localhost:5180').replace(/\/+$/, ''),
  backendUrl: (cleanUrl(process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_URL) || 'http://localhost:5002').replace(/\/+$/, ''),
  storageType: process.env.STORAGE_TYPE || 'local',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  timezone: process.env.APP_TIMEZONE || 'Asia/Colombo',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiVisionModel: process.env.GEMINI_VISION_MODEL || 'gemini-3-flash-preview',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiVisionModel: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
  // Email & SMTP Configuration for OTPs and notifications
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    user: process.env.SMTP_USER || process.env.EMAIL_USER || '',
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || '',
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || 'SocialSync AI <sltsocialsync@gmail.com>',
    fromName: process.env.SMTP_FROM_NAME || 'SocialSync AI',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'sltsocialsync@gmail.com',
    isConfigured: Boolean((process.env.SMTP_HOST && process.env.SMTP_USER) || (process.env.EMAIL_USER && process.env.EMAIL_PASS))
  },
  // OAuth Platforms Configuration
  oauth: {
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
      redirectUri: cleanUrl(process.env.FACEBOOK_REDIRECT_URI) || `${cleanUrl(process.env.BACKEND_URL) || 'http://localhost:5002'}/api/oauth/facebook/callback`,
      scopes: process.env.FACEBOOK_SCOPES || 'pages_show_list,pages_read_engagement,pages_manage_posts,public_profile',
      isConfigured: Boolean(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET)
    },
    instagram: {
      clientId: process.env.INSTAGRAM_CLIENT_ID || '',
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
      redirectUri: cleanUrl(process.env.INSTAGRAM_REDIRECT_URI) || `${cleanUrl(process.env.BACKEND_URL) || 'http://localhost:5002'}/api/oauth/instagram/callback`,
      scopes: process.env.INSTAGRAM_SCOPES || 'instagram_business_basic,instagram_business_content_publish',
      isConfigured: Boolean(process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET)
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirectUri: cleanUrl(process.env.LINKEDIN_REDIRECT_URI) || `${cleanUrl(process.env.BACKEND_URL) || 'http://localhost:5002'}/api/oauth/linkedin/callback`,
      scopes: process.env.LINKEDIN_SCOPES || 'openid profile email w_member_social',
      apiVersion: process.env.LINKEDIN_API_VERSION || '202601',
      isConfigured: Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET)
    },
    threads: {
      clientId: process.env.THREADS_CLIENT_ID || '',
      clientSecret: process.env.THREADS_CLIENT_SECRET || '',
      redirectUri: cleanUrl(process.env.THREADS_REDIRECT_URI) || `${cleanUrl(process.env.BACKEND_URL) || 'http://localhost:5002'}/api/oauth/threads/callback`,
      isConfigured: Boolean(process.env.THREADS_CLIENT_ID && process.env.THREADS_CLIENT_SECRET)
    },
    tiktok: {
      clientKey: process.env.TIKTOK_CLIENT_KEY || '',
      clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
      redirectUri: cleanUrl(process.env.TIKTOK_REDIRECT_URI) || `${cleanUrl(process.env.BACKEND_URL) || 'http://localhost:5002'}/api/oauth/tiktok/callback`,
      scopes: process.env.TIKTOK_SCOPES || 'user.info.basic,video.publish,video.upload',
      isConfigured: Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET)
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: cleanUrl(process.env.GOOGLE_AUTH_REDIRECT_URI) || `${cleanUrl(process.env.BACKEND_URL) || 'http://localhost:5002'}/api/auth/google/callback`,
      scopes: 'openid email profile',
      isConfigured: Boolean(process.env.GOOGLE_CLIENT_ID)
    },
    youtube: {
      clientId: process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: cleanUrl(process.env.YOUTUBE_REDIRECT_URI) || cleanUrl(process.env.GOOGLE_REDIRECT_URI) || `${cleanUrl(process.env.BACKEND_URL) || 'http://localhost:5002'}/api/oauth/youtube/callback`,
      scopes: process.env.YOUTUBE_SCOPES || 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly openid email profile',
      isConfigured: Boolean(
        (process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID) &&
        (process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET)
      )
    }
  },
  // PayHere Payment Gateway Configuration
  payhere: {
    merchantId: process.env.PAYHERE_MERCHANT_ID || '',
    merchantSecret: process.env.PAYHERE_MERCHANT_SECRET || process.env.PAYHERE_SECRET || '',
    isSandbox: process.env.PAYHERE_SANDBOX !== 'false',
    notifyUrl: process.env.PAYHERE_NOTIFY_URL || '',
    isConfigured: Boolean(
      process.env.PAYHERE_MERCHANT_ID &&
      (process.env.PAYHERE_MERCHANT_SECRET || process.env.PAYHERE_SECRET) &&
      process.env.PAYHERE_MERCHANT_SECRET !== 'YOUR_SANDBOX_MERCHANT_SECRET' &&
      process.env.PAYHERE_SECRET !== 'YOUR_SANDBOX_MERCHANT_SECRET'
    )
  }
};
