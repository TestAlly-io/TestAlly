# API contracts

JSON shapes for the public HTTP API. **Source of truth for client typings:** `client/src/types/api.ts`. Server handlers live in `server/src/app.ts` (or route modules if refactored).

All paths are under `/api` from the browser (same origin in production; dev uses Vite proxy).

---

## `POST /api/analyze`

**Request body**

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `code` | string | yes | Non-empty after trim |
| `language` | string | yes | `html` \| `jsx` \| `tsx` \| `vue` \| `svelte` |
| `description` | string | no | |
| `css` | string | no | |
| `js` | string | no | |

**Responses**

- **`202`** — `{ "status": "accepted", "jobId", "statusUrl", "resultsUrl" }` — see `AnalyzeResponse`.
- **`400`** — `{ "error", "message" }` if `code` missing.

---

## `GET /api/status/:jobId`

**Responses**

- **`200`** — `JobStatus` (`status`, `jobId`, `phase`, `description`, timestamps, …).
- **`404`** — unknown `jobId`.

Stub implementations may return `completed` immediately.

---

## `GET /api/manual-test/:jobId`

**Responses**

- **`200`** — `ManualTestResponse`: `status`, `jobId`, optional `analysis` (`AnalysisResult`), optional `metadata`.
- **`404`** — unknown `jobId`.

---

## `GET /api/health`

**`200`** — Liveness, e.g. `{ "status": "healthy", "llm": { "configured": boolean } }` (exact shape may include extra fields in some versions).

---

## `GET /api/health/llm`

Active LLM connectivity check (no full chat completion).

**Responses**

- **`200`** — Probe succeeded; body includes `ok: true`, `via`, `latencyMs`, optional `models`, `message`.
- **`503`** — LLM not configured (e.g. `LLM_API_URL` unset).
- **`502`** — Reachability or API shape check failed; `message` explains.

---

## `POST /api/infer-component`

**Request body**

| Field | Type | Required |
|-------|------|----------|
| `raw` | string | yes (non-empty trim) |

**Responses**

- **`200`** — `InferComponentResponse` (`language`, `componentKind`, `description`, `code`, optional `css` / `js`).
- **`400`** — missing `raw`.
- **`503`** — LLM not configured.
- **`502`** — upstream LLM error.

---

## Errors

Non-OK responses typically include JSON with `error` and/or `message`. The client maps these to `Error` in `client/src/api.ts`.
