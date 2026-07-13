# Campaign status ledger

Maintained by the orchestrator. Append-only per phase.

## Phase A — analysis (COMPLETE)

- `analysis/spec-requirements.md` — 1018 normative requirements across 26 areas.
  Testability: offline-unit 558, conformance 393, live 43, inspection 24. Deferred
  appendix enumerates non-targets (out-of-scope / not-yet-implemented).
- `analysis/doc-behaviors.md` — 96 DOC promises + 9-example catalog + 4 doc/spec tensions.
- `analysis/code-surface.md` — architecture, 6 harness entry points, 5 test runners,
  7 seams, gap list.

## Baseline suite state (captured Phase A)

| Suite | Command | Model? | Result |
|---|---|---|---|
| default | `npm test` | no | 148 files / 1745 PASS |
| conformance | `npm run test:conformance` | no | 26 PASS |
| live (H8a) | `npm run test:live` | yes | 4 PASS / 1 FAIL |
| acceptance (H9a) | `npm run test:acceptance` | yes | 5 PASS / 5 FAIL |
| hardening | `npx vitest --config vitest.hardening.config.ts` | yes | NOT YET RUN (32 files, serial, live) |
| typecheck | `npm run typecheck` | no | clean |

## Candidate defects observed at baseline (pre-triage)

- **CAND-1 typed-query non-conforming output** — live H8a "typed-query lowering, bounded"
  + acceptance (b) named-schema + (c) inline-object all fail schema validation
  ("must be object"). Cross-suite, reproducible. HIGH interest.
- **CAND-2 binder off-session echo note absent** — acceptance (d): no bind_echo success
  note nor binder failure note on stdout.
- **CAND-3 provider 403 Forbidden** — acceptance (g),(h) exit 1 with `403 Forbidden`;
  same provider passed (a),(e),(f),(i). Likely infra/rate-limit; MUST be triaged vs
  a real loom defect before counting as a finding.

## Phase C — execution (COMPLETE)

Slices S1–S7 executed in parallel; coverage maps + findings under `execution/`
and `findings/`. 22 new e2e test files authored driving the production paths.
Converged findings:

- Loom-defects fixed in `src/**`:
  - Group A (10 closed-registry diagnostic codes never emitted): `unknown-identifier`,
    `unknown-method`, `extra-object-field`/`missing-object-field` (wiring),
    `bare-object-literal`, `mixed-plus-operands`, `non-orderable-operands`,
    `bind-echo-on-bypass`, `bind-echo-without-params`, `argument-hint-not-displayed`,
    `deferred-frontmatter-field` (+ reserved-field set; `binder_temperature` was
    mis-coded).
  - B1: schema object body with newline-separated (comma-missing) fields silently
    dropped a field with no diagnostic — now errors, preserves fields.
  - B2/B3: unparenthesised `fn`, stray `;`/punctuation now diagnosed.
  - C1 (FIND-S6-1): loom `description:` dropped at `pi.registerCommand` — now threaded.
- Not loom-defects (triaged): CAND-1 typed-query "must be object" = correct rejection
  of a non-object payload (S3 deterministic repro) + a stale live test harness +
  provider-infra; CAND-2 binder echo note present on the loom-system-note channel
  (test observed wrong channel); CAND-3 = provider 403 infra (green on 2nd provider).

## Phase D — fixes (COMPLETE)

FIX-1 (parser structural), FIX-2 (type-layer), FIX-3 (frontmatter advisory),
FIX-4 (description wiring) landed; FIX-5a reconciled Phase-C witnesses; FIX-5b
repaired test artifacts (D1 live JSON.parse, D2 acceptance channel, D3 24 hardening
probe channels, D6 INV-9) and verified 8 fixtures FIX-1 corrected. Borderlines
E1–E5 investigated and ACCEPTED (no fix needed / forward-compat). `src/**` diff:
9 files, +940/-19, confined to parser/lexer/frontmatter/type-layer/stdlib/extension.

## Phase E — retest (COMPLETE — GREEN)

| Suite | Command | Result |
|---|---|---|
| typecheck | `npm run typecheck` | clean |
| lint | `npm run lint` | clean |
| default | `npm test` | 169 files / **1870 PASS** / 0 fail |
| conformance | `npm run test:conformance` | **26 PASS** |
| live (H8a) | `npm run test:live` | **5/5 PASS** |
| acceptance (H9a) | `npm run test:acceptance` (openrouter) | **10/10 PASS** (unity-messages 403 = infra) |
| hardening | `vitest.hardening.config.ts` | all deterministic tests PASS; residual = `claude-opus-4-8` model-turn timeouts (XMODE-2) triaged provider-infra per §5 |

FIND-E-1 (3 hardening fixtures using bare object literals now correctly rejected)
repaired to named-schema construction; both files re-run green.

## Definition of done — MET

All in-scope requirement areas coverage-mapped; default + conformance green; live +
acceptance green on a stable provider; hardening green modulo triaged provider-infra
(opus timeouts, `unity-messages` 403). Zero open loom-defect findings. All new tests
committed under `tests/`.

## Post-campaign follow-ups (COMPLETE)

- README `Status` rewritten to reflect reality: the type-layer-diagnostics known-gap
  bullet (all cited checks now fire) was removed; the Provenance D-6 line corrected.
- npm package version set to `0.1.3` (early, pre-stable — `0.x` release-maturity
  axis, distinct from the `loom 1.0` language design scope which is unchanged). The
  earlier `1.0.0` was judged an overclaim given the defects this campaign found in
  the "production-ready" build; `0.1.x` honestly signals a pre-stable runtime under
  hardening. README Status reframed to make the two axes explicit.
- **Nested control/effect forms in pure positions (former README bullet 2 / DOC-94)
  — FIXED.** `evalExpr` now decomposes `object`/`array`/`index`/`member`/`ternary`/
  `binary`/method-call/`result-ctor` on the async executor so nested `match`/`@`-query/
  tool-call/`invoke`/`fn`-call route through the runtime path instead of the sync
  pure host's `default: return null`. Verified twice, independently: object-field +
  array-element + all pure-operator-over-inline-composite shapes now evaluate
  correctly; short-circuit/ternary/ordering/error-propagation semantics preserved;
  no false positives; typecheck/lint/`npm test` (170 files / 1886) / conformance (26)
  green. Src: `src/runtime/statement-executor.ts`; regression test
  `tests/nested-control-in-pure-position.test.ts` (16 tests). One narrow residual
  documented in the README: a pure-operator expression that is *itself* the `?`-operand
  or `match`-scrutinee with an inline-composite effect and no intervening `let`
  (`[<effect>][0]?`, `match [<effect>][0] {…}`) — fixing it in `evalAsResult` was
  judged to carry a match-scrutinee Ok-wrapping regression hazard disproportionate to
  a construct a `let` trivially avoids. Detail: `execution/fix-bullet2-results.md`,
  `findings/verify-bullet2.md`, `findings/verify-bullet2-final.md`.
- **Final residual (the `?`/`match`-scrutinee edge) — FIXED.** Root-cause analysis
  (`findings/residual-bug-analysis.md`) showed it was a real, reachable bug (not a
  grammar/spec consequence) fixable without the feared `asResultValue` Ok-wrapping
  regression. `evalAsResult` now decomposes the pure-operator operand kinds by
  returning `evalExpr(operand)` raw (no `Ok(...)` wrap), so an effect inside a
  pure-operator expression that is itself the `?`-operand or `match`-scrutinee
  dispatches through the async path. Independently verified: entire control/effect-
  in-pure-position class fully closed, no Ok-wrapping regression, short-circuit/
  ordering/failure-propagation preserved; typecheck/lint/`npm test` (170 files /
  **1897**) / conformance (26) green. Src: `src/runtime/statement-executor.ts`;
  tests: `tests/nested-control-in-pure-position.test.ts` (27 tests). README Status
  restored to the D-6 posture (no enumerated gaps). Detail:
  `findings/verify-residual-final.md`.
