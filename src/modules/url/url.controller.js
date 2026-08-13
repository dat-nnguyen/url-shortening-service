import { createUrlShortening, getOriginalUrl } from './url.service.js';

/**
 * Handles URL shortening requests (POST /api/shorten).
 *
 * Validates the `originalUrl` format, extracts `userId` from `req.user` if authenticated via optional JWT,
 * calls the service layer to persist the record and generate a Base62 short code, then returns a `201 Created`
 * HTTP response with the short code and full URL.
 *
 * @param {import('express').Request} req - Express request object, expecting `{ originalUrl: string }` in `req.body` and optional `req.user`.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON response containing shortened URL details or an error payload.
 */
export async function shortenUrl(req, res) {
    try {
        const { originalUrl } = req.body;

        if (!originalUrl) {
            return res.status(400).json({ error: 'Invalid URL provided.' });
        }

        try {
            new URL(originalUrl);
        } catch (err) {
            return res.status(400).json({ error: 'Invalid URL provided.' });
        }

        const userId = req.user?.id ?? null;
        const urlRecord = await createUrlShortening(originalUrl, userId);

        const fullShortUrl = `${req.protocol}://${req.get('host')}/${urlRecord.shortCode}`;
        return res.status(201).json({
            originalUrl: urlRecord.originalUrl,
            shortCode: urlRecord.shortCode,
            shortUrl: fullShortUrl,
            createdAt: urlRecord.createdAt,
        });

    } catch (error) {
        console.error('Error in shortenUrl controller:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * Handles URL redirection requests (GET /:shortCode).
 *
 * Looks up the original URL associated with the provided Base62 `shortCode`. If found, performs an HTTP
 * redirect to the original destination URL. Otherwise, returns a `404 Not Found` error.
 *
 * @param {import('express').Request} req - Express request object containing `shortCode` in `req.params`.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void|import('express').Response>} Performs an HTTP redirect or returns an error JSON response.
 */
export async function redirectToOriginalUrl(req, res) {
    try {
        const { shortCode } = req.params;

        if (!shortCode) {
            return res.status(400).json({ error: 'Missing short URL parameter.' });
        }

        const record = await getOriginalUrl(shortCode);
        if (!record) {
            return res.status(404).json({ error: 'URL not found.' });
        }

        return res.redirect(record.originalUrl);
    } catch (error) {
        console.error('Error in redirectToOriginalUrl controller:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}
