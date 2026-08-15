import express from 'express';
import os from 'node:os';
import { env } from './config/env.js';
import { setupSwagger } from './config/swagger.js';
import urlRoutes from './modules/url/url.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import defaultSnowflake from './utils/snowflake.js';
import { AppError } from './utils/errors.js';

const app = express();

// Load Balancing Verification: Inject Container and Worker ID headers
app.use((req, res, next) => {
    res.setHeader('X-Served-By', process.env.HOSTNAME || os.hostname() || 'local-node');
    res.setHeader('X-Worker-ID', defaultSnowflake.workerId.toString());
    next();
});

// Global Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount Swagger OpenAPI Documentation & Interactive UI
setupSwagger(app);

/**
 * @openapi
 * /:
 *   get:
 *     summary: Root Landing & Documentation Redirect
 *     description: Redirects browser requests to interactive Swagger documentation at /api-docs.
 *     tags:
 *       - System
 *     responses:
 *       302:
 *         description: Redirects to /api-docs.
 */
app.get('/', (req, res) => {
    res.redirect('/api-docs');
});

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Cluster Health & Instance Diagnostics
 *     description: Returns application health status, serving container ID, and assigned Snowflake Worker ID.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Application cluster is healthy.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        servedBy: process.env.HOSTNAME || os.hostname() || 'local-node',
        workerId: defaultSnowflake.workerId.toString(),
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
    console.log(`🚀 Server listening on http://0.0.0.0:${PORT} in ${env.NODE_ENV} mode (Node ID: ${process.env.HOSTNAME || os.hostname() || 'local-node'}, Worker ID: ${defaultSnowflake.workerId})`);
    console.log(`📚 Swagger UI available at http://localhost:${PORT}/api-docs`);
});

export default app;
