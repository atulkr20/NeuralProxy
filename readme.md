# NeuralProxy

A production-grade AI Gateway built in Node.js/TypeScript that acts as a unified proxy layer in front of multiple LLM providers. It handles intelligent routing, automatic provider failover, per-API-key rate limiting, prompt caching, async cost tracking, and a full analytics API.

Think of it as Nginx — but for LLMs.

---

## Architecture Diagram
```
                        Client Request
                             │
                             ▼
                    ┌─────────────────┐
                    │  Auth Middleware │  ← Validate API key (SHA-256 hash lookup)
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Rate Limiter   │  ← Sliding window check in Redis
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Budget Checker  │  ← Monthly spend vs budget in DB
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Cache Check    │  ← SHA-256 hash lookup in Redis
                    └────────┬────────┘
                             │
               ┌─────────────┴─────────────┐
               │ Cache Hit                 │ Cache Miss
               ▼                           ▼
      Return cached               ┌─────────────────┐
      response ($0 cost)          │  Router Service  │
                                  └────────┬────────┘
                                           │
                          ┌────────────────┼────────────────┐
                          ▼                ▼                ▼
                   ┌────────────┐  ┌────────────┐  ┌────────────┐
                   │   Groq     │  │  Gemini    │  │   Mock     │
                   │ (priority1)│  │ (priority2)│  │ (priority3)│
                   └────────────┘  └────────────┘  └────────────┘
                          │
                          │ (tries next on failure)
                          ▼
                    ┌─────────────────┐
                    │ Cost Calculator │  ← tokens × price from DB
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Cache Writer   │  ← Store response in Redis with TTL
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  BullMQ Queue   │  ← Enqueue log job (non-blocking)
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
             Response to        Background Worker
               Client           writes to PostgreSQL
```

---

## What Problem It Solves

| Problem | How NeuralProxy Solves It |
|---|---|
| Single LLM provider = single point of failure | Automatic fallback to next provider in priority order |
| No visibility into LLM costs per user | Per API-key cost tracking stored in PostgreSQL |
| Repeated identical prompts waste money | Redis prompt cache with TTL and hit rate analytics |
| Unlimited LLM calls = abuse | Sliding window rate limiting via Redis sorted sets |
| Different provider APIs = messy code | Single `/v1/chat` endpoint works across all providers |

---

## Tech Stack

| Technology | Usage |
|---|---|
| Node.js + TypeScript | Core server, type-safe adapters and interfaces |
| Express.js | HTTP server, middleware chain, REST API |
| PostgreSQL | API keys, request logs, provider configs, cost data |
| Prisma ORM | Type-safe DB access, migrations |
| Redis | Prompt cache, rate limit sorted sets, BullMQ broker |
| BullMQ | Async request logging queue + worker |
| SHA-256 (crypto) | Prompt hash for cache keys, API key hashing |
| Docker | Local Redis setup |

---

## Folder Structure
```
src/
├── server.ts
├── prisma.ts
├── redis.ts
├── types.ts
├── routes/
│   ├── chat.routes.ts
│   ├── keys.routes.ts
│   └── analytics.routes.ts
├── middleware/
│   ├── auth.middleware.ts
│   ├── rateLimit.middleware.ts
│   └── budget.middleware.ts
├── providers/
│   ├── adapter.interface.ts
│   ├── openai.adapter.ts
│   ├── gemini.adapter.ts
│   └── mock.adapter.ts
├── services/
│   ├── router.service.ts
│   ├── cache.service.ts
│   └── cost.service.ts
├── workers/
│   └── logger.worker.ts
└── queues/
    └── logQueue.ts
```

---

## Database Schema

Three core tables:

**api_keys** — stores hashed API keys and per-key config (rate limit, budget, allowed providers)

**request_logs** — every LLM request logged with provider, tokens, cost, latency, cache hit, fallback used

**provider_configs** — provider priority order and pricing (cost per 1k input/output tokens)

---

## API Endpoints

### Core Proxy
```
POST /v1/chat
Authorization: Bearer <api_key>

Body:
{
  "model": "llama-3.1-8b-instant",
  "messages": [{ "role": "user", "content": "..." }],
  "provider": "openai"   // optional — uses priority order if not specified
}

Response:
{
  "content": "...",
  "provider_used": "openai",
  "cache_hit": false,
  "tokens": { "input": 42, "output": 18 },
  "cost_usd": 0.0000001,
  "fallback_used": false
}
```

### API Key Management
```
POST   /v1/keys          — Create new API key
GET    /v1/keys/:id      — Get key details
PATCH  /v1/keys/:id      — Update rate limit / budget / providers
DELETE /v1/keys/:id      — Revoke key
```

### Analytics
```
GET /v1/analytics/usage      — Total requests, tokens, cost
GET /v1/analytics/costs      — Breakdown by provider and model
GET /v1/analytics/cache      — Cache hit rate, tokens saved, money saved
GET /v1/analytics/providers  — Provider health, latency, error rates
```

---

## Core Features

### Multi-Provider Routing + Automatic Fallback
Each request can specify a preferred provider or NeuralProxy picks based on priority config stored in DB. If a provider fails (5xx, timeout, 429), it automatically tries the next one. 4xx validation errors do not trigger fallback — those are client errors.
```
Try openai → fails → try gemini → fails → try anthropic → all failed → 500
```

`fallback_used: true` is returned in the response and logged in DB.

### Sliding Window Rate Limiting
More accurate than fixed window — prevents bursting at window boundaries. Implemented using a Redis sorted set per API key.

On every request:
1. `ZREMRANGEBYSCORE` — remove entries older than 60 seconds
2. `ZCARD` — count remaining entries
3. If count >= limit → reject with 429
4. `ZADD` — add current timestamp
5. `EXPIRE` — auto-clean the key after TTL

### SHA-256 Prompt Caching
Cache key = SHA-256 of `model + JSON.stringify(messages)`. Same prompt = same hash = cache hit. Cached responses are stored in Redis with configurable TTL (default 1 hour). Cache hits cost $0 and skip the LLM call entirely.

### Async Cost Logging via BullMQ
Writing to PostgreSQL on every LLM request would add 10-30ms of latency to the hot path. Instead, NeuralProxy enqueues a log job immediately after the response is sent and returns to the client. A background worker picks it up and writes to DB asynchronously.

This is an intentional tradeoff — eventual consistency on analytics data to keep the hot path fast.

### Monthly Budget Enforcement
Every API key has a `monthlyBudget` in USD. Before every request, the total spend for the current month is aggregated from `request_logs`. If over budget → reject with 402.

---

## Environment Variables
```env
DATABASE_URL=
REDIS_URL=
GROQ_API_KEY=
GEMINI_API_KEY=
CACHE_TTL_SECONDS=3600
DEFAULT_RATE_LIMIT=60
PORT=3000
```

---

## Running Locally
```bash
# 1. Install dependencies
npm install

# 2. Start Redis
docker-compose up -d

# 3. Run migrations
npx prisma migrate dev

# 4. Seed provider configs
npx ts-node -r dotenv/config src/seed.ts

# 5. Start the server
npm run dev
```

---
