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
FROM deps AS client-builder
RUN npm run build:client

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
