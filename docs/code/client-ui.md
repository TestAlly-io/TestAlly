# Client UI structure

Generated from `client/src/` (Vite + React).

## Bootstrap

- `main.tsx` — React root, router provider.
- `App.tsx` — Route `/` → `AppShell`.

## Shell

- `layout/AppShell.tsx` — Header, tab list, tab panels.
- **Tabs (current):** `overview` → `ClassicWorkspace`, `oneInput` → `OneInputWorkspace`.

## Pages

| Component | File | Role |
|-----------|------|------|
| Classic workspace | `pages/ClassicWorkspace.tsx` | Split fields + editor + analysis flow. |
| One-input workspace | `pages/OneInputWorkspace.tsx` | Single paste + infer + analysis flow. |

## Shared API client

- `client/src/api.ts` — `fetch` helpers for `/api/*` (analyze, status, manual-test, infer-component, etc.).
