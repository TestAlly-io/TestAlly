# Troubleshooting

## Dev: UI loads but API calls fail

- **Run both processes:** `npm run dev` starts Vite and Express. If only Vite runs, `/api` returns 502 or connection errors.
- **Matching ports:** Vite reads `API_PORT` from the repo-root `.env` for the proxy target. Express must listen on that same port (default `3001`).

## `EADDRINUSE` on the API port

Another process (old dev server, Docker, another app) owns the port. Either stop it (`lsof -i :3001`) or set a free `API_PORT` in `.env` and restart `npm run dev`.

## LLM: infer or `/api/health/llm` fails

- **`LLM_API_URL` unset** — Configure in `.env` (see [configuration.md](./configuration.md)).
- **Wrong URL shape** — Prefer `http://host:11434` **or** `http://host:11434/v1`, not paths that duplicate `v1` twice.
- **Model missing** — `LLM_MODEL` must match a model available on the server (`ollama list`, etc.).
- **Firewall / Docker** — From containers, `localhost` is not the host; use `host.docker.internal` or the service name from compose (see [deployment-manual.md](./deployment-manual.md)).

## Vite port already in use (`5173`)

Set `DEV_CLIENT_PORT` in `.env` to a free port, or stop the process using `5173`.

## Tests fail after `npm install`

Some optional native deps (e.g. canvas) may fail to compile on certain Node versions. Try `npm install --ignore-scripts` for local unit tests, or use the Node version in `package.json` `engines` and system libraries required by the failing package.

## Still stuck

Search [GitHub issues](https://github.com/TestAlly-io/TestAlly/issues) or open a new issue with OS, Node version, relevant log lines, and redacted `.env` variable **names** (not values).
