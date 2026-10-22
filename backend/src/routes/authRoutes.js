import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  me,
  logout,
  updateProfile,
  changePassword,
  forgotPassword,
  verifyResetOtp,
  verifyResetToken,
  resetPassword,
  validateAdminInvitation,
  acceptAdminInvitation,
  googleAuth,
  initiateGoogleOAuthRedirect,
  handleGoogleOAuthCallback,
  getGoogleAuthConfig,
  registerSchema,
  loginSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  deleteAccount
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const forgotPasswordLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 15,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many password reset requests from this IP. Please try again later.',
        error: 'RATE_LIMIT_EXCEEDED'
      }
    });

const authLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many authentication attempts. Please try again in a few minutes.',
        error: 'AUTH_RATE_LIMIT_EXCEEDED'
      }
    });

router.post('/register', authLimiter, validate({ body: registerSchema }), register);
router.post('/login', authLimiter, validate({ body: loginSchema }), login);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, me);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);
router.delete('/delete-account', authenticateToken, deleteAccount);

// Google Sign-In & OAuth Routes
router.get('/google/config', getGoogleAuthConfig);
router.post('/google', authLimiter, validate({ body: googleAuthSchema }), googleAuth);
router.get('/google', initiateGoogleOAuthRedirect);
router.get('/google/callback', handleGoogleOAuthCallback);

// Password Reset Flow (URL Link + OTP compatibility)
router.post('/forgot-password', forgotPasswordLimiter, validate({ body: forgotPasswordSchema }), forgotPassword);
router.get('/verify-reset-token', verifyResetToken);
router.post('/verify-reset-otp', validate({ body: verifyOtpSchema }), verifyResetOtp);
router.post('/reset-password', validate({ body: resetPasswordSchema }), resetPassword);

// Administrator Invitation Flow
router.get('/admin-invite/:token', validateAdminInvitation);
router.post('/admin-invite/accept', authLimiter, acceptAdminInvitation);

export default router;
