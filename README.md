# ⚡ Distributed URL Shortener & Analytics Platform

[![Roadmap.sh](https://img.shields.io/badge/Roadmap.sh-Project%20Spec-blue.svg)](https://roadmap.sh/projects/url-shortening-service)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-blueviolet.svg)](https://url-shortening-service-pbuw.onrender.com/api-docs/#/)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io/)
[![Prisma](https://img.shields.io/badge/Prisma-7-indigo.svg)](https://www.prisma.io/)
[![Nginx](https://img.shields.io/badge/Nginx-Reverse%20Proxy-brightgreen.svg)](https://nginx.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)

A high-performance, containerized, horizontally scalable URL shortening and analytics platform engineered with **Node.js (ESM), PostgreSQL, Redis, Twitter Snowflake, and Nginx**.

Built according to the [Roadmap.sh URL Shortening Service Project](https://roadmap.sh/projects/url-shortening-service).

---

## 🏛️ System Architecture

```text
                               ┌────────────────────────────────────────┐
                               │         External HTTP Traffic          │
                               └───────────────────┬────────────────────┘
                                                   │ (Port 80)
                                                   ▼
                               ┌────────────────────────────────────────┐
                               │        Nginx Reverse Proxy & LB        │
                               │  (Docker Embedded DNS: 127.0.0.11)     │
                               └───────┬──────────────┬───────────────┬─┘
                                       │              │               │
                     ┌─────────────────┘              │               └────────────────┐
                     ▼                                ▼                                ▼
           ┌──────────────────┐             ┌──────────────────┐             ┌──────────────────┐
           │  Node Instance 1 │             │  Node Instance 2 │             │  Node Instance 3 │
           │  (Worker ID: 264)│             │  (Worker ID: 98) │             │  (Worker ID: 139)│
           └─────────┬────────┘             └─────────┬────────┘             └─────────┬────────┘
                     │                                │                                │
                     └────────────────────────┬───────┴────────────────────────────────┘
                                              │
                          ┌───────────────────┴───────────────────┐
                          ▼                                       ▼
             ┌───────────────────────────┐           ┌──────────────────────────┐
             │       Redis Cluster       │           │   PostgreSQL Database    │
             │  - Cache-Aside (24h TTL)  │           │  - Explicit 64-bit IDs   │
             │  - Sentinel (60s TTL)     │           │  - Indexed lookups       │
             │  - Atomic Lua Rate Limit  │           │  - User/URL relations    │
             └───────────────────────────┘           └──────────────────────────┘
```

---

## 🔬 Core System Design Decisions

### 1. 64-bit Twitter Snowflake ID Generation vs. Database Auto-Increment

- **Decentralized Generation**: Eliminates sequence table locks, allowing each application worker to generate IDs independently.
- **Strictly Monotonic**: Time-ordered IDs provide high database B-tree index locality.
- **64-bit Binary Layout**:
  - `1 bit`: Unused / Sign bit (always `0`).
  - `41 bits`: Millisecond timestamp delta from custom epoch (`1700000000000n` / Nov 2023), supporting ~69 years.
  - `10 bits`: Worker Node ID ($0\text{--}1023$), supporting up to 1,024 independent server nodes.
  - `12 bits`: Sequence counter ($0\text{--}4095$), allowing $4,096\text{ IDs/ms}$ per worker ($4.096\text{ million IDs/sec}$).
- **Automatic Replica Derivation**: Dynamic Docker Compose containers deterministically derive their 10-bit Worker ID from their unique container `HOSTNAME` hash.

### 2. Bijective Base62 Encoding Engine

- **URL-Safe Alphabet**: `[a-z][A-Z][0-9]` ($62\text{ characters}$) producing compact, readable slugs (e.g. `A3hLagSQ4i`).
- **Native BigInt Operations**: Prevents 64-bit precision truncation issues common with standard JavaScript numbers.
- **$O(1)$ Decoding**: Uses a pre-computed ASCII map for instant reverse lookups.

### 3. Redis Cache-Aside with Penetration Protection

- **Cache-Aside Redirection**: High-frequency short URLs are cached in Redis under `url:${shortCode}` with a **24-hour TTL (`EX 86400`)**, bypassing PostgreSQL for sub-millisecond 302 redirects.
- **Cache Penetration Protection (Null Sentinel)**: Requests for non-existent codes cache a `__NULL__` sentinel with a **60-second TTL**, shielding PostgreSQL from malicious 404 flooding attacks.

### 4. Atomic Lua Script Rate Limiting

- **Single-Cycle Atomicity**: Evaluates `INCR` + conditional `EXPIRE` + `TTL` in a single Redis engine cycle via `EVAL`, eliminating fixed-window race conditions.
- **Proxy-Aware Client IP Extraction**: Safely extracts real client IPs via `req.headers['x-real-ip']` forwarded by Nginx.
- **Standard HTTP Rate Limit Headers**: Injects `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After`.

### 5. Horizontal Scalability & Zero-State Node Clusters

- **Stateless Containers**: All application state resides in Redis and PostgreSQL, allowing $N$ identical Node.js containers to run concurrently.
- **Host Port Isolation**: Node containers are private to the internal Docker network; all public traffic enters via Nginx on port `80`.
- **Dynamic DNS Load Balancing**: Nginx resolves Docker's embedded DNS (`127.0.0.11`) to distribute traffic evenly across replicas using Round-Robin.
- **Observable Verification**: Injects `X-Served-By` (Container ID) and `X-Worker-ID` (Snowflake Worker ID) on every response.

---

## 📁 Project Structure

```text
.
├── Dockerfile                    # Multi-stage Alpine container build
├── docker-compose.yml            # 4-tier stack (App, Postgres, Redis, Nginx)
├── nginx/
│   └── nginx.conf                # Nginx reverse proxy & load balancer config
├── prisma/
│   └── schema.prisma             # PostgreSQL schema with explicit 64-bit IDs
├── src/
│   ├── app.js                    # Express application entry point
│   ├── config/
│   │   ├── env.js                # Fail-fast startup environment guard
│   │   ├── prisma.js             # PrismaPg driver adapter singleton
│   │   ├── redis.js              # ioredis connection client singleton
│   │   └── swagger.js            # OpenAPI 3.0 documentation & UI config
│   ├── middleware/
│   │   ├── auth.middleware.js    # Strict and Optional JWT middleware
│   │   └── rateLimiter.middleware.js # Atomic Lua Redis rate limiter
│   ├── modules/
│   │   ├── auth/                 # Authentication module (JWT, Bcrypt)
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.schema.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.validate.js
│   │   └── url/                  # URL Shortening & Base62 module
│   │       ├── base62.js         # Native BigInt Base62 encoder/decoder
│   │       ├── url.controller.js
│   │       ├── url.routes.js
│   │       └── url.service.js    # Single-step atomic write & Cache-Aside
│   └── utils/
│       ├── errors.js             # Custom OOP application error hierarchy
│       └── snowflake.js          # 64-bit Twitter Snowflake ID generator
└── tests/                        # Comprehensive unit & integration tests
    ├── base62.test.js
    ├── errors.test.js
    └── snowflake.test.js
```

---

## 📚 API Documentation & Swagger UI

👉 **Live Interactive Swagger UI**: [url-shortening-service-pbuw.onrender.com/api-docs/#/](https://url-shortening-service-pbuw.onrender.com/api-docs/#/)

Interactive Swagger documentation is served at the `/api-docs` route on your deployment (with raw OpenAPI JSON specification available at `/api-docs.json`).

### Endpoints Overview

| Method | Endpoint | Description | Rate Limit | Auth |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/shorten` | Shorten a long URL to Base62 | 15 req/min | Optional Bearer JWT |
| `GET` | `/:shortCode` | Redirect to original long URL (302) | — | Public |
| `POST` | `/api/auth/register` | Register new user account | 5 req/min | Public |
| `POST` | `/api/auth/login` | Authenticate user & get JWT | 5 req/min | Public |
| `GET` | `/health` | Cluster diagnostics & Worker ID | — | Public |

---

### Example API Usage

#### 1. Shorten a URL

```bash
curl -i -X POST https://url-shortening-service-pbuw.onrender.com/shorten \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://roadmap.sh/projects/url-shortening-service"}'
```

**Response (`201 Created`)**:

```json
{
  "originalUrl": "https://roadmap.sh/projects/url-shortening-service",
  "shortCode": "A3hLagSQ4i",
  "shortUrl": "https://url-shortening-service-pbuw.onrender.com/A3hLagSQ4i",
  "createdAt": "2026-08-15T08:58:13.487Z"
}
```

#### 2. Resolve & Redirect

```bash
curl -i https://url-shortening-service-pbuw.onrender.com/A3hLagSQ4i
```

**Response (`302 Found`)**:

```http
HTTP/1.1 302 Found
Location: https://roadmap.sh/projects/url-shortening-service
```

#### 3. Health Check & Node Identification

```bash
curl -s https://url-shortening-service-pbuw.onrender.com/health | jq .
```

**Response (`200 OK`)**:

```json
{
  "status": "OK",
  "servedBy": "a38b0fff252e",
  "workerId": "264",
  "timestamp": "2026-08-15T08:59:14.992Z"
}
```

---

## 🚀 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- [Node.js](https://nodejs.org/) v20+ (for local development/testing)

### 1. Clone & Configure

```bash
git clone https://github.com/dat-nnguyen/url-shortener.git
cd url-shortener
cp .env.example .env
```

### 2. Launch Scaled Multi-Replica Stack

```bash
# Starts PostgreSQL, Redis, Nginx, and 3 scaled Node instances
docker compose up --build --scale app=3 -d
```

### 3. Run Automated Tests

```bash
npm test
```

---

## ⚙️ Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Node.js internal application port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@postgres:5432/urlshortener?sslmode=disable` |
| `REDIS_URL` | Redis connection URI | `redis://redis:6379` |
| `JWT_SECRET` | Secret key for signing JWT access tokens | *(Required in Production)* |
| `JWT_EXPIRES_IN` | JWT token validity duration | `1h` |
| `WORKER_ID` | Snowflake Worker Node ID (0–1023) | *(Auto-derived from container ID)* |

---

## 📜 License

This project is open-source and licensed under the [ISC License](LICENSE).
