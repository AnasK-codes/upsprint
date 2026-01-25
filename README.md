# 🚀 UpSprint

> **Competitive Programming, Gamified & Social.**

## 🎯 Core Idea & Motivation

Competitive programming is often a solitary, fragmented grind. Students juggle multiple profiles (LeetCode, Codeforces, CodeChef), losing sight of holistic progress. Motivation dips after contests, and "I'll start tomorrow" becomes the norm.

**UpSprint turns this isolation into a shared, performance-driven culture.** It connects friends, unifies stats, and rewards the most undervalued metric in coding: **Consistency**.

## 🧠 What We Solve

- **❌ The fragmented view**: No more manual profile hopping to see LeetCode streaks vs. Codeforces ratings.
- **❌ The motivation gap**: We replace "grinding in silence" with "competing in trusted circles".
- **✅ Consistency > Talent**: Our algorithms rank disciplined daily effort higher than sporadic brilliance.

## ✨ Key Features

### 👥 Social-First Connected Profiles

- **Unified Identity**: Link LeetCode, Codeforces, and CodeChef to a single public profile.
- **Friend Tracking**: See what your peers are solving in real-time.
- **Automatic Sync**: No manual entry. Our snapshot engine keeps your stats fresh.

### 🏆 Multi-Dimensional Leaderboards

We don't just rank by rating. We rank by habits.

- **Global Normalized Leaderboard**: A fair scoring system that harmonizes ratings across different platforms.
- **Daily Activity Leaderboard**: A reset-daily view of who is putting in the work _today_.
- **Platform-Specific Views**: Focused leaderboards for LeetCode or Codeforces purists.

### 🔥 Gamification

- **Streaks**: Visualizing daily commitment.
- **Activity Timeline**: A feed of your recent problem-solving milestones.
- **Badges (Coming Soon)**: Achievements for consistency, language mastery, and contest participation.

## ⚙️ Engineering Highlights

UpSprint is built for scale, reliability, and data integrity.

- **Snapshot-Based Architecture**: Historical performance is archived via periodic snapshots, preventing data loss and allowing auditability.
- **Deterministic Ranking Engine**: Leaderboards are rebuilt in optimized batches using atomic transactions.
- **In-Memory Caching**: High-frequency read paths are cached to ensure a "real-time" feel without overloading the database.

## 🧩 Tech Stack

### Frontend

- **Framework**: [Next.js](https://nextjs.org/) (App Router & Server Components)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/)
- **State**: React Hooks & Context
- **Language**: TypeScript

### Backend

- **Runtime**: [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Auth**: Google OAuth 2.0 (Passport.js)
- **Security**: Rate Limiting (`apiLimiter`), Secure Headers, HTTP-only Cookies

## 🏗️ System Design

A service-oriented architecture designed for clarity and correctness:

    User[User] -->|Action| UI[Next.js Frontend]
    UI -->|API Req| API[Express API / Auth Layer]
    API -->|Read| Cache[(Redis/Memory Cache)]
    API -->|Write| DB[(PostgreSQL)]
    Cron[Scheduler] -->|Trigger| Jobs[Snapshot Workers]
    Jobs -->|Fetch| Ext[External APIs (LeetCode/CF)]
    Jobs -->|Persist| DB
    Jobs -->|Rebuild| RankingService

## 🧠 Philosophy

**UpSprint is not about flexing ranks.**
It's about **showing up**. It's about learning alongside friends and building the muscle of consistency. Progress feels real when shared.

---

© 2026 UpSprint Team. Built to make competitive programming social again ❤️
