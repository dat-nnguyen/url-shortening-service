import { Router } from 'express';
import { shortenUrl, redirectToOriginalUrl } from './url.controller.js';

const router = Router();

/**
 * @route   POST /shorten
 * @desc    Validates and shortens a given long URL into a Base62 short code.
 * @access  Public
 */
router.post('/shorten', shortenUrl);

/**
 * @route   GET /:shortCode
 * @desc    Resolves the Base62 short code and redirects the client to the original URL.
 * @access  Public
 */
router.get('/:shortCode', redirectToOriginalUrl);

export default router;