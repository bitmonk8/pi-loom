# FIX-5a — campaign witness reconciliation (D7) — results

Tests-only. No `src/**` touched. Reconciles the Phase-C witness tests that
asserted the OLD (pre-fix) behaviour or used `it.fails`, now that Phase-D src
fixes (FIX-1 parser structural, FIX-2 type layer, FIX-3 frontmatter advisory,
FIX-4 wiring) have landed and behave per spec.

Starting state: `npx vitest run` showed exactly 17 failures, all in the two
witness files below (10 inverted `it.fails` + 1 characterization in S4;
3 inverted `it.fails` + 3 pre-fix `[observed]` in S2). No genuine regressions.

## Files touched

- `tests/e2e-s4-never-emitted-diagnostics.test.ts`
- `tests/e2e-s2-advisory-diagnostics.test.ts`

No other files edited (S1 and S5 confirmed unchanged — see §Verification).

## S4 — `tests/e2e-s4-never-emitted-diagnostics.test.ts`

Header comment rewritten: these are no longer defect-recording `it.fails`
witnesses; they are permanent POSITIVE gates. Describe block renamed to
"registry codes now emitted (permanent positive gates, D7-reconciled)".

The ten `it.fails(...)` → `it(...)`, each asserting its code now fires on the
documented trigger (codes verbatim per `docs/reference/diagnostics.md`):

| Witness | Code asserted | New state |
|---|---|---|
| unknown-identifier | `loom/parse/unknown-identifier` | `it` (green) |
| unknown-method | `loom/parse/unknown-method` | `it` (green) |
| mixed-plus-operands | `loom/parse/mixed-plus-operands` | `it` (green) |
| non-orderable-operands | `loom/parse/non-orderable-operands` | `it` (green) |
| extra-object-field | `loom/parse/extra-object-field` | `it` (green) |
| bare-object-literal | `loom/parse/bare-object-literal` | `it` (green) |
| bind-echo-on-bypass | `loom/parse/bind-echo-on-bypass` | `it` (green) |
| bind-echo-without-params | `loom/load/bind-echo-without-params` | `it` (green) |
| argument-hint-not-displayed | `loom/load/argument-hint-not-displayed` | `it` (green) |
| deferred-frontmatter-field | `loom/load/deferred-frontmatter-field` | `it` (green) |

Characterization test (FIND-S4-10) updated: previously asserted
`binder_temperature` yields `loom/load/unknown-frontmatter-field` (and NOT the
deferred code). Now asserts it yields `loom/load/deferred-frontmatter-field`
(and NOT the generic unknown code), reflecting the FIX-3 reserved-field set.
Describe block renamed to "FIND-S4-10 reserved-field routing (D7-reconciled)".

Control test ("a known parse error fires") unchanged — still green.

## S2 — `tests/e2e-s2-advisory-diagnostics.test.ts`

Header comment rewritten to describe the reconciled structure.

Three `[observed]` characterization tests (which pinned the pre-fix
no-diagnostic output) updated to assert the advisory now FIRES:

| Test | Was | Now |
|---|---|---|
| FRNT-23 binder_temperature | asserted `unknown-frontmatter-field` present, `deferred-frontmatter-field` absent | asserts `deferred-frontmatter-field` present, `unknown-frontmatter-field` absent |
| FRNT-22 bind_echo no-params | asserted `bind-echo-without-params` undefined | asserts `bind-echo-without-params` defined |
| FRNT-5 argument-hint no desc | asserted `argument-hint-not-displayed` undefined | asserts `argument-hint-not-displayed` defined |

Three `[spec repro] it.fails(...)` → plain `it(...)` (assert code present +
`severity === "warning"`, unchanged assertion bodies):

| Repro | Code | Severity | New state |
|---|---|---|---|
| FRNT-23 | `loom/load/deferred-frontmatter-field` | warning | `it` (green) |
| FRNT-22 | `loom/load/bind-echo-without-params` | warning | `it` (green) |
| FRNT-5 | `loom/load/argument-hint-not-displayed` | warning | `it` (green) |

`[control]` test (argument-hint WITH description raises no advisory) unchanged —
still green.

## Verification (§3 of the task)

- `tests/e2e-s1-*.test.ts` — all green, no edits (FIX-1 flip confirmed):
  `e2e-s1-runtime-values` (9), `e2e-s1-lexer-intake` (7),
  `e2e-s1-grammar-literal-sublang` (6), `e2e-s1-expr-diagnostics` (6).
- `tests/e2e-s5-invoke-untyped-style.test.ts` — INV-20 `it.fails` UNCHANGED
  (line 173, borderline E4, intentionally not fixed). File green (5 tests).

No assertion weakened. No code/message mismatch encountered — every witness's
expected code matches what src now emits per the registry.

## Final suite counts (GATE)

- `npx vitest run` (full default suite) — **169 files, 1870 tests passed, 0 failed.**
- `npm run test:conformance` — **1 file, 26 tests passed, 0 failed.**
