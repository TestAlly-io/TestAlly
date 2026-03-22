# infra/app/Dockerfile — builds and serves the Vite React client
# Build context: repo root (docker build -f infra/app/Dockerfile .)
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

# ---- Build client ----
FROM deps AS builder
ARG CACHEBUST=0
RUN echo "client build ${CACHEBUST}" && npm run build:client

# ---- Production image ----
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# DO App Platform injects PORT; default to 8080 for local/other environments
ENV PORT=8080

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/build/client ./build/client
RUN npm install serve

USER appuser
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 1

CMD ["sh", "-c", "npx serve -s build/client -l $PORT"]
