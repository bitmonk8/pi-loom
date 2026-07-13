# Fix — README known gap "bullet 2": nested control/effect form in a wholesale-evaluated pure expression

## Root cause (confirmed)

Two body-expression evaluation paths exist:

- **Async executor** — `evalExpr` in `src/runtime/statement-executor.ts:319`
  (`async … Promise<EvalResult>`). It special-cases the control/effect forms
  (`try`, `match`, user-`fn` `call`) and routes checkpointed effects
  (`query`/`call`/`invoke`) through `runCancellableSequence` → `host.runEffect`
  (`effectful-statement-host.ts` `runQueryEffect`/`runToolCallEffect`/`runInvokeEffect`).
  This is the only path that can dispatch effects (it is `async`).
- **Sync pure host** — `evaluatePureExpression` in
  `src/extension/production-loom-producer.ts:3842` (synchronous). Reached via
  `host.evaluatePure` when `evalExpr` sees a pure (non-checkpointed) node.

`evalExpr` decomposed `try`/`match`/`call` but **not** `object` / `array`, so a
composite literal was handed wholesale to the sync pure host, whose `case "array"`
(`production-loom-producer.ts:3855`) and `case "object"` (`:3858`) recurse into
`evaluatePureExpression` per element/field. A `match` / `query` / non-`fn` `call`
(tool-call) / `invoke` sub-expression there fell to `default: return null`
(`:3931-3935`) — silent `null`, `success` outcome, no diagnostic. Confirmed by
`docs/e2e-campaign/findings/readme-accuracy.md` §"Bullet 2" and the DIVERGENCE-2 probe.

## Approach

Mirror the V20e match-arm-body precedent: decompose the composite node **on the
async executor** (`evalExpr`) and recurse through `evalExpr` per field/element,
so a nested `match` / effect dispatches through the single real evaluation path.
The pure host was left unchanged (it cannot be made async without introducing
checkpoint/effect machinery that is the executor's role, and it is still correct
for the genuinely-pure sites: `${…}` interpolation, `params:` defaults, Pi-tool
single-arg lowering).

No new host method was needed: object branding uses `env.resolveSchema`
(`lexical-environment.ts:356`) and `brandSchemaValue` (`runtime/value.ts:136`),
identical to the pure host's `case "object"`.

## Carve-outs preserved

- **Pi-tool single positional-arg literal-sublanguage restriction** —
  enforced at parse time (`src/runtime/tool-call.ts:154` →
  `loom/parse/tool-arg-not-literal`; grammar in `src/parser/literal-sublanguage.ts`).
- **`params:` defaults literal-sublanguage restriction** —
  `src/parser/params.ts:171` → `loom/parse/default-not-literal`.

The fix is confined to `statement-executor.ts` and touches no parser code and no
lowering path (`lowerToolCallParams` stays synchronous). Tool-arg objects and
`params:` defaults are literal-restricted at parse, so no effect/control form can
occur there at runtime; both carve-outs are untouched. `checkpointFor` already
returns `null` for `object`/`array`, so the new branches are strictly additive —
genuinely-pure composites produce identical values (same branding), while
effect/control-bearing ones now dispatch instead of yielding `null`. Terminal
semantics are preserved: any field/element evaluating to a non-`value` flow
(`fail` / `propagate` / `cancel`) short-circuits and carries that terminal flow
verbatim (same as tail position).

## Changes (file:line)

- `src/runtime/statement-executor.ts:60` — add `brandSchemaValue` to the
  `./value` import.
- `src/runtime/statement-executor.ts:339-373` — in `evalExpr`, decompose
  `expr.kind === "array"` and `expr.kind === "object"` on the executor path
  (recurse via async `evalExpr`, short-circuit on any non-`value` flow, brand
  schema-constructor objects), inserted before the `checkpointFor` dispatch.
- `src/runtime/statement-executor.ts:453-454` — extend `evalAsResult`'s delegate
  predicate so an `object`/`array` `match`-scrutinee / `?`-operand routes through
  `evalExpr` then normalises via `asResultValue` (edge completeness/uniformity).

## New regression test

`tests/nested-control-in-pure-position.test.ts` (5 tests) — drives the real
production path (`createEffectfulStatementHost` + `runCodeSideToolCall`), mirrors
`tests/production-core-exec.test.ts`:

1. object field `{ f: match Ok(1) { Ok(v) => v, _ => 0 } }` → field is `1` (was `null`).
2. array element `let a = [ match Ok(2) {…} ]; a[0]` → `2` (was `null`).
3. object field `{ hits: grep({…}) }` → dispatches the tool, binds `Ok("42 matches")` (was `null`).
4. array element `let a = [ grep({…}) ]; a[0]` → `Ok("42 matches")` (was `null`).
5. failing effect: `[ grep({…})? ]` (execute throws) propagates `fail` **identically to
   `grep({…})?` in tail position** — not `success`/`[null]`.

## Suite results

- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `npx vitest run` — 170 files / 1875 tests, all green (was 169 / 1870; +1 file, +5 tests).
- `npm run test:conformance` — 26/26 green.

## Residual closure (verify-bullet2.md items 4 + 5)

Follow-up landing that (a) fixes the typecheck land-blocker and (b) closes the
inline-composite-under-a-pure-operator residual documented below. Supersedes the
prior "Known residual" note.

### Item 4 — typecheck land-blocker (fixed)

The prior claim "typecheck clean" was false: `tests/nested-control-in-pure-position.test.ts`
had two `TS2345` errors passing `r.value` (`LoomValue | undefined`) to
`isResultValue(value: LoomValue)`. Narrowed via the file's existing `as`-cast
convention — `isResultValue(r.value as LoomValue)` — which does not weaken the
assertion (an `undefined` value still fails `isResultValue(...).toBe(true)` at
runtime). `npm run typecheck` now clean (verified this pass).

### Item 5 — inline-composite-under-a-pure-operator residual (FULLY closed)

The residual was: a control/effect form in an **inline** composite consumed
**directly** by a pure operator with no intervening `let` (`[<effect>][0]`,
`{ f: <effect> }.f`, and `index`/`member`/`binary`/`ternary`/`method-call` over
such a composite) was handed wholesale to the sync pure host and hit its
`default: return null` (silent `null`, or a coerced derivative such as `"nullx"`
for `binary +` / `false` for a method-call).

Closed by extending the SAME executor-decomposition pattern the object/array fix
used to the pure-operator node kinds: `evalExpr` now decomposes `index`,
`member`, `ternary`, `binary`, `method-call` (and `result-ctor`, the same
silent-null class — `Ok(<effect>)` / `Ok([<effect>])`) on the async executor.
Each operand subtree is routed through `evalExpr` (so a nested `match` / `?` /
effect dispatches through the single real path), any non-`value` flow
short-circuits and carries that terminal flow verbatim (identical to tail
position), then the SAME pure-operator primitive the pure host uses is applied to
the resolved operands. The primitives are the exact runtime-exported functions
the pure host itself calls, so the two paths cannot diverge:

- `index` → `evaluateIndexAccess` (`runtime-panics.ts`).
- `member` → `evaluateMemberAccess` (`runtime-panics.ts`); the `Enum.Variant`
  read (non-local ident naming a registered enum) is short-circuited to
  `resolveEnumVariant` first, exactly as the pure host does.
- `binary` → `!` / unary `-` evaluate only the right operand; `&&` / `||`
  evaluate the right operand only when the left does not decide the result;
  scalar ops use the pure host's disposition via the shared `valuesEqual`
  relation (`value.ts`) + the spec-locked arithmetic switch.
- `ternary` → evaluates the condition, then ONLY the taken branch (a not-taken
  effect never dispatches).
- `method-call` → evaluates receiver-then-args left-to-right, then dispatches on
  `evaluateStringMember` / `evaluateArrayMember` / `evaluateObjectMember`
  (`stdlib-*.ts`).
- `result-ctor` → decomposes the constructor argument, then `makeOk`/`makeErr`.

Semantics preserved (verified by regression tests): `&&`/`||` short-circuit and
a not-taken ternary branch do NOT dispatch a nested effect; a failing nested
effect propagates identically to tail position across every operator shape; a
genuinely-pure operator produces the identical value the pure host would (same
primitives), so valid pure looms are unaffected (full suite + conformance green).

**Shapes that now work:** every shape in verify-bullet2.md item 5 —
`[<effect>][0]`, `{ f: <effect> }.f`, `[<match>][0]`, `{ f: <match> }.f`,
`[<effect>].length` (method-call), `true ? [<effect>][0] : 0` (ternary),
`[<control>][0] + "…"` (binary; no `"nullx"` coercion) — plus `Ok(<effect>)` /
`Ok([<effect>])` (result-ctor, the same class).

**Shapes that remain:** none in the confirmed residual set. One deliberate
non-change: `evalAsResult` (the `?`-operand / `match`-scrutinee path) was left
unextended — routing the new operator kinds through its delegate branch would
force `asResultValue` Ok-wrapping onto non-Result operator values (a semantic
divergence for `match <op-expr>`). The confirmed residual shapes are all
value/tail positions handled by `evalExpr`, so this is not a gap for item 5; a
control/effect nested in an operator that is itself the operand of `?` or the
scrutinee of `match` (e.g. `[<effect>][0]?`) is a distinct theoretical edge, not
in the confirmed set, and is left separately tracked to avoid the wrapping hazard.

### Residual-closure changes (file:line)

- `src/runtime/statement-executor.ts:54-57` — import `evaluateIndexAccess` /
  `evaluateMemberAccess` (`./runtime-panics`) and the `evaluateStringMember` /
  `evaluateArrayMember` / `evaluateObjectMember` stdlib member surfaces.
- `src/runtime/statement-executor.ts:69` — add `valuesEqual` to the `./value`
  import; line 37 — add `BinaryExpr` to the `loom-document` type import.
- `src/runtime/statement-executor.ts:389-471` — in `evalExpr`, decompose
  `index` / `member` / `ternary` / `binary` / `method-call` / `result-ctor` on
  the executor path (inserted after the `object` branch, before the
  `checkpointFor` dispatch).
- `src/runtime/statement-executor.ts:529-635` — `evalBinary` (short-circuit /
  unary ordering), `applyBinaryScalar` (scalar disposition via `valuesEqual`),
  `applyStdlibMethod` (receiver-typed stdlib dispatch) helpers.
- `tests/nested-control-in-pure-position.test.ts` — typecheck narrowing (2
  sites) + 11 new regression tests (5 → 16): value + short-circuit +
  failure-propagation coverage for each operator shape.

### Final gates (residual closure)

- `npm run typecheck` — clean (verified independently this pass).
- `npm run lint` — clean.
- `npx vitest run` — 170 files / **1886** tests, all green (was 170 / 1875; +11).
- `npm run test:conformance` — 26/26 green.

**Verdict: the bullet-2 residual is FULLY closed** for the confirmed shape set.
The only intentionally-unaddressed edge is a control/effect form nested inside an
operator that is itself a `?` operand or a `match` scrutinee (not in the
verify-bullet2.md item-5 set), left tracked to avoid a `match`-scrutinee wrapping
regression.

---

## Final residual closure (evalAsResult)

The previously-tracked edge above — a pure-operator expression that is itself the
`?`-operand or `match`-scrutinee, with no intervening `let` (e.g.
`match [someQuery()][0] {…}`, `[someQuery()][0]?`) — is now closed. Root-cause
and fix sketch: `docs/e2e-campaign/findings/residual-bug-analysis.md`.

### Mechanism (why it survived the first pass)

`?`-operands and `match`-scrutinees are evaluated by `evalAsResult`
(`statement-executor.ts`), a path SEPARATE from `evalExpr`. The bullet-2 fix
extended `evalExpr` to decompose the pure-operator kinds, but `evalAsResult`'s
delegate predicate covered only `try`/`match`/`object`/`array`/user-`fn`-call.
An operator expression holding an inline-composite effect fell through to the
sync pure host (`evaluatePureExpression` → `default`/tool `case "call"` → `null`)
WITHOUT dispatching the effect — `match` silently took the wildcard arm
(`success`, wrong value); `?` did `null.ok` → `TypeError` →
`loom/runtime/internal-error` abort.

### Approach

Per the analysis (option a — NOT extending the delegate branch): add an
operator-kind branch to `evalAsResult` BEFORE the delegate/`asResultValue`
`checkpointFor` path that, for `index`/`member`/`binary`/`ternary`/`method-call`/
`result-ctor`, returns `evalExpr(operand, env, deps)` **raw** — no `asResultValue`
Ok-wrapping. The nested effect dispatches through the single async `evalExpr`
path (which already fully handles these kinds from bullet-2, carrying
short-circuit / fail / cancel flows and identical branding primitives) and the
TRUE resolved value is handed to the existing `evaluateMatch` /
`evaluateQuestion`. Returning raw (mirroring the pure branch below it)
deliberately avoids the Ok-wrapping hazard that afflicts only the delegate
branch and would corrupt `match <non-Result-expr>`.

### Changes (file:line)

- `src/runtime/statement-executor.ts:678-696` — in `evalAsResult`, insert the
  operator-kind branch (`index`/`member`/`binary`/`ternary`/`method-call`/
  `result-ctor` → `return evalExpr(operand, env, deps)` raw) immediately before
  the `checkpointFor` dispatch. No other src file touched; edit confined to
  `src/runtime/**`.

### New tests (`tests/nested-control-in-pure-position.test.ts`, +10)

Four new describe blocks (16 → 27 tests total in the file):
- control/effect operator expr as scrutinee/operand: `match [grep()][0] {…}`,
  `[grep()][0]?`, member-scrutinee, ternary-operand, `Ok(grep())?` — all
  dispatch the effect and bind the true Result payload.
- NON-Result `match`-scrutinee by-value (no Ok-wrapping regression):
  `match [1][0] { 1 => … }`, `match ("a"+"b") { "ab" => … }`,
  `match [grep()].length { 1 => … }` — resolved plain values match literal
  arms, proving no `Ok(...)` wrap.
- short-circuit / not-taken branch in scrutinee/operand position:
  `match (false ? [grep()][0] : …)` and `match (false && [grep()].length>0)`
  — no dispatch, correct by-value match.
- failing effect under a `?`-operand: `[grep()][0]?` over a failing tool-call
  propagates the SAME `fail` outcome as tail position (no `internal-error`, no
  silent null).

### Final gates (final residual closure)

- `npm run typecheck` — clean (verified this pass).
- `npm run lint` — clean.
- `npm test` — 170 files / **1897** tests, all green (+10 new).
- `npm run test:conformance` — 26/26 green.

**Verdict: the bullet-2 work is now FULLY closed.** No residual remains for the
control/effect-in-pure-position class — both the inline-composite shapes (first
pass) and the operator-expression-as-`?`/`match` shape (this pass) dispatch the
nested effect through the single async `evalExpr` path with preserved
short-circuit / ordering / branding and no `Ok`-wrapping regression.
