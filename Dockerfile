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
ENV NODE_ENV=production
ENV API_PORT=3001
# OpenAI-compatible API base (host:port or full URL; http:// added at runtime if missing).
# From inside the container, use the host’s LAN IP, Docker bridge IP, or host.docker.internal — not localhost — if the LLM runs on the machine hosting Docker.
ENV LLM_API_URL=172.26.32.29:11435
# Must match a model available on that server (e.g. ollama pull <name>).
ENV LLM_MODEL=llama3.2
# LLM_TOKEN: never bake into the image; pass at run time: docker run -e LLM_TOKEN=...

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=server-builder /app/build/server ./build/server
COPY --from=client-builder /app/build/client ./build/client
COPY package*.json ./
COPY server/package*.json ./server/
COPY server/src/lib/wcag/data ./build/server/lib/wcag/data

USER appuser
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "build/server/index.js"]
