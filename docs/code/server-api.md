# Server HTTP API

Generated from `server/src/app.ts` (Express). All paths are prefixed with the app mount (typically `/` in dev behind Vite’s `/api` proxy).

| Method | Path | Purpose |
|--------|------|--------|
| `POST` | `/api/analyze` | Submit component for analysis; returns `202` + `jobId` (stub in-memory jobs). |
| `GET` | `/api/status/:jobId` | Poll job status (stub completes immediately). |
| `GET` | `/api/manual-test/:jobId` | Fetch manual-test / analysis payload for a job (stub). |
| `GET` | `/api/health` | Liveness; includes `llm.configured` from env. |
| `GET` | `/api/health/llm` | Active LLM reachability probe (Ollama tags / OpenAI-style `v1/models`). |
| `POST` | `/api/infer-component` | Body `{ raw: string }` — LLM classifies pasted source (`server/src/lib/llmInferComponent.ts`). |

**Production:** when `NODE_ENV === 'production'`, static files are served from `client` build and `GET *` returns `index.html` for SPA routing.
