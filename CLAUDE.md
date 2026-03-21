# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TestAlly is an AI-powered accessibility testing assistant that generates per-component manual WCAG compliance testing walkthroughs. It combines static analysis (axe-core, ESLint a11y, custom rules) with LLM-generated guidance in an If-This-Then-That (ITTT) step format. A secondary LLM pass validates output accuracy and returns a confidence score.

**Status**: Early implementation — the monorepo scaffold is in place (`client/` Vite + React placeholder, `server/` Express with `GET /api/health`). The analysis pipeline, LLM layers, and WCAG tooling described in `docs/` are not built yet.

## Planned Tech Stack

- **Language**: TypeScript (strict mode) across client and server
- **Frontend**: Vite + React SPA, CSS Modules, Monaco Editor or CodeMirror 6
- **Backend**: Express.js (Node.js 18.17+ / 20 LTS recommended)
- **Testing**: Vitest + React Testing Library (coverage target: ≥97%)
- **LLM**: LangChain.js for orchestration; models configured per deployment (Anthropic, OpenAI, etc.)
- **Static Analysis**: axe-core 4.x, eslint-plugin-jsx-a11y, PostCSS/css-tree, htmlparser2/parse5
- **Prompt Evaluation**: LangSmith + Promptfoo
- **Containerization**: Docker (multi-stage builds)

## Development Commands (from deployment spec)

```bash
npm run dev              # Start client + server concurrently
npm run dev:client       # Vite dev server (port 5173)
npm run dev:server       # Express server (port 3001, nodemon)
npm run test             # Unit tests (Vitest)
npm run test:watch       # Tests in watch mode
npm run test:coverage    # Coverage report
npm run test:e2e         # End-to-end tests
npm run build            # Build client + server
npm start                # Run production build
```

Vite proxies `/api` requests to Express during development.

## Architecture

### Analysis Pipeline (State Machine)

Jobs are async — `POST /api/analyze` returns a job ID (HTTP 202), client polls `/api/status/:jobId`, results at `/api/manual-test/:jobId`.

```
SUBMIT → LINT → [BUILD* → RENDER*] → ANALYZE → GENERATE → VALIDATE → COMPLETE
                 (* post-MVP)
```

- **LINT**: ESLint a11y on source. MVP: errors/warnings passed downstream. Post-MVP: hard gate.
- **ANALYZE**: Agentic phase — Planning Agent decides which tools to run (axe-core, custom rules, pattern/event/CSS/ARIA analysis). Uses LangChain tool-use interface.
- **GENERATE**: Primary LLM produces ITTT walkthrough with WCAG citations.
- **VALIDATE**: Validation LLM cross-checks accuracy, returns confidence score. Can loop back to ANALYZE (max 2 iterations).

### Workspace Structure

```
client/          # Vite + React SPA
  src/pages/     # ClassicWorkspace.tsx (multi-field), OneInputWorkspace.tsx (single paste)
 src/layout/    # AppShell.tsx — Overview = ClassicWorkspace, One input = OneInputWorkspace
  src/components/# CodeEditor, ResultsPanel, ManualTestCard
server/          # Express.js backend
  src/routes/    # API endpoints
  src/middleware/ # CORS, rate limiting, input validation
  src/lib/
    analysis/    # axe-core, ESLint, custom rules
    analyzer/    # Pattern detection, CSS/event/ARIA analysis
    llm/         # LangChain orchestrator, provider adapters
    wcag/        # WCAG knowledge base (JSON/YAML, loaded at startup)
docs/
  manual-testing-reference.md  # RAG source: per-component ITTT testing walkthroughs
```

### LLM Configuration

Provider API keys are configured via env vars (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`). Model selection and role assignment (generation, validation, planning agent) are decided in code. No runtime failover — prompts are model-specific.

### Custom Rules (MVP)

1. **Link-as-Button Detector**: `<a>` without `href` but with `onClick` → SC 4.1.2
2. **Focus Ring Removal Detector**: CSS `outline: none/0` without visible replacement → SC 2.4.7

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/analyze` | POST | Submit component for analysis (returns job ID) |
| `/api/status/:jobId` | GET | Poll job progress |
| `/api/manual-test/:jobId` | GET | Retrieve completed walkthrough |
| `/api/health` | GET | Health check |

### Security Model (MVP)

- All code is parsed, never executed (static analysis only)
- Input isolated in structured prompt templates (prompt injection mitigation)
- No data persistence — results returned and discarded
- Rate limiting: 20 req/min on `/analyze`, 60 req/min on other endpoints (per IP)
- Max input size: 50KB per field

## Key Documentation

- `docs/technical-specification.md` — Full architecture, API spec, data flow, custom rules
- `docs/deployment-manual.md` — Setup, env config, Docker deployment, monitoring
- `docs/user-guide.md` — End-user testing workflows
- `docs/initial-pitch.md` — Project vision, MVP scope, SWOT analysis
