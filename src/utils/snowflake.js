import os from 'node:os';

/**
 * 64-bit Snowflake ID Generator (Twitter Snowflake implementation using native BigInt).
 *
 * 64-bit Binary Layout:
 * ┌────────┬──────────────────────────────────────────┬──────────────────────┬──────────────────────────┐
 * │ 1 bit  │ 41 bits                                  │ 10 bits              │ 12 bits                  │
 * │ Unused │ Timestamp delta (milliseconds from epoch)│ Worker Node ID (0-1023)│ Sequence Counter (0-4095)│
 * └────────┴──────────────────────────────────────────┴──────────────────────┴──────────────────────────┘
 */

// Bit width allocations
const SEQUENCE_BITS = 12n;
const WORKER_ID_BITS = 10n;

// Maximum values (bit masks)
const MAX_WORKER_ID = -1n ^ (-1n << WORKER_ID_BITS); // 1023n (Supports up to 1024 workers)
const SEQUENCE_MASK = -1n ^ (-1n << SEQUENCE_BITS);   // 4095n (4096 unique IDs per ms per worker)

// Bit shift offsets
const WORKER_ID_SHIFT = SEQUENCE_BITS;                // 12n
const TIMESTAMP_LEFT_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS; // 22n

// Static custom epoch baseline: 2023-11-14T22:13:20.000Z (November 2023)
const DEFAULT_CUSTOM_EPOCH = 1700000000000n;

/**
 * Resolves or derives a unique Worker ID (0-1023) for this instance.
 *
 * Resolution Order:
 * 1. Checks explicit `process.env.WORKER_ID` environment variable.
 * 2. In dynamic multi-replica Docker environments, computes a deterministic hash
 *    modulo 1024 from the container's unique `HOSTNAME` (12-char container ID).
 *
 * @returns {number} Worker ID between 0 and 1023.
 */
export function resolveWorkerId() {
    if (process.env.WORKER_ID !== undefined && process.env.WORKER_ID !== '') {
        const parsed = parseInt(process.env.WORKER_ID, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1023) {
            return parsed;
        }
    }

    const hostname = process.env.HOSTNAME || os.hostname() || '0';

    let hash = 0;
    for (let i = 0; i < hostname.length; i++) {
        hash = (hash * 31 + hostname.charCodeAt(i)) >>> 0;
    }

    return hash % 1024;
}

/**
 * Distributed unique 64-bit Snowflake ID Generator.
 * Guarantees strictly monotonic, globally unique, time-ordered IDs across independent nodes.
 */
export class Snowflake {
    /**
     * Initializes a Snowflake ID Generator instance.
     *
     * @param {number|string|bigint} [workerId] - Unique worker ID (between 0 and 1023). Defaults to resolveWorkerId().
     * @param {number|string|bigint} [epoch=DEFAULT_CUSTOM_EPOCH] - Custom baseline epoch in ms.
     */
    constructor(workerId = resolveWorkerId(), epoch = DEFAULT_CUSTOM_EPOCH) {
        const bigIntWorkerId = BigInt(workerId);
        const bigIntEpoch = BigInt(epoch);

        if (bigIntWorkerId < 0n || bigIntWorkerId > MAX_WORKER_ID) {
            throw new RangeError(`Worker ID must be between 0 and ${MAX_WORKER_ID}. Received: ${workerId}`);
        }

        this.workerId = bigIntWorkerId;
        this.epoch = bigIntEpoch;
        this.sequence = 0n;
        this.lastTimestamp = -1n;
    }

    /**
     * Generates a strictly monotonic, unique 64-bit integer ID.
     *
     * @returns {bigint} Unique 64-bit Snowflake ID.
     * @throws {Error} If system clock drifts backwards past lastTimestamp.
     */
    nextId() {
        let timestamp = BigInt(Date.now());

        // Clock Drift Guard: System clock moved backwards
        if (timestamp < this.lastTimestamp) {
            const driftMs = this.lastTimestamp - timestamp;
            throw new Error(`Clock moved backwards. Refusing to generate Snowflake ID for ${driftMs}ms.`);
        }

        // Same millisecond collision: Increment sequence counter
        if (timestamp === this.lastTimestamp) {
            this.sequence = (this.sequence + 1n) & SEQUENCE_MASK;

            // Counter rolled over (exceeded 4095 in the same millisecond) -> Wait for next millisecond
            if (this.sequence === 0n) {
                while (timestamp <= this.lastTimestamp) {
                    timestamp = BigInt(Date.now());
                }
            }
        } else {
            // New millisecond: Reset sequence counter
            this.sequence = 0n;
        }

        this.lastTimestamp = timestamp;

        // Bitwise packing: ((timestamp - epoch) << 22) | (workerId << 12) | sequence
        const id = ((timestamp - this.epoch) << TIMESTAMP_LEFT_SHIFT)
            | (this.workerId << WORKER_ID_SHIFT)
            | this.sequence;

        return id;
    }

    /**
     * Deconstructs a 64-bit Snowflake ID into its constituent components.
     *
     * @param {number|string|bigint} id - The 64-bit Snowflake ID.
     * @returns {{ timestamp: Date, rawTimestampMs: bigint, workerId: bigint, sequence: bigint }}
     */
    decompose(id) {
        const bigIntId = BigInt(id);
        const sequence = bigIntId & SEQUENCE_MASK;
        const workerId = (bigIntId >> WORKER_ID_SHIFT) & MAX_WORKER_ID;
        const timestampDelta = bigIntId >> TIMESTAMP_LEFT_SHIFT;
        const rawTimestampMs = timestampDelta + this.epoch;

        return {
            timestamp: new Date(Number(rawTimestampMs)),
            rawTimestampMs,
            workerId,
            sequence,
        };
    }
}

// Singleton instance initialized with automatic Worker ID resolution
const defaultSnowflake = new Snowflake();

export default defaultSnowflake;
