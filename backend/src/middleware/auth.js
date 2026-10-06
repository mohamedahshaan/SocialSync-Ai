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
        profileImage: true,
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

    // Attach verified user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
