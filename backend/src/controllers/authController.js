import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/index.js';

export const registerSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required')
});

/**
 * Register a new user
 */
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

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

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash
      },
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
        createdAt: true
      }
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user,
        token
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

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: 'INVALID_CREDENTIALS'
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
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
