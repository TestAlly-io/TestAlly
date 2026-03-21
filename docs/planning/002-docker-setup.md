# 002 — Docker Setup

## Context

The project has been initialized with the monorepo structure from `001-basic-setup.md`. You are now adding Docker support for production builds.

## Dependencies

- `001-basic-setup.md` completed

## What You're Building

A multi-stage Dockerfile that builds client and server separately, then produces a minimal production image. Plus a `.dockerignore` for efficient builds.

---

## Steps

### 1. Create .dockerignore

Create `.dockerignore` at the project root:

```
node_modules/
dist/
.git/
.idea/
.env
.env.production
.env.local
*.tsbuildinfo
coverage/
docs/
tests/
*.md
!package.json
```

### 2. Create the multi-stage Dockerfile

Create `Dockerfile` at the project root:

```dockerfile
# ---- Base ----
FROM node:24-alpine AS base
WORKDIR /app

# ---- Install dependencies ----
FROM base AS deps
COPY package.json package-lock.json* ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci

# ---- Build client ----
FROM deps AS client-builder
COPY client/ ./client/
COPY tsconfig.json ./
RUN npm run build:client

# ---- Build server ----
FROM deps AS server-builder
COPY server/ ./server/
COPY tsconfig.json ./
RUN npm run build:server

# ---- Production deps only ----
FROM base AS prod-deps
COPY package.json package-lock.json* ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci --omit=dev

# ---- Runner ----
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/server/node_modules ./server/node_modules 2>/dev/null || true
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=client-builder /app/client/dist ./client/dist
COPY package.json ./
COPY server/package.json ./server/

# Copy WCAG knowledge base data (needed at runtime)
COPY server/src/lib/wcag/data ./server/dist/lib/wcag/data 2>/dev/null || true

USER appuser
EXPOSE 3001
ENV PORT=3001

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "server/dist/index.js"]
```

### 3. Build and test the image

```bash
# Build
docker build -t testally .

# Run (use .env.example as a starting point — copy and edit first)
cp .env.example .env.production
# Edit .env.production with real API keys

docker run -d \
  --name testally \
  -p 3001:3001 \
  --env-file .env.production \
  testally

# Verify
curl http://localhost:3001/api/health
# Expected: {"status":"healthy"}

# Check frontend is served
curl -s http://localhost:3001/ | head -5
# Should return the index.html content

# Cleanup
docker stop testally && docker rm testally
```

### 4. Update server to serve static client assets in production

Edit `server/src/index.ts` — add static file serving for production:

```ts
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.API_PORT ?? 3001;

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy' });
});

// Serve static client assets in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));

  // SPA fallback — serve index.html for non-API routes
  app.get('{*path}', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`TestAlly server running on port ${PORT}`);
});
```

---

## Verification

```bash
# Image builds successfully
docker build -t testally .

# Container starts and health check passes
docker run -d --name testally-test -p 3001:3001 --env-file .env.production testally
sleep 3
curl http://localhost:3001/api/health

# Cleanup
docker stop testally-test && docker rm testally-test
```

## Files Created / Modified

```
.dockerignore          (new)
Dockerfile             (new)
server/src/index.ts    (modified — added static file serving)
```

## Maintaining the Dockerfile

When the app or repo layout changes, contributors should adjust the root **`Dockerfile`** (and **`.dockerignore`**) as needed. See **`docs/deployment-manual.md` → §5.1 → “Updating Dockerfiles and rebuilding images”** for a checklist: client `public/` assets, dependency/`COPY` paths, **`API_PORT`** / **`EXPOSE`** / health checks, runtime **`LLM_*`** via env at run time (not baked-in secrets), Node image bumps, and busting cache when the built UI looks stale.

## Next Step

Proceed to `003-local-dev-docker-compose.md`.
