# Final independent verification — README "bullet 2" residual closure

Adversarial, independent re-verification of the **second** change round documented
in `docs/e2e-campaign/execution/fix-bullet2-results.md` §"Residual closure"
(item-4 typecheck land-blocker + item-5 inline-composite-under-a-pure-operator
closure). The verifier did **not** write the changes. Every gate was re-run from
scratch; every behavioural claim was checked with **independently constructed
probes** (own AST builders, own `QueryModelDriver`/tool harness) driven through
the REAL production path — `createProductionProducerDeps` → `bindPromptConversation`
→ `executeBody`, real `createEffectfulStatementHost` + `runCodeSideToolCall`,
mirroring `tests/production-core-exec.test.ts`. No `src/**` or `README.md` edits
were made. The temporary probe file (`tests/_verify_bullet2_final_probe.test.ts`,
17 assertions) was removed after the run.

## Verdict summary

| Item | Subject | Verdict |
|---|---|---|
| 1 | Gates independently re-run (typecheck / lint / vitest / conformance) | **PASS** |
| 2 | All item-5 residual shapes now evaluate to the correct value | **PASS** |
| 3 | Semantics preserved (short-circuit / order / enum / propagation) | **PASS** |
| 4 | No false positives (pure looms + parse carve-outs) | **PASS** |
| 5 | Declared non-change (`evalAsResult` over operator-expr) | **CONFIRMED — narrow, mixed severity** |
| 6 | Test integrity of the 11 new regression tests | **PASS** |

**Overall recommendation: (B) — closed except one named narrow residual.** The
confirmed item-5 shape set (every value/tail-position operator over an inline
composite) is genuinely, independently closed. A real, reachable residual remains
only when such an operator expression is itself the operand of `?` or the
scrutinee of `match` — the change's explicitly-declared non-change. The current
README bullet is now **stale/incorrect** (it still claims the now-fixed
object-field / array-element shapes fail) and must be rewritten to the narrow
residual below.

Unlike the first round, the "typecheck clean" claim is now **true**
(independently confirmed).

---

## Item 1 — gates, independently re-run — PASS

| Gate | Command | Result | Author claim | Match |
|---|---|---|---|---|
| typecheck | `npm run typecheck` (`tsc --noEmit`) | **clean, exit 0** | clean | ✅ (prior round's false "clean" now genuinely true) |
| lint | `npm run lint` | **clean, exit 0** | clean | ✅ |
| full suite | `npx vitest run` | **170 files / 1886 tests, all green** | 170 / 1886 | ✅ |
| conformance | `npm run test:conformance` | **26 / 26 green** | 26 | ✅ |

The two prior `TS2345` sites in `tests/nested-control-in-pure-position.test.ts`
(lines ~252/269, `isResultValue(r.value)` with `r.value: LoomValue | undefined`)
are resolved via the `isResultValue(r.value as LoomValue)` narrowing; the whole
project typechecks. Numbers match the claim exactly.

## Item 2 — every residual shape now evaluates — PASS

Independently-constructed probes, each driven through `executeBody`; the scripted
`grep` tool records params + a dispatch counter so a genuine async dispatch (not
the pure host's `null` safety net) is provable.

| Independently-built shape | Outcome | Value | Effect dispatched? |
|---|---|---|---|
| `[ grep() ][0]` (index) | success | `Ok("42 matches")` | yes (calls=1) ✅ |
| `{ f: grep() }.f` (member) | success | `Ok("42 matches")` | yes ✅ |
| `true ? [ grep() ][0] : 0` (ternary taken) | success | `Ok("42 matches")` | yes (calls=1) ✅ |
| `[ match Ok("hi"){…} ][0] + "!"` (binary) | success | `"hi!"` — **not `"nullx"`** | (control) ✅ |
| `[ grep() ].length` (method-call) | success | `1` | yes (calls=1) ✅ |
| `Ok(grep())` (result-ctor) | success | `Ok(Ok("42 matches"))` | yes ✅ |
| `Ok([ grep() ])` (result-ctor over array) | success | `Ok([Ok("42 matches")])` | yes (calls=1) ✅ |

All seven required shapes evaluate correctly; none is `null` and none is a coerced
derivative. The implementation routes each operand subtree through the async
`evalExpr` and applies the **same runtime primitives the pure host uses**
(`evaluateIndexAccess` / `evaluateMemberAccess` / `valuesEqual` + arithmetic /
`evaluateStringMember`/`evaluateArrayMember`/`evaluateObjectMember` / `makeOk`),
so the value/branding cannot diverge from the pure path.

## Item 3 — semantics preserved — PASS

The regression risks were the focus. All independently confirmed:

| Probe | Result | Evidence |
|---|---|---|
| `false && ([ grep() ].length > 0)` | `false`, **calls=0** | dead `&&` operand never dispatched ✅ |
| `true \|\| ([ grep() ].length > 0)` | `true`, **calls=0** | dead `\|\|` operand never dispatched ✅ |
| `false ? [ grep() ][0] : 5` | `5`, **calls=0** | not-taken ternary branch never dispatched ✅ |
| `[ tag("recv") ].includes( tag("arg") )` | dispatch order `["recv","arg"]` | receiver-then-args left-to-right ✅ |
| `enum Color{Red,Green}; Color.Green` | enum value carrying wire `"Green"`, not `null` | `Enum.Variant` member read intact (short-circuited to `resolveEnumVariant` before member access) ✅ |
| failing `grep()?` nested in **all 6** shapes (index/member/binary/ternary/method-call/result-ctor) | every one `outcome==="fail"`, value≠`null` | matches the independently-computed tail-position baseline (`fail`) exactly ✅ |

The `evalBinary` helper implements `!`/unary-`-` (right-only), `&&`/`||`
(right-operand evaluated only when the left does not decide) and left-then-right
scalar ordering identically to the pure host; the `ternary` branch evaluates the
condition then ONLY the taken arm. A failing nested effect's non-`value` flow is
carried verbatim, so terminal outcomes equal tail position across every shape.

## Item 4 — no false positives — PASS

Independent pure-loom probes (no nested effects) all produce ordinary values:
`[10,20][1]==20`, `{a:3}.a==3`, `2+3==5`, `"a"+"b"=="ab"`, `true?1:2==1`,
`[1,2,3].length==3`, `1==1 → true`, `"a"!="b" → true`, `!false → true`. Values
are identical to the pre-change pure path (same primitives).

Parse-time carve-outs are structurally untouched (the change is confined to the
runtime `statement-executor.ts`; no parser/lowering path is touched). Confirmed
by the first-round verification (`verify-bullet2.md` item 3) against the shipped
enforcement — Pi-tool single-arg `loom/parse/tool-arg-not-literal` fires on a
non-literal (`read({ path: resolve(x) })`), silent on the literal; `params:`
default `loom/parse/default-not-literal` fires on `= compute()`, silent on `=
"TypeScript"`. Since both sites are literal-restricted at parse, no effect/control
form can occur there at runtime — the new executor branches are strictly additive.
The full suite + conformance being green corroborates zero regressions.

## Item 5 — declared non-change: `evalAsResult` over an operator expression — CONFIRMED

`evalExpr` (the value/tail path) was extended to decompose
`index`/`member`/`ternary`/`binary`/`method-call`/`result-ctor`, but `evalAsResult`
(the `?`-operand / `match`-scrutinee path, `statement-executor.ts:~665`) was
deliberately **not** — its delegate predicate covers only
`try`/`match`/`object`/`array`/user-`fn` call. So an operator expression holding
an inline-composite effect, when it is the operand of `?` or the scrutinee of
`match`, still falls to `checkpointFor === null` → the sync pure host →
`evaluatePureExpression`'s `default: return null`.

Independently probed and characterised (dispatch counter proves the effect never
fired):

| Shape (no intervening `let`) | Observed behaviour | Effect dispatched? | Severity |
|---|---|---|---|
| `match [ grep() ][0] { Ok(v)=>v, _=>0 }` | **outcome `success`, value `0`** (scrutinee silently `null` → wildcard arm; WRONG value) | **no** (calls=0) | **silent-wrong-value — dangerous** |
| `([ grep() ][0])?` (`?` over the operator expr) | **aborts** — raw `TypeError` (`?` on `null`) surfaced via `surfaceUnexpectedThrow` as a `loom/runtime/internal-error` `loom-system-note`; loom aborts | **no** (calls=0) | **loud abort — lower danger, poor message** |
| `let a=[ grep() ]; a[0]?` (bound baseline, contrast) | success, value `"42 matches"` | **yes** (calls=1) | fixed ✅ |

Notes:
- The `?` variant does **not** silent-null as the change-doc loosely implies — it
  produces an uncaught `TypeError` that production frames as an `internal-error`
  system note (verified: `loom-composition-producer.ts` top-level `catch` →
  `surfaceUnexpectedThrow`). Loud, not silent — but an internal-error rather than
  a clean diagnostic. This behaviour is pre-existing (the diff never touched
  `evalAsResult`'s operator handling), so it is **not a new regression**.
- The `match` variant IS a silent wrong-value (success + coerced-null scrutinee),
  the same danger class as the original bullet-2 bug. Also pre-existing / not a
  new regression.
- **Reachability & likelihood: low.** An author must inline-construct a composite
  holding an effect/control form, apply a pure operator to it, AND feed that whole
  operator expression to `?` or `match`, all with no intervening `let`. Idiomatic
  loom binds to a `let` first, which fully avoids it (baseline row proves the
  bound form works). The confirmed item-5 set from `verify-bullet2.md` (all
  value/tail positions) is fully closed; this edge is a distinct, narrower
  combination outside that set.
- **Consistency defect worth noting:** the fix makes `[<effect>][0]` work but
  `[<effect>][0]?` / `match [<effect>][0]` not — a real author could reasonably
  expect the `?`/`match` forms to work given the value form now does.

## Item 6 — test integrity of the 11 new regression tests — PASS

`tests/nested-control-in-pure-position.test.ts` runs 16 tests green independently
(5 original + 11 new, matching the claim). The 11 new tests assert **concrete
non-null values / correct terminal outcomes**, never `null`, never a tautology:

- Value assertions pin fix-dependent constants: `.toBe(7)`, `.toBe(8)`,
  `.toBe(9)`, `.toBe(1)`, `"hi!"`, dispatched `Ok("42 matches")` + `.received()`
  equals the lowered `{pattern:"TODO",path:"src"}`, result-ctor inner value `5`.
- Short-circuit tests assert `tool.received()` is **`undefined`** (effect NOT
  dispatched) alongside the short-circuit value — a real behavioural pin.
- The failing-effect loop asserts each of the 6 operator shapes has
  `outcome === baseline` where the baseline is the **independently-computed** tail
  `grep()?` outcome (`"fail"`), plus value `≠ null`.

Dispositive differential (my own probes): the SAME nested effect yields the
correct value in the fixed operator positions and dispatches (calls=1), but
silent-nulls with no dispatch (calls=0) in the unfixed `?`/`match`-scrutinee
positions — proving the assertions pin real, fix-dependent behaviour, not
constants. No test asserts `null`; no test is self-referential.

Caveat (minor): the failing-effect assertions use `.not.toBe(null)` (a weak lower
bound) rather than pinning the exact `Err`; this is acceptable because it is
paired with the exact `outcome` equality against the independent baseline.

---

## Non-change map (item 5: shape → behaviour → severity)

| Shape | Behaviour | Dispatch | Severity | New regression? |
|---|---|---|---|---|
| `match <op-expr holding inline effect> {…}` | silent `null` scrutinee → wrong arm, `success` | no | dangerous (silent wrong value) | no (pre-existing) |
| `<op-expr holding inline effect>?` | `internal-error` `loom-system-note`, loom aborts | no | loud, poor message | no (pre-existing) |
| every value/tail operator shape (item-5 confirmed set) | correct value, effect dispatches | yes | — | closed ✅ |

---

## Recommendation for README bullet 2 — (B) closed except a named narrow residual

The current bullet is **stale and must be rewritten**: it still claims the
object-literal field value / array-element / operator shapes "do not evaluate —
silently yields `null`" and prescribes the `let` workaround, but those shapes now
evaluate correctly (item 2). Do **not** pick (A) fully-closed — a real silent
wrong-value residual (`match` over an operator-expr holding an inline effect)
remains. Do **not** pick (C) reopen — the broad gap and the entire confirmed
item-5 set are genuinely, independently closed.

Suggested replacement bullet (orchestrator to apply to `README.md`; verifier did
not edit it):

> A control/effect form (a nested `match`, or an effectful user-`fn` call /
> tool-call / `@`-query / `invoke`) evaluates correctly as a tail, a `match`-arm
> body, a `let` initializer, an object-literal field value, an array element, and
> as the operand of a pure operator (`index` / `member` / `binary` / `ternary` /
> `method-call` / `Ok(…)`/`Err(…)`) applied to a freshly-constructed composite.
> It does **not** yet evaluate when such a pure-operator expression is *itself*
> the operand of `?` or the scrutinee of a `match` with no intervening binding
> (e.g. `[<effect>][0]?` or `match [<effect>][0] { … }`): the `match` form
> silently yields `null` (no diagnostic; outcome still success) and the `?` form
> aborts with an internal-error note. Bind the composite (or the form) to a `let`
> first, then operate on the binding.

No pre-land blockers remain (typecheck/lint/suite/conformance all green).
