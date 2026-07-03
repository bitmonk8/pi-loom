# `H7b` — Committed `.loom` fixture parse gate

**Convention.** [`conventions.md`](./conventions.md) — *Per-phase TDD ritual* (test-corpus hygiene) and the [`H7a`](./H7a-integration-acceptance.md) integration-acceptance fixture obligation.

**Adds.** A mechanical gate that every committed `.loom` fixture the repository ships — at minimum [`H7a`](./H7a-integration-acceptance.md)'s `tests/fixtures/h7a/acceptance.loom` and any `.pi/looms/*.loom` — parses cleanly through the real lexer/parser (`lexLoom` → `parseLoomDocument`) with **zero** load/parse diagnostics. This closes the coverage gap the manual real-host smoke surfaced: `H7a`'s in-process double models the composed pipeline and never lexes/parses the committed fixture text, so an invalid fixture (the fixture used `#` comments, which loom does not recognise — loom comments are `//` / `///`) shipped green until it was driven against a real host. See [`../../notes.md`](../../notes.md) (2026-07-02 smoke findings). This is an infrastructure gate closing no spec REQ-ID.

**Tests.**
- `Convention:` (*Per-phase TDD ritual* — test-corpus hygiene) `npm test` walks the committed `.loom` fixtures, runs each through `lexLoom` then `parseLoomDocument`, and asserts each yields zero load/parse diagnostics; the gate reddens if a committed fixture is not a valid `.loom` (asserted by a seeded invalid fixture that is expected to redden, then excluded from the shipped set).

**Deps.** `H7a`

**Ships when.** `npm test` includes a passing assertion that every committed `.loom` fixture parses with zero diagnostics, and a seeded-invalid case confirms the gate reddens on a malformed fixture.
