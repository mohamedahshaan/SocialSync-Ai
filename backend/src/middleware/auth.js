import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../utils/prisma.js';

export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required. Please log in.',
        error: 'UNAUTHORIZED'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token.',
        error: 'INVALID_TOKEN'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId || decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        credits: true,
        profileImage: true,
        tokenVersion: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user no longer exists.',
        error: 'USER_NOT_FOUND'
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended by an administrator. Please contact support.',
        error: 'ACCOUNT_SUSPENDED'
      });
    }

    // Invalidate session if tokenVersion does not match database (after password reset)
    const tokenVersion = decoded.tokenVersion !== undefined ? decoded.tokenVersion : 0;
    if (user.tokenVersion !== tokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Your session has been invalidated following a password reset. Please log in again.',
        error: 'SESSION_INVALIDATED'
      });
    }

    // Attach verified user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Enforce administrator authorization for protected administrative endpoints
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
      error: 'UNAUTHORIZED'
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Administrator authorization required. Access denied.',
      error: 'FORBIDDEN_NOT_ADMIN'
    });
  }

  next();
}
