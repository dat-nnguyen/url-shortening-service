import { Router } from 'express';
import { register, login } from './auth.controller.js';
import { validate } from './auth.validate.js';
import { registerSchema, loginSchema } from './auth.schema.js';
import { authRateLimiter } from '../../middleware/rateLimiter.middleware.js';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Registers a new user account. Protected by rate limiting and schema validation.
 * @access  Public
 */
router.post('/register', authRateLimiter, validate(registerSchema), register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticates a user and returns a JWT access token. Protected by rate limiting.
 * @access  Public
 */
router.post('/login', authRateLimiter, validate(loginSchema), login);

export default router;
