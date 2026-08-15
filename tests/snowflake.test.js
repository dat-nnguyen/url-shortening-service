import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import defaultSnowflake, { Snowflake, resolveWorkerId } from '../src/utils/snowflake.js';

describe('64-bit Twitter Snowflake ID Generator', () => {
    test('generates valid 64-bit BigInt IDs', () => {
        const id = defaultSnowflake.nextId();
        assert.equal(typeof id, 'bigint');
        assert.ok(id > 0n);
    });

    test('generates strictly monotonic IDs', () => {
        const id1 = defaultSnowflake.nextId();
        const id2 = defaultSnowflake.nextId();
        const id3 = defaultSnowflake.nextId();

        assert.ok(id2 > id1, 'id2 must be greater than id1');
        assert.ok(id3 > id2, 'id3 must be greater than id2');
    });

    test('guarantees 100% collision-free generation during rapid execution', () => {
        const set = new Set();
        const iterations = 5000;

        for (let i = 0; i < iterations; i++) {
            const id = defaultSnowflake.nextId();
            assert.equal(set.has(id), false, `Collision detected at ID: ${id}`);
            set.add(id);
        }

        assert.equal(set.size, iterations);
    });

    test('correctly decomposes Snowflake ID into constituent fields', () => {
        const workerId = 42;
        const generator = new Snowflake(workerId);
        const id = generator.nextId();

        const decomposed = generator.decompose(id);
        assert.equal(decomposed.workerId, BigInt(workerId));
        assert.equal(typeof decomposed.sequence, 'bigint');
        assert.ok(decomposed.timestamp instanceof Date);
        assert.ok(decomposed.timestamp.getTime() > 1700000000000);
    });

    test('validates Worker ID bounds (0 to 1023)', () => {
        assert.doesNotThrow(() => new Snowflake(0));
        assert.doesNotThrow(() => new Snowflake(1023));
        assert.throws(() => new Snowflake(-1), /Worker ID must be between 0 and 1023/);
        assert.throws(() => new Snowflake(1024), /Worker ID must be between 0 and 1023/);
    });

    test('resolveWorkerId returns valid integer in [0, 1023]', () => {
        const id = resolveWorkerId();
        assert.equal(typeof id, 'number');
        assert.ok(id >= 0 && id <= 1023);
    });
});
