# Phase D — fix plan

Orchestrator-authored, from the Phase-C findings across S1–S7. Findings converge on a
small set of genuine loom-defects plus a larger set of test/fixture artifacts.

## Aggregated findings ledger

### Loom-defects (require `src/**` change)

Group A — closed diagnostic registry not honoured (DIAG-2: registry is closed, triggers
normative). Codes present in the Reference registry, absent from `src/**`, do not fire on
their documented trigger. Confirmed independently by S1 and S4.

| ID | Code | Sev/Phase | Finding | Nature |
|---|---|---|---|---|
| A1 | `loom/parse/unknown-identifier` | E/parse | S1-1, S4-1 | scope resolution (structural) |
| A2 | `loom/parse/unknown-method` | E/parse | S1-2, S4-2 | receiver-type method check (type layer) |
| A3 | `loom/parse/extra-object-field` + `missing-object-field` | E/parse | S1-3, S4-5 | `checkObjectLiteralFields` implemented but never called in body position (wiring) |
| A4 | `loom/parse/bare-object-literal` | E/parse | S1-4, S4-6 | schemaless `{…}` in expr position (structural) |
| A5 | `loom/parse/mixed-plus-operands` | E/type | S1-5, S4-3 | `+` mixed operands (type layer) |
| A6 | `loom/parse/non-orderable-operands` | E/type | S1-6, S4-4 | `< <= > >=` non-orderable (type layer) |
| A7 | `loom/parse/bind-echo-on-bypass` | W/parse | S4-7 | advisory (frontmatter shape) |
| A8 | `loom/load/bind-echo-without-params` | W/load | S4-8, S2-2 | advisory (frontmatter shape) |
| A9 | `loom/load/argument-hint-not-displayed` | W/load | S4-9, S2-3 | advisory (frontmatter shape) |
| A10 | `loom/load/deferred-frontmatter-field` | W/load | S4-10, S2-1 | reserved-field set absent; reserved fields wrongly coded `unknown-frontmatter-field` |

Group B — parser correctness:

| ID | Finding | Nature | Severity |
|---|---|---|---|
| B1 | S7-1 | schema object body with newline-separated (comma-missing) fields silently coalesces two fields into one malformed field, no diagnostic. Grammar (`grammar.md:225`) requires `Field ("," Field)*`. Silent data-shape corruption of typed-query/params/invoke-return schemas. | blocks-spec-compliance |
| B2 | S1-7 | unparenthesised `fn f x { … }` silently accepted (grammar requires parenthesised param list). | partial |
| B3 | S1-8 | stray non-grammar punctuation (`;`, stray char in statement position) silently swallowed. | partial |

Group C — extension wiring:

| ID | Finding | Nature | Severity |
|---|---|---|---|
| C1 | S6-1 | loom top-level `description:` (and `///` lowering) dropped at `pi.registerCommand`; `production-composition.ts:533` spreads `{...composedInput, run}` and omits `description`; factory reads `fixture.description` = undefined. Violates REQ-PIC-31. Single-line fix. | partial |

### Test/fixture artifacts (fix `tests/**`, NOT `src/**`)

| ID | Finding | Fix |
|---|---|---|
| D1 | S3-2 / S7-3 | live H8a typed-query test `JSON.parse`s the whole two-turn prompt stream. Assert the bound typed value structurally, or drive a single-typed-turn loom. |
| D2 | S7-4 (CAND-2) | acceptance (d) asserts the `bind_echo` note on `pi -p` stdout; it is emitted on the `loom-system-note` channel. Observe the correct channel. |
| D3 | S7-5 | ~24 hardening probes read `probe.diagnostics` (empty since V4e) instead of `probe.systemNotes`. Repoint to `probe.systemNotes`. Files: `discovery-cli`, `frontmatter-diagnostics`, `imports-resolution`, `invoke-parse-load`, `invoke-runtime-ceilings`. |
| D4 | S7-6 | acceptance fixtures use a non-language `respond` construct (parses as bare undefined ident + expr). Rewrite to a final query. NOTE: after A1 lands, bare `respond` will (correctly) emit `unknown-identifier` — these fixtures MUST be rewritten. |
| D5 | S7-2 | `acc-typed-named.loom` schema fields not comma-separated. After B1 lands this becomes a load error; add the missing comma. |
| D6 | S7-7 | hardening `invoke-runtime-ceilings` INV-9 asserts pre-fix (buggy) prompt→prompt non-attachment; runtime now correctly attaches (matches passing `session-invoke-attach`). Invert or delete INV-9. |
| D7 | S1/S2/S4/S5 | the `it.fails`/red witness tests authored in Phase C (`tests/e2e-s1-*`, `e2e-s2-advisory-diagnostics`, `e2e-s4-never-emitted-diagnostics`, `e2e-s5-invoke-untyped-style`) flip to green/hard-fail once the src fixes land — convert `it.fails`→`it` and un-skip the red assertions. |

### Borderline — investigate, then fix-or-accept (document verdict)

| ID | Finding | Disposition |
|---|---|---|
| E1 | S7-8 | `looms.binderModel` provider-qualified id (`anthropic/claude-haiku-4.5`) not resolved for binder. Investigate settings resolution; fix if a real resolution bug, else document expected id format. |
| E2 | S7-9 | benign teardown race: reload debounced past dispose emits through stale `ctx.ui` → `registry-swap-failed` log noise. Add post-dispose guard if cheap; else accept as cosmetic. |
| E3 | S4-11 | dead retired constant `RUNTIME_DEGRADED_CODE` for a retired code. Remove dead surface (cosmetic hygiene) or accept. |
| E4 | S5-1 | `InvokeExpr` lacks a `style` discriminator (INV-20). Forward-compat only (INV-2 seam is deferred). Accept/defer. |
| E5 | S3-3..7, S4-12 | in-scope coverage gaps (no defect). Add tests if cheap; else record as accepted coverage debt. |

## Execution order & delegation

Fixes touch disjoint modules → parallelisable, then a serial retest gate.

- **FIX-1 (parser structural)** — `src/parser/loom-document.ts`, `literal-sublanguage.ts`,
  `src/lexer/lexer.ts`: B1, A3, A4, A1, B2, B3. One worker (single module owner; avoids
  loom-document.ts edit conflicts).
- **FIX-2 (type layer)** — `src/parser/type-layer-checks.ts` (+ inference helpers): A2,
  A5, A6. Fire ONLY when operand/receiver types are statically resolvable (mirror the
  existing partial-type-layer pattern; defer unknowns to runtime — no false positives on
  valid looms). One worker.
- **FIX-3 (frontmatter advisory)** — `src/parser/frontmatter.ts`: A7, A8, A9, A10
  (add a reserved/deferred-field set). One worker.
- **FIX-4 (extension wiring)** — `src/extension/production-composition.ts`: C1. One worker.
- **FIX-5 (tests/fixtures)** — D1–D7 + borderline E1–E5 investigation. Runs AFTER
  FIX-1..4 land (D4/D5/D7 depend on the new diagnostics). One+ workers.

## Gates

- Every src-fix worker MUST run `npm run typecheck` + the full `npm test` after its
  change and drive it green. A pre-existing test going red is either (a) a genuine
  regression → fix the check, or (b) a fixture that is itself malformed per spec → fix
  the fixture and note it. NEVER weaken a legitimate assertion to hide a real diagnostic.
- No false-positive budget: the new diagnostics must not fire on any valid committed
  fixture (the `committed-fixture-parse-gate` guards this).
- After all fixes: Phase E retest (§ test-plan §7) — default + conformance green; live/
  acceptance/hardening green modulo triaged provider-infra; README known-gap disclaimer
  reconciled with the now-closed diagnostics.
