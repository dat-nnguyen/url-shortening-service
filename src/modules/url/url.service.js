import prisma from '../../config/prisma.js';
import redis from '../../config/redis.js';
import snowflake from '../../utils/snowflake.js';
import { encode } from './base62.js';

/**
 * Standard Cache TTL in seconds (24 hours).
 */
const CACHE_TTL_SECONDS = 86400;

/**
 * Sentinel value stored in Redis when a URL does not exist in the database.
 * Protects PostgreSQL against Cache Penetration attacks.
 */
const NULL_CACHE_SENTINEL = '__NULL__';

/**
 * Short cache TTL in seconds for non-existent records (60 seconds).
 */
const NULL_CACHE_TTL_SECONDS = 60;

/**
 * Returns the standardized Redis cache key for a given short code.
 *
 * @param {string} shortCode - The Base62 short code.
 * @returns {string} The Redis cache key.
 */
const getCacheKey = (shortCode) => `url:${shortCode}`;

/**
 * Creates a shortened URL record linked optionally to a user account using 64-bit Snowflake ID generation.
 * 
 * Optimized Flow:
 * 1. Validates input and converts `userId` to `BigInt` if provided.
 * 2. Checks for existing URL for the user to prevent duplicate entries.
 * 3. Generates a unique 64-bit Snowflake ID (`snowflake.nextId()`).
 * 4. Encodes the Snowflake ID into Base62 (`shortCode = encode(id)`).
 * 5. Executes a single atomic INSERT in PostgreSQL with both `id` and `shortCode` upfront.
 * 6. Stores the created record in Redis cache for instant lookups.
 *
 * @param {string} originalUrl - The original long URL.
 * @param {number|string|bigint|null} [userId=null] - Optional user ID owning the URL.
 * @returns {Promise<{ id: string, originalUrl: string, shortCode: string, userId: string|null, createdAt: Date }>} The URL record.
 */
export async function createUrlShortening(originalUrl, userId = null) {
    if (!originalUrl || typeof originalUrl !== 'string') {
        throw new TypeError('originalUrl must be a non-empty string.');
    }

    const userBigIntId = userId ? BigInt(userId) : null;

    // Check if URL already exists for this user to prevent duplicate entries
    const existing = await prisma.url.findFirst({
        where: {
            originalUrl,
            userId: userBigIntId,
        },
    });

    if (existing) {
        const normalizedExisting = {
            ...existing,
            id: existing.id.toString(),
            userId: existing.userId ? existing.userId.toString() : null,
        };

        try {
            await redis.set(
                getCacheKey(existing.shortCode),
                JSON.stringify(normalizedExisting),
                'EX',
                CACHE_TTL_SECONDS
            );
        } catch (err) {
            console.warn(`[Redis Cache Error] Failed to cache existing URL:`, err.message);
        }

        return normalizedExisting;
    }

    // 1. Generate unique 64-bit Snowflake ID and Base62 shortCode
    const id = snowflake.nextId();
    const shortCode = encode(id);

    // 2. Single atomic database INSERT
    const createdRecord = await prisma.url.create({
        data: {
            id,
            originalUrl,
            shortCode,
            userId: userBigIntId,
        },
    });

    const normalizedRecord = {
        ...createdRecord,
        id: createdRecord.id.toString(),
        userId: createdRecord.userId ? createdRecord.userId.toString() : null,
    };

    // 3. Populate Redis Cache
    try {
        await redis.set(
            getCacheKey(shortCode),
            JSON.stringify(normalizedRecord),
            'EX',
            CACHE_TTL_SECONDS
        );
    } catch (err) {
        console.warn(`[Redis Cache Error] Failed to cache created URL:`, err.message);
    }

    return normalizedRecord;
}

/**
 * Retrieves the URL record by its shortCode using Cache-Aside pattern with Cache Penetration protection.
 *
 * Flow:
 * 1. Checks Redis cache using key `url:${shortCode}`.
 * 2. If sentinel value `__NULL__` found: returns null immediately (prevents DB hammering).
 * 3. If cached JSON record found: parses and returns the cached record immediately.
 * 4. If cache miss: queries PostgreSQL database via Prisma.
 * 5. If not found in DB: caches sentinel `__NULL__` with 60-second TTL to mitigate penetration.
 * 6. If found in DB: normalizes record and caches it in Redis with 24-hour TTL (EX 86400).
 * 7. Returns the normalized record (or null if not found).
 *
 * @param {string} shortCode - The Base62 short code.
 * @returns {Promise<{ id: string, originalUrl: string, shortCode: string, userId: string|null, createdAt: Date } | null>}
 */
export async function getOriginalUrl(shortCode) {
    if (!shortCode || typeof shortCode !== 'string') {
        return null;
    }

    const cacheKey = getCacheKey(shortCode);

    // 1. Check Redis Cache
    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            // Cache Penetration Check: Sentinel value indicates known non-existent key
            if (cached === NULL_CACHE_SENTINEL) {
                return null;
            }
            return JSON.parse(cached);
        }
    } catch (err) {
        console.warn(`[Redis Cache Error] Failed to read key ${cacheKey}:`, err.message);
    }

    // 2. Database Query on Cache Miss
    const record = await prisma.url.findUnique({
        where: { shortCode },
    });

    if (!record) {
        // Cache Penetration Mitigation: Cache sentinel value with 60s TTL
        try {
            await redis.set(
                cacheKey,
                NULL_CACHE_SENTINEL,
                'EX',
                NULL_CACHE_TTL_SECONDS
            );
        } catch (err) {
            console.warn(`[Redis Cache Error] Failed to write null sentinel for ${cacheKey}:`, err.message);
        }
        return null;
    }

    const normalizedRecord = {
        ...record,
        id: record.id.toString(),
        userId: record.userId ? record.userId.toString() : null,
    };

    // 3. Populate Redis Cache with 24-hour expiration
    try {
        await redis.set(
            cacheKey,
            JSON.stringify(normalizedRecord),
            'EX',
            CACHE_TTL_SECONDS
        );
    } catch (err) {
        console.warn(`[Redis Cache Error] Failed to write key ${cacheKey}:`, err.message);
    }

    return normalizedRecord;
}

/**
 * Retrieves all shortened URL records owned by a specific user (ordered by most recent first).
 *
 * @param {number|string|bigint} userId - The user ID to query.
 * @returns {Promise<Array<{ id: string, originalUrl: string, shortCode: string, userId: string|null, createdAt: Date }>>} Array of URL records.
 */
export async function getUserUrls(userId) {
    if (userId === null || userId === undefined) {
        return [];
    }

    let userBigIntId;
    try {
        userBigIntId = BigInt(userId);
    } catch (err) {
        return [];
    }

    const records = await prisma.url.findMany({
        where: { userId: userBigIntId },
        orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => ({
        ...record,
        id: record.id.toString(),
        userId: record.userId ? record.userId.toString() : null,
    }));
}