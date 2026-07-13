# pi-loom end-to-end test plan

Orchestrator-authored. Derived from the Phase-A analysis deliverables:
`analysis/spec-requirements.md` (1018 normative requirements), `analysis/doc-behaviors.md`
(96 doc promises + example catalog), `analysis/code-surface.md` (harness entry points +
suite inventory).

## 1. Objective

Methodically verify that the shipped pi-loom 1.0 extension complies with its
specification end-to-end, across the whole documented language + host-integration
surface — not spot checks. Produce a coverage-mapped, executed test plan; drive every
confirmed non-compliance to green.

## 2. Scope

IN SCOPE: every requirement row in `analysis/spec-requirements.md` NOT listed in its
Deferred appendix, plus the 96 documented promises, plus every runnable example.

OUT OF SCOPE (do not test as if shipped): everything in the Deferred appendix of
`spec-requirements.md` (out-of-scope grammar, not-yet-implemented seams, loom-1.0
non-goals, editorial-only governance rules). A worker that believes a deferred item is
actually observable must record it as a `borderline` finding, not a failure.

## 3. Test methods (by testability class)

Each requirement is exercised by the cheapest method that actually observes the shipped
behaviour. Entry points per `analysis/code-surface.md` §2.

- **M1 offline-unit** — `parseLoomDocument()` / `parseFrontmatter()` / `lexLoom()` /
  pure binder + type-compat + schema-lowering helpers. Assert on returned diagnostics /
  AST / values. No model, no session. Runner: `npm test`.
- **M2 conformance (no model)** — drive the *production composition* without a live
  model: (a) `tests/harness` `loadExtension` + `ResponseProgrammer` scripted turns, or
  (b) `tests/conformance` `runProductionLoad`/`runSource`, or (c) a scripted
  `QueryModelDriver` seam (`src/runtime/query-tool-loop.ts:119`). Assert on transcript,
  system-notes, terminal outcome, diagnostics, registration. Runner: `npm test` (new
  tests) / `npm run test:conformance`.
- **M3 live** — real model turn: `bootShippedExtension` (live), `runProbe` (hardening),
  `spawnPiPrint` (acceptance). Only for requirements that genuinely need a model
  (query success, binder mapping, schema repair). Assert deterministically where a
  loom pins the reply; otherwise assert structural invariants (exit code, note
  presence, no envelope leak). Runner: `test:live` / `test:acceptance` / hardening.
- **M4 inspection** — code/doc reading with file:line. For terminology, SDK-pin,
  host-wiring, and editorial-governance rows.

## 4. Test areas & execution assignment

The 26 requirement areas are grouped into execution slices. Each slice is delegated to
one `worker` (which recursively delegates sub-slices). Every worker MUST:

1. Read its assigned area rows in `analysis/spec-requirements.md`.
2. Run the existing tests covering the area (globs from `code-surface.md` §3 map).
3. Build a **coverage map**: each in-scope requirement → covering test file(s) `path`,
   or `UNCOVERED`. Cite the test that covers it.
4. For UNCOVERED offline/conformance requirements of real behavioural weight, author
   NEW vitest tests that drive the *production* path (M1/M2 entry points above), and
   run them. Do not test deferred items.
5. Record every failure or observed spec-noncompliance as a finding (see §6).
6. Write `execution/<slice>-results.md` (coverage map + suite results + new-test list)
   and `findings/<slice>-findings.md` (may be empty).

| Slice | Areas (reqs) | Primary method | Existing test globs |
|---|---|---|---|
| S1 language-core | LEX, GRAM, EXPR, CTRL, FUNC, RET, BIND, TYPE, RVM (171) | M1 + some M2 | `lexer-*`, `whole-program-parser`, `expression-*`, `control-flow`, `functions-and-return`, `match-result`, `statement-executor`, `runtime-value-model`, `bindings`, `literals-and-paths`, `type-*`, `static-type-inference`, `canonical-number-render`, `disc-unions-recursion`, `lexical-environment` |
| S2 frontmatter-imports | FRNT, DESC, IMP (112) | M1 + M2 | `frontmatter-*`, `descriptions`, `imports`, `wire-name-translation`, `callable-set*`, `params-defaults`, `settings-merge` |
| S3 query-tools-schemas | QRY, TOOL, SCH (111) | M1 + M2 (+ few M3) | `query-*`, `queryerror-variants`, `typed-query-schema-integration`, `tool-calls*`, `tool-return-shape-*`, `schema-*`, `prompt-tool-loop-governor`, `frontmatter-tool-loop-respond-repair` |
| S4 errors-diag-cancel-ceilings | ERR, DIAG, CANCEL, HC (307) | M1 + M2 | `terminal-outcomes`, `no-rollback`, `runtime-panics`, `queryerror-variants`, `diagnostics-primitive`, `*-diagnostics-production`, `code-registry`, `cancellation-core`, `production-cancellation-wiring`, `depth-enforcement`, `ceiling-arbitration`, `tool-calls-depth-ceiling`, `invoke-ceiling-depth`, `unknown-reason-rule` |
| S5 discovery-invoke-binder | DISC, SLSH, INV, BINDER (126) | M1 + M2 | `discovery-*`, `package-discovery`, `settings-merge`, `reload-*`, `registration-reload-wiring`, `watcher-*`, `watch-token-seams`, `slash-dispatch`, `minimal-slash-command`, `argument-echo`, `invoke-*`, `invocation-core`, `active-invocation-*`, `binder-*`, `capability-probe`, `defaulting-revalidation`, `bind-context-transcript` |
| S6 pic-session-gov | PIC, SESS, GOV (191) | M2 + M4 | `extension-*`, `composition-producer`, `production-*`, `session-*`, `runtime-event-channel`, `system-note-channel`, `*-seam*`, `checkpoint-*`, `forwarding-*`, `conversation-drive`, `sdk-inventory`, `closing-gate`, `cross-cutting-gates`, `version-bump-*`, `inventory-closure-audit*`, `export-visibility` |
| S7 live-e2e-triage | live/acceptance/hardening cross-cut; DOC promises; examples | M3 | `test:live`, `test:acceptance`, `vitest.hardening.config.ts`, `docs/examples/*` |

## 5. Live / end-to-end triage rules (S7)

Live suites depend on a real provider and can fail for reasons unrelated to loom.
Classify every live/acceptance/hardening failure into exactly one:

- **loom-defect** — reproducible, provider-independent, contradicts a Reference
  requirement. Deterministic repro required (ideally reduced to an M2 conformance
  test). → finding, must be fixed.
- **provider-infra** — transient network/auth/rate (`403`, `429`, timeouts, `5xx`),
  or model-capability specific to the acceptance provider. Confirm by re-running and/or
  reproducing on a second provider/model. → NOT a loom finding; note in results.
- **test-artifact** — the test harness asserts something stricter than the spec (e.g.
  `JSON.parse` of a reply the spec does not require to be pure JSON). → finding against
  the test, fix the test.

Baseline candidate defects to resolve first (from `status.md`): CAND-1 typed-query
non-conforming output (cross-suite), CAND-2 binder echo note absent, CAND-3 the 403s.

## 6. Finding schema

Each finding (one block in `findings/<slice>-findings.md`):

```
### FIND-<slice>-<n>: <one-line title>
- Requirement: REQ-<AREA>-<n> (spec tag) / DOC-<n>
- Spec citation: path:line
- Method: M1|M2|M3
- Repro: minimal .loom + invocation, or test file:line
- Expected: <spec-quoted behaviour>
- Observed: <actual>
- Verdict: loom-defect | test-artifact | provider-infra | borderline | deferred-not-a-bug
- Severity: blocks-spec-compliance | partial | cosmetic
```

## 7. Phases

- **Phase C — execution.** Slices S1–S7 delegated in parallel. Gate: all coverage maps
  written, all findings recorded. Do NOT fix anything during Phase C.
- **Phase D — fix plan.** Orchestrator aggregates findings → `fix-plan.md`, ordered by
  severity + dependency. Delegated fixes.
- **Phase E — retest.** Re-run every suite + every new test touching a fixed area.
  Iterate C-findings → D-fix → E-retest until: default + conformance green; live/
  acceptance/hardening green modulo triaged provider-infra; zero open loom-defect
  findings.

## 8. Definition of done

- Coverage map exists for all 26 areas; every in-scope requirement is either covered by
  a cited test or has a recorded justification.
- `npm test`, `npm run test:conformance` green.
- `npm run test:live`, `npm run test:acceptance`, hardening green except failures
  positively triaged as provider-infra (documented, with a second-provider or re-run
  confirmation).
- All new tests committed under `tests/`. All findings resolved or explicitly accepted.
