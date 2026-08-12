import prisma from '../../config/prisma.js';
import { encode } from './base62.js';

/**
 * Creates a shortened URL record.
 * 
 * Flow:
 * 1. Inserts the record with a temporary shortCode to reserve the auto-increment `id` (BigInt).
 * 2. Encodes `id` into Base62 (`shortCode = encode(id)`).
 * 3. Updates the database record with the generated `shortCode`.
 *
 * @param {string} originalUrl - The original long URL.
 * @returns {Promise<{ id: string, originalUrl: string, shortCode: string, createdAt: Date }>} The URL record.
 */
export async function createUrlShortening(originalUrl) {
    if (!originalUrl || typeof originalUrl !== 'string') {
        throw new TypeError('originalUrl must be a non-empty string.');
    }

    // Check if URL already exists to prevent duplicate entries
    const existing = await prisma.url.findFirst({
        where: { originalUrl },
    });

    if (existing) {
        return {
            ...existing,
            id: existing.id.toString(),
        };
    }

    // 1. Create record with temporary shortCode to obtain auto-increment ID
    const tempCode = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const urlRecord = await prisma.url.create({
        data: {
            originalUrl,
            shortCode: tempCode,
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
    };
}

/**
 * Retrieves the URL record by its shortCode.
 *
 * @param {string} shortCode - The Base62 short code.
 * @returns {Promise<{ id: string, originalUrl: string, shortCode: string, createdAt: Date } | null>}
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
    };
}