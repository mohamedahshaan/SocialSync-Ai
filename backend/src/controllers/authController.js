import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/index.js';
import { createOrUpdateSubscription } from '../services/subscriptionService.js';
import {
  sendPasswordResetOtpEmail,
  sendPasswordResetSuccessEmail
} from '../services/emailService.js';

export const registerSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  plan: z.string().optional()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required')
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please provide a valid email address')
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  otp: z.string().length(6, 'Verification code must be exactly 6 digits').regex(/^\d{6}$/, 'Code must contain numbers only')
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  resetToken: z.string().optional(),
  otp: z.string().optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
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
    const { name, email, password, plan, cardData } = req.body;

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

    // Determine initial plan type
    let planType = 'FREE';
    if (plan) {
      const upper = plan.toUpperCase();
      if (['FREE', 'CREATOR', 'PROFESSIONAL'].includes(upper)) {
        planType = upper;
      }
    }

    // Hash password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
        plan: planType,
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
        plan: planType,
        reason: 'Initial plan selection on user registration'
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

    // If a paid plan or cardData was submitted, initialize subscription / 1-month trial
    let subscription = null;
    if (planType !== 'FREE' || cardData) {
      try {
        subscription = await createOrUpdateSubscription({
          userId: user.id,
          planType,
          cardData
        });
        const updated = await prisma.user.findUnique({
          where: { id: user.id },
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
        if (updated) Object.assign(user, updated);
      } catch (subErr) {
        console.error('Subscription activation note:', subErr.message);
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role, tokenVersion: 0 },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

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

    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      plan: user.plan,
      credits: user.credits,
      profileImage: user.profileImage,
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
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters'
      });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { name: name.trim() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        credits: true,
        profileImage: true,
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
        message: 'If an account exists with this email address, a 6-digit verification code has been sent.',
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

    // Generate random secure 6-digit OTP
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

    // Send email with OTP
    await sendPasswordResetOtpEmail({
      email: cleanEmail,
      name: user.name,
      otp,
      expiresMinutes: 5
    });

    return res.json({
      success: true,
      message: 'If an account exists with this email address, a 6-digit verification code has been sent.',
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
 * Set new password following verified OTP
 * Hashes password using bcrypt (12 rounds) and increments tokenVersion to invalidate existing sessions
 */
export async function resetPassword(req, res, next) {
  try {
    const { email, resetToken, otp, newPassword, confirmPassword } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long',
        error: 'PASSWORD_TOO_SHORT'
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

    if (resetToken) {
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
      // Direct reset via OTP & email
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

    // Verify OTP record is not already used
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

    // Mark OTP as used
    await prisma.passwordResetOtp.update({
      where: { id: targetOtpId },
      data: { used: true }
    });

    // Invalidate ALL existing sessions by incrementing tokenVersion
    // Mark email as verified if not already verified (since user successfully received OTP on this email)
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

