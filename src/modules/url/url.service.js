import prisma from '../../config/prisma.js';
import { encode } from './base62.js';

/**
 * Creates a shortened URL record linked optionally to a user account.
 * 
 * Flow:
 * 1. Converts `userId` to `BigInt` if provided.
 * 2. Inserts the record with a temporary shortCode to reserve the auto-increment `id` (BigInt).
 * 3. Encodes `id` into Base62 (`shortCode = encode(id)`).
 * 4. Updates the database record with the generated `shortCode`.
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
        return {
            ...existing,
            id: existing.id.toString(),
            userId: existing.userId ? existing.userId.toString() : null,
        };
    }

    // 1. Create record with temporary shortCode to obtain auto-increment ID
    const tempCode = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const urlRecord = await prisma.url.create({
        data: {
            originalUrl,
            shortCode: tempCode,
            userId: userBigIntId,
        },
    });

    // 2. Generate Base62 shortCode from auto-increment BigInt ID
    const shortCode = encode(urlRecord.id);

    // 3. Update record with final shortCode
    const updatedRecord = await prisma.url.update({
        where: { id: urlRecord.id },
        data: { shortCode },
    });

    return {
        ...updatedRecord,
        id: updatedRecord.id.toString(),
        userId: updatedRecord.userId ? updatedRecord.userId.toString() : null,
    };
}

/**
 * Retrieves the URL record by its shortCode.
 *
 * @param {string} shortCode - The Base62 short code.
 * @returns {Promise<{ id: string, originalUrl: string, shortCode: string, userId: string|null, createdAt: Date } | null>}
 */
export async function getOriginalUrl(shortCode) {
    if (!shortCode || typeof shortCode !== 'string') {
        return null;
    }

    const record = await prisma.url.findUnique({
        where: { shortCode },
    });

    if (!record) {
        return null;
    }

    return {
        ...record,
        id: record.id.toString(),
        userId: record.userId ? record.userId.toString() : null,
    };
}