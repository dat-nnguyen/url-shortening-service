import { Router } from 'express';
import { shortenUrl, redirectToOriginalUrl } from './url.controller.js';
import { authenticateOptional } from '../../middleware/auth.middleware.js';
import { shortenRateLimiter } from '../../middleware/rateLimiter.middleware.js';

const router = Router();

/**
 * @route   POST /shorten
 * @desc    Validates and shortens a given long URL into a Base62 short code. Supports optional JWT auth and rate limiting.
 * @access  Public / Optional Auth
 */
router.post('/shorten', shortenRateLimiter, authenticateOptional, shortenUrl);

/**
 * @route   GET /:shortCode
 * @desc    Resolves the Base62 short code and redirects the client to the original URL.
 * @access  Public
 */
router.get('/:shortCode', redirectToOriginalUrl);

export default router;