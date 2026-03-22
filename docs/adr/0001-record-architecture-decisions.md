# ADR 0001: Record architecture decisions

## Status

Accepted

## Context

TestAlly spans frontend, backend, LLM, and analysis pipelines. Decisions buried only in PR threads or chat are easy to lose.

## Decision

Use this `docs/adr/` folder and the naming convention `NNNN-title.md` to record significant architectural choices.

## Consequences

- New contributors can read **why** something is the way it is.
- Outdated ADRs can be superseded by a new ADR that references the old one instead of rewriting history.

## Template for new ADRs

```markdown
# ADR NNNN: Title

## Status

Proposed | Accepted | Superseded by ADR-XXXX

## Context

What problem or forces led to this?

## Decision

What we chose.

## Consequences

Trade-offs, follow-ups, and risks.
```
