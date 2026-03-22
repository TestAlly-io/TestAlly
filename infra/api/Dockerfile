# infra/api/Dockerfile — builds and runs the Express server
# Build context: repo root (docker build -f infra/api/Dockerfile .)
# Compatible with DigitalOcean App Platform (honours $PORT at runtime)

# ---- Base ----
FROM node:24-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package*.json ./
COPY client ./client
COPY server ./server
RUN npm install

# ---- Build server ----
FROM deps AS builder
RUN npm run build:server

# ---- Production deps ----
FROM base AS prod-deps
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm install --omit=dev

# ---- Production image ----
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# DO App Platform injects PORT; default to 8080 for local/other environments
ENV PORT=8080
# Default CloudFest host for the cloudfest provider (Ollama or compatible).
ENV CLOUDFEST_HOST=172.26.32.29:11435
# Per-role provider config and API keys should be passed at run time:
# docker run -e PLANNING_LLM_PROVIDER_KEY=...

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=prod-deps /app/node_modules ./node_modules
COPY package*.json ./
COPY --from=builder /app/build/server ./build/server
COPY server/package*.json ./server/
COPY server/src/lib/wcag/data ./build/server/lib/wcag/data

USER appuser
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

CMD node build/server/index.js
