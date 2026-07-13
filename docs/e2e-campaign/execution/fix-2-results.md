# FIX-2 — type-layer diagnostics (A2, A5, A6)

Implements the three missing type-phase diagnostics in the type-layer checker,
fed by the existing `V20b` static-type substrate. Each fires ONLY when the
operand / receiver static type is concretely resolvable; an unresolved
(`unknown`) type is deferred to the runtime safety net (no `type`-phase
diagnostic), mirroring the `let-rhs-type-mismatch` "statically resolvable" guard.

## Per-item status

| ID | Code | Sev/Phase | Status | Trigger verified | Normative message reproduced |
|---|---|---|---|---|---|
| A5 | `loom/parse/mixed-plus-operands` | E/type | done | `1 + "a"` → fires | `'+' has mixed operand types: integer and string` |
| A6 | `loom/parse/non-orderable-operands` | E/type | done | `1 < "a"`, `true < false` → fire | `'<' requires two numeric or two string operands; got integer and string` |
| A2 | `loom/parse/unknown-method` | E/parse | done | `"hello".frobnicate()` → fires | `unknown method 'frobnicate' on type string` |

Message strings sourced VERBATIM from `docs/spec_topics/diagnostics/code-registry-parse.md`
(rows `mixed-plus-operands`, `non-orderable-operands`, `unknown-method`), matching
`docs/reference/diagnostics.md` (DIAG-4).

## Changes (file:line)

### `src/parser/type-layer-checks.ts`
- `:37` header comment records A5/A6/A2 and the statically-resolvable guard.
- `:44` import `displayType`; `:57-59` import the three stdlib member allow-lists.
- `:91` `ORDERING_OPS` (`<`, `<=`, `>`, `>=`).
- `:107` `classifyOperand` — maps a `CompatType` to `numeric` / `string` / `other`
  / `unknown` (unfolds aliases; unresolved `named` → `unknown` → defer).
- `:154` `classifyReceiver` — maps a receiver `CompatType` to a concrete built-in
  (`string` / `array` / `object` / `number` / `integer` / `boolean` / `null`) or
  `unknown` (unresolved `named`, union → defer).
- `:184` `builtinMembers` — the per-built-in stdlib allow-list (member-less
  primitives → empty set).
- `:635-638` binary-op wiring: `+` → `checkPlusOperands`; ordering ops →
  `checkOrderingOperands`.
- `:682` `member` case wiring → `checkMemberAccess`.
- `:775-806` `checkMethodCall` extended: existing `array.join` precondition
  retained; adds A2 unknown-method after classifying the receiver.
- `:808-828` `checkMemberAccess` — A2 on bare property access; object *field*
  access (`obj.field`) and unresolved receivers are skipped.
- `:830-845` `pushUnknownMethod` — emits `loom/parse/unknown-method`.
- `:846-878` `checkPlusOperands` — A5.
- `:880-912` `checkOrderingOperands` — A6.

### `src/runtime/stdlib-string.ts` `:61`
- Export `STRING_MEMBERS` allow-list (kept in lockstep with `evaluateStringMember`).

### `src/runtime/stdlib-array.ts` `:45`
- Export `ARRAY_MEMBERS` allow-list (kept in lockstep with `evaluateArrayMember`).

### `src/runtime/stdlib-object.ts` `:83`
- Export `OBJECT_MEMBERS` allow-list (kept in lockstep with `evaluateObjectMember`).

The member allow-lists are the single source of truth for both the A2 check and
the runtime dispatcher, sourced from expressions.md §"Built-in methods and
properties".

## No-false-positive design

- **A5 / A6**: fire only when BOTH operands classify to a concrete category. Any
  `unknown` operand (unresolved identifier, call / member / index result, `Ok`/
  `Err`, query/invoke result the substrate cannot resolve) defers. A valid pair
  is `numeric+numeric` (incl. `integer`⊑`number`) or `string+string`; every other
  concrete pair fires. Booleans/null/enum/union/object/array against anything are
  correctly rejected only when statically concrete.
- **A2**: fires only when the receiver classifies to a concrete built-in. Object
  *field* access (`obj.field`) is never gated (it is not a stdlib member surface);
  only object *method* calls are checked against `keys`/`values`/`has`. Member-less
  primitives (`number`/`integer`/`boolean`/`null`) expose no members, so any
  member/method access on them is `unknown-method`. Unresolved receivers (free
  identifiers, chained-call results, unions) defer to the runtime.

### A2 boundary (documented)

A2 is scoped to receivers whose static type resolves to a concrete built-in
(`string`, `array`, `object`, or a member-less primitive). Receivers past the
parser's static view (an unresolved `NamedType`, a union, a chained
method/call/index result the substrate types as a sentinel `named`) are deferred
— they raise no `type`-phase diagnostic and fall through to the runtime. This is
the deliberate static→runtime fallback; it guarantees no valid loom with a
dynamically-typed receiver is wrongly rejected. Note the `V20b` substrate types
query/invoke bindings as their nominal ascription (`named <schema>`); object
*field* access on such a binding is skipped (never gated), and object *method*
calls on it would only fire for names outside `keys`/`values`/`has`, which no
valid loom uses (Results must be unwrapped before member access).

## Behavioural verification (via `parseDoc`, the shipped front-end)

```
1 + "a"                         => mixed-plus-operands: '+' has mixed operand types: integer and string
1 < "a"                         => non-orderable-operands: '<' requires two numeric or two string operands; got integer and string
true < false                    => non-orderable-operands: '<' requires two numeric or two string operands; got boolean and boolean
"hello".frobnicate()            => unknown-method: unknown method 'frobnicate' on type string
(5).toString()                  => unknown-method: unknown method 'toString' on type integer
schema P{...}; p.frob()         => unknown-method: unknown method 'frob' on type P
"hello".length                  => []   (valid property)
"a,b".split(",")                => []   (valid method)
1 + 2 / "a" + "b" / 1 < 2       => []   (valid operand pairs)
foo.bar()                       => []   (unresolved receiver — deferred)
schema P{...}; p.x              => []   (object field access — not gated)
[1,2,3].slice(0)                => []   (valid array method)
```

## Gate results

- `npm run typecheck` — clean.
- Established suite minus campaign witnesses (`--exclude tests/e2e-s{1..6}-*.test.ts`)
  — **148 files, 1745 tests passed** (including `committed-fixture-parse-gate`:
  22 passed — zero false positives on committed valid fixtures).
- `npm run test:conformance` — **1 file, 26 tests passed**.

No witness files (`tests/e2e-s*`) edited. No new registry codes. No globals/statics
(the checker builds fresh per-parse state; the allow-lists are module-level
`ReadonlySet` constants).
