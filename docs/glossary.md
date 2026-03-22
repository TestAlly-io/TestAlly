# Glossary

Quick reference for **concepts and tools** referenced across TestAlly documentation (`docs/`, `CONTRIBUTING.md`, `CLAUDE.md`). For behavior and architecture, see [technical-specification.md](./technical-specification.md).

| Term | Description |
|------|-------------|
| [Anthropic](#anthropic) | Claude LLM provider (API key via env) |
| [ARIA](#aria) | Accessible Rich Internet Applications — roles/states for assistive tech |
| [axe-core](#axe-core) | Automated accessibility testing engine |
| [CodeMirror](#codemirror) | Extensible browser code editor (v6) |
| [concurrently](#concurrently) | Run multiple npm scripts in parallel |
| [CORS](#cors) | Cross-Origin Resource Sharing — browser + Express origin policy |
| [CSS Modules](#css-modules) | Scoped CSS files co-located with components (Vite built-in) |
| [css-tree](#css-tree) | CSS parser and AST toolkit |
| [Docker](#docker) | Container images and Compose for dev/prod |
| [ESLint](#eslint) | JS/TS static analysis |
| [eslint-plugin-jsx-a11y](#eslint-plugin-jsx-a11y) | ESLint rules for JSX accessibility |
| [Express.js](#expressjs) | Node HTTP API framework used by the server |
| [htmlparser2](#htmlparser2) | Fast HTML/XML parser for Node |
| [ITTT](#ittt) | If-This-Then-That step format for manual test walkthroughs |
| [jsdom](#jsdom) | DOM/HTML simulation in Node (tests / analysis) |
| [LangChain.js](#langchainjs) | LLM orchestration, tools, prompts (TypeScript) |
| [LangSmith](#langsmith) | LangChain observability and prompt evaluation |
| [LLM](#llm) | Large language model — generation and validation passes |
| [Monaco Editor](#monaco-editor) | VS Code–engine browser editor (alternative to CodeMirror) |
| [nodemon](#nodemon) | Restarts the Node dev server when files change |
| [Ollama](#ollama) | Local OpenAI-compatible model server |
| [OpenAI](#openai) | GPT-family provider (API key via env) |
| [OpenAI-compatible API](#openai-compatible-api) | REST shape (`/v1/chat/completions`, etc.) used by Ollama and gateways |
| [parse5](#parse5) | HTML5 parser (alternative/complement to htmlparser2) |
| [PostCSS](#postcss) | CSS tooling pipeline (parsing/transform plugins) |
| [Prettier](#prettier) | Opinionated code formatter |
| [Promptfoo](#promptfoo) | Open-source prompt regression / eval (offline-friendly) |
| [RAG](#rag) | Retrieval-Augmented Generation — knowledge base text injected into LLM context |
| [Rate limiting](#rate-limiting) | Per-IP request caps on API routes (tunable via env) |
| [React](#react) | UI library for the client SPA |
| [React Router](#react-router) | Client-side routing for the SPA |
| [React Testing Library](#react-testing-library) | User-centric component tests (with Vitest) |
| [SPA](#spa) | Single-page application (client-side routing) |
| [supertest](#supertest) | HTTP assertion library for Express integration tests |
| [TestAlly](#testally) | This product — AI-assisted accessibility testing assistant |
| [tsx](#tsx) | Run TypeScript on Node without a separate compile step (dev server) |
| [TypeScript](#typescript) | Typed JavaScript used across client and server |
| [Vite](#vite) | Frontend dev server and build tool |
| [Vitest](#vitest) | Vite-native unit/integration test runner |
| [WCAG](#wcag) | Web Content Accessibility Guidelines |
| [Zod](#zod) | TypeScript-first schema validation |

---

## Anthropic

**[Anthropic](https://www.anthropic.com/)** provides Claude models. TestAlly may use `ANTHROPIC_API_KEY` (or role-specific keys in advanced setups) for LLM-backed features. See [configuration.md](./configuration.md) and [deployment-manual.md](./deployment-manual.md).

---

## ARIA

**[WAI-ARIA](https://www.w3.org/WAI/standards-guidelines/aria/)** (Accessible Rich Internet Applications) defines roles, states, and properties that make dynamic web content and custom controls understandable to assistive technologies. Referenced in component analysis and [accessibility.md](./accessibility.md).

---

## axe-core

**[axe-core](https://github.com/dequelabs/axe-core)** (by Deque Systems) is an accessibility testing engine. It runs automated WCAG-oriented checks against markup and returns violations with remediation hints. Used in the static analysis layer described in the [technical specification](./technical-specification.md).

---

## CodeMirror

**[CodeMirror](https://codemirror.net/)** (version 6) is a modular code editor for the web — syntax highlighting, keymaps, and extensions. One option for the component source editor in the UI (see also [Monaco Editor](#monaco-editor)).

---

## concurrently

**[concurrently](https://github.com/open-cli-tools/concurrently)** runs multiple npm scripts in one terminal (e.g. Vite + Express via `npm run dev`).

---

## CORS

**Cross-Origin Resource Sharing** controls which browser origins may call the API or load assets. Express configures allowed origins (often tied to `APP_URL` / deployment host). See [deployment-manual.md](./deployment-manual.md#82-cors-configuration).

---

## CSS Modules

**CSS Modules** scope class names per file so component styles do not leak globally. Vite supports them without extra plugins; see [technical-specification.md](./technical-specification.md).

---

## css-tree

**[css-tree](https://github.com/csstree/csstree)** parses CSS into an AST for programmatic analysis (e.g. focus styles, properties).

---

## Docker

**[Docker](https://www.docker.com/)** packages the app into images; Compose stacks run client + server for local or deployed environments. See [deployment-manual.md](./deployment-manual.md) and [planning/002-docker-setup.md](./planning/002-docker-setup.md).

---

## ESLint

**[ESLint](https://eslint.org/)** analyzes JavaScript/TypeScript for correctness and style. Paired with [eslint-plugin-jsx-a11y](#eslint-plugin-jsx-a11y) for accessibility rules on JSX.

---

## eslint-plugin-jsx-a11y

**[eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)** adds ESLint rules that catch common accessibility mistakes in JSX (labels, roles, alt text, etc.).

---

## Express.js

**[Express](https://expressjs.com/)** is the Node.js HTTP framework for TestAlly’s API (`/api/*`), static file serving in production, and middleware (CORS, JSON, rate limits as implemented).

---

## htmlparser2

**[htmlparser2](https://github.com/fb55/htmlparser2)** is a fast, forgiving HTML/XML parser with a streaming API, suitable for analyzing component markup without a browser.

---

## ITTT

**If-This-Then-That** — the structured manual testing format TestAlly targets: conditional steps (“if focus moves here, then expect …”). Walkthroughs cite [WCAG](#wcag) success criteria. See [manual-testing-reference.md](./manual-testing-reference.md).

---

## jsdom

**[jsdom](https://github.com/jsdom/jsdom)** implements DOM and HTML standards in Node.js so browser-oriented APIs can run in tests or server-side analysis without a real browser.

---

## LangChain.js

**[LangChain.js](https://js.langchain.com/)** provides abstractions for LLM prompts, structured output, tool calling, and multi-step agents — used for the orchestration layer in the technical design.

---

## LangSmith

**[LangSmith](https://smith.langchain.com/)** is LangChain’s platform for tracing, datasets, and evaluating prompts in development and CI. Mentioned in the [technical specification](./technical-specification.md) for prompt quality work.

---

## LLM

**Large language model** — in TestAlly, models that (1) help generate manual test walkthroughs, (2) validate or score outputs, and/or (3) power auxiliary flows such as paste inference. Configured via env and HTTP APIs ([OpenAI-compatible API](#openai-compatible-api)). See [configuration.md](./configuration.md).

---

## Monaco Editor

**[Monaco Editor](https://microsoft.github.io/monaco-editor/)** powers VS Code’s editor in the browser; an alternative to [CodeMirror](#codemirror) for the component code input surface.

---

## nodemon

**[nodemon](https://nodemon.io/)** watches the server tree and restarts Node when sources change — typical for `npm run dev:server` in development. See [technical-specification.md](./technical-specification.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## Ollama

**[Ollama](https://ollama.com/)** runs LLMs locally with an **OpenAI-compatible** HTTP API, often at `http://localhost:11434`. Common for dev with `LLM_API_URL`. See [troubleshooting.md](./troubleshooting.md).

---

## OpenAI

**[OpenAI](https://platform.openai.com/)** provides GPT-family models. `OPENAI_API_KEY` (or role-specific keys) may supply credentials for LLM features.

---

## OpenAI-compatible API

Many gateways (including **Ollama**, LM Studio, vLLM) expose endpoints shaped like OpenAI’s REST API (`/v1/chat/completions`, `/v1/models`). TestAlly’s raw `fetch` paths assume this shape when using `LLM_API_URL`.

---

## parse5

**[parse5](https://github.com/inikulin/parse5)** is an HTML5-compliant parser; listed in the tech spec as an alternative to [htmlparser2](#htmlparser2) for DOM-like analysis.

---

## PostCSS

**[PostCSS](https://postcss.org/)** is a tool for transforming CSS with plugins; cited in the tech spec for CSS parsing pipelines alongside [css-tree](#css-tree).

---

## Prettier

**[Prettier](https://prettier.io/)** formats JS/TS/CSS/MD consistently; use via `npm run format`.

---

## Promptfoo

**[Promptfoo](https://www.promptfoo.dev/)** is an open-source tool for versioned prompt tests and regression checks, useful when [LangSmith](#langsmith) is not desired offline.

---

## RAG

**Retrieval-Augmented Generation** — supplying relevant documents (e.g. WCAG criteria, [manual-testing-reference.md](./manual-testing-reference.md)) into the LLM prompt so answers stay grounded. Described in [technical-specification.md](./technical-specification.md).

---

## Rate limiting

Express middleware caps requests per IP (e.g. stricter limits on `/api/analyze`). Defaults and env tunables are documented in [deployment-manual.md](./deployment-manual.md) and [configuration.md](./configuration.md).

---

## React

**[React](https://react.dev/)** implements the client UI (shell, workspaces, results). Works with Vite and [CSS Modules](#css-modules).

---

## React Router

**[React Router](https://reactrouter.com/)** maps URLs to React views in the [SPA](#spa). The deployment manual references the root `App` + route layout.

---

## React Testing Library

**[React Testing Library](https://testing-library.com/react)** encourages tests that resemble user behavior (queries by role/label). Used with [Vitest](#vitest) for `*.test.tsx` files; see [testing.md](./testing.md).

---

## SPA

**Single-page application** — one HTML shell with client-side routing; the production server typically serves `index.html` for non-API routes. See [architecture-overview.md](./architecture-overview.md).

---

## supertest

**[supertest](https://github.com/ladjs/supertest)** attaches to an Express app (in memory) and asserts on HTTP responses — standard for API route tests. See [testing.md](./testing.md).

---

## TestAlly

**TestAlly** is an AI-assisted accessibility testing assistant: static checks plus LLM-generated, WCAG-cited manual walkthroughs for components. This repository implements the app and documentation you are reading.

---

## tsx

**[tsx](https://github.com/privatenumber/tsx)** executes TypeScript directly on Node (ESM/CJS), common in `nodemon --exec tsx` dev setups for the server without pre-building.

---

## TypeScript

**[TypeScript](https://www.typescriptlang.org/)** adds static types to JavaScript; used across `client/` and `server/` with shared conventions. Run `tsc` via workspace builds.

---

## Vite

**[Vite](https://vitejs.dev/)** dev server, HMR, and Rollup-based production builds for the React client. Proxies `/api` to Express in development.

---

## Vitest

**[Vitest](https://vitest.dev/)** is the unit/integration test runner (`npm test`), aligned with Vite’s pipeline. See [testing.md](./testing.md).

---

## WCAG

**[Web Content Accessibility Guidelines](https://www.w3.org/WAI/standards-guidelines/wcag/)** — international standards (2.x) for accessible web content. TestAlly ties manual steps and automation findings to WCAG success criteria.

---

## Zod

**[Zod](https://zod.dev/)** defines runtime schemas that infer TypeScript types — useful for validating API payloads and LLM structured output where adopted.

---

## Related documentation

- [Documentation index](./README.md) — all top-level guides
- [Architecture overview](./architecture-overview.md) — system map
- [Configuration](./configuration.md) — environment variables
- [API contracts](./api-contracts.md) — `/api` JSON shapes
- [Troubleshooting](./troubleshooting.md) — common dev issues
