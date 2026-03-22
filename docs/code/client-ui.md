# Client UI structure

Generated from `client/src/` (Vite + React).

## Bootstrap

- `main.tsx` — React root, router provider.
- `App.tsx` — Route `/` → `AppShell`.

## Shell

- `layout/AppShell.tsx` — Header and workspace. Some builds show only Classic (Overview) and omit the One input / Chat tabs.
- **Tabs (when enabled):** `overview` → `ClassicWorkspace`, `oneInput` → `OneInputWorkspace`, `chat` → `ChatWorkspace`.

## Pages

| Component | File | Role |
|-----------|------|------|
| Classic workspace | `pages/ClassicWorkspace.tsx` | Split fields + editor + analysis flow. |
| One-input workspace | `pages/OneInputWorkspace.tsx` | Single paste + infer + analysis flow. |
| Chat workspace | `pages/ChatWorkspace.tsx` | Conversational draft + analyze (hidden in overview-only shell). |

## Shared API client

- `client/src/api.ts` — `fetch` helpers for `/api/*` (analyze, status, manual-test, infer-component, etc.).
