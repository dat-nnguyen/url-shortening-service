import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Scalable URL Shortener & Analytics API',
            version: '1.0.0',
            description: `
## 🚀 High-Performance, Distributed URL Shortener Service

A distributed URL shortening engine built with **Node.js (ESM), Express, PostgreSQL (Prisma 7), Redis, Twitter Snowflake, and Nginx**.

---

### 🏛️ Key Architectural Features
- **64-bit Twitter Snowflake ID Generation**: Decentralized, strictly monotonic ID generator with dynamic container worker ID derivation.
- **Bijective Base62 Encoding**: Converts 64-bit integer IDs into compact URL-safe codes with $O(1)$ decoding map.
- **Redis Cache-Aside Architecture**: Microsecond 302 redirections with 24-hour TTL.
- **Cache Penetration Protection**: Short 60s TTL sentinel values for non-existent IDs to guard PostgreSQL from exhaustion attacks.
- **Atomic Lua Script Rate Limiting**: Single-engine cycle atomic \`INCR\` + \`EXPIRE\` with proxy IP extraction.
- **Horizontal Scalability**: Multi-replica stateless Node containers load balanced by Nginx via Docker embedded DNS (\`127.0.0.11\`).
            `,
            contact: {
                name: 'Engineering Team',
                url: 'https://github.com/dat-nnguyen/url-shortening-service',
            },
        },
        servers: [
            {
                url: '/',
                description: 'Current Environment / Nginx Gateway',
            },
            {
                url: 'http://localhost',
                description: 'Local Nginx Reverse Proxy (Port 80)',
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT access token obtained from /api/auth/login.',
                },
            },
            schemas: {
                ShortenRequest: {
                    type: 'object',
                    required: ['originalUrl'],
                    properties: {
                        originalUrl: {
                            type: 'string',
                            format: 'uri',
                            example: 'https://github.com/dat-nnguyen/url-shortening-service',
                            description: 'The target destination URL to shorten.',
                        },
                    },
                },
                ShortenResponse: {
                    type: 'object',
                    properties: {
                        originalUrl: { type: 'string', example: 'https://github.com' },
                        shortCode: { type: 'string', example: 'A3hLagSQ4i' },
                        shortUrl: { type: 'string', example: 'http://localhost/A3hLagSQ4i' },
                        createdAt: { type: 'string', format: 'date-time', example: '2026-08-15T08:58:13.487Z' },
                    },
                },
                RegisterRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'developer@example.com' },
                        password: { type: 'string', format: 'password', example: 'SecurePassword123!' },
                    },
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'developer@example.com' },
                        password: { type: 'string', format: 'password', example: 'SecurePassword123!' },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', example: 'Authentication successful.' },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', example: '363999304894906368' },
                                email: { type: 'string', example: 'developer@example.com' },
                            },
                        },
                    },
                },
                HealthResponse: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'OK' },
                        servedBy: { type: 'string', example: '32a2bfe6df59' },
                        workerId: { type: 'string', example: '264' },
                        timestamp: { type: 'string', format: 'date-time', example: '2026-08-15T08:59:14.992Z' },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', example: 'Invalid request payload or resource not found.' },
                    },
                },
                RateLimitErrorResponse: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', example: 'Too many requests. Please try again later.' },
                        limit: { type: 'number', example: 15 },
                        current: { type: 'number', example: 16 },
                        retryAfter: { type: 'string', example: '45 seconds' },
                    },
                },
            },
        },
    },
    apis: [
        './src/modules/**/*.routes.js',
        './src/app.js',
    ],
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Mounts Swagger UI and raw OpenAPI JSON spec onto the Express application.
 *
 * @param {import('express').Application} app
 */
export function setupSwagger(app) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'URL Shortener API Documentation',
        customCss: '.swagger-ui .topbar { display: none }',
    }));

    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
}
