import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { encode, decode } from '../src/modules/url/base62.js';

describe('Base62 Bijective Encoding & Decoding', () => {
    test('encodes 0 correctly', () => {
        assert.equal(encode(0), 'a');
        assert.equal(encode(0n), 'a');
    });

    test('encodes positive integers and BigInt correctly', () => {
        assert.equal(encode(1), 'b');
        assert.equal(encode(25), 'z');
        assert.equal(encode(26), 'A');
        assert.equal(encode(51), 'Z');
        assert.equal(encode(52), '0');
        assert.equal(encode(61), '9');
        assert.equal(encode(62), 'ba');
        assert.equal(encode(125), 'cb');
    });

    test('decodes Base62 strings back to original BigInt IDs', () => {
        assert.equal(decode('a'), 0n);
        assert.equal(decode('b'), 1n);
        assert.equal(decode('z'), 25n);
        assert.equal(decode('A'), 26n);
        assert.equal(decode('Z'), 51n);
        assert.equal(decode('0'), 52n);
        assert.equal(decode('9'), 61n);
        assert.equal(decode('ba'), 62n);
        assert.equal(decode('cb'), 125n);
    });

    test('handles large 64-bit Snowflake IDs accurately without precision loss', () => {
        const largeSnowflakeId = 363999325111451648n;
        const encoded = encode(largeSnowflakeId);
        assert.equal(typeof encoded, 'string');
        assert.ok(encoded.length > 0);

        const decoded = decode(encoded);
        assert.equal(decoded, largeSnowflakeId);
    });

    test('throws RangeError on negative numbers', () => {
        assert.throws(() => encode(-1), /numericId must be a non-negative integer/);
        assert.throws(() => encode(-500n), /numericId must be a non-negative integer/);
    });

    test('throws error on invalid inputs and characters', () => {
        assert.throws(() => encode('not_a_number'), /Cannot convert not_a_number to a BigInt/);
        assert.throws(() => decode(''), /shortCode must be a non-empty string/);
        assert.throws(() => decode(123), /shortCode must be a non-empty string/);
        assert.throws(() => decode('abc!123'), /Invalid character '!' in Base62 shortCode/);
        assert.throws(() => decode('hello world'), /Invalid character ' ' in Base62 shortCode/);
    });
});
