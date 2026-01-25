# UpSprint Backend

The powerhouse behind the social competitive programming platform. Built with Node.js, Express, and Prisma.

## 🏗️ API Architecture

The backend follows a **Service-Controller-Route** pattern to ensure separation of concerns.

- **Controllers**: Handle HTTP requests, input validation, and sending responses.
- **Services**: Contain business logic and third-party API integrations (LeetCode, Codeforces).
- **Jobs**: Background tasks for data fetching and processing.
- **Routes**: Define API endpoints and apply middleware (Auth, Rate Limits).

## 🔐 Authentication

We use a hybrid approach for secure and seamless authentication:

1. **Google OAuth 2.0**: Implemented via `passport-google-oauth20`. Users sign in with their Google accounts.
2. **JWT Sessions**: Upon successful login, a JSON Web Token (JWT) is issued and stored in a secure, HTTP-only cookie (`token`).
3. **Middleware**: `auth.middleware.ts` validates the JWT on protected routes.

## 🗄️ Database Schema

We use **PostgreSQL** with **Prisma ORM**. Key models include:

- **User**: The core identity. Links to multiple platform accounts.
- **LinkedAccount**: Represents a connection to an external platform (e.g., LeetCode). Stores metadata like `username`, `platform`, `currentStreak`.
- **PlatformSnapshot**: Historical record of a user's stats at a point in time. Used for progress tracking.
- **DailyActivity**: Normalized daily submission counts, used to calculate streaks and "consistency" scores.
- **Leaderboard**: A materialized view of the current global rankings, rebuilt periodically for performance.

## 📸 Snapshot System

To avoid rate limits and slow API responses, we do **not** fetch external data on every request.

- **Snapshot Job**: Runs periodically (via Cron) to fetch the latest stats for all linked accounts.
- **Normalization**: Raw data from LeetCode/Codeforces/CodeChef is normalized into a standard format (`rating`, `problemsSolved`, `rankTitle`).
- **Storage**: Each fetch creates a new `PlatformSnapshot` record.

## 🏆 Ranking Engine & Logic

The leaderboard is not real-time but **near real-time** (eventually consistent).

1. **Normalization**: Different platforms have different rating scales. We normalize them to a 0-1 scale.
   - _Codeforces_: Max ~4000
   - _LeetCode_: Max ~3000
   - _CodeChef_: Max ~3500
2. **Scoring**: `Score = (NormalizedRating * Weight) * 1000`.
3. **Rebuild Process**:
   - The `leaderboard.job.ts` runs periodically.
   - It aggregates the latest snapshots for every user.
   - It wipes the existing `Leaderboard` table and bulk-inserts the new rankings.
   - This ensures O(1) read performance for the `/leaderboard` API.

## 🕰️ Cron Jobs & Workers

We use `node-cron` to schedule background tasks:

- **Snapshot Sync**: Fetches new data every 6 hours.
- **Leaderboard Rebuild**: Runs daily at 1 AM (and triggered manually on critical events like account disconnect).

## ⚡ Caching Strategy

To ensure sub-100ms response times:

- **In-Memory Cache**: Simple map-based cache (`utils/cache.ts`) for hot endpoints like `/leaderboard`.
- **TTL**: Cache entries have a short Time-To-Live (e.g., 60 seconds) to balance freshness and load.
- **Invalidation**: Cache is automatically cleared after a leaderboard rebuild.

## 📡 Example API Requests

### 1. Get User Profile

**GET** `/users/profile`  
_Headers: Cookie: token=..._

```json
{
  "id": 1,
  "name": "Anas Khan",
  "accounts": [{ "platform": "leetcode", "username": "anaskhan" }]
}
```

### 2. Connect Account

**POST** `/users/connect`

```json
{
  "platform": "leetcode",
  "username": "tourist"
}
```

### 3. Get Leaderboard

**GET** `/leaderboard?page=1&limit=50`

```json
[
  {
    "rank": 1,
    "score": 1450.5,
    "user": { "name": "Test User", "avatarUrl": "..." }
  }
]
```

## 🛠️ Setup & Run

```bash
# Install dependencies
npm install

# Database Setup
npx prisma generate
npx prisma migrate dev

# Run Dev Server
npm run dev
```
