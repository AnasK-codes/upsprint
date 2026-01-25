# UpSprint Frontend

The modern, responsive web interface for UpSprint using Next.js 14 and Tailwind CSS.

## 📁 Routing Structure

We use the Next.js **App Router** for a hierarchical and efficient routing system:

- **`/`**: Landing page (Public).
- **`/login`, `/signup`**: Authentication pages (Protected: Guest Only).
- **`/profile`**: User dashboard for managing connected accounts (Protected: Auth Only).
- **`/leaderboard`**: The core social hub (Protected: Auth Only).
  - Toggles between Global, LeetCode, Daily, and Group views via client-side state.
- **`/user/[id]`**: Public profile view of other users.

## 🔐 Authentication Flow

Authentication is managed via a centralized `AuthContext` + Custom Hooks:

1. **`useAuth` Hook**: Exposes usage of specific `login`, `logout` methods and the current `user` object.
2. **Session Persistence**: Relies on HTTP-only cookies set by the backend. The frontend attempts to fetch `/api/users/profile` on mount.
3. **Route Protection**:
   - `useEffect` middleware in `AuthProvider` redirects unauthenticated users away from protected routes.
   - Redirects authenticated users _away_ from `/login`.

## 🏆 Leaderboard UI Logic

The leaderboard is designed for high responsiveness:

- **Client-Side Filters**: Batch, Branch, and Platform filters update URL params (`searchParams`) to allow deep-linking.
- **Caching**: Implements a `useRef` cache to store pages/tab data. Switching tabs feels instant as data is retrieved from memory if previously fetched.
- **Optimistic Updates**: UI updates immediately on interaction (e.g., joining a group) while background revalidation ensures data consistency.

## 📡 Real-Time & Updates

While the platform currently uses **Polling/Revalidation** for simplicity, it is architected for WebSocket scalability:

- **Current State**: Data is fetched on-mount and revalidated on explicit user actions (pull-to-refresh logic in `retry`).
- **Future Integration**: The `LeaderboardClient` is isolated, making it easy to swap the `fetcher` logic with `useSocket` subscription hooks without refactoring the UI components.

## ⚡ Gamification Elements

Gamification is woven into the UI DNA:

- **Streaks**: Visual flame icons (🔥) next to usernames indicating daily consistency.
- **Badges**: Placeholder components ready for achievement system integration.
- **Activity Feed**: A vertical timeline component (`ActivityTimeline`) visualizing submission history.

## 🎨 Animations

We use **Framer Motion** for "delight" micro-interactions:

- **Page Transitions**: Smooth fade-in/slide-up effects on route changes.
- **Tab Switching**: A floating "magic layout" background that slides between active tabs (`layoutId="activeTab"`).
- **Hover Effects**: Buttons and cards scale slightly on interaction.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Animation**: Framer Motion
- **Data Fetching**: Native `fetch` / Axios with Interceptors

## 🏃‍♂️ Running Locally

```bash
cd frontend/my-app
npm install
npm run dev
```

Visit `http://localhost:3000`.
