import { Router } from 'express';
import { shortenUrl, redirectToOriginalUrl } from './url.controller.js';
import { authenticateOptional } from '../../middleware/auth.middleware.js';
import { shortenRateLimiter } from '../../middleware/rateLimiter.middleware.js';

const router = Router();

/**
 * @openapi
 * /shorten:
 *   post:
 *     summary: Shorten a long URL
 *     description: Accepts a valid destination URL, generates a unique 64-bit Twitter Snowflake ID, encodes it into Base62, and caches it in Redis. If a Bearer JWT is supplied, associates URL with the user.
 *     tags:
 *       - URLs
 *     security:
 *       - BearerAuth: []
 *       - {}
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShortenRequest'
 *     responses:
 *       201:
 *         description: URL successfully created and shortened.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShortenResponse'
 *       400:
 *         description: Invalid destination URL format.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded (15 req/min).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitErrorResponse'
 */
router.post('/shorten', shortenRateLimiter, authenticateOptional, shortenUrl);

/**
 * @openapi
 * /{shortCode}:
 *   get:
 *     summary: Redirect to original long URL
 *     description: Resolves the Base62 short code from Redis cache (or PostgreSQL fallback) and performs an HTTP 302 redirection to the destination URL.
 *     tags:
 *       - URLs
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         schema:
 *           type: string
 *           example: A3hLagSQ4i
 *         description: The Base62 short code to resolve.
 *     responses:
 *       302:
 *         description: Successfully found. Redirecting to original URL.
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               example: https://github.com
 *             description: The target destination URL.
 *       404:
 *         description: Short code does not exist.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:shortCode', redirectToOriginalUrl);

export default router;