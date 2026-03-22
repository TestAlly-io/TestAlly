# Configuration reference

Canonical template: **`.env.example`** at the repo root. Copy to **`.env`** (never commit `.env`).

## Who reads what

| Variable family | Read by | Notes |
|-----------------|---------|--------|
| `LLM_*`, `ANTHROPIC_*`, `OPENAI_*` | **Node** (`server/`) | Secrets stay server-side only |
| `API_PORT`, `NODE_ENV` | **Node** | `API_PORT` is also read by Vite for the dev proxy (`client/vite.config.ts`) |
| `DEV_CLIENT_PORT` | **Vite** | Optional override for the dev UI port |
| `VITE_*` | **Vite / browser** | Only non-secret flags; embedded in client bundle |

## LLM (OpenAI-compatible / Ollama)

| Variable | Required | Purpose |
|----------|----------|---------|
| `LLM_API_URL` | For infer + LLM health | Base URL, e.g. `http://localhost:11434` or `http://localhost:11434/v1` (avoid double `/v1` in paths — see [troubleshooting.md](./troubleshooting.md)) |
| `LLM_TOKEN` | Optional | `Authorization: Bearer …` for gated gateways |
| `LLM_MODEL` | Recommended | Model id for `v1/chat/completions` (must exist on the server) |
| `LLM_CHAT_PATH` | Optional | Default `v1/chat/completions` |
| `LLM_INFER_TIMEOUT_MS` | Optional | Infer request timeout (server) |
| `LLM_PROBE_TIMEOUT_MS` | Optional | `GET /api/health/llm` probe budget |

Provider API keys in `.env.example` (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) support future or alternate integrations; the stub server paths described in [api-contracts.md](./api-contracts.md) primarily use `LLM_API_URL` for infer.

## App / dev

| Variable | Default | Purpose |
|----------|---------|---------|
| `APP_URL` | — | Documented canonical UI URL |
| `API_PORT` | `3001` | Express listen port; Vite proxy target |
| `DEV_CLIENT_PORT` | `5173` | Vite dev port |
| `NODE_ENV` | `development` | Enables production static serving + SPA fallback when `production` |

## Rate limits & analysis (reserved)

Variables such as `RATE_LIMIT_*`, `MAX_INPUT_SIZE_KB`, `ANALYSIS_TIMEOUT_MS` are documented for alignment with the product spec; wire-up may vary by server version — check `server/src` and [deployment-manual.md](./deployment-manual.md).

## Related

- [deployment-manual.md](./deployment-manual.md) — Docker and production env
- [troubleshooting.md](./troubleshooting.md) — Port and LLM URL issues
