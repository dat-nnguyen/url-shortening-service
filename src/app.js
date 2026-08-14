import express from 'express';
import os from 'node:os';
import { env } from './config/env.js';
import urlRoutes from './modules/url/url.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import { AppError } from './utils/errors.js';

const app = express();

// Load Balancing Verification: Inject Container/Node Hostname header
app.use((req, res, next) => {
    res.setHeader('X-Served-By', process.env.HOSTNAME || os.hostname() || 'local-node');
    next();
});

// Global Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        servedBy: process.env.HOSTNAME || os.hostname() || 'local-node',
        timestamp: new Date().toISOString(),
    });
});

// Module Routes
app.use('/api/auth', authRoutes);
app.use('/', urlRoutes);

// Global Fallback Error Handling Middleware
app.use((err, req, res, next) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.message });
    }
    console.error('Unhandled Application Error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
});

// Start Express Server listening on all network interfaces for Docker
const PORT = env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server listening on http://0.0.0.0:${PORT} in ${env.NODE_ENV} mode (Instance: ${process.env.HOSTNAME || os.hostname() || 'local-node'})`);
});

export default app;
