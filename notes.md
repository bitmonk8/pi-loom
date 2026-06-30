# Implementation notes (non-plan discoveries)

Free-form running log of discoveries that are not plan changes.

## 2026-06-30 — H2a cross-cutting gates

- **Custom ESLint rules vs stock `no-restricted-syntax`.** The plan's `Adds.`
  prose for H2a names `no-restricted-syntax` for the sequential-by-default and
  blocking-runtime checks. Stock `no-restricted-syntax` cannot consult a
  flagged node's *own source line* for an allow comment, which the leaf's
  binding Tests bullets require (a `// allow:` / `// allow-sync:` /
  `// allow-broad-catch:` comment on the same line makes the otherwise-flagged
  construct pass). The three gates are therefore implemented as custom
  comment-keyed rules in `eslint-plugin-loom-local`
  (`no-broad-catch`, `no-unguarded-promise-combinator`, `no-blocking-sync`).
  `Adds.` is descriptive (Class-3, illustrative); the comment-keyed pass/fail
  behaviour is the binding obligation, and a custom rule is the faithful way
  to provide it. Logged as a divergence in `.pi/impl-progress/decisions.jsonl`.
- **H2a `no-broad-catch` checks comment presence only.** Per the conventions.md
  enforcement posture, the H2a lint verifies only that an exempt site carries a
  `// allow-broad-catch: <token>` comment with a non-empty token; resolving the
  cited token against `coverage-matrix.md` is the loom 1.0 closing gate's job
  (H5c), not this rule's.
- **`npm run lint` uses `--no-error-on-unmatched-pattern`** so the script is
  green while `src/` is still empty; later leaves populate `src/**`.
