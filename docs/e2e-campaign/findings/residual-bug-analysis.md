# Residual bug — root-cause + fixability analysis

**Bug.** After the bullet-2 fix, a pure-operator expression that *contains* an
inline-composite effect misbehaves in exactly one shape: when that operator
expression is itself the operand of `?` or the scrutinee of `match`, with no
intervening `let`. Examples: `[someQuery()][0]?` and `match [someQuery()][0] {…}`.

- `match [<effect>][0] {…}` → **silent wrong value**: `success` outcome, scrutinee
  silently `null`, wildcard arm taken, effect never dispatched.
- `[<effect>][0]?` → **loud abort**: raw `TypeError` surfaced as a
  `loom/runtime/internal-error` system note.
- Bound form (`let x = [<effect>][0]; x?` / `match x`) works.

All behavioural claims below are backed by a probe I ran against the real
production path (`createProductionProducerDeps` → `bindPromptConversation` →
`executeBody` with a scripted `grep` Pi-tool), then deleted. Probe output:

| Probe | outcome | value | tool calls |
|---|---|---|---|
| `match [grep()][0] { Ok(v)=>v, _=>0 }` | `success` | `0` | **0** (not dispatched) |
| `([grep()][0])?` | **threw** `TypeError: Cannot read properties of null (reading 'ok')` | — | **0** |
| `let x=[grep()][0]; match x {…}` (baseline) | `success` | `"42 matches"` | **1** (dispatched) |

---

## 1. Exact mechanism

Two evaluation paths exist for a sub-expression:

- **Async executor** `evalExpr` (`src/runtime/statement-executor.ts:319`) — the
  only path that can dispatch an effect (it is `async` and routes checkpointed
  `query`/`call`/`invoke` through `runCancellableSequence` → `host.runEffect`).
  The bullet-2 fix extended it to decompose `array`/`object` and the pure
  operator kinds `index`/`member`/`ternary`/`binary`/`method-call`/`result-ctor`
  on the executor path (`statement-executor.ts:363–471`), so an inline composite
  holding an effect dispatches through this path.
- **Sync pure host** `evaluatePureExpression`
  (`src/extension/production-loom-producer.ts:3842`) — synchronous, cannot
  dispatch an effect. Its `default: return null`
  (`production-loom-producer.ts:3935`) is a silent safety net: a `query` /
  tool-`call` / `invoke` reaching it yields `null`.

The `?` operand and the `match` scrutinee are **not** evaluated by `evalExpr`.
`evalTry` (`statement-executor.ts:719`) and `evalMatch` (`:740`) both delegate to
a *separate* function, `evalAsResult` (`:656`), which has its own dispatch
predicate. That predicate (`:664–671`) special-cases only:

```
operand.kind === "try" || "match" || "object" || "array"
  || (operand.kind === "call" && resolveUserFn(...) !== undefined)
```

It does **not** include `index` / `member` / `binary` / `ternary` /
`method-call` / `result-ctor` — the very kinds the bullet-2 fix added to
`evalExpr`. So for `[grep()][0]` as a `?`-operand / `match`-scrutinee:

1. `evalAsResult`'s delegate predicate does not match `index`.
2. It falls to `deps.host.checkpointFor(operand)` (`:678`).
   `checkpointFor` (`effectful-statement-host.ts:375`) returns non-null **only**
   for `query`/`call`/`invoke`; for `index` it returns `null`.
3. `checkpoint === null` → `deps.host.evaluatePure(operand, env)`
   (`statement-executor.ts:680`) — the **sync pure host**, returned verbatim
   (note: the pure branch does **not** wrap in `asResultValue`).
4. `evaluatePureExpression` `case "index"` (`production-loom-producer.ts:3888`)
   recurses: target `[grep()]` → `case "array"` maps each element →
   `grep()` → `case "call"`; `grep` is a Pi tool, not a user `fn`, so the call
   case returns `null` (`:3907`). Array = `[null]`; `[null][0]` → `null`.

So the whole operator expression resolves to `null` **without dispatching the
effect** (probe: `calls=0`). The effect never fires because the pure host is
synchronous and has no effect machinery.

**Why `match` silent-nulls but `?` loud-aborts** — divergent downstream code
paths consuming the `null`:

- `evalMatch` (`:740`) calls `evalAsResult` → `null`, then
  `evaluateMatch(null, arms)` (`src/runtime/match-result.ts:143`). `null` fails
  the `Ok(v)` constructor pattern, matches the wildcard `_` arm → arm body `0`.
  No throw, `success` outcome → **silent wrong value**.
- `evalTry` (`:719`) calls `evalAsResult` → `null`, then
  `evaluateQuestion(() => null)` (`src/runtime/runtime-panics.ts:222`), whose
  body is `const result = operand() as ResultValue; return result.ok ? …`.
  `null.ok` throws a raw `TypeError`. That `TypeError` is **not** a `LoomPanic`,
  so `surfaceUnexpectedThrow` (`runtime-panics.ts:263`) classifies it as a
  `loom/runtime/internal-error` diagnostic and the loom aborts — **loud abort,
  poor message**.

Both are pre-existing (the bullet-2 diff never touched `evalAsResult`), so
neither is a new regression.

## 2. Why the fix worker declined it — hazard verified as real

The declared hazard: routing the new operator kinds through `evalAsResult`'s
**existing delegate branch** would force `asResultValue` Ok-wrapping onto
non-Result operator values, a semantic divergence for `match <op-expr>`.

Verified. The delegate branch (`statement-executor.ts:672–676`) does:

```ts
const inner = await evalExpr(operand, env, deps);
if (inner.flow !== "value") return inner;
return { flow: "value", value: asResultValue(inner.value) };
```

and `asResultValue` (`:707`) is:

```ts
function asResultValue(value: LoomValue): ResultValue {
  return isResultValue(value) ? value : makeOk(value);   // wraps non-Result in Ok(...)
}
```

So a *naive* extension that simply adds the operator kinds to the delegate
predicate would run every `match <op-expr>` scrutinee through `asResultValue`.
For a scrutinee whose runtime value is **not** a `Result` (e.g.
`match [1,2,3][0] {…}`, scrutinee `1`), it would wrap `1` → `Ok(1)`, so a literal
pattern `1 => …` would no longer match and `Ok(v) => …` would fire instead —
a genuine change to `match` semantics. The hazard is real for the delegate path.

(Note the pure branch at `:680` deliberately does **not** wrap — it returns the
raw pure value — so the bound baseline `match x` and pure scrutinees are already
correct. The wrapping only lives in the effect/delegate branches.)

## 3. Is it fixable? — yes, cleanly, low risk

The hazard is specific to *reusing the wrapping delegate branch*. It is avoided
entirely by option (a): evaluate the scrutinee/operand through `evalExpr` first
to a real `LoomValue`, then hand the **raw** value to the existing `?`/`match`
logic — **without** `asResultValue`. This is exactly what the working pure
branch (`:680`) already does for bound scrutinees; the operator kinds only differ
in needing the async path to dispatch the nested effect.

Why raw (no wrap) is correct for both consumers:

- `match`: `evaluateMatch` wants the true scrutinee value (Result or otherwise) —
  identical to the pure/bound path. No wrap.
- `?`: ERR-18 (see §4) guarantees the `?` operand is statically
  `Result<T, QueryError>`, so the resolved value is already a branded `Result`;
  `evaluateQuestion` consumes it directly. No wrap needed (and `evaluateQuestion`
  no longer sees `null`).

**Fix sketch** (minimal, `src/runtime/statement-executor.ts`, in `evalAsResult`,
insert before the `checkpointFor` call at `:678`):

```ts
// A pure OPERATOR expression as the `?`-operand / `match`-scrutinee: evaluate it
// through the async executor so a nested inline-composite effect dispatches, and
// return the RAW resolved value. No `asResultValue` wrap — `match` needs the true
// scrutinee value, and ERR-18 guarantees a `?` operand is already `Result`-typed.
if (
  operand.kind === "index" ||
  operand.kind === "member" ||
  operand.kind === "binary" ||
  operand.kind === "ternary" ||
  operand.kind === "method-call" ||
  operand.kind === "result-ctor"
) {
  return evalExpr(operand, env, deps);
}
```

`evalExpr` already fully handles these kinds (bullet-2), returns an `EvalResult`
whose `flow`/`value` are propagated verbatim (short-circuit / fail / cancel
already carried), and applies the same runtime primitives as the pure host, so
value/branding cannot diverge.

Pitfalls (all handled by the sketch):

- **No wrap.** Must return `evalExpr(...)` directly, *not* through the delegate's
  `asResultValue` branch — that is the whole hazard from §2.
- **Ordering / short-circuit.** Already owned by `evalExpr`/`evalBinary`
  (verified: `&&`/`||` and not-taken ternary do not dispatch).
- **Branding.** `evalExpr` uses `makeOk`/`makeErr` + the shared primitives, so a
  resolved `Result` is branded and `isResultValue` recognises it; `evaluateMatch`
  and `evaluateQuestion` operate correctly.
- **`result-ctor` is redundant-but-harmless** in the `?` list: `evalAsResult`
  never receives a `result-ctor` `?`-operand in a way that reaches here (`?` on
  `Ok(x)` is already classified `result` upstream), but including it is
  consistent and safe. It is meaningful for `match Ok([grep()]) {…}`.

Regression surface: nil for the working paths — the pure branch (`:680`) and the
effect/delegate branches are untouched; only the previously-`null`-producing
operator kinds change, and they change from `null` to the correct dispatched
value. Recommend a regression test mirroring the deleted probe (assert
`match`→`"42 matches"` with `calls=1`, and `[grep()][0]?`→ success/propagate,
not `internal-error`).

## 4. Grammar / spec — is the shape a well-formed, reachable program? YES

- **Grammar.** `docs/reference/grammar.md:275` precedence level 1 groups
  `. [] () postfix ?` left-associative, so `[someQuery()][0]?` parses as
  `(([someQuery()])[0])?`. `docs/spec_topics/expressions.md:3` states the same
  expression grammar applies at `if`/`match` scrutinees, so
  `match [someQuery()][0] {…}` is grammatical. Both are well-formed syntax.
- **`?` operand type (ERR-18, `expressions.md:201`).** The `?` operand MUST be
  statically `Result<T, QueryError>`; violation is
  `loom/parse/question-on-non-result`, a static `type`-phase failure. The check
  is implemented in `type-layer-checks.ts` `questionOperandKind` (`:740`): it
  fires **only** when it can *prove* the operand non-Result (kinds
  `prim`/`literal`/`array`); a statically-unresolvable `named` type defers
  (`default → undefined`, no diagnostic). For `[grep()][0]`,
  `static-type-inference.ts:245` infers the index as its array's element type;
  the array element `grep()` (a `call`) infers `{kind:"named", name:"grep"}`, so
  the index infers `{kind:"named", name:"grep"}` — a `named` type → deferred → **no
  diagnostic**. The loom **loads**. At runtime the tool-call returns a `Result`,
  so ERR-18 is satisfied in substance; the static checker simply cannot prove it
  and defers to the (buggy) runtime path.
- **`match` scrutinee.** No type restriction; exhaustiveness is not statically
  checked (`expressions.md:176`, `grammar.md:219`). `match <any-expr>` is
  well-formed; a Result scrutinee is exactly the idiomatic case.

Conclusion: both `[someQuery()][0]?` and `match [someQuery()][0] {…}` are
well-formed, type-checking, spec-sanctioned programs that a conformant author can
write and load. This is a **real reachable bug**, not an out-of-grammar or
ill-typed shape.

## 5. Bottom line

1. **Fixable with acceptable risk — YES.** Add an operator-kind branch to
   `evalAsResult` (`statement-executor.ts`, before `:678`) that returns
   `evalExpr(operand, env, deps)` **raw** (no `asResultValue`). This dispatches
   the nested effect via the single async path and hands the true value to
   `evaluateMatch` / `evaluateQuestion`. It sidesteps the Ok-wrapping hazard
   (that hazard is only real for the *delegate* branch, which the fix does not
   use) and touches none of the working paths. ~6-line change + a regression
   test.

2. **Not a grammar/type consequence.** The shape is well-formed and loads
   (ERR-18's static check defers on the unresolvable element type). It is a real
   executor gap, not an unreachable/ill-typed program.

3. **Severity + reachability.** Reachability is **low but real**: the author must
   inline-construct a composite holding an effect, apply a pure operator to it,
   and feed that whole operator expression to `?`/`match` with no intervening
   `let` — idiomatic loom binds to a `let` first, which works. Severity is
   **mixed and split by form**: the `match` form is the dangerous class (silent
   wrong value, `success` outcome, no diagnostic — same danger class as the
   original bullet-2 bug); the `?` form is lower danger (loud abort, but an
   `internal-error` rather than a clean diagnostic). Given the low change cost
   and the silent-wrong-value danger of the `match` form, fixing is warranted;
   until then the `let`-binding workaround fully avoids it.
