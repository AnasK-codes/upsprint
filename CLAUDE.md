# CLAUDE.md: instructions for Claude Code sessions in UpSprint

UpSprint aggregates LeetCode, Codeforces and CodeChef stats into unified leaderboards, streaks, groups and (soon) a progress dashboard. It is the owner's resume project and is being grown into a micro-SaaS. The owner plans the work; Claude writes the code.

## Start of every session
1. Read `docs/ROADMAP.md` and find the step named in the prompt. Stay within that step; if the work drifts into a later step, stop and say so.
2. For steps marked 🧠 in the roadmap, present a plan first and wait for approval before editing.
3. Check `docs/BENCHMARKS.md` before touching anything performance-related.

## Git rules (strict)
- **Never add attribution of any kind** to commits or PRs: no `Co-Authored-By: Claude…`, no "Generated with Claude Code", no session links, no mention of Claude or AI in messages. The commit author is always the repo owner's git identity. Do not change `user.name` or `user.email`.
- Conventional commits (`feat:`, `fix:`, `refactor:`, `perf:`, `test:`, `docs:`, `chore:`), imperative and concise.
- Work on a branch per roadmap step (e.g. `step-2.2-bullmq-worker`), never directly on `main`.
- Commit only when asked. Never push, force-push, tag, or open a PR without explicit permission.
- Never rewrite published history.

## No CI
- Do **not** add GitHub Actions or any hosted CI. The ✓ on GitHub commits is the Vercel deployment, not CI.
- Verify locally instead: `npm run check` (type-check + lint + tests) in `backend/` and `frontend/my-app/` once Phase 1 adds it. Run it before saying a step is done, and report failures honestly.

## Repo layout
- `backend/`: Express 5 + TypeScript (ESM: relative imports use the `.js` suffix), Prisma 7 + PostgreSQL. Entry `src/server.ts`, app `src/app.ts`, routes → controllers/services, jobs in `src/jobs/`.
- `frontend/my-app/`: Next.js 16 App Router, React 19, Tailwind v4, framer-motion. API client in `src/services/api.ts`.
- `benchmarks/` (Phase 0): seeder, mock platform server, k6 scripts, results. `docs/`: roadmap, benchmarks, ADRs.

## Commands
- Backend: `cd backend && npm run dev` (port 4000), `npm run build`, `npx prisma migrate dev --name <name>`.
- Frontend: `cd frontend/my-app && npm run dev` (port 3000), `npm run build`, `npm run lint`.

## Engineering rules
- Keep API response shapes backward-compatible unless the step says otherwise; update `frontend/my-app/src/services/api.ts` types alongside any change.
- Schema changes go through Prisma migrations (never edit applied migrations). Write backfills to be idempotent.
- No N+1 queries; no full-table work inside a request handler; long work goes to the worker/queue.
- Every external call (LeetCode/Codeforces/CodeChef) needs a timeout and error handling. Never hit the real platforms from tests or benchmarks; use the mock platform server.
- Validate inputs with zod; use the logger, not `console.*`.
- Ask before adding a dependency, and say why it is needed.
- Never read, print or commit `.env` files or secrets. Use `.env.example` for documented variables.

## Benchmark integrity (critical: these numbers go in interviews)
- Never invent, estimate or "round up" performance numbers. Every number must come from a script in `benchmarks/` with raw output saved under `benchmarks/results/`.
- Baseline numbers come only from the `baseline-v1` tag. Compare before/after on the same machine, dataset and load profile, and record the environment.
- If a result looks too good, check for cache hits, error responses or rate-limiting before reporting it. Report regressions honestly.
- In docs, write `[MEASURE]` where a number hasn't been measured yet.

## Frontend and design rules
- **Keep the Aceternity components** in `frontend/my-app/src/components/ui/` (`comet-card`, `cover`, `infinite-moving-cards`, `sparkles`). Restyle them through props, classes and design tokens; don't rewrite or delete them.
- Everything else (layout, backgrounds, navbar, pages, cards, tables, forms) follows the design system from roadmap Phase 5: tokens in Tailwind v4 `@theme`, dark-first with a light mode, consistent spacing, radius and type scale.
- Respect `prefers-reduced-motion`. Lazy-load heavy visual effects (tsparticles). Watch bundle size and Core Web Vitals.
- Accessibility: semantic HTML, keyboard navigation, visible focus, WCAG AA contrast.
- Marketing copy must be truthful: no fake testimonials, invented user counts or fabricated logos. Show only real stats, or omit them. Mark unbuilt features "Coming soon". No pricing section yet.
- Don't imply partnership with LeetCode, Codeforces or CodeChef; refer to them by name only.

## Definition of done for a step
Code compiles, `npm run check` passes locally, the step's "Done when" items from the roadmap are met, and you summarise what changed and what remains unverified.
