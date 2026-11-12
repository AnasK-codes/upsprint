# syntax=docker/dockerfile:1

# ---- deps: all dependencies (needed to build) ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---- build: prisma generate + tsc ----
FROM deps AS build
COPY prisma.config.js tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate && npm run build

# ---- prod-deps: production dependencies only, with generated client ----
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json prisma.config.js ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev \
    && npx prisma generate

# ---- runtime ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json prisma.config.js ./
COPY --chown=node:node prisma ./prisma
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:${PORT}/healthz || exit 1
# API (default). Other commands, run with the same image:
#   migrate: npx prisma migrate deploy
#   worker:  node dist/worker.js   (added in Step 2.2)
CMD ["node", "dist/server.js"]
