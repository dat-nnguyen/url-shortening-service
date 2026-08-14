import redis from '../config/redis.js';

/**
 * Atomic Lua script to increment rate counter and set TTL atomically in a single Redis engine cycle.
 * Prevents key persistence without expiration in high-concurrency race conditions.
 */
const RATE_LIMIT_LUA_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return {current, ttl}
`;

/**
 * Extracts the real client IP address from request headers set by reverse proxies (e.g. Nginx).
 *
 * @param {import('express').Request} req - Express request object.
 * @returns {string} Client IP address string.
 */
export function getClientIp(req) {
    const realIp = req.headers['x-real-ip'];
    if (realIp && typeof realIp === 'string') {
        return realIp.trim();
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor && typeof forwardedFor === 'string') {
        return forwardedFor.split(',')[0].trim();
    }

    return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Factory function creating Redis-backed Rate Limiter middleware using atomic Lua scripting.
 *
 * Flow:
 * 1. Extracts real client IP (via `x-real-ip` / `x-forwarded-for`).
 * 2. Builds Redis key: `ratelimit:${clientIp}:${routeIdentifier}`.
 * 3. Atomically executes Lua script (INCR + conditional EXPIRE + TTL).
 * 4. If `count > limit`, responds with HTTP 429 Too Many Requests.
 * 5. Sets standard rate limit response headers (`X-RateLimit-*`, `Retry-After`).
 *
 * @param {Object} [options={}] - Rate limiter configuration options.
 * @param {number} [options.limit=20] - Maximum allowed requests in the time window.
 * @param {number} [options.windowSeconds=60] - Sliding time window in seconds.
 * @param {string} [options.routeIdentifier='global'] - Unique scope/route identifier.
 * @returns {import('express').RequestHandler} Express rate limiter middleware function.
 */
export function createRateLimiter(options = {}) {
    const {
        limit = 20,
        windowSeconds = 60,
        routeIdentifier = 'global',
    } = options;

    return async (req, res, next) => {
        const clientIp = getClientIp(req);
        const key = `ratelimit:${clientIp}:${routeIdentifier}`;

        try {
            // Execute atomic Lua script in Redis
            const result = await redis.eval(
                RATE_LIMIT_LUA_SCRIPT,
                1,
                key,
                windowSeconds
            );

            const currentCount = Number(result[0]);
            const ttl = Number(result[1]);
            const remaining = Math.max(0, limit - currentCount);

            res.setHeader('X-RateLimit-Limit', limit);
            res.setHeader('X-RateLimit-Remaining', remaining);
            res.setHeader('X-RateLimit-Reset', ttl > 0 ? ttl : windowSeconds);

            // Check if count exceeds limit
            if (currentCount > limit) {
                res.setHeader('Retry-After', ttl > 0 ? ttl : windowSeconds);
                return res.status(429).json({
                    error: 'Too many requests. Please try again later.',
                    limit,
                    current: currentCount,
                    retryAfter: `${ttl > 0 ? ttl : windowSeconds} seconds`,
                });
            }

            return next();
        } catch (error) {
            console.warn(`[RateLimiter Error] Failed to enforce rate limit for ${key}:`, error.message);
            // Graceful degradation: allow request through if Redis fails
            return next();
        }
    };
}

/**
 * Pre-configured rate limiter for general endpoints (20 req/min).
 */
export const defaultRateLimiter = createRateLimiter({
    limit: 20,
    windowSeconds: 60,
    routeIdentifier: 'default',
});

/**
 * Pre-configured strict rate limiter for Auth endpoints (5 attempts/min).
 */
export const authRateLimiter = createRateLimiter({
    limit: 5,
    windowSeconds: 60,
    routeIdentifier: 'auth',
});

/**
 * Pre-configured rate limiter for URL shortening endpoints (15 req/min).
 */
export const shortenRateLimiter = createRateLimiter({
    limit: 15,
    windowSeconds: 60,
    routeIdentifier: 'shorten',
});
