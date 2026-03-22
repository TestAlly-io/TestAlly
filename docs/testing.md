# Testing

## Commands

| Command | Purpose |
|---------|---------|
| `npm test` | Vitest — unit/integration suites (default config) |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | Coverage report (`@vitest/coverage-v8`) |
| `npm run test:e2e` | E2E config when present (`vitest.e2e.config.ts`) |
| `npm run lint` | ESLint across the repo |
| `npm run format` | Prettier write |

See also **[../CONTRIBUTING.md](../CONTRIBUTING.md)** (testing and standards).

## Layout

- **Client** — `client/src/**/*.test.tsx` (React Testing Library).
- **Server** — `server/src/**/*.test.ts` (Node, supertest for HTTP where used).
- **Root Vitest** — Workspace config discovers tests under `client/` and `server/`.

## Writing API tests

When adding Express routes, prefer tests that hit the mounted app with **supertest** (see `server/src/app.test.ts` if present) so JSON contracts stay aligned with [api-contracts.md](./api-contracts.md).

## Coverage

The project may target high coverage over time (see `CLAUDE.md` / technical spec). Run `npm run test:coverage` before large merges when practical.
