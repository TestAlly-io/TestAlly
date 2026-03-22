# Release checklist

Use before tagging a release or publishing a Docker image. Adjust for your branching model (`master` vs `main`).

## Pre-release

- [ ] **Default branch green** — CI (if enabled) passes; locally: `npm run lint`, `npm test`, `npm run build`.
- [ ] **Version** — Bump `version` in root `package.json` (and lock/workspace packages if you version them independently).
- [ ] **Changelog** — Add entries under `CHANGELOG.md` or the GitHub Releases notes (features, fixes, breaking changes).
- [ ] **Docs** — Update [user-guide.md](./user-guide.md), [configuration.md](./configuration.md), or [deployment-manual.md](./deployment-manual.md) if behavior or env vars changed.
- [ ] **Security** — No secrets in the diff; `.env` remains gitignored.

## Build & smoke

- [ ] `npm run build` — Client and server artifacts land under `build/` (or paths in `Dockerfile`).
- [ ] `npm start` — Brief smoke: `GET /api/health`, load UI in browser.
- [ ] **Docker** (if you ship images) — `docker compose build` / prod compose per [deployment-manual.md](./deployment-manual.md).

## Publish

- [ ] **Tag** — `git tag vX.Y.Z` on the release commit; push tags.
- [ ] **Release notes** — GitHub Release (or equivalent) with upgrade notes and migration steps.
- [ ] **Deploy** — Run your environment’s promotion steps (staging → production).
