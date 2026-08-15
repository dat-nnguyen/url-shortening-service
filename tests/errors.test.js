import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    AppError,
    BadRequestError,
    UnauthorizedError,
    NotFoundError,
    ConflictError,
} from '../src/utils/errors.js';

describe('Custom Application Error Hierarchy', () => {
    test('AppError sets default status code and message', () => {
        const error = new AppError('Server error', 500);
        assert.equal(error.message, 'Server error');
        assert.equal(error.statusCode, 500);
        assert.ok(error instanceof Error);
    });

    test('BadRequestError has status code 400', () => {
        const error = new BadRequestError('Bad payload');
        assert.equal(error.statusCode, 400);
        assert.equal(error.message, 'Bad payload');
        assert.ok(error instanceof AppError);
    });

    test('UnauthorizedError has status code 401', () => {
        const error = new UnauthorizedError('Unauthorized');
        assert.equal(error.statusCode, 401);
        assert.equal(error.message, 'Unauthorized');
        assert.ok(error instanceof AppError);
    });

    test('NotFoundError has status code 404', () => {
        const error = new NotFoundError('Not found');
        assert.equal(error.statusCode, 404);
        assert.equal(error.message, 'Not found');
        assert.ok(error instanceof AppError);
    });

    test('ConflictError has status code 409', () => {
        const error = new ConflictError('Conflict detected');
        assert.equal(error.statusCode, 409);
        assert.equal(error.message, 'Conflict detected');
        assert.ok(error instanceof AppError);
    });
});
