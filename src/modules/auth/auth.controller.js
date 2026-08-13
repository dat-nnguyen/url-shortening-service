import { registerUser, loginUser } from './auth.service.js';
import { AppError } from '../../utils/errors.js';

/**
 * Controller to handle user registration (POST /api/auth/register).
 *
 * @param {import('express').Request} req - Express request object expecting `{ email, password }` in `req.body`.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} HTTP response.
 */
export async function register(req, res) {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        await registerUser(email, password);
        return res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
        if (error instanceof AppError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('Error in register controller:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * Controller to handle user login (POST /api/auth/login).
 *
 * @param {import('express').Request} req - Express request object expecting `{ email, password }` in `req.body`.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} HTTP response containing JWT token.
 */
export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const token = await loginUser(email, password);
        return res.status(200).json({ token });
    } catch (error) {
        if (error instanceof AppError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('Error in login controller:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}
