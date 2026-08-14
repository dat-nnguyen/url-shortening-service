/**
 * Validation schema for user registration.
 */
export const registerSchema = {
    body: {
        email: { required: true, type: 'string' },
        password: { required: true, type: 'string' },
    },
};

/**
 * Validation schema for user login.
 */
export const loginSchema = {
    body: {
        email: { required: true, type: 'string' },
        password: { required: true, type: 'string' },
    },
};
