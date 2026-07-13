# Phase-E — final live/e2e retest results

Scope: re-run the live, acceptance, and full hardening suites; triage every
failure per test-plan §5; confirm green modulo positively-triaged provider-infra.
A live provider IS configured. Hardening harness picks model `claude-opus-4-8`
(anthropic) via `requireLiveProvider()` (`available[0]`/opus preference — not
env-overridable). Acceptance default provider is `unity-messages`.

**No `src/**` modified. No test files modified this task.** (The hardening test
diffs in the working tree are the prior FIX-5b D3/D6 edits.) A temporary
diagnostic probe `tests/hardening/_diagtmp.test.ts` was created for triage and
DELETED.

## Suite results

| Suite | Command | Result |
|---|---|---|
| live | `npm run test:live` | **5/5 green.** |
| acceptance (default) | `npm run test:acceptance` (`unity-messages`) | 7/10 — 3 failures, all **provider-infra** (403). |
| acceptance (stable) | `PI_LOOM_ACC_PROVIDER=openrouter PI_LOOM_ACC_MODEL=anthropic/claude-haiku-4.5 npm run test:acceptance` | **10/10 green.** |
| hardening | `npx vitest run --config vitest.hardening.config.ts` | 28/32 files, 116/122 tests green. 6 failures triaged below. |

### live — 5/5 green
All five `tests/live/live-production-acceptance.test.ts` tests pass (incl. the D1
single-turn typed-query). The recurring `loom/runtime/registry-swap-failed …
ctx is stale after session replacement or reload` on **stderr** is the FIX-5b E2
cosmetic teardown race (probe/live harness disposes the session without draining
the 250 ms reload debounce). It fails no assertion.

### acceptance — default `unity-messages` 3 failures = provider-infra
- (h) match-queryerror — `stderr: 403 Forbidden`, exit 1. → provider-infra.
- (b) named-schema typed-query — response failed schema validation, `stdout` **empty**
  (`must be object` on empty). Downstream of the same 403 (no reply). → provider-infra.
- (c) inline-object typed-query — same empty-stdout schema-validation failure. → provider-infra.

Confirming re-run on the stable `openrouter` / `anthropic/claude-haiku-4.5`
provider: **10/10 green** (all of a–i). This confirms the three default-provider
reds are `unity-messages` 403s (provider-infra per §5), not fixture/loom defects.
Matches the Phase-C/D and FIX-5b footprint.

## Hardening failures — triage (6 tests, 4 files)

The full run showed heavy provider distress: multiple 180 000 ms (== `testTimeout`)
model-turn hangs. Each failure re-run once individually per §5.

### Provider-infra (3) — model-turn timeouts on `claude-opus-4-8`

| Test | 1st run | Re-run | Nature | Verdict |
|---|---|---|---|---|
| `exprflow-fn-tail-bug.test.ts` › bare-call tail loses value… | timeout 180 022 ms | **PASS 7 114 ms** | valid loom; live `@`-turn hung then recovered | provider-infra (transient) |
| `exprflow-arith.test.ts` › evaluates arithmetic… renders numbers | timeout 180 020 ms | timeout 180 021 ms | valid loom (no object literals); registers; deterministic-`userTexts` assert; the single live `@`-query completion hung | provider-infra (timeout, §5) |
| `session-crossmode.test.ts` › XMODE-2: interpolating-template match-arm evaluates to null (`tmatch.loom`) | timeout 180 003 ms | timeout 180 004 ms | valid loom; computes `"null!"` locally; single live `@`-query completion hung. Deterministic sibling "match inside interpolation" PASSED (4 839 ms) | provider-infra (timeout, §5) |

Evidence these are model-turn hangs (not loom hangs): the looms contain no loops
/ recursion and register successfully; the hang is in the outbound live
completion. Dozens of other live-model turns in the same run succeeded
(`session-binder` 10/10, `session-subagent-toolloop` 6/6, `query-enums` 5/5,
etc.), and `fn-tail-bug` recovered verbatim on retry — the signature of sporadic
opus overload/rate-limiting surfacing as a hung completion (§5 timeouts/429/5xx).

### Test-artifact (3) — stale bare-object-literal fixtures → FIND-E-1

Reduced to a deterministic, zero-token, provider-independent load-phase probe.
Root cause: three fixtures use **bare object literals** in value/tail position,
which the shipped parser correctly rejects with `loom/parse/bare-object-literal`
(REQ-EXPR-35 / REQ-GRAM-3 / REQ-DIAG-56, Sev E parse). The looms fail load, so
the tests never reach their intended assertion.

| Test | Fixture / offending token | Observed |
|---|---|---|
| `session-crossmode.test.ts:177` › conformant: object/array final value survives | `objchild.loom` tail `{ name: "widget", count: 7, tags: […] }` | `Err: invoke of ./objchild.loom failed (load_failure)`; `userTexts=[]`; assert `''` ⊉ `OBJ=widget\|7\|alpha` |
| `session-crossmode.test.ts:207` › conformant: enum final value survives | `enumchild.loom` tail `{ status: Status.Done }` | same `load_failure`; assert `''` ⊉ `ENUM=Done` |
| `exprflow-stdlib.test.ts:111` › array + object stdlib | `coll.loom` `let obj = { a: 1, b: 2 }` | `/coll` fails load, unregistered → raw `/coll` sent to model; `userTexts=["/coll"]`; assert ⊉ `alen=3\|` |

Deterministic load-phase probe output (model `claude-opus-4-8`, `drives: []`):
```
registered = ["numchild"]
systemNotes = [
  "objchild.loom:5:1:  loom/parse/bare-object-literal: bare object literal not permitted in this position; name the schema (Schema { ... })",
  "enumchild.loom:6:1: loom/parse/bare-object-literal: bare object literal not permitted in this position; name the schema (Schema { ... })",
  "coll.loom:7:11:     loom/parse/bare-object-literal: bare object literal not permitted in this position; name the schema (Schema { ... })",
]
```

**Verdict: test-artifact (stale fixtures). Parser is spec-correct — NOT a
loom-defect, NOT a `src/**` fix.** These are NOT the D3 observation-channel
artifact and NOT provider-infra, so they fall OUTSIDE this task's narrow
authorized test-fix scope (D3-style `probe.diagnostics`→`probe.systemNotes`
repoint only). **Not fixed here — escalated as FIND-E-1** for an orchestrator
decision on the fixture corpus (suggested named-schema rewrite recorded in the
finding; would preserve every assertion). See
`docs/e2e-campaign/findings/phase-e-findings.md`.

## Files edited

- None (`src/**` untouched; no test files modified). Temporary triage probe
  `tests/hardening/_diagtmp.test.ts` created and deleted.

## Gate assessment

- `test:live` — **GREEN (5/5).** ✅
- `test:acceptance` — **GREEN (10/10) on the stable openrouter provider**; the 3
  default `unity-messages` reds are 403 provider-infra (confirmed by the green
  second-provider run). ✅
- hardening — **NOT fully green.** 116/122 tests, 28/32 files pass. Of the 6 reds:
  - **3 positively triaged provider-infra** (opus model-turn timeouts; one
    recovered on retry, two are §5 timeouts) — acceptable per the gate.
  - **3 are provably test-artifacts (FIND-E-1, stale bare-object-literal
    fixtures; parser spec-correct)** — NOT provider-infra and NOT the authorized
    D3 repair. These are escalated, not fixed. **The DoD "hardening green modulo
    provider-infra" is therefore NOT met until FIND-E-1's fixtures are updated.**

STOP/report: FIND-E-1 is a genuine, reproducible, provider-independent discovery
outside the authorized fix scope. Reported for decision rather than fixed
unilaterally.

---

## FIND-E-1 repair applied (2026-07-13)

Authorized stale-fixture test repair (tests-only; `src/**` untouched). Repointed
the three bare object literals to named-schema constructors per the finding's
suggested repair, keeping every assertion intact.

Files edited:
- `tests/hardening/session-crossmode.test.ts`
  - `objchild.loom`: added `schema Thing { name: string, count: number, tags: array<string> }`; tail now `Thing { name: "widget", count: 7, tags: ["alpha", "beta"] }`.
  - `enumchild.loom`: added `schema Wrap { status: Status }`; tail now `Wrap { status: Status.Done }`.
- `tests/hardening/exprflow-stdlib.test.ts`
  - `coll.loom`: added `schema Pair { a: number, b: number }`; `let obj = Pair { a: 1, b: 2 }`.

Re-run results (`vitest run --config vitest.hardening.config.ts`):
- `exprflow-stdlib.test.ts` — **GREEN (3/3)**; `coll` fixture now loads,
  `alen=3|…|ok=["a","b"]|ov=[1,2]|oh=true|…` all assertions pass.
- `session-crossmode.test.ts` — the two FIND-E-1 targets now **GREEN**:
  `conformant: object/array final value survives + interpolates`
  (`OBJ=widget|7|alpha`) ✓ and `conformant: enum final value survives boundary`
  (`ENUM=Done`) ✓. One unrelated test, `XMODE-2: interpolating-template match-arm
  evaluates to null`, **timed out at 180s on both runs** — a model-turn timeout
  (§5 provider-infra, not a FIND-E-1 fixture and not deterministic on the fixture
  shape). Its sibling `XMODE-2: match inside interpolation yields null` passes.

Previously-timed-out files re-run to confirm infra (not deterministic):
- `exprflow-arith.test.ts` — **GREEN (1/1)**.
- `exprflow-fn-tail-bug.test.ts` — **GREEN (1/1)**.
Both pass → confirmed provider-infra timeouts, not deterministic failures.

Net: FIND-E-1's three test-artifacts are resolved. Remaining hardening reds are
§5 provider-infra model-turn timeouts (opus overload), not test-artifacts.
