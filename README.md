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
**Jobs**: Cron-based snapshot workers for platform data sync

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
                  │  Cron Jobs   │
                  │  - Snapshots │
                  │  - Rankings  │
                  └──────────────┘
```

**Data Flow**:

1. Cron jobs fetch platform data (LeetCode/Codeforces/CodeChef APIs)
2. Snapshots stored in `PlatformSnapshot` and `DailyActivity` tables
3. Leaderboard rebuild job calculates normalized scores
4. API serves cached leaderboard data with DB-level visibility filtering

## Security & Privacy

- **Auth**: httpOnly cookies, CSRF protection, rate limiting
- **Visibility Enforcement**: DB-level filtering for `GROUPS_ONLY` users (never appear in global APIs)
- **User Isolation**: Membership verification before group data access
- **Minimal Responses**: Only required fields returned, no internal IDs leaked
- **Input Validation**: Batch/branch/platform filters validated against constants

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

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

### Cron Jobs (Optional)

```bash
cd backend
npm run snapshot  # Manual trigger for testing
```

## Future Improvements

- **Real-time Updates**: WebSocket integration for live leaderboard changes
- **Badges System**: Achievements for consistency, language mastery, contest participation
- **Analytics Dashboard**: Personal performance trends and insights
- **Mobile App**: React Native client for iOS/Android
- **Contest Integration**: Live contest tracking and notifications

---

Built with ❤️ for competitive programmers who value consistency.
