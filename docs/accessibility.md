# Accessibility (documentation for the TestAlly UI)

TestAlly helps teams test **their** components for accessibility. This page sets expectations for **the application shell** itself.

## Principles

- **Keyboard** — Primary navigation (tabs, forms, dialogs) must be operable without a pointer. Tab order should follow visual order.
- **Semantics** — Use landmarks (`header`, `main`, `nav` where appropriate), correct headings, and `role`/`aria-*` when components emulate native patterns (e.g. tablists).
- **Focus** — Visible focus indicators; no `outline: none` without an accessible replacement.
- **Labels** — Every control has an accessible name (visible label, `aria-label`, or `aria-labelledby`).

## Implementation hints (React)

- Prefer native elements (`button`, `a` with `href`, `input` + `label`) before ARIA-heavy divs.
- For custom tab bars, follow the [ARIA Authoring Practices Guide — Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).
- Run **axe** in CI or locally against key views when the stack supports it (see [glossary.md](./glossary.md) — axe-core).

## Content

- User-visible strings should remain understandable without relying on color alone (see WCAG 1.4.1).
- Error messages should be exposed to assistive tech (`role="alert"` or live regions where appropriate).

## Related docs

- [manual-testing-reference.md](./manual-testing-reference.md) — ITTT-style manual test thinking
- [user-guide.md](./user-guide.md) — End-user flows
