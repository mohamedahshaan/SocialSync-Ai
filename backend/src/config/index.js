import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_change_in_production_2026',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5001',
  storageType: process.env.STORAGE_TYPE || 'local',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',



  // OAuth Platforms Configuration
  oauth: {
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
      redirectUri: process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:5001/api/oauth/facebook/callback',
      scopes: process.env.FACEBOOK_SCOPES || 'pages_show_list,pages_read_engagement,pages_manage_posts,public_profile',
      isConfigured: Boolean(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET)
    },
    instagram: {
      clientId: process.env.INSTAGRAM_CLIENT_ID || '',
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:5001/api/oauth/instagram/callback',
      scopes: process.env.INSTAGRAM_SCOPES || 'instagram_business_basic,instagram_business_content_publish',
      isConfigured: Boolean(process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET)
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:5001/api/oauth/linkedin/callback',
      scopes: process.env.LINKEDIN_SCOPES || 'openid profile email w_member_social',
      apiVersion: process.env.LINKEDIN_API_VERSION || '202601',
      isConfigured: Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET)
    },
    x: {
      clientId: process.env.X_CLIENT_ID || '',
      clientSecret: process.env.X_CLIENT_SECRET || '',
      redirectUri: process.env.X_REDIRECT_URI || 'http://localhost:5001/api/oauth/x/callback',
      isConfigured: Boolean(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET)
    },
    threads: {
      clientId: process.env.THREADS_CLIENT_ID || '',
      clientSecret: process.env.THREADS_CLIENT_SECRET || '',
      redirectUri: process.env.THREADS_REDIRECT_URI || 'http://localhost:5001/api/oauth/threads/callback',
      isConfigured: Boolean(process.env.THREADS_CLIENT_ID && process.env.THREADS_CLIENT_SECRET)
    },
    tiktok: {
      clientKey: process.env.TIKTOK_CLIENT_KEY || '',
      clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
      redirectUri: process.env.TIKTOK_REDIRECT_URI || 'http://localhost:5001/api/oauth/tiktok/callback',
      scopes: process.env.TIKTOK_SCOPES || 'user.info.basic,video.publish,video.upload',
      isConfigured: Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET)
    }
  }
};
