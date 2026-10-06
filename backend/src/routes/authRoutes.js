import { Router } from 'express';
import { register, login, me, logout, registerSchema, loginSchema } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/register', validate({ body: registerSchema }), register);
router.post('/login', validate({ body: loginSchema }), login);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, me);

export default router;
