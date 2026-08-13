import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { ConflictError, UnauthorizedError } from '../../utils/errors.js';

/**
 * Registers a new user with an encrypted password.
 *
 * Checks whether the email already exists in the database. If unique, hashes the password
 * using bcrypt and persists the new user record.
 *
 * @param {string} email - User's email address.
 * @param {string} password - User's plain text password.
 * @returns {Promise<boolean>} Resolves to `true` on successful registration.
 * @throws {ConflictError} If the email already exists in the database.
 */
export async function registerUser(email, password) {
    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (existingUser) {
            throw new ConflictError('Email is already existed.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            },
        });

        return true;
    } catch (error) {
        console.error('Error registering user:', error);
        throw error;
    }
}

/**
 * Authenticates a user and issues a signed JWT access token.
 *
 * Verifies email existence and compares the plain text password against the hashed password.
 * Generates a JWT token signed with `env.JWT_SECRET`.
 *
 * @param {string} email - User's registered email address.
 * @param {string} password - User's plain text password.
 * @returns {Promise<string>} Signed JSON Web Token (JWT) string.
 * @throws {UnauthorizedError} If credentials are invalid.
 */
export async function loginUser(email, password) {
    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            throw new UnauthorizedError('Invalid email or password');
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            throw new UnauthorizedError('Invalid email or password');
        }

        const token = jwt.sign(
            { id: user.id.toString(), email: user.email },
            env.JWT_SECRET,
            { expiresIn: env.JWT_EXPIRES_IN }
        );

        return token;
    } catch (error) {
        console.error('Error logging in user:', error);
        throw error;
    }
}
