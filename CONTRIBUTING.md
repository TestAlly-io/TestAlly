# Contributing to TestAlly

Thank you for your interest in contributing to TestAlly! This project is an open-source, AI-powered accessibility testing assistant that helps developers bridge the gap between automated scans and manual accessibility audits.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [AI-Assisted Contributions](#ai-assisted-contributions)
- [Commit Convention](#commit-convention)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Project Architecture](#project-architecture)
- [Reporting Issues](#reporting-issues)

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/TestAlly.git
   cd TestAlly
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/<org>/TestAlly.git
   ```

## Development Setup

### Prerequisites

- Node.js 18.17+ or 20 LTS (recommended)
- npm
- Docker (optional, for containerized builds)

### Installation

```bash
npm install
```

### Running Locally

```bash
npm run dev              # Start client + server concurrently
npm run dev:client       # Vite dev server only (port 5173)
npm run dev:server       # Express server only (port 3001, nodemon)
```

The Vite dev server proxies `/api` requests to the Express backend automatically.

### Environment Variables

Copy `.env.example` to `.env` and configure the required API keys:

```
ANTHROPIC_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
```

These keys are never committed to the repository. See `docs/deployment-manual.md` for full environment configuration and `docs/configuration.md` for a concise variable reference.

## How to Contribute

### 1. Find or Create an Issue

- Check existing [issues](../../issues) before starting work
- For bugs, open an issue describing the problem, steps to reproduce, and expected behavior
- For features, open an issue describing the use case and proposed approach
- Wait for maintainer feedback before starting significant work

### 2. Create a Feature Branch

Always branch from `main`:

```bash
git checkout main
git pull upstream main
git checkout -b feat/your-feature-name
```

### 3. Make Your Changes

- Keep changes focused and atomic — one concern per PR
- Follow the [coding standards](#coding-standards) below
- Add or update tests for any changed behavior
- Update documentation if your change affects public APIs or user-facing behavior

### 4. Submit a Pull Request

Push your branch to your fork and open a PR against `main`:

```bash
git push origin feat/your-feature-name
```

Then open a pull request on GitHub.

## Pull Request Process

All contributions must go through a pull request. Direct pushes to `main` are not allowed.

### PR Requirements

- **Descriptive title** summarizing the change
- **Description** explaining what was changed and why
- **Linked issue** (if applicable) using `Closes #123` or `Relates to #123`
- **Passing CI checks** — linting, tests, and build must pass
- **Test coverage** — new code must be covered by tests (project target: >= 97%)
- **Review approval** — at least one maintainer must approve before merge

### PR Description Template

```markdown
## What

Brief description of the change.

## Why

Context on why this change is needed.

## How

High-level summary of the approach.

## Testing

How you verified this works (manual steps, new tests, etc.).
```

## AI-Assisted Contributions

We welcome contributions that use AI tools (GitHub Copilot, Claude, ChatGPT, etc.) to assist with development. However, **transparency is required**.

### Disclosure Rule

If AI was used in writing any part of your contribution (code, documentation, tests, commit messages), you **must** include a `Co-Authored-By` trailer in the relevant commit messages:

```
Co-Authored-By: Claude <noreply@anthropic.com>
```

```
Co-Authored-By: GitHub Copilot <noreply@github.com>
```

```
Co-Authored-By: ChatGPT <noreply@openai.com>
```

Use the appropriate trailer for whichever AI tool(s) you used. This can be added to individual commits — it does not need to be on every commit if only some were AI-assisted.

### Why We Require This

- **Transparency** — reviewers should know when AI generated code so they can review accordingly
- **Accountability** — the human contributor remains responsible for the correctness, security, and quality of all submitted code regardless of how it was produced
- **Trust** — as an accessibility tool, our users depend on vetted, reliable output; knowing the provenance of contributions is part of maintaining that trust

### Your Responsibility

AI-generated code must meet the same standards as hand-written code. You are expected to:

- Review and understand all AI-generated code before committing
- Verify that it passes all tests and linting
- Ensure it does not introduce security vulnerabilities
- Confirm it follows the project's coding standards

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

<optional body>

<optional footer(s)>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `style` | Code style changes (formatting, semicolons, etc.) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, or dependency changes |
| `perf` | Performance improvement |

### Scope (optional)

Use the area of the codebase affected: `client`, `server`, `analysis`, `llm`, `wcag`, `custom-rules`, `docs`.

### Examples

```
feat(analysis): add focus ring removal detector

fix(server): handle empty code field in /api/analyze

docs: update API endpoint documentation

test(llm): add validation LLM confidence scoring tests

chore: upgrade axe-core to 4.10.x
```

## Coding Standards

### TypeScript

- **Strict mode** is enabled — do not use `any` unless absolutely necessary
- Use explicit return types on exported functions
- Prefer `interface` over `type` for object shapes
- Use `readonly` where mutation is not intended

### General

- Use meaningful variable and function names
- Keep functions small and focused
- No commented-out code in PRs — use version control for history
- Accessibility is not optional — if you are building UI, it must be accessible

### Linting

```bash
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix where possible
```

All code must pass linting with zero errors before a PR will be reviewed.

## Testing

### Running Tests

```bash
npm run test           # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Generate coverage report
npm run test:e2e       # End-to-end tests
```

### Test Expectations

- **Coverage target**: >= 97% line and branch coverage
- Every new feature or bug fix must include corresponding tests
- Use Vitest for unit tests and React Testing Library for component tests
- Test behavior, not implementation details
- Name test files with `.test.ts` or `.test.tsx` suffix, co-located with source files

## Project Architecture

Understanding the architecture helps you contribute effectively. See `docs/technical-specification.md` for the full specification.

### Key Directories

```
client/              # Vite + React SPA
  src/pages/         # Page components
  src/components/    # Reusable UI components
server/              # Express.js backend
  src/routes/        # API endpoint handlers
  src/middleware/     # CORS, rate limiting, validation
  src/lib/
    analysis/        # Static analysis (axe-core, ESLint, custom rules)
    analyzer/        # Pattern, CSS, event, and ARIA analysis
    llm/             # LangChain orchestrator and LLM providers
    wcag/            # WCAG knowledge base (JSON/YAML)
docs/                # Project documentation
```

### Analysis Pipeline

The core of TestAlly is an async state machine pipeline:

```
SUBMIT -> LINT -> ANALYZE -> GENERATE -> VALIDATE -> COMPLETE
```

- **LINT**: ESLint a11y checks on source code
- **ANALYZE**: AI planning agent runs analysis tools (axe-core, custom rules, pattern/CSS/ARIA detection)
- **GENERATE**: Primary LLM produces ITTT manual testing walkthrough
- **VALIDATE**: Validation LLM cross-checks for accuracy and scores confidence

Jobs are asynchronous — the API returns a job ID and the client polls for progress.

### Custom Rules

MVP includes two custom detectors. If you want to add a new custom rule:

1. **Link-as-Button Detector** (reference implementation) — `<a>` without `href` but with `onClick`
2. **Focus Ring Removal Detector** (reference implementation) — CSS `outline: none` without visible replacement

New rules should follow the same pattern: trigger condition, WCAG reference, fix guidance, and manual test instruction.

## Reporting Issues

### Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/OS/Node.js version
- Component code that triggered the issue (if applicable)

### Feature Requests

Include:
- The use case or problem you are trying to solve
- Your proposed solution (if any)
- How it aligns with the project's goal of bridging the manual accessibility testing gap

## License

By contributing to TestAlly, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Questions? Open an issue or start a discussion. We appreciate every contribution that helps make the web more accessible.
