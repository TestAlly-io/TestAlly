# TestAlly Deployment Manual

Version: 1.0.0
Last updated: 2026-03-13

---

## 1. Overview

This manual covers how to set up, configure, and deploy TestAlly for development, staging, and production environments. TestAlly uses a Vite + React frontend with an Express.js backend that communicates with LLM providers and runs static accessibility analysis.

Analysis jobs are **asynchronous**: `POST /api/analyze` returns a job ID (HTTP 202), the client polls `GET /api/status/:jobId` for progress, and retrieves results from `GET /api/manual-test/:jobId` when complete. The backend uses a LangChain.js-powered state machine with an agentic Planning Agent that autonomously selects which analysis tools to run for each component.

---

## 2. Prerequisites

### 2.1 System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | 18.17+ | 20 LTS |
| npm / yarn / pnpm | npm 9+ | pnpm 8+ |
| RAM | 1 GB | 2 GB |
| Disk | 500 MB | 1 GB |
| OS | macOS, Linux, Windows (WSL2) | macOS or Linux |

### 2.2 Required Accounts and API Keys

| Service | Purpose | Required |
|---------|---------|----------|
| LLM Provider (primary) | Generate manual testing walkthroughs | Yes |
| LLM Provider (validation) | Cross-check walkthrough accuracy | Yes |
| GitHub account | Source control, CI/CD | Yes |

Supported LLM providers: Anthropic (Claude), OpenAI (GPT-4), or any OpenAI-compatible API.

---

## 3. Local Development Setup

### 3.1 Clone the Repository

```bash
git clone https://github.com/testally/testally.git
cd testally
```

### 3.2 Install Dependencies

```bash
npm install
```

Or with pnpm:

```bash
pnpm install
```

### 3.3 Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# LLM Provider API Keys
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxx

# Application Settings
APP_URL=http://localhost:5173
API_PORT=3001
NODE_ENV=development

# Rate Limiting (per-endpoint defaults defined in code:
#   POST /api/analyze: 20 req/min, GET endpoints: 60 req/min)
# These env vars override the defaults when set:
RATE_LIMIT_ANALYZE_MAX=20
RATE_LIMIT_ANALYZE_WINDOW_MS=60000
RATE_LIMIT_READ_MAX=60
RATE_LIMIT_READ_WINDOW_MS=60000

# Analysis Settings
MAX_INPUT_SIZE_KB=50
ANALYSIS_TIMEOUT_MS=30000
```

### 3.4 Start the Development Servers

```bash
# Start both client and server concurrently
npm run dev

# Or start them individually:
npm run dev:client   # Vite dev server on http://localhost:5173
npm run dev:server   # Express API server on http://localhost:3001
```

Vite is configured to proxy `/api` requests to the Express server during development.

### 3.5 Run Tests

```bash
# Unit tests (Vitest)
npm run test

# Unit tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# End-to-end tests
npm run test:e2e
```

Coverage enforcement: the project requires ≥ 97% line and branch coverage (target: 100%). CI will fail if coverage drops below threshold.

---

## 4. Project Structure

```
testally/
  client/                     # Vite + React frontend
    src/
      main.tsx                # App entry point
      App.tsx                 # Root component with React Router
      pages/
        Home.tsx              # Main application page
      components/             # React UI components
        CodeEditor/           # Code input component
        ResultsPanel/         # Analysis results display
        ManualTestCard/       # Individual test walkthrough card
      types/
        analysis.ts           # TypeScript types for analysis results
        api.ts                # API request/response types
    index.html
    vite.config.ts
    tsconfig.json
  server/                     # Express.js backend
    src/
      index.ts                # Express app entry point
      routes/
        analyze.ts            # POST /api/analyze endpoint (returns job ID, HTTP 202)
        status.ts             # GET /api/status/:jobId endpoint (poll job progress)
        manual-test.ts        # GET /api/manual-test/:jobId endpoint (retrieve results)
        health.ts             # GET /api/health endpoint
      middleware/
        cors.ts               # CORS configuration
        rate-limit.ts         # Rate limiting
        validate-input.ts     # Input validation and sanitization
      lib/
        analysis/
          axe-runner.ts       # axe-core integration
          eslint-runner.ts    # ESLint a11y integration
          custom-rules/
            link-as-button.ts # Link-as-button detector
            focus-ring.ts     # Focus ring removal detector
            index.ts          # Rule registry
        analyzer/
          component-analyzer.ts  # Pattern and behavior detection
          css-analyzer.ts        # CSS property analysis
          event-analyzer.ts      # Event handler analysis
        llm/
          orchestrator.ts     # LangChain.js state machine orchestrator (agentic tool-use)
          providers/
            anthropic.ts      # Anthropic Claude adapter
            openai.ts         # OpenAI adapter
          prompts/
            primary.ts        # Primary analysis prompt templates
            validation.ts     # Validation prompt templates
        wcag/
          knowledge-base.ts   # WCAG criteria reference data
          mappings.ts         # Component-type-to-criteria mappings
    tsconfig.json
  public/                     # Static assets (served by Express in prod)
  tests/
    unit/                     # Unit tests
    e2e/                      # End-to-end tests
  .env.example                # Environment variable template
  package.json
  tsconfig.json               # Root TypeScript config
```

---

## 5. Deployment Options

### 5.1 Option A: Docker (Recommended)

Docker provides the simplest, most portable deployment path.

#### Dockerfile:

```dockerfile
FROM node:20-alpine AS base

# Build the client
FROM base AS client-builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY client/package.json ./client/
RUN npm ci
COPY client/ ./client/
COPY tsconfig.json ./
RUN npm run build:client

# Build the server
FROM base AS server-builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY server/package.json ./server/
RUN npm ci --omit=dev
COPY server/ ./server/
COPY tsconfig.json ./
RUN npm run build:server

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 appgroup
RUN adduser --system --uid 1001 appuser
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/node_modules ./node_modules
COPY --from=client-builder /app/client/dist ./client/dist
COPY package.json ./

USER appuser
EXPOSE 3001
ENV PORT=3001
CMD ["node", "server/dist/index.js"]
```

#### Build and Run:

```bash
# Build the image
docker build -t testally .

# Run the container
docker run -d \
  --name testally \
  -p 3001:3001 \
  --env-file .env.production \
  testally
```

#### Docker Compose (with reverse proxy):

```yaml
version: '3.8'

services:
  testally:
    build: .
    restart: unless-stopped
    env_file:
      - .env.production
    ports:
      - "3001:3001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - testally
```

#### Updating Dockerfiles and rebuilding images

The **canonical** multi-stage build lives in the **repo-root `Dockerfile`**. The example embedded earlier in this section may lag behind; always compare with the real file when following these notes.

| Change in the repo | What to update |
|--------------------|----------------|
| **New client static assets** (`client/public/*`, favicons, logos) | No Dockerfile edit required if files live under `client/` — they are included in the `deps` / `client-builder` stages. **Rebuild the image** so `client/dist` picks them up. |
| **Client or server dependencies** | `package.json` / lockfile changes are copied in `deps` / `prod-deps`. Rebuild; use `docker build --no-cache` if the image still shows old behavior. |
| **Stale UI in the image** | The Dockerfile may use a `CACHEBUST` build-arg on the client stage. Rebuild with e.g. `docker build --build-arg CACHEBUST=$(date +%s) -t testally .` or `--no-cache` for the client-builder stage. |
| **Listen port** | Keep **`API_PORT`** (app), **`EXPOSE`**, **`HEALTHCHECK` URL**, and **`docker run -p host:container`** aligned. The app reads `process.env.API_PORT` (default `3001`). |
| **LLM / secrets** | Do **not** commit real API keys or host-specific IPs in the Dockerfile. Pass **`LLM_API_URL`**, **`LLM_MODEL`**, **`LLM_TOKEN`** at **run time** (`docker run -e …`, Compose `environment`, or `env_file`). From inside the container, `localhost` is the container itself — use **`host.docker.internal`** (Docker Desktop), the host LAN IP, or a service name on Compose networks to reach Ollama or another LLM on the host. |
| **Node.js version** | Bump the **`FROM node:…-alpine`** images to match **`package.json` `engines.node`** and CI. |
| **Monorepo layout** (`client/`, `server/`, workspaces) | Adjust **`COPY`** paths and stage boundaries if you move packages or add workspaces. Ensure **`npm install` / `npm ci`** still run from the repo root context expected by the Dockerfile. |
| **Server runtime files outside `dist`** | If the server loads JSON/YAML or other files at runtime (e.g. WCAG data), add a matching **`COPY --from=…`** into the **runner** stage to the path **`import.meta.url`** resolves to in production. |
| **`.dockerignore`** | Update when new directories should be excluded from the build context (faster builds, smaller uploads) or when something **must** be included that was previously ignored. |

**Quick verification after Dockerfile edits:**

```bash
docker build -t testally .
docker run --rm -p 3001:3001 --env-file .env.production testally
# In another terminal:
curl -s http://localhost:3001/api/health
curl -sI http://localhost:3001/ | head -3
```

### 5.2 Option B: Node.js Direct

For simple deployments without containerization.

```bash
# Install dependencies
npm ci --omit=dev

# Build client and server
npm run build

# Start the production server
npm start
```

The Express server serves the built Vite client assets from `client/dist/` and handles API routes — a single process for both frontend and backend.

Use a process manager like PM2 for production:

```bash
npm install -g pm2

# Start with PM2
pm2 start node --name "testally" -- server/dist/index.js

# Configure auto-restart
pm2 startup
pm2 save
```

---

## 6. Configuration Reference

### 6.1 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | No* | - | API key for Anthropic models |
| `OPENAI_API_KEY` | No* | - | API key for OpenAI models |
| `APP_URL` | Yes | - | Public URL of the application |
| `API_PORT` | No | `3001` | Port for the Express server |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `RATE_LIMIT_ANALYZE_MAX` | No | `20` | Max requests per window per IP for `POST /api/analyze` |
| `RATE_LIMIT_ANALYZE_WINDOW_MS` | No | `60000` | Rate limit window for `/api/analyze` in milliseconds |
| `RATE_LIMIT_READ_MAX` | No | `60` | Max requests per window per IP for GET endpoints |
| `RATE_LIMIT_READ_WINDOW_MS` | No | `60000` | Rate limit window for GET endpoints in milliseconds |
| `MAX_INPUT_SIZE_KB` | No | `50` | Maximum input size per field in KB |
| `ANALYSIS_TIMEOUT_MS` | No | `30000` | Timeout for full analysis pipeline in ms |

\* At least one provider API key (Anthropic or OpenAI) must be configured.

### 6.2 Vite Configuration

Key settings in `client/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

---

## 7. Monitoring and Health Checks

### 7.1 Health Endpoint

`GET /api/health` returns:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "checks": {
    "llm_primary": "connected",
    "llm_validation": "connected",
    "axe_core": "loaded"
  }
}
```

### 7.2 Monitoring Recommendations

- Monitor the `/api/health` endpoint with your preferred uptime service
- Track API response times (target: < 10s for full analysis)
- Monitor LLM API usage and costs via provider dashboards
- Set alerts for error rate spikes (5xx responses)
- Log analysis requests (without code content) for usage metrics

---

## 8. Security Hardening

### 8.1 Production Checklist

- [ ] All API keys are set as environment variables, not in code
- [ ] `.env` and `.env.production` are in `.gitignore`
- [ ] Rate limiting is configured and tested
- [ ] HTTPS is enabled (via nginx or load balancer)
- [ ] CORS is configured to allow only your domain
- [ ] Content Security Policy headers are set
- [ ] Input size limits are enforced
- [ ] No sensitive data is logged

### 8.2 CORS Configuration

CORS is configured in Express middleware:

```ts
// server/src/middleware/cors.ts
import cors from 'cors';

const allowedOrigins = [process.env.APP_URL];

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
});
```

---

## 9. Scaling Considerations

### 9.1 Bottlenecks

The primary bottleneck is LLM API latency. Static analysis completes in under 500ms, but LLM calls can take 3-8 seconds each (two calls per analysis).

### 9.2 Scaling Strategies

| Strategy | When to Apply |
|----------|--------------|
| Horizontal scaling (multiple containers) | Medium traffic |
| Request queuing (Bull/BullMQ) | High traffic, prevent overload |
| Response caching | Repeated analyses of identical components |
| LLM response streaming | Improve perceived performance |
| Load balancer (nginx, HAProxy) | Distribute across instances |

### 9.3 Cost Management

LLM API costs scale with usage. To manage costs:

- Set monthly API budget alerts with your LLM provider
- Implement request rate limiting per user/IP
- Cache analysis results for identical inputs (hash-based)
- Use smaller/cheaper models for validation when accuracy is acceptable
- Monitor token usage per analysis to identify prompt optimization opportunities

---

## 10. Troubleshooting

### 10.1 Common Issues

**Application fails to start:**
- Verify Node.js version: `node --version` (must be 18.17+)
- Verify all required environment variables are set
- Run `npm ci` to ensure clean dependency installation

**LLM calls fail or time out:**
- Check API key validity with the provider
- Verify network connectivity to the LLM provider
- Increase `ANALYSIS_TIMEOUT_MS` if timeouts are frequent
- Check provider status pages for outages

**axe-core analysis returns empty results:**
- Ensure the HTML input is valid and well-formed
- Check that axe-core is properly installed: `npm ls axe-core`

**Rate limiting triggers too aggressively:**
- Adjust `RATE_LIMIT_ANALYZE_MAX`/`RATE_LIMIT_READ_MAX` and corresponding `_WINDOW_MS` variables in environment
- For development, set high limits or disable rate limiting

**Docker container exits immediately:**
- Check logs: `docker logs testally`
- Verify the `.env.production` file exists and has required variables
- Ensure port 3001 is not already in use

**Vite proxy not reaching Express in dev:**
- Ensure the Express server is running on port 3001
- Check `vite.config.ts` proxy target matches the Express port

### 10.2 Logging

Express logs to stdout by default. For production Docker deployments, configure Docker log drivers:

```bash
docker run -d \
  --name testally \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  -p 3001:3001 \
  --env-file .env.production \
  testally
```

---

## 11. Backup and Recovery

### 11.1 What to Back Up

Since the MVP does not persist user data, backups focus on:

- **Environment configuration**: `.env.production` file (store securely, not in git)
- **Custom rules**: Any custom detection rules added beyond the defaults
- **WCAG knowledge base**: Curated criteria mappings

### 11.2 Recovery Procedure

1. Provision a new server or container environment
2. Clone the repository at the appropriate version tag
3. Restore the `.env.production` file
4. Run `npm ci && npm run build && npm start`
5. Verify health endpoint returns healthy status

---

## 12. Updating

### 12.1 Docker Deployments

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker build -t testally .
docker stop testally
docker rm testally
docker run -d --name testally -p 3001:3001 --env-file .env.production testally
```

Or with Docker Compose:

```bash
docker compose build
docker compose up -d
```

### 12.2 Direct Node.js Deployments

```bash
git pull origin main
npm ci --omit=dev
npm run build
pm2 restart testally
```
