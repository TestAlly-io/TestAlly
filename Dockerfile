# Maintainer notes: when changing ports, COPY paths, Node version, or runtime assets,
# see docs/deployment-manual.md §5.1 "Updating Dockerfiles and rebuilding images".
#
# ---- Base ----
FROM node:24-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package*.json ./
COPY client ./client
COPY server ./server
RUN npm install

# ---- Build client ----
# Bump or pass --build-arg CACHEBUST=$(date +%s) if the UI in the image looks stale.
FROM deps AS client-builder
ARG CACHEBUST=0
RUN echo "client build ${CACHEBUST}" && npm run build:client

# ---- Build server ----
FROM deps AS server-builder
RUN npm run build:server

# ---- Production deps ----
FROM base AS prod-deps
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm install --omit=dev

# ---- Runner ----
FROM node:24-alpine AS runner
WORKDIR /app

# mode: "client" or "server"
ARG mode=server
ENV APP_MODE=${mode}

# APP_PORT controls which port is exposed and used at runtime
ARG APP_PORT=3001
ENV APP_PORT=${APP_PORT}

ENV NODE_ENV=production
# Default CloudFest host for the cloudfest provider (Ollama or compatible).
# From inside the container, use the host’s LAN IP, Docker bridge IP, or
# host.docker.internal — not localhost — if the LLM runs on the Docker host.
ENV CLOUDFEST_HOST=172.26.32.29:11435
# Per-role provider config (PLANNING_LLM_PROVIDER, etc.) and API keys
# should be passed at run time: docker run -e PLANNING_LLM_PROVIDER_KEY=...

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Common files
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package*.json ./

# Server-mode files
COPY --from=server-builder /app/build/server ./build/server
COPY server/package*.json ./server/
COPY server/src/lib/wcag/data ./build/server/lib/wcag/data

# Client-mode files
COPY --from=client-builder /app/build/client ./build/client

USER appuser
EXPOSE ${APP_PORT}

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${APP_PORT}/api/health || exit 1

# Client mode: serve static files with a lightweight server
# Server mode: run the Express app
CMD if [ "$APP_MODE" = "client" ]; then \
      npx serve -s build/client -l ${APP_PORT}; \
    else \
      node build/server/index.js; \
    fi
