# Independent verification — bullet-2 LAST residual closure (`evalAsResult`)

Adversarial verification of the `evalAsResult` operator-kind branch
(`src/runtime/statement-executor.ts` ~678–696). Every gate re-run from scratch;
every behavioural claim re-proved with my own probes driving the production
`executeBody` path (`createProductionProducerDeps` → `bindPromptConversation` →
`executeBody`) with a scripted `grep` Pi-tool carrying a **dispatch counter**.
Probes were deleted after the run. Nothing from the prior round was trusted.

## Fix under test

`evalAsResult` (the `?`-operand / `match`-scrutinee evaluator, separate from
`evalExpr`) gained a branch — BEFORE the `checkpointFor` dispatch — that for
`index` / `member` / `binary` / `ternary` / `method-call` / `result-ctor`
operands returns `evalExpr(operand, env, deps)` **raw** (no `asResultValue`
Ok-wrap). The nested effect dispatches through the single async `evalExpr` path;
the true resolved value reaches `evaluateMatch` / `evaluateQuestion`.

---

## Item 1 — Gates (independently re-run)

| Gate | Command | Result |
|---|---|---|
| Typecheck (project-wide) | `npm run typecheck` (`tsc -p tsconfig.json --noEmit`) | **PASS** — exit 0, no diagnostics. Confirmed it is the whole-project `tsc`, not a single-file check. |
| Lint | `npm run lint` | **PASS** — exit 0. |
| Full suite | `npx vitest run` | **PASS** — **170 files / 1897 tests**, all green, exit 0. Matches the claim exactly. |
| Conformance | `npm run test:conformance` | **PASS** — **26/26** green, exit 0. |

The prior round's "typecheck clean" claim is now TRUE (independently re-verified).

**Item 1: PASS.**

---

## Item 2 — Residual now fixed (every operator shape under `?`/`match` dispatches)

Probes used a `grep` tool returning `Ok("HITS-99")` with a dispatch counter.

| Probe (scrutinee/operand) | outcome | value | dispatch count |
|---|---|---|---|
| `match [grep()][0] { Ok(v)=>v, _=>0 }` | success | `"HITS-99"` (Ok arm, **not** wildcard `0`) | **1** |
| `[grep()][0]?` | success | `"HITS-99"` (unwrapped) | **1** |
| `{ f: grep() }.f?` (member) | success | `"HITS-99"` | **1** |
| `match ([grep()].length + 100) { 101=>7, … }` (binary, effect in operand) | success | `7` | **1** |
| `(true ? [grep()][0] : Ok("z"))?` (ternary) | success | `"HITS-99"` | **1** |
| `match [grep()].length { 1=>55, … }` (method-call receiver) | success | `55` | **1** |
| `Ok(grep())?` (result-ctor) | success | inner `Ok("HITS-99")` | **1** |
| `match Ok(grep()) { Ok(v)=>v, _=>0 }` (result-ctor under match) | success | inner `Ok("HITS-99")` | **1** |

Every shape dispatches the effect exactly once and binds the true payload — no
silent wildcard, no `null`, no `internal-error`.

**Item 2: PASS.**

---

## Item 3 — No Ok-wrapping regression

The decisive adversarial test: a `match` whose **first arm is `Ok(v)=>999`**,
followed by a literal arm. If the fix silently wrapped a plain scrutinee in
`Ok(...)`, the `Ok(v)` arm fires (→ 999). A correct raw value skips it and hits
the literal arm.

| Probe | value | interpretation |
|---|---|---|
| `match [1][0] { Ok(v)=>999, 1=>100, _=>0 }` | `100` | plain `1` matched the literal arm — NOT wrapped |
| `match ("a"+"b") { Ok(v)=>999, "ab"=>100, _=>0 }` | `100` | plain `"ab"` — NOT wrapped |
| `match (true ? 5 : 9) { Ok(v)=>999, 5=>100, _=>0 }` | `100` | plain `5` — NOT wrapped |
| `match [5][0] { Ok(v)=>v, _=>0 }` (only Ok + wildcard) | `0` | raw `5` is not a Result → wildcard; a wrapped `Ok(5)` would have bound `v`→`5` |

In no case did the `Ok(v)` arm fire for a plain value. The raw-return design
(no `asResultValue`) is confirmed to avoid the wrapping hazard entirely.

**Item 3: PASS.**

---

## Item 4 — Failure / cancel propagation and short-circuit

**Failure propagation.** A `grep` whose `execute()` throws is lowered to a
value-level `Err(CodeToolError)` Result (verified), so:

| Probe | outcome | consistency |
|---|---|---|
| tail `grep()?` (baseline) | `fail` | — |
| `[grep()][0]?` (failing) | `fail` | **identical to tail**; dispatch count = 1 (dispatched, not swallowed); value ≠ null |
| `match [grep()][0] { Ok/Err/_ }` (failing) | `success`, value `GOT-ERR` | caught by `Err(e)` arm |
| `let x=[grep()][0]; match x {…}` (failing, bound baseline) | `success`, value `GOT-ERR` | **identical to inline** |
| `match grep() {…}` (direct effect scrutinee, failing) | `success`, value `GOT-ERR` | **identical** |

The failing effect is genuinely dispatched and its `Err` surfaces uniformly:
`?` propagates it (`fail`), `match` catches it (`Err` arm) — inline, bound, and
direct forms all agree. No silent-null, no `internal-error`, no swallow.

**Short-circuit / not-taken (dispatch counter = 0 required):**

| Probe | value | dispatch count |
|---|---|---|
| `match (false ? [grep()][0] : Ok("k")) {Ok(v)=>v,_=>0}` | `"k"` | **0** (not-taken branch) |
| `match (false && ([grep()].length>0)) {false=>42,_=>0}` | `42` | **0** (`&&` short-circuit) |
| `match (true || ([grep()].length>0)) {true=>42,_=>0}` | `42` | **0** (`||` short-circuit) |

Cancel: the executor path routes cancellation through the same
`runCancellableSequence`/`handlePartialTerminalOutcome` as tail position (code
inspection; `evalExpr` carries the `cancel` flow verbatim and `evalAsResult`
returns it raw). No divergence introduced by the raw-return branch.

**Item 4: PASS.**

---

## Item 5 — No false positives

- Bound baseline `let x=[grep()][0]; match x {…}` → `"HITS-99"`, count 1 —
  identical to the inline form (item 2).
- Pure loom `match [10,20,30][1] { Ok(v)=>999, 20=>111, _=>0 }` → `111`
  (by-value, no wrap, no effect).
- Ordinary `match`/`?` over bound values behave identically (bound baseline +
  full suite unaffected).
- Parse-time carve-outs untouched: the edit is confined to `evalAsResult` in
  `src/runtime/statement-executor.ts`; no parser/lowering path touched by this
  closure. The tool-arg and `params:`-default literal-sublanguage restrictions
  are enforced at parse and remain green (conformance 26/26 exercises the
  `badparam` / `badparse` / `collision` / `unknowntool` diagnostics).

**Item 5: PASS.**

---

## Item 6 — Test integrity

`tests/nested-control-in-pure-position.test.ts` = **27 `it()` tests** (all
green). The `evalAsResult` closure added the last 4 describe blocks
(`match`-scrutinee/`?`-operand dispatch ×5, NON-Result by-value ×3,
short-circuit ×2, failing-propagation ×1 = **11 new** tests; the fix doc says
"+10" — a minor arithmetic slip in the doc, immaterial: the tests exist and
assert real outcomes).

The assertions are genuine, non-tautological, and assert **correct non-null
values / correct outcomes**:
- positive value assertions: `.toBe("42 matches")`, `.toBe(100/200/300/42)`,
  `.toBe("x")`, `isResultValue(...)===true`, `rv.value==="42 matches"`;
- dispatch is proved by `tool.received()` `toEqual({pattern,path})` (positive
  dispatch) and `toBeUndefined()` (no dispatch, short-circuit);
- failure is anchored to a computed tail baseline (`toBe(baseline)` where
  `baseline==="fail"`).

The only `not.toBe(null)` / `toBeUndefined` assertions sit in the failing /
short-circuit tests and are each paired with a positive outcome+value assertion,
so none is a "asserts null == success" tautology. No test asserts `null` as a
correct value.

**Item 6: PASS.**

---

## Final verdict

**The entire control/effect-in-pure-position class is NOW FULLY CLOSED, with no
regression detected.**

- All four gates pass independently and project-wide: typecheck (0),
  lint (0), full suite (170 files / **1897** tests), conformance (**26/26**).
  The prior false "typecheck clean" claim is now genuinely true.
- Every operator shape (`index` / `member` / `binary` / `ternary` /
  `method-call` / `result-ctor`) as a `?`-operand or `match`-scrutinee dispatches
  the nested effect through the single async `evalExpr` path (dispatch counter
  = 1) and binds the true value.
- The Ok-wrapping hazard that motivated the raw-return approach is provably
  absent: an `Ok(v)`-first `match` never fires for a plain scrutinee.
- Failure propagates uniformly (`?`→fail identical to tail; `match`→`Err` arm
  identical to bound and direct forms); short-circuit and not-taken branches do
  not dispatch (counter = 0).
- Bound baselines, pure looms, and parse-time carve-outs are unchanged.

No remaining edge or regression in the confirmed shape set was found by
independent adversarial probing.
