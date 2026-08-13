import { Router } from 'express';
import { register, login } from './auth.controller.js';
import { validate } from '../../middlewares/validate.js';
import { registerSchema, loginSchema } from './auth.schema.js';
const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Registers a new user account.
 * @access  Public
 */
router.post('/register', validate(registerSchema), register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticates a user and returns a JWT access token.
 * @access  Public
 */

router.post('/login', validate(loginSchema), login);

export default router;
