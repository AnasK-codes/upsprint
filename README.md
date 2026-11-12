# UpSprint

A competitive programming platform that aggregates multi-platform stats (LeetCode, Codeforces, CodeChef) into unified leaderboards, emphasizing consistency over sporadic performance through daily activity tracking and social accountability.

## Key Features

- **Unified Profile**: Single identity across LeetCode, Codeforces, and CodeChef with automatic sync
- **Multi-Dimensional Leaderboards**: Global normalized scores, daily activity, platform-specific, and group-based rankings
- **Privacy Controls**: GROUPS_ONLY visibility option for users who want to compete privately
- **Streak Tracking**: Visual daily commitment metrics with real-time updates
- **Group Competition**: Create private leaderboards for study groups with custom invite codes
- **Activity Timeline**: Real-time feed of problem-solving milestones and account connections

## Tech Stack

**Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion  
**Backend**: Node.js, Express, TypeScript  
**Database**: PostgreSQL with Prisma ORM  
**Auth**: Google OAuth 2.0 (Passport.js), httpOnly cookies  
**Caching**: In-memory LRU cache for leaderboard queries  
**Jobs**: BullMQ (Redis) queues and a separate worker process for platform data sync

## Architecture

```
┌─────────────┐
│  Next.js UI │
└──────┬──────┘
       │ API calls (credentials: include)
       ▼
┌─────────────────────────────────┐
│  Express API + Auth Middleware  │
└──────┬──────────────────┬───────┘
       │                  │
       ▼                  ▼
┌──────────┐      ┌──────────────┐
│  Cache   │      │  PostgreSQL  │
│  (LRU)   │      │   (Prisma)   │
└──────────┘      └──────┬───────┘
                         ▲
                         │
                  ┌──────┴───────┐
                  │ Worker (BullMQ│
                  │ + Redis)     │
                  │ - Sync/plat. │
                  │ - Rankings   │
                  └──────────────┘
```

**Data Flow**:

1. A repeatable scheduler job enqueues one sync job per linked account (Codeforces: one per batch of handles); per-platform queues fetch the data (LeetCode/Codeforces/CodeChef) with rate limits, retries and circuit breakers
2. Snapshots stored in `PlatformSnapshot` and `DailyActivity` tables
3. Leaderboard rebuild job calculates normalized scores
4. API serves cached leaderboard data with DB-level visibility filtering

## Security & Privacy

- **Sessions**: the JWT lives only in an `httpOnly` cookie set by the backend. It is never returned in a JSON body, never put in a URL, and frontend JavaScript cannot read it. Requests authenticate by cookie only (`credentials: "include"`); there is no Bearer-header path.
- **Google sign-in**: the OAuth callback redirects to the frontend with a random one-time code (stored hashed in the `OAuthCode` table, single use, ~60s lifetime). The frontend exchanges it with `POST /auth/exchange`, which sets the cookie. The OAuth `state` is also checked against an httpOnly cookie.
- **CSRF**: because the cookie can be sent cross-site (`SameSite=None` in the default production setup), every state-changing request (POST/PUT/PATCH/DELETE) is checked by an `Origin` (falling back to `Referer`) check against `FRONTEND_URL`. A cookie-bearing request with neither header is rejected. This is an Origin check, not a double-submit token.
- **Rate limiting**: in-memory, per process (not shared across instances); stricter limits on auth endpoints.
- **Input validation**: request bodies, query strings and route params are validated with zod; invalid input returns `400 { message, errors }`.
- **Metrics**: `/metrics` requires `Authorization: Bearer $METRICS_TOKEN` and is disabled (404) when `METRICS_TOKEN` is unset.
- **Visibility Enforcement**: DB-level filtering for `GROUPS_ONLY` users (never appear in global APIs)
- **User Isolation**: Membership verification before group data access
- **Minimal Responses**: Only required fields returned, no internal IDs leaked

### Deployment and cookies

- **Recommended: same site.** Serve the frontend and API under one registrable domain (e.g. `app.example.com` and `api.example.com`) and set `COOKIE_SAMESITE=lax` and `COOKIE_DOMAIN=.example.com` on the backend. This keeps working in browsers that block third-party cookies.
- **Cross-site (e.g. `*.vercel.app` frontend + `*.onrender.com` API)**: the default in production is `SameSite=None; Secure`. Browsers that block third-party cookies (Safari by default, Chrome in some modes) will drop it and login will not persist. There is no longer a JS-readable fallback token.
- Backend env: `FRONTEND_URL` must exactly match the frontend origin (used for CORS, the CSRF Origin check and the OAuth redirect); `NODE_ENV=production` (HTTPS is required for `Secure`); `GOOGLE_CALLBACK_URL` must be registered in Google Cloud. Frontend env: `NEXT_PUBLIC_API_URL` points at the API.
- The frontend no longer has an edge middleware gate (it cannot see a cookie set on the API's domain); route protection is client-side via `useAuth`, and the API enforces auth.

## Local Setup

### Docker (recommended)

Prerequisites: Docker with Compose v2.

```bash
cp .env.example .env   # set JWT_SECRET (openssl rand -hex 32) and Google OAuth credentials
docker compose up --build
```

This starts Postgres, Redis, a one-shot `migrate` job (`prisma migrate deploy`), the API
(http://localhost:4000, probes at `/healthz` and `/readyz`) and the web app (http://localhost:3000).
The `worker` service is a stub until Step 2.2; opt in with `docker compose --profile worker up`.

### Without Docker

Prerequisites: Node.js 22+, PostgreSQL 14+, Redis (optional until Step 2.2).

### Backend

```bash
cd backend
npm install
cp .env.example .env  # Configure DATABASE_URL, GOOGLE_CLIENT_ID, etc.
npx prisma migrate dev
npm run dev  # Runs on port 4000
```

### Frontend

```bash
cd frontend/my-app
npm install
cp .env.example .env.local  # Set NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev  # Runs on port 3000
```

### Worker (background sync)

The API process runs no background jobs. `src/worker.ts` is a separate entrypoint:

```bash
cd backend
npm run build
REDIS_URL=redis://localhost:6379 node dist/worker.js   # or: docker compose up worker
```

- Queues: `sync-leetcode`, `sync-codeforces`, `sync-codechef` (each with its own rate limiter, concurrency and circuit breaker), `leaderboard`, and `scheduler`.
- Every `SYNC_INTERVAL_HOURS` (default 6) a repeatable job enqueues all accounts with random jitter. Job ids are `accountId-window`, so several worker replicas never double-enqueue. There is no sync at startup.
- Failed jobs retry with exponential backoff and jitter; jobs that exhaust their attempts stay in the queue's failed set (our dead-letter queue). Counts are in `GET /admin/jobs/summary`; a read-only Bull Board is at `/admin/queues` (admin only).
- With `REDIS_URL` set, API rate limits are shared across replicas through Redis. See `backend/.env.example` for all tunables.

## Future Improvements

- **Real-time Updates**: WebSocket integration for live leaderboard changes
- **Badges System**: Achievements for consistency, language mastery, contest participation
- **Analytics Dashboard**: Personal performance trends and insights
- **Mobile App**: React Native client for iOS/Android
- **Contest Integration**: Live contest tracking and notifications

---

Built with ❤️ for competitive programmers who value consistency.
