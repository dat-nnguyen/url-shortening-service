const BASE62_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const BASE = BigInt(BASE62_ALPHABET.length);

const CHAR_MAP = new Map(
    Array.from(BASE62_ALPHABET).map((char, index) => [char, BigInt(index)])
);

/**
 * Encodes a numeric ID into a Base62 short string.
 *
 * Supports standard JavaScript `number` and `bigint` primitives.
 *
 * @param {number|bigint|string} numericId - The numeric ID to encode (must be a non-negative integer).
 * @returns {string} The Base62 encoded string.
 * @throws {TypeError} If `numericId` cannot be converted to a BigInt.
 * @throws {RangeError} If `numericId` is negative.
 *
 * @example
 * encode(125); // returns "cb"
 * encode(1234567890123456789n); // returns "bDmuSbXp4xR"
 */
export function encode(numericId) {
    let num = BigInt(numericId);

    if (num < 0n) {
        throw new RangeError('numericId must be a non-negative integer.');
    }

    if (num === 0n) {
        return BASE62_ALPHABET[0];
    }

    let encoded = '';
    while (num > 0n) {
        const remainder = Number(num % BASE);
        encoded = BASE62_ALPHABET[remainder] + encoded;
        num = num / BASE;
    }

    return encoded;
}

/**
 * Decodes a Base62 short string back into a BigInt numeric ID.
 *
 * @param {string} shortCode - The Base62 string to decode.
 * @returns {bigint} The decoded integer ID as a BigInt.
 * @throws {TypeError} If `shortCode` is not a non-empty string.
 * @throws {Error} If `shortCode` contains characters not present in the Base62 alphabet.
 *
 * @example
 * decode("cb"); // returns 125n
 * decode("bDmuSbXp4xR"); // returns 1234567890123456789n
 */
export function decode(shortCode) {
    if (typeof shortCode !== 'string' || shortCode.length === 0) {
        throw new TypeError('shortCode must be a non-empty string.');
    }

    let decoded = 0n;
    for (let i = 0; i < shortCode.length; i++) {
        const char = shortCode[i];
        const value = CHAR_MAP.get(char);
        if (value === undefined) {
            throw new Error(`Invalid character '${char}' in Base62 shortCode.`);
        }
        decoded = decoded * BASE + value;
    }

    return decoded;
}