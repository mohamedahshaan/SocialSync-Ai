import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/index.js';
import { createOrUpdateSubscription } from '../services/subscriptionService.js';
import {
  sendPasswordResetOtpEmail,
  sendPasswordResetSuccessEmail,
  sendPasswordResetLinkEmail,
  sendGoogleAccountNoticeEmail
} from '../services/emailService.js';

export const registerSchema = z.object({
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').regex(/[^a-zA-Z0-9]/, 'Password must contain at least one symbol (e.g. !@#$%^&*)'),
  confirmPassword: z.string(),
  plan: z.string().optional(),
  cardData: z.object({
    cardNumber: z.union([z.string(), z.number()]).optional().nullable(),
    cardholderName: z.string().optional().nullable(),
    expMonth: z.union([z.string(), z.number()]).optional().nullable(),
    expYear: z.union([z.string(), z.number()]).optional().nullable(),
    cvc: z.union([z.string(), z.number()]).optional().nullable()
  }).passthrough().optional().nullable()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
}).refine(data => {
  const combined = (data.name || `${data.firstName || ''} ${data.lastName || ''}`).trim();
  return combined.length >= 2;
}, {
  message: 'Name must be at least 2 characters',
  path: ['name']
});

export const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required')
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(10, 'Google ID token is required'),
  linkPassword: z.string().optional()
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please provide a valid email address')
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  otp: z.string().length(6, 'Verification code must be exactly 6 digits').regex(/^\d{6}$/, 'Code must contain numbers only')
});

export const resetPasswordSchema = z.object({
  token: z.string().optional(),
  email: z.string().email('Please provide a valid email address').optional(),
  resetToken: z.string().optional(),
  otp: z.string().optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long').regex(/[^a-zA-Z0-9]/, 'Password must contain at least one symbol (e.g. !@#$%^&*)'),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

/**
 * Register a new user
 */
export async function register(req, res, next) {
  try {
    let body = req.body || {};
    if (body.name && typeof body.name === 'object' && body.name.email) {
      body = { ...body.name, ...body };
      if (typeof body.name === 'object' && body.name?.name) {
        body.name = body.name.name;
      }
    }
    const { name, firstName, lastName, email, password, plan, cardData } = body;
    const finalName = (name || `${firstName || ''} ${lastName || ''}`).trim();

    // Check if email is already taken
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
        error: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // Determine initial plan type - Self-registration always initiates on legitimate Free plan
    const planType = 'FREE';

    // Hash password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: finalName,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
        plan: 'FREE',
        credits: 200,
        registrationSource: 'SELF_REGISTRATION',
        isEmailVerified: false,
        tokenVersion: 0
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        credits: true,
        profileImage: true,
        isEmailVerified: true,
        registrationSource: true,
        createdAt: true
      }
    });

    // Record initial plan history
    await prisma.planHistory.create({
      data: {
        userId: user.id,
        plan: 'FREE',
        previousPlan: null,
        creditsBefore: 0,
        creditsAfter: 200,
        source: 'SELF_REGISTRATION',
        status: 'SUCCESS',
        reason: 'Initial Free plan allocation on user registration'
      }
    });

    // Record welcome credit grant transaction
    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: 200,
        balanceAfter: 200,
        type: 'INITIAL_GRANT',
        reason: 'Welcome allocation on signup (200 credits)'
      }
    });

    // Initialize Free subscription record
    let subscription = null;
    try {
      subscription = await createOrUpdateSubscription({
        userId: user.id,
        planType: 'FREE'
      });
    } catch (subErr) {
      console.error('Subscription initialization note:', subErr.message);
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role, tokenVersion: 0 },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const packagePlan = await prisma.packagePlan.findUnique({
      where: { planType: user.plan }
    });
    user.planAllowance = packagePlan?.credits ?? null;
    user.planName = packagePlan?.name ?? null;

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user,
        token,
        subscription
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Log in an existing user
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: 'INVALID_CREDENTIALS'
      });
    }

    // Check account status
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended by an administrator. Please contact support.',
        error: 'ACCOUNT_SUSPENDED'
      });
    }

    // Handle Google-only account without local password
    if (!user.passwordHash) {
      return res.status(400).json({
        success: false,
        message: 'This account was created with Google Sign-In and does not have a local password. Please sign in using "Continue with Google".',
        error: 'GOOGLE_ACCOUNT_NO_PASSWORD'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: 'INVALID_CREDENTIALS'
      });
    }

    // Record last login timestamp
    const now = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now }
    });

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tokenVersion: user.tokenVersion || 0
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const effectivePlan = isSuperAdmin ? 'PROFESSIONAL' : user.plan;

    const packagePlan = await prisma.packagePlan.findUnique({
      where: { planType: effectivePlan }
    });

    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      plan: effectivePlan,
      planAllowance: packagePlan?.credits ?? (isSuperAdmin ? 1500 : null),
      planName: packagePlan?.name ?? (isSuperAdmin ? 'Professional' : null),
      credits: isSuperAdmin && (user.credits ?? 0) < (packagePlan?.credits || 1500)
        ? (packagePlan?.credits || 1500)
        : (user.credits ?? 0),
      profileImage: user.profileImage,
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      country: user.country || 'Sri Lanka',
      isEmailVerified: user.isEmailVerified,
      registrationSource: user.registrationSource,
      lastLoginAt: now,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: sanitizedUser,
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current authenticated user profile
 */
export async function me(req, res) {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
}

/**
 * Logout
 */
export async function logout(req, res) {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}

/**
 * Update authenticated user profile
 */
export async function updateProfile(req, res, next) {
  try {
    const { name, profileImage, phone, address, city, country } = req.body;

    const dataToUpdate = {};

    if (name !== undefined) {
      if (!name || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Name must be at least 2 characters'
        });
      }
      dataToUpdate.name = name.trim();
    }

    if (profileImage !== undefined) {
      dataToUpdate.profileImage = typeof profileImage === 'string' ? profileImage.trim() : '';
    }

    if (phone !== undefined) {
      dataToUpdate.phone = typeof phone === 'string' ? phone.trim() : null;
    }

    if (address !== undefined) {
      dataToUpdate.address = typeof address === 'string' ? address.trim() : null;
    }

    if (city !== undefined) {
      dataToUpdate.city = typeof city === 'string' ? city.trim() : null;
    }

    if (country !== undefined) {
      dataToUpdate.country = typeof country === 'string' ? country.trim() : 'Sri Lanka';
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No profile fields provided for update'
      });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        credits: true,
        profileImage: true,
        phone: true,
        address: true,
        city: true,
        country: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updated }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Change authenticated user password
 */
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    if (!/[^a-zA-Z0-9]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must contain at least one symbol (e.g. !@#$%^&*)'
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        passwordHash,
        lastPasswordResetAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Request a 6-digit password reset OTP email
 * Protected against account enumeration and brute-force timing attacks
 */
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();

    if (!cleanEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user) {
      // Prevent timing attacks by executing a dummy bcrypt hash
      await bcrypt.hash('dummy_otp_000000', 10);
      return res.json({
        success: true,
        message: 'If an account exists with this email address, a password reset link has been sent.',
        cooldownSeconds: 60
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Your account is suspended. Please contact support.',
        error: 'ACCOUNT_SUSPENDED'
      });
    }

    // Handle Google-only account without local password
    if (!user.passwordHash) {
      await sendGoogleAccountNoticeEmail({
        email: cleanEmail,
        name: user.name,
        loginUrl: `${config.frontendUrl}/login`
      });
      return res.status(400).json({
        success: false,
        isGoogleOnly: true,
        message: 'This account was created with Google Sign-In and does not have a local password. Please sign in using "Continue with Google".',
        error: 'GOOGLE_ACCOUNT_NO_PASSWORD'
      });
    }

    // Check for resend cooldown on recent OTP
    const recentOtp = await prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        used: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    if (recentOtp && recentOtp.resendAvailableAt && recentOtp.resendAvailableAt > now) {
      const waitSeconds = Math.ceil((recentOtp.resendAvailableAt.getTime() - now.getTime()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting a new code.`,
        error: 'RATE_LIMIT_EXCEEDED',
        cooldownSeconds: waitSeconds
      });
    }

    // Invalidate previous unexpired unused OTPs for this user
    await prisma.passwordResetOtp.updateMany({
      where: {
        userId: user.id,
        used: false
      },
      data: {
        used: true
      }
    });

    // Invalidate previous unused reset link tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        used: false
      },
      data: {
        used: true
      }
    });

    // Generate cryptographically secure random 32-byte single-use reset token
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes expiry

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: resetExpiresAt,
        used: false
      }
    });

    const resetUrl = `${config.frontendUrl}/reset-password?token=${rawResetToken}`;

    // Send email with secure reset link
    await sendPasswordResetLinkEmail({
      email: cleanEmail,
      name: user.name,
      resetUrl,
      expiresMinutes: 60
    });

    // Also generate random secure 6-digit OTP (for backward compatibility with mobile/tests)
    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 60 seconds cooldown

    await prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        email: cleanEmail,
        otpHash,
        expiresAt,
        resendAvailableAt,
        attempts: 0,
        used: false
      }
    });

    // Send email with OTP (maintains test store compatibility)
    await sendPasswordResetOtpEmail({
      email: cleanEmail,
      name: user.name,
      otp,
      expiresMinutes: 5
    });

    return res.json({
      success: true,
      message: 'If an account exists with this email address, a password reset link has been sent.',
      cooldownSeconds: 60
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify 6-digit OTP and issue a short-lived reset authorization token
 */
export async function verifyResetOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanOtp = (otp || '').trim();

    if (!cleanEmail || !cleanOtp || cleanOtp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'A valid email and 6-digit verification code are required'
      });
    }

    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: {
        email: cleanEmail,
        used: false
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code. Please request a new code.',
        error: 'INVALID_OTP'
      });
    }

    // Check attempts limit (max 5)
    if (otpRecord.attempts >= 5) {
      await prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { used: true }
      });
      return res.status(400).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new code.',
        error: 'MAX_ATTEMPTS_EXCEEDED'
      });
    }

    // Check expiration (5 minutes)
    if (new Date() > otpRecord.expiresAt) {
      await prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { used: true }
      });
      return res.status(400).json({
        success: false,
        message: 'This verification code has expired. Verification codes are valid for 5 minutes only.',
        error: 'OTP_EXPIRED'
      });
    }

    const isValid = await bcrypt.compare(cleanOtp, otpRecord.otpHash);
    if (!isValid) {
      const nextAttempts = otpRecord.attempts + 1;
      await prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: {
          attempts: nextAttempts,
          used: nextAttempts >= 5
        }
      });
      const remaining = 5 - nextAttempts;
      return res.status(400).json({
        success: false,
        message: remaining > 0
          ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect attempts. Please request a new code.',
        error: 'INVALID_OTP',
        remainingAttempts: Math.max(0, remaining)
      });
    }

    // Issue short-lived reset token (valid for 10 minutes)
    const resetToken = jwt.sign(
      {
        userId: otpRecord.userId,
        otpId: otpRecord.id,
        email: cleanEmail,
        purpose: 'PASSWORD_RESET'
      },
      config.jwtSecret,
      { expiresIn: '10m' }
    );

    return res.json({
      success: true,
      message: 'Verification code confirmed. You may now set your new password.',
      data: {
        resetToken,
        email: cleanEmail
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Set new password following verified link token, verified OTP, or OTP token
 * Hashes password using bcrypt (12 rounds) and increments tokenVersion to invalidate existing sessions
 */
export async function resetPassword(req, res, next) {
  try {
    const { token, email, resetToken, otp, newPassword, confirmPassword } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long',
        error: 'PASSWORD_TOO_SHORT'
      });
    }

    if (!/[^a-zA-Z0-9]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one symbol (e.g. !@#$%^&*)',
        error: 'PASSWORD_SYMBOL_REQUIRED'
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
        error: 'PASSWORDS_DO_NOT_MATCH'
      });
    }

    let targetUserId = null;
    let targetOtpId = null;
    let targetTokenId = null;

    if (token) {
      // 1. Single-use cryptographically secure link token flow
      const cleanToken = token.trim();
      const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');
      const tokenRecord = await prisma.passwordResetToken.findUnique({
        where: { tokenHash }
      });

      if (!tokenRecord) {
        return res.status(400).json({
          success: false,
          message: 'This password reset link is invalid or has already been used.',
          error: 'INVALID_TOKEN'
        });
      }

      if (tokenRecord.used) {
        return res.status(400).json({
          success: false,
          message: 'This password reset link has already been used. Please request a new one.',
          error: 'TOKEN_ALREADY_USED'
        });
      }

      if (new Date() > tokenRecord.expiresAt) {
        return res.status(400).json({
          success: false,
          message: 'This password reset link has expired. Please request a new one.',
          error: 'TOKEN_EXPIRED'
        });
      }

      targetUserId = tokenRecord.userId;
      targetTokenId = tokenRecord.id;
    } else if (resetToken) {
      // 2. Short-lived JWT resetToken flow
      try {
        const decoded = jwt.verify(resetToken, config.jwtSecret);
        if (decoded.purpose !== 'PASSWORD_RESET') {
          return res.status(400).json({
            success: false,
            message: 'Invalid reset authorization token',
            error: 'INVALID_RESET_TOKEN'
          });
        }
        targetUserId = decoded.userId;
        targetOtpId = decoded.otpId;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Reset authorization has expired. Please verify your code again.',
          error: 'RESET_TOKEN_EXPIRED'
        });
      }
    } else if (otp && cleanEmail) {
      // 3. Direct reset via OTP & email
      const otpRecord = await prisma.passwordResetOtp.findFirst({
        where: {
          email: cleanEmail,
          used: false
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification code',
          error: 'INVALID_OTP'
        });
      }

      if (new Date() > otpRecord.expiresAt) {
        await prisma.passwordResetOtp.update({
          where: { id: otpRecord.id },
          data: { used: true }
        });
        return res.status(400).json({
          success: false,
          message: 'Verification code has expired. Please request a new code.',
          error: 'OTP_EXPIRED'
        });
      }

      const isValid = await bcrypt.compare(otp.trim(), otpRecord.otpHash);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code',
          error: 'INVALID_OTP'
        });
      }

      targetUserId = otpRecord.userId;
      targetOtpId = otpRecord.id;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Valid verification code or reset token required',
        error: 'MISSING_RESET_CREDENTIALS'
      });
    }

    // Verify OTP record is not already used (if OTP flow)
    if (targetOtpId) {
      const otpRecord = await prisma.passwordResetOtp.findUnique({
        where: { id: targetOtpId }
      });

      if (!otpRecord || otpRecord.used) {
        return res.status(400).json({
          success: false,
          message: 'This verification code has already been used. Please request a new code.',
          error: 'OTP_ALREADY_USED'
        });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Hash new password using bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const now = new Date();

    // Mark single-use token or OTP as used
    if (targetTokenId) {
      await prisma.passwordResetToken.update({
        where: { id: targetTokenId },
        data: { used: true }
      });
    }

    if (targetOtpId) {
      await prisma.passwordResetOtp.update({
        where: { id: targetOtpId },
        data: { used: true }
      });
    }

    // Invalidate ALL existing sessions by incrementing tokenVersion
    // Mark email as verified if not already verified (since user successfully received link/OTP on this email)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        lastPasswordResetAt: now,
        isEmailVerified: true,
        emailVerifiedAt: user.emailVerifiedAt || now,
        tokenVersion: { increment: 1 }
      }
    });

    // Send confirmation email
    await sendPasswordResetSuccessEmail({
      email: user.email,
      name: user.name
    });

    return res.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Validate reset token from link query parameter
 */
export async function verifyResetToken(req, res, next) {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is required',
        error: 'MISSING_TOKEN'
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: { id: true, email: true, name: true, status: true }
        }
      }
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'This password reset link is invalid or has already been used.',
        error: 'INVALID_TOKEN'
      });
    }

    if (record.used) {
      return res.status(400).json({
        success: false,
        message: 'This password reset link has already been used. Please request a new one.',
        error: 'TOKEN_ALREADY_USED'
      });
    }

    if (new Date() > record.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'This password reset link has expired. Please request a new one.',
        error: 'TOKEN_EXPIRED'
      });
    }

    if (record.user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'This account has been suspended.',
        error: 'ACCOUNT_SUSPENDED'
      });
    }

    return res.json({
      success: true,
      message: 'Reset token is valid',
      data: {
        email: record.user.email
      }
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// GOOGLE OAUTH 2.0 / OIDC VERIFICATION & SIGN-IN
// ============================================================

const googleOAuthClient = new OAuth2Client(config.oauth.google.clientId);

/**
 * Helper to securely verify Google ID token
 */
async function verifyGoogleIdToken(idToken) {
  const ticket = await googleOAuthClient.verifyIdToken({
    idToken,
    audience: config.oauth.google.clientId
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error('Malformed Google ID token payload');
  }

  // Validate issuer
  if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
    throw new Error('Invalid Google ID token issuer');
  }

  return payload;
}

/**
 * Google Sign-In & Registration handler
 * Verifies Google ID token signature, issuer, audience, and expiry
 */
export async function googleAuth(req, res, next) {
  try {
    const { idToken, linkPassword } = req.body;
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required',
        error: 'MISSING_ID_TOKEN'
      });
    }

    let payload;
    try {
      payload = await verifyGoogleIdToken(idToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Google ID token verification failed: ' + err.message,
        error: 'INVALID_GOOGLE_TOKEN'
      });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const isEmailVerified = Boolean(payload.email_verified);
    const name = payload.name || email.split('@')[0];
    const picture = payload.picture || '';

    // 1. Check if user already exists with this verified Google subject identity
    let user = await prisma.user.findUnique({
      where: { googleId }
    });

    if (user) {
      if (user.status === 'SUSPENDED') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended by an administrator. Please contact support.',
          error: 'ACCOUNT_SUSPENDED'
        });
      }

      const now = new Date();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: now,
          ...(picture && !user.profileImage ? { profileImage: picture } : {})
        }
      });

      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tokenVersion: user.tokenVersion || 0
        },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      const packagePlan = await prisma.packagePlan.findUnique({
        where: { planType: user.plan }
      });

      return res.json({
        success: true,
        message: 'Signed in with Google successfully',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            plan: user.plan,
            planAllowance: packagePlan?.credits ?? null,
            planName: packagePlan?.name ?? null,
            credits: user.credits,
            profileImage: user.profileImage || picture,
            isEmailVerified: user.isEmailVerified,
            registrationSource: user.registrationSource,
            lastLoginAt: now,
            createdAt: user.createdAt
          },
          token
        }
      });
    }

    // 2. Check if user exists with matching email
    const existingEmailUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingEmailUser) {
      if (existingEmailUser.status === 'SUSPENDED') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended by an administrator. Please contact support.',
          error: 'ACCOUNT_SUSPENDED'
        });
      }

      // Security requirement: Never automatically link unverified emails
      if (!isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Your Google email address is not verified by Google. Account linking denied.',
          error: 'UNVERIFIED_GOOGLE_EMAIL'
        });
      }

      // If existing user has a local password, require account linking confirmation with password
      if (existingEmailUser.passwordHash) {
        if (!linkPassword) {
          return res.status(200).json({
            success: false,
            requiresLinking: true,
            email: existingEmailUser.email,
            message: 'An account with this email address already exists. Please confirm your password to link your Google account.',
            error: 'ACCOUNT_LINKING_REQUIRED'
          });
        }

        const isMatch = await bcrypt.compare(linkPassword, existingEmailUser.passwordHash);
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: 'Incorrect password. Account linking failed.',
            error: 'INVALID_LINK_PASSWORD'
          });
        }
      }

      // Link Google ID to existing account
      const now = new Date();
      user = await prisma.user.update({
        where: { id: existingEmailUser.id },
        data: {
          googleId,
          isEmailVerified: true,
          emailVerifiedAt: existingEmailUser.emailVerifiedAt || now,
          lastLoginAt: now,
          ...(picture && !existingEmailUser.profileImage ? { profileImage: picture } : {})
        }
      });

      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tokenVersion: user.tokenVersion || 0
        },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      const packagePlan = await prisma.packagePlan.findUnique({
        where: { planType: user.plan }
      });

      return res.json({
        success: true,
        message: 'Account linked with Google successfully',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            plan: user.plan,
            planAllowance: packagePlan?.credits ?? null,
            planName: packagePlan?.name ?? null,
            credits: user.credits,
            profileImage: user.profileImage,
            isEmailVerified: user.isEmailVerified,
            registrationSource: user.registrationSource,
            lastLoginAt: now,
            createdAt: user.createdAt
          },
          token
        }
      });
    }

    // 3. New User Registration via Google OAuth
    const now = new Date();
    try {
      user = await prisma.user.create({
        data: {
          name: name.trim(),
          email,
          googleId,
          passwordHash: null,
          role: 'USER',
          status: 'ACTIVE',
          plan: 'FREE',
          credits: 200,
          profileImage: picture,
          isEmailVerified,
          emailVerifiedAt: isEmailVerified ? now : null,
          registrationSource: 'GOOGLE_OAUTH',
          lastLoginAt: now,
          tokenVersion: 0
        }
      });

      // Record initial plan history
      await prisma.planHistory.create({
        data: {
          userId: user.id,
          plan: 'FREE',
          previousPlan: null,
          creditsBefore: 0,
          creditsAfter: 200,
          source: 'GOOGLE_OAUTH',
          status: 'SUCCESS',
          reason: 'Initial plan selection on Google OAuth signup'
        }
      });

      // Record welcome credit grant transaction (200 credits)
      await prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount: 200,
          balanceAfter: 200,
          type: 'INITIAL_GRANT',
          reason: 'Welcome allocation on Google signup (200 credits)'
        }
      });
    } catch (createErr) {
      // Concurrency protection: if concurrent request created the user
      if (createErr.code === 'P2002') {
        user = await prisma.user.findFirst({
          where: { OR: [{ googleId }, { email }] }
        });
        if (!user) throw createErr;
      } else {
        throw createErr;
      }
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tokenVersion: 0
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const packagePlan = await prisma.packagePlan.findUnique({
      where: { planType: user.plan }
    });

    return res.status(201).json({
      success: true,
      message: 'Google account created successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          plan: user.plan,
          planAllowance: packagePlan?.credits ?? null,
          planName: packagePlan?.name ?? null,
          credits: user.credits,
          profileImage: user.profileImage,
          isEmailVerified: user.isEmailVerified,
          registrationSource: user.registrationSource,
          lastLoginAt: now,
          createdAt: user.createdAt
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Initiates standard OAuth 2.0 Authorization Code redirect flow to Google
 */
export function initiateGoogleOAuthRedirect(req, res) {
  if (!config.oauth.google.clientId) {
    return res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured on this server',
      error: 'GOOGLE_AUTH_NOT_CONFIGURED'
    });
  }

  // Create state token with CSRF nonce and expiry
  const state = jwt.sign(
    { nonce: crypto.randomBytes(16).toString('hex'), timestamp: Date.now() },
    config.jwtSecret,
    { expiresIn: '10m' }
  );

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', config.oauth.google.clientId);
  authUrl.searchParams.set('redirect_uri', config.oauth.google.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'select_account');
  authUrl.searchParams.set('state', state);

  if (req.query.json === 'true' || req.headers.accept?.includes('application/json')) {
    return res.json({
      success: true,
      data: {
        url: authUrl.toString(),
        redirect_uri: config.oauth.google.redirectUri
      }
    });
  }

  res.redirect(authUrl.toString());
}

/**
 * Handles callback from Google OAuth redirect flow
 */
export async function handleGoogleOAuthCallback(req, res) {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    console.warn('[Google OAuth Callback] Error from Google:', oauthError);
    return res.redirect(`${config.frontendUrl}/login?error=google_cancelled`);
  }

  if (!code || !state) {
    return res.redirect(`${config.frontendUrl}/login?error=missing_oauth_params`);
  }

  try {
    jwt.verify(state, config.jwtSecret);
  } catch (err) {
    return res.redirect(`${config.frontendUrl}/login?error=invalid_oauth_state`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id: config.oauth.google.clientId,
        client_secret: config.oauth.google.clientSecret,
        redirect_uri: config.oauth.google.redirectUri,
        grant_type: 'authorization_code'
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { id_token } = tokenRes.data;
    if (!id_token) {
      return res.redirect(`${config.frontendUrl}/login?error=missing_id_token`);
    }

    const payload = await verifyGoogleIdToken(id_token);
    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const isEmailVerified = Boolean(payload.email_verified);
    const name = payload.name || email.split('@')[0];
    const picture = payload.picture || '';

    // Check user by googleId
    let user = await prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      // Check user by email
      const existingEmailUser = await prisma.user.findUnique({ where: { email } });
      if (existingEmailUser) {
        if (existingEmailUser.status === 'SUSPENDED') {
          return res.redirect(`${config.frontendUrl}/login?error=account_suspended`);
        }
        if (existingEmailUser.passwordHash) {
          // Redirect to login with account linking prompt
          return res.redirect(
            `${config.frontendUrl}/login?requiresLinking=true&linkEmail=${encodeURIComponent(email)}&email=${encodeURIComponent(email)}&idToken=${encodeURIComponent(id_token)}`
          );
        }
        // Link without password if none exists
        user = await prisma.user.update({
          where: { id: existingEmailUser.id },
          data: {
            googleId,
            isEmailVerified: true,
            emailVerifiedAt: existingEmailUser.emailVerifiedAt || new Date(),
            lastLoginAt: new Date()
          }
        });
      } else {
        // Create new user
        const now = new Date();
        try {
          user = await prisma.user.create({
            data: {
              name: name.trim(),
              email,
              googleId,
              passwordHash: null,
              role: 'USER',
              status: 'ACTIVE',
              plan: 'FREE',
              credits: 200,
              profileImage: picture,
              isEmailVerified,
              emailVerifiedAt: isEmailVerified ? now : null,
              registrationSource: 'GOOGLE_OAUTH',
              lastLoginAt: now,
              tokenVersion: 0
            }
          });

          await prisma.planHistory.create({
            data: { userId: user.id, plan: 'FREE', reason: 'Initial plan selection on Google OAuth signup' }
          });

          await prisma.creditTransaction.create({
            data: { userId: user.id, amount: 200, balanceAfter: 200, type: 'INITIAL_GRANT', reason: 'Welcome allocation on Google signup (200 credits)' }
          });
        } catch (createErr) {
          if (createErr.code === 'P2002') {
            user = await prisma.user.findFirst({ where: { OR: [{ googleId }, { email }] } });
          } else {
            throw createErr;
          }
        }
      }
    }

    if (user.status === 'SUSPENDED') {
      return res.redirect(`${config.frontendUrl}/login?error=account_suspended`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const sessionToken = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role, tokenVersion: user.tokenVersion || 0 },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.redirect(`${config.frontendUrl}/login?googleToken=${sessionToken}`);
  } catch (err) {
    console.error('[Google OAuth Callback] Error processing callback:', err.message);
    return res.redirect(`${config.frontendUrl}/login?error=google_auth_failed`);
  }
}

/**
 * Return public Google client configuration for frontend
 */
export function getGoogleAuthConfig(req, res) {
  res.json({
    success: true,
    data: {
      clientId: config.oauth.google.clientId,
      redirectUri: config.oauth.google.redirectUri,
      isConfigured: config.oauth.google.isConfigured
    }
  });
}

/**
 * Return default granular permissions for a given administrative role
 */
export function getDefaultPermissions(role) {
  if (role === 'SUPER_ADMIN') {
    return JSON.stringify(['*']);
  }
  if (role === 'ADMIN') {
    return JSON.stringify([
      'users:read',
      'users:write',
      'plans:manage',
      'promotions:manage',
      'credits:manage',
      'payments:manage',
      'publishing:read',
      'analytics:read'
    ]);
  }
  if (role === 'SUPPORT_ADMIN') {
    return JSON.stringify([
      'users:read',
      'publishing:read',
      'analytics:read'
    ]);
  }
  return JSON.stringify([]);
}

/**
 * Validate an administrative invitation token
 * GET /api/auth/admin-invite/:token
 */
export async function validateAdminInvitation(req, res, next) {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid invitation token provided.',
        error: 'INVALID_TOKEN'
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const invitation = await prisma.adminInvitation.findUnique({
      where: { tokenHash },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'This invitation token is invalid or has expired.',
        error: 'INVITATION_NOT_FOUND'
      });
    }

    if (invitation.status === 'REVOKED') {
      return res.status(410).json({
        success: false,
        message: 'This administrative invitation has been revoked by an administrator.',
        error: 'INVITATION_REVOKED'
      });
    }

    if (invitation.status === 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'This administrative invitation has already been accepted and activated.',
        error: 'INVITATION_ALREADY_ACCEPTED'
      });
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.adminInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' }
      });
      return res.status(410).json({
        success: false,
        message: 'This invitation has expired. Please request a new invitation from a Super Administrator.',
        error: 'INVITATION_EXPIRED'
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email.toLowerCase() },
      select: { id: true, name: true, email: true, role: true }
    });

    return res.json({
      success: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        roleName: invitation.role === 'SUPER_ADMIN' ? 'Super Administrator' : invitation.role === 'SUPPORT_ADMIN' ? 'Support Administrator' : 'Administrator',
        invitedByName: invitation.invitedBy?.name || 'Super Administrator',
        hasExistingAccount: Boolean(existingUser),
        existingName: existingUser?.name || null,
        expiresAt: invitation.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Accept an administrative invitation and provision access
 * POST /api/auth/admin-invite/accept
 */
export async function acceptAdminInvitation(req, res, next) {
  try {
    const { token, name, password, confirmPassword } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invitation token is required.',
        error: 'TOKEN_REQUIRED'
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const invitation = await prisma.adminInvitation.findUnique({
      where: { tokenHash },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invitation token.',
        error: 'INVITATION_NOT_FOUND'
      });
    }

    if (invitation.status !== 'PENDING' || new Date() > invitation.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'This invitation is no longer valid or has already been used.',
        error: 'INVITATION_INVALID'
      });
    }

    const email = invitation.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    let activatedUser = null;

    if (existingUser) {
      // Existing user: verify their current password to link securely
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'An existing account was found for this email. Please enter your account password to authenticate and accept.',
          error: 'PASSWORD_REQUIRED'
        });
      }

      const isValidPassword = await bcrypt.compare(password, existingUser.passwordHash || '');
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect password for your existing account. Please verify your credentials to activate admin access.',
          error: 'INVALID_CREDENTIALS'
        });
      }

      await prisma.$transaction(async (tx) => {
        activatedUser = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            role: invitation.role,
            permissions: invitation.permissions || getDefaultPermissions(invitation.role),
            status: 'ACTIVE',
            tokenVersion: { increment: 1 },
            lastLoginAt: new Date()
          }
        });

        await tx.adminInvitation.update({
          where: { id: invitation.id },
          data: {
            status: 'ACCEPTED',
            acceptedAt: new Date(),
            acceptedById: activatedUser.id
          }
        });

        await tx.adminAuditLog.create({
          data: {
            adminId: activatedUser.id,
            action: 'ADMIN_INVITATION_ACCEPTED',
            targetUserId: activatedUser.id,
            details: JSON.stringify({
              email,
              role: invitation.role,
              invitedById: invitation.invitedById,
              accountType: 'EXISTING_USER_UPGRADED'
            }),
            ipAddress: req.ip
          }
        });
      });
    } else {
      // New user: validate name and password
      if (!name || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Full name is required (minimum 2 characters).',
          error: 'NAME_TOO_SHORT'
        });
      }

      if (!password || password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long.',
          error: 'PASSWORD_TOO_SHORT'
        });
      }

      if (!/[^a-zA-Z0-9]/.test(password)) {
        return res.status(400).json({
          success: false,
          message: 'Password must contain at least one symbol (e.g. !@#$%^&*).',
          error: 'PASSWORD_SYMBOL_REQUIRED'
        });
      }

      if (confirmPassword && password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match.',
          error: 'PASSWORD_MISMATCH'
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      await prisma.$transaction(async (tx) => {
        activatedUser = await tx.user.create({
          data: {
            name: name.trim(),
            email,
            passwordHash,
            role: invitation.role,
            permissions: invitation.permissions || getDefaultPermissions(invitation.role),
            status: 'ACTIVE',
            plan: 'PROFESSIONAL',
            credits: 1000,
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
            registrationSource: 'ADMIN_INVITATION',
            createdById: invitation.invitedById,
            tokenVersion: 0,
            lastLoginAt: new Date()
          }
        });

        await tx.planHistory.create({
          data: {
            userId: activatedUser.id,
            plan: 'PROFESSIONAL',
            reason: `Administrative provisioning via invitation (${invitation.role})`
          }
        });

        await tx.creditTransaction.create({
          data: {
            userId: activatedUser.id,
            amount: 1000,
            balanceAfter: 1000,
            type: 'INITIAL_GRANT',
            reason: 'Administrative initial credit grant'
          }
        });

        await tx.adminInvitation.update({
          where: { id: invitation.id },
          data: {
            status: 'ACCEPTED',
            acceptedAt: new Date(),
            acceptedById: activatedUser.id
          }
        });

        await tx.adminAuditLog.create({
          data: {
            adminId: activatedUser.id,
            action: 'ADMIN_INVITATION_ACCEPTED',
            targetUserId: activatedUser.id,
            details: JSON.stringify({
              email,
              role: invitation.role,
              invitedById: invitation.invitedById,
              accountType: 'NEW_ADMIN_PROVISIONED'
            }),
            ipAddress: req.ip
          }
        });
      });
    }

    const sessionToken = jwt.sign(
      {
        userId: activatedUser.id,
        email: activatedUser.email,
        name: activatedUser.name,
        role: activatedUser.role,
        tokenVersion: activatedUser.tokenVersion || 0
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    let parsedPermissions = [];
    try {
      parsedPermissions = JSON.parse(activatedUser.permissions || '[]');
    } catch {
      parsedPermissions = [];
    }

    return res.status(201).json({
      success: true,
      message: `Administrator access activated successfully! Welcome to the SocialSync AI Governance Team.`,
      data: {
        token: sessionToken,
        user: {
          id: activatedUser.id,
          name: activatedUser.name,
          email: activatedUser.email,
          role: activatedUser.role,
          status: activatedUser.status,
          plan: activatedUser.plan,
          credits: activatedUser.credits,
          permissions: parsedPermissions
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/auth/delete-account
 * Permanently delete authenticated user's account and all personal records
 * - Enforces password verification for password users (or confirmation text for OAuth users)
 * - Prohibits super admin self-destruction
 * - Preserves legal & financial payment records by setting payment.userId = null
 * - Records non-identifying AccountDeletionEvent with sha256(userId) for audit and churn analytics
 * - Purges all posts, platforms, jobs, social connections, subscriptions, and tokens
 * - Idempotent: repeated attempts for the same account cannot count more than once
 */
export async function deleteAccount(req, res, next) {
  try {
    const userId = req.user.id;
    const { password, confirmation, reason } = req.body || {};

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        posts: { select: { id: true } }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found or already deleted.',
        error: 'USER_NOT_FOUND'
      });
    }

    // Protect Super Admin from self-service account deletion
    if (user.role === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Super Administrator accounts cannot be deleted through self-service settings.',
        error: 'SUPER_ADMIN_DELETION_PROHIBITED',
        code: 'SUPER_ADMIN_DELETION_PROHIBITED'
      });
    }

    // Verification: if user has password, require password match
    if (user.passwordHash) {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Your current password is required to permanently delete your account.',
          error: 'PASSWORD_REQUIRED',
          code: 'PASSWORD_REQUIRED'
        });
      }
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect password. Permanent account deletion aborted.',
          error: 'INVALID_CREDENTIALS',
          code: 'INVALID_CREDENTIALS'
        });
      }
    } else {
      // OAuth-only user (no password set): require confirmation string "DELETE"
      if ((confirmation || '').trim().toUpperCase() !== 'DELETE') {
        return res.status(400).json({
          success: false,
          message: 'Please type DELETE to confirm permanent account deletion.',
          error: 'CONFIRMATION_REQUIRED'
        });
      }
    }

    const userIdHash = crypto.createHash('sha256').update(user.id).digest('hex');
    const postIds = user.posts.map(p => p.id);

    await prisma.$transaction(async (tx) => {
      // 1. Record persistent, privacy-preserving deletion event (idempotent upsert via userIdHash)
      await tx.accountDeletionEvent.upsert({
        where: { userIdHash },
        update: {},
        create: {
          userIdHash,
          deletedAt: new Date(),
          registrationAt: user.createdAt,
          reason: typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 100) : 'USER_REQUESTED'
        }
      });

      // 2. Preserve financial & payment records for legal/accounting compliance (disassociate userId)
      await tx.payment.updateMany({
        where: { userId: user.id },
        data: { userId: null }
      });

      // 3. Purge publishing jobs and post platforms
      if (postIds.length > 0) {
        await tx.publishingJob.deleteMany({
          where: { postId: { in: postIds } }
        });
        await tx.postPlatform.deleteMany({
          where: { postId: { in: postIds } }
        });
        await tx.post.deleteMany({
          where: { id: { in: postIds } }
        });
      }

      // 4. Delete social accounts (and tokens)
      await tx.socialAccount.deleteMany({
        where: { userId: user.id }
      });

      // 5. Delete password reset tokens & OTPs
      await tx.passwordResetOtp.deleteMany({
        where: { userId: user.id }
      });
      await tx.passwordResetToken.deleteMany({
        where: { userId: user.id }
      });

      // 6. Delete subscriptions & subscription events
      await tx.subscriptionEvent.deleteMany({
        where: { userId: user.id }
      });
      await tx.userSubscription.deleteMany({
        where: { userId: user.id }
      });

      // 7. Delete plan history & credit transactions
      await tx.planHistory.deleteMany({
        where: { userId: user.id }
      });
      await tx.creditTransaction.deleteMany({
        where: { userId: user.id }
      });

      // 8. Delete promotion redemptions
      await tx.promotionRedemption.deleteMany({
        where: { userId: user.id }
      });

      // 9. Clean audit log links
      await tx.adminAuditLog.deleteMany({
        where: { targetUserId: user.id }
      });
      await tx.adminAuditLog.deleteMany({
        where: { adminId: user.id }
      });

      // 10. Clear createdById on any users provisioned by this user
      await tx.user.updateMany({
        where: { createdById: user.id },
        data: { createdById: null }
      });

      // 11. Finally, permanently delete the user record
      await tx.user.delete({
        where: { id: user.id }
      });
    });

    return res.json({
      success: true,
      message: 'Your account and all personal data have been permanently deleted.'
    });
  } catch (error) {
    next(error);
  }
}
