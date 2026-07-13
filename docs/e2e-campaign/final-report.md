# pi-loom end-to-end test campaign — final report

## Outcome

The methodical, spec-derived end-to-end test plan was built, executed, and driven
to green. All suites pass modulo positively-triaged provider-infrastructure noise.

| Suite | Result |
|---|---|
| `npm run typecheck` / `npm run lint` | clean |
| `npm test` (offline, 169 files) | **1870 pass / 0 fail** |
| `npm run test:conformance` | **26 pass** |
| `npm run test:live` | **5/5 pass** |
| `npm run test:acceptance` (stable provider) | **10/10 pass** |
| hardening (`vitest.hardening.config.ts`) | all deterministic tests pass; residual = `claude-opus-4-8` model-turn timeouts (infra) |

Baseline at campaign start: offline 1745 pass; live 4/5; acceptance 5/10; hardening
not run. Net: +125 offline tests (22 new spec-derived e2e files), and the live/
acceptance/hardening failures resolved (10 loom-defects fixed + test artifacts).

## Method

1. **Analysis (delegated):** three workers produced `analysis/spec-requirements.md`
   (1018 normative requirements, 26 areas, testability-classified),
   `analysis/doc-behaviors.md` (96 doc promises + 9-example catalog + doc/spec
   tensions), `analysis/code-surface.md` (architecture, 6 harness entry points, 5
   runners, seams, gaps). Each recursively delegated to sub-workers.
2. **Plan (orchestrator):** `test-plan.md` — 7 execution slices, per-class methods
   (M1 offline / M2 conformance / M3 live / M4 inspection), triage rules, finding
   schema, definition of done.
3. **Execution (delegated, S1–S7):** coverage-mapped every in-scope requirement to a
   test or authored a new one; recorded findings; ran all five runners.
4. **Fix (delegated, FIX-1..5):** fixed the confirmed loom-defects, reconciled
   witnesses, repaired test artifacts, triaged borderlines.
5. **Retest (delegated):** re-ran every suite to green.

All inter-agent communication was markdown-on-disk under `docs/e2e-campaign/`.

## What was actually wrong (10 loom-defects fixed)

The dominant defect class: **the closed diagnostic-code registry was not honoured** —
10 registry codes (DIAG-2 says the registry is closed and triggers are normative) were
absent from `src/**`, so malformed looms loaded clean. Fixed:

- `unknown-identifier`, `unknown-method`, `extra-object-field` + `missing-object-field`
  (an implemented check that production never called), `bare-object-literal`,
  `mixed-plus-operands`, `non-orderable-operands` (parser + type-layer).
- `bind-echo-on-bypass`, `bind-echo-without-params`, `argument-hint-not-displayed`,
  `deferred-frontmatter-field` (frontmatter advisories; reserved fields such as
  `binder_temperature` were mis-coded as `unknown-frontmatter-field`).

Plus:
- **Silent schema corruption (FIND-S7-1):** a schema object body whose fields were
  newline-separated (author forgot a comma) silently coalesced two fields into one
  malformed field with no diagnostic — corrupting typed-query / params / invoke-return
  validation shape. Now a load error.
- **Dropped `description` (FIND-S6-1):** a loom's `description:` was discarded before
  `pi.registerCommand`, so autocomplete showed nothing. One-line thread-through fix.
- Unparenthesised `fn` and stray `;`/punctuation are now diagnosed.

All fixes are conservative: type-layer diagnostics fire only when operand/receiver
types are statically resolvable (no false positives; the `committed-fixture-parse-gate`
and the full suite confirm no valid loom regressed).

## What looked wrong but was not (triaged, no src change)

- **Typed-query "must be object" (CAND-1):** the runtime correctly rejects a non-object
  payload (REQ-QRY-36); a deterministic conformance repro proved the lowering/validation
  is correct. The live failure was a stale test harness (`JSON.parse` of a two-turn
  stream) + provider infra.
- **Binder echo note (CAND-2):** present and correct on the `loom-system-note` channel;
  the acceptance test observed the wrong channel (`pi -p` stdout).
- **403 Forbidden (CAND-3):** `unity-messages` rate-limit; green on a second provider.
- ~28 hardening/acceptance/live failures were stale test artifacts (V4e diagnostic
  channel move, non-language `respond` fixtures, a pre-fix bug-characterization test,
  bare-object-literal fixtures) — repaired in the tests, not the runtime.

## Accepted / documented (not fixed)

- Borderlines E1–E5 (binderModel id format, cosmetic teardown reload-race log noise,
  a retired-code constant still referenced, the forward-compat INV `style` discriminator,
  minor coverage gaps) — investigated and accepted with rationale in the findings.
- README `Status` known-gap bullet on type-layer diagnostics is now stale (those checks
  are implemented); it understates capability. The nested-control-forms bullet (DOC-94)
  was not exercised by any finding and is left unverified.

## Artifact index

- `analysis/` — spec-requirements, doc-behaviors, code-surface (+ partials).
- `test-plan.md`, `fix-plan.md`, `status.md`, this report.
- `execution/` — per-slice coverage maps + suite results + fix-*/phase-e results.
- `findings/` — s1–s7 + phase-e findings (§6 schema, verdict per finding).
- `tests/e2e-s*.test.ts`, `tests/fix1-parser-structural.test.ts`,
  `tests/helpers/e2e-s1.ts` — 22 new production-path tests (permanent gates).
