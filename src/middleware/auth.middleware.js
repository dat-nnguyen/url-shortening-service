import jwt from 'jsonwebtoken';

/**
 * Optional Authentication Middleware.
 *
 * Extracts Bearer token from the `Authorization` header.
 * - If token exists and is valid, sets `req.user = decodedToken` and calls `next()`.
 * - If token is missing or invalid, sets `req.user = null` and calls `next()`.
 *
 * Allows endpoints to support both logged-in users and anonymous access.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware callback.
 * @returns {void}
 */
export function authenticateOptional(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedToken;
    } catch (error) {
        req.user = null;
    }

    return next();
}

/**
 * Strict Authentication Middleware.
 *
 * Extracts Bearer token from the `Authorization` header.
 * - If token exists and is valid, sets `req.user = decodedToken` and calls `next()`.
 * - If token is missing or invalid, responds immediately with HTTP `401 Unauthorized`.
 *
 * Used to protect private user endpoints.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {void|import('express').Response} Calls `next()` if authenticated, else returns 401 response.
 */
export function authenticateStrict(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedToken;
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Authentication required' });
    }
}