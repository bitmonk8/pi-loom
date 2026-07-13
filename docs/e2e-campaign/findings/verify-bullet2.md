# Independent verification — README "bullet 2" fix (nested control/effect in wholesale-evaluated pure positions)

Adversarial, independent verification of the fix documented in
`docs/e2e-campaign/execution/fix-bullet2-results.md`. The verifier did **not**
write the fix. All probes below were constructed independently (own ASTs, own
driver harness mirroring `tests/production-core-exec.test.ts`) and driven through
the REAL production path (`createProductionProducerDeps` → `bindPromptConversation`
→ `executeBody`, real `createEffectfulStatementHost` + `runCodeSideToolCall`).
No `src/**` or `README.md` edits were made. The temporary probe file
(`tests/_verify_bullet2_probe.test.ts`, 20 assertions) was removed after the run.

The fix under test is the working-tree (uncommitted) change to
`src/runtime/statement-executor.ts` (`evalExpr` object/array decomposition +
`evalAsResult` predicate extension), matching the documented approach verbatim.

## Verdict summary

| Item | Subject | Verdict |
|---|---|---|
| 1 | Original repro (match + effect in object-field / array-element) evaluates | **PASS** |
| 2 | Failing nested effect propagates identically to tail | **PASS** |
| 3 | Parse-time carve-outs (tool-arg / params-default literal sublanguage) intact; valid looms unaffected | **PASS** |
| 4 | Suites green; new regression test asserts the right thing (not a tautology) | **PASS at runtime**, but **typecheck is RED** (see caveat) |
| 5 | Residual inline-pure-parent edge | **CONFIRMED, silent-null, narrow** |

**Overall recommendation: (B) — mostly closed. Replace the current README bullet
with a narrow residual note.** The current README bullet is now *stale/incorrect*
(it still claims the fixed shapes fail and prescribes a workaround that is no
longer needed). One delivery blocker must be fixed first: the new test file does
not typecheck (`npm run typecheck` is RED), contradicting the author's "clean"
claim.

---

## Item 1 — original repro on the fixed tree — PASS

Independent probes, all driven through `executeBody`:

| Shape (independently constructed) | Outcome | Value | Expected |
|---|---|---|---|
| `let p = { f: match Ok(1) { Ok(v)=>v, _=>0 } }; p.f` | success | `1` | `1` ✅ (was `null`) |
| `let a = [ match Ok(5) { Ok(v)=>v, _=>0 } ]; a[0]` | success | `5` | `5` ✅ (was `null`) |
| `let o = { hits: grep({pattern,path}) }; o.hits` | success | `Ok("42 matches")` | dispatched Result ✅ |
| `let a = [ grep({pattern,path}) ]; a[0]` | success | `Ok("42 matches")` | dispatched Result ✅ |

For the effectful shapes the scripted `grep` tool double recorded the real lowered
params `{ pattern: "TODO", path: "src" }` — i.e. the effect genuinely dispatched
through the async executor / `runCodeSideToolCall`, it did not fall to the pure
host's `null` safety net. Query/invoke are the same dispatch class as tool-call
(`checkpointFor` → `runEffect`); the tool-call proof generalises to them (the live
query/invoke spawn paths need the opt-in live suite, as the author notes).

## Item 2 — error propagation — PASS

The failure of a nested effectful form propagates identically to tail position
(does NOT swallow to a `success`/`null`):

| Shape | Outcome | Note |
|---|---|---|
| tail `grep()?` (baseline, failing tool) | `fail` | reference terminal outcome |
| array element `[ grep()? ]` | `fail` | equals baseline ✅ |
| object field `{ f: grep()? }` | `fail` | equals baseline ✅ |
| bound-then-used `let a = [ grep()? ]; a[0]` | `fail` | canonical bullet-2 shape ✅ |

The short-circuit in `evalExpr`'s object/array branches (`if (evaluated.flow !==
"value") return evaluated;`) carries the `fail` flow verbatim, so the terminal
outcome matches tail position exactly. Pre-fix these produced `success` with a
bound `[null]` / `{f:null}`.

## Item 3 — carve-outs intact / no false positives — PASS

The fix touches only `statement-executor.ts` (runtime); it does not touch any
parser or lowering path, so the parse-time literal-sublanguage restrictions are
structurally untouched. Confirmed positively against the shipped enforcement:

- **Pi-tool single object arg** — `checkToolCallArguments` (the real parse
  enforcement, `src/runtime/tool-call.ts`) on `read({ path: resolve(x) })` still
  fires `loom/parse/tool-arg-not-literal`; on the literal `read({ path:
  "src/main.ts" })` it fires nothing. ✅
  (Note: full-document `parseDoc` does not resolve `read` as a Pi tool without a
  registry, so the check is only reachable via the enforcement entry point — the
  same path the shipped parser calls.)
- **`params:` default RHS** — full-document `parseDoc` of
  `params:\n  language: string = compute()` still fires
  `loom/parse/default-not-literal`; the literal `= "TypeScript"` fires nothing. ✅
- **Valid loom unaffected** — a loom with a literal tool arg and a literal default
  emits neither carve-out diagnostic. ✅

Because both argument objects and `params:` defaults are literal-restricted at
parse, no effect/control form can occur at those runtime sites; the new executor
branches are strictly additive.

## Item 4 — suites + new-test integrity — PASS at runtime, TYPECHECK RED

Independently re-run on the fixed tree:

| Gate | Result | Author claim | Match |
|---|---|---|---|
| `npx vitest run` | **170 files / 1875 tests, all green** | 170 / 1875 | ✅ |
| `npm run test:conformance` | **26/26 green** | 26 | ✅ |
| `npm run lint` | **clean** | clean | ✅ |
| `npm run typecheck` | **RED — 2 errors** | "clean" | ❌ **FALSE** |

**Typecheck defect (blocker for the "clean" claim).** `tsc -p tsconfig.json
--noEmit` fails with two errors, both in the author's own new test:

```
tests/nested-control-in-pure-position.test.ts(252,26): error TS2345:
  Argument of type 'LoomValue | undefined' is not assignable to parameter of type 'LoomValue'.
tests/nested-control-in-pure-position.test.ts(269,26): error TS2345: ... (same)
```

Both are `isResultValue(r.value)` where `runBody` returns `value: LoomValue |
undefined`. This is a type-strictness defect only (vitest transpiles without
type-checking, so the tests still run and pass), but it means the fix as
delivered does **not** pass the repo's typecheck gate. Trivial fix
(narrow/assert `r.value`), but it must be applied before landing.

**New test is not a tautology.** `tests/nested-control-in-pure-position.test.ts`
asserts concrete non-null values (`.toBe(1)`, `.toBe(2)`, dispatched
`Ok("42 matches")`, `tool.received()` equals the lowered params) and, for the
failing case, `nested.outcome === tail.outcome === "fail"` plus
`nested.value ≠ null`. It never asserts `null` and never asserts a value equal to
its own input. Independent corroboration: my own separately-constructed ASTs
produced the identical values (Item 1/2). Dispositive differential (Item 5): the
SAME nested `match`/effect yields the correct value when the composite is owned
by the executor (bound-then-used) but `null` when owned by the pure host
(inline-under-pure-operator) — proving the assertions pin real, fix-dependent
behaviour, not a constant.

## Item 5 — residual edge map (inline composite under a pure operator, no `let`)

An effect/control form nested in an **inline** composite that is consumed
**directly** by a pure operator is still handed wholesale to the sync pure host
(the parent `index`/`member`/`binary`/`ternary`/`method-call` node has
`checkpointFor === null` → `evaluatePure`, which recurses synchronously and
cannot dispatch), so it hits `evaluatePureExpression`'s `default: return null`.
Every such shape is **silent** (outcome `success`, effect NOT dispatched):

| Inline shape (no `let`) | Outcome | Value | Effect dispatched? | Still broken? |
|---|---|---|---|---|
| `[ grep() ][0]` | success | `null` | no | **yes** |
| `{ f: grep() }.f` | success | `null` | no | **yes** |
| `[ match Ok(9){…} ][0]` | success | `null` | (control) | **yes** |
| `{ f: match Ok(9){…} }.f` | success | `null` | (control) | **yes** |
| `[ grep() ].includes("x")` (method-call) | success | `false` | no | **yes** (wrong value, coerced) |
| `true ? [ grep() ][0] : 0` (ternary) | success | `null` | no | **yes** |
| `[ grep() ][0] + "x"` (binary) | success | `"nullx"` | no | **yes** (silent null coerced into a plausible string) |
| **CONTROL** `let a = [ grep() ]; a[0]` (fixed shape) | success | `Ok("42 matches")` | **yes** | no ✅ |

The failure class is exactly the original bullet-2 class: **silent `null` (or a
coerced derivative such as `"nullx"` / `false`) with a `success` outcome and no
diagnostic** — the dangerous mode, not an error. The `binary` case is the worst:
the null is silently coerced into a real-looking string.

**Scope confirmation.** The fix is recursive down the composite tree: an effect
nested in a composite that is itself a field/element of a bound composite works
(each nested `object`/`array` re-enters `evalExpr`). The residual is *only* the
inline-composite-directly-under-a-pure-operator case with no intervening `let`.

**Severity.** Medium-low likelihood, bad (silent) failure mode, fully avoidable:

- Likelihood: an author must inline-construct a composite AND immediately
  index / member-access / operate on it in the same expression AND place an
  effect/control form inside — e.g. `{ result: grep(…) }.result` or
  `[ compute() ][0]`. Idiomatic loom binds to a `let` first; the residual never
  fires once a `let` is introduced.
- Failure mode: silent-null (success + wrong value), no diagnostic. Same danger
  class as the original bug.
- Mitigation: identical one-line workaround — introduce a `let` for the composite
  (or the effect) and reference the binding.

---

## Recommendation to the orchestrator — (B) mostly closed; narrow the note

The broad bullet-2 gap is closed for the shapes the README currently names
(object-literal field value, array element, and the bound-then-used pattern). The
**current README Status bullet is now stale and incorrect**: it still asserts
those shapes "do not evaluate … silently yields `null`" and prescribes "bind such
a form to a `let` first, then reference the binding inside the object literal or
array" — a workaround that is (a) no longer needed for the shapes it names and
(b) not even the failing case anymore.

Do NOT call bullet 2 fully closed (option A): a real, silent-null residual remains.
Do NOT reopen (option C): the targeted gap is genuinely fixed and covered.

**Rewrite the bullet to name only the residual** (suggested content for the
orchestrator to apply to `README.md`; the verifier did not edit the README):

> A control/effect form (a nested `match`, or an effectful `@`-query / tool-call /
> `invoke` / user-`fn` call) evaluates correctly as an object-literal field value,
> an array element, a `let` initializer, a tail, a `match` scrutinee, or a `?`
> operand. It still does **not** evaluate when written **inline** as the operand of
> a pure operator with no intervening binding — e.g. `[<effect>][0]`,
> `{ f: <effect> }.f`, or an `index` / `member` / `binary` / `ternary` /
> `method-call` applied directly to a freshly-constructed composite that holds the
> form; it silently yields `null` (no diagnostic; outcome still success). Bind the
> composite (or the form) to a `let` first, then operate on the binding.

Blocking pre-land item (independent of the README): fix the two `TS2345` errors in
`tests/nested-control-in-pure-position.test.ts` so `npm run typecheck` is green —
the author's "typecheck clean" claim is currently false.
