/**
 * Base Application Error class for operational errors.
 */
export class AppError extends Error {
    /**
     * @param {string} message - Human-readable error message.
     * @param {number} statusCode - HTTP status code (default: 500).
     */
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 400 Bad Request Error
 */
export class BadRequestError extends AppError {
    constructor(message = 'Bad Request') {
        super(message, 400);
    }
}

/**
 * 401 Unauthorized Error
 */
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}

/**
 * 404 Not Found Error
 */
export class NotFoundError extends AppError {
    constructor(message = 'Not Found') {
        super(message, 404);
    }
}

/**
 * 409 Conflict Error (e.g. duplicate resources)
 */
export class ConflictError extends AppError {
    constructor(message = 'Conflict') {
        super(message, 409);
    }
}
