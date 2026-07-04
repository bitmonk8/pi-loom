# Hardening findings — Expressions & Control Flow

Area: arithmetic / comparison / boolean / string operators & precedence,
integer-vs-number semantics, string interpolation & escapes, let/binding &
scoping, if/else, while, for, match, ternary, user fn + recursion + return,
enums, and the string/array/object stdlib.

Method: live probes against the SHIPPED extension (`tests/hardening/probe-harness.ts`).
Deterministic channel — each loom computes values into `let` bindings (the real
expression evaluator) and interpolates them into a single `@`-query template;
assertions run against `turn.userTexts`. Probe files: `tests/hardening/exprflow-*.test.ts`.

Verified CORRECT (no findings): operator precedence (`2 + 3 * 4` → 14; `-2 * 3`
→ -6), left-associativity, comparison, `&&`/`||`, `!`, ternary branch selection,
`/` always-number (`7/2` → 3.5), `%` sign (`-7 % 3` → -1), string `+`
concatenation, the full `string` stdlib incl. all five normative `replace`
reference vectors, `split`/empty-separator, array `length`/`includes`/`indexOf`/
`slice` (incl. negative), object `keys`/`values`/`has`, array & object indexing,
structural `==` incl. enum-tag equality, `for`/`while`/`break`/`continue`/`if-else`,
empty-array `for` (body skipped), `match` as an expression (literal + `Ok`/`Err`
patterns + wildcard), string escapes (`\t`, `\n`, `\\`, `\'`, `\u{..}`), and
compound assignment (`+= -= *= /= %=`). Simple fn calls and early `return` work.

---

## EXPR-1 — Interpolating a computed `Infinity` / `NaN` renders `"null"`

Repro (`arith.loom`, drive `/arith`):
```
let divz = 1 / 0
let zdivz = 0 / 0
let modz = 5 % 0
@`R divz=${divz}|zdivz=${zdivz}|modz=${modz}|END reply ok`
```
EXPECTED: the interpolated value reflects the computed IEEE-754 result. Division
/ modulo by zero yields `Infinity`/`NaN` and does not panic
(`docs/spec_topics/expressions.md` §"Other arithmetic"). The QRY-18 canonical
number renderer (`src/render/canonical-number.ts` `renderCanonicalNumber`) maps
these to `"Infinity"` / `"NaN"`.
OBSERVED: `divz=null|zdivz=null|modz=null|` — non-finite numbers render as `null`.
Root cause: the shipped render path `renderQueryText` →
`stringifyPathValue` (`src/extension/production-loom-producer.ts:1337`) uses
`JSON.stringify`, and `JSON.stringify(Infinity) === "null"`.
VERDICT: **bug** — the model is shown `null` for a value that is actually
`Infinity`/`NaN`, diverging from the QRY-18 canonical renderer.

## EXPR-2 — `array.concat` is unimplemented at runtime; the loom silently aborts

Repro (`concat.loom`, drive `/concat`):
```
let xs = [1, 2]
let cc = xs.concat([3, 4])
@`R cc=${cc}|END reply ok`
```
EXPECTED: `cc = [1,2,3,4]`. `concat(other): array<T ⊔ U>` is a documented
`array<T>` member (`docs/reference/grammar.md` §"Built-in methods and
properties"; `docs/spec_topics/expressions.md` array stdlib table), and the type
layer supports it (`concatElementType` in `src/runtime/stdlib-string.ts`).
OBSERVED: the loom registers, but produces NO user turn — it aborts. The runtime
member dispatch `evaluateArrayMember` (`src/runtime/stdlib-array.ts`) has cases
for `length`/`join`/`includes`/`indexOf`/`slice` only; `concat` falls to the
`default` which throws `unknown array stdlib member: concat`.
VERDICT: **bug** — a documented stdlib method is unimplemented in the shipped
runtime and crashes any loom that calls it.

## EXPR-3 — Bare object literal accepted without `loom/parse/bare-object-literal`

Repro (`bareobj.loom`):
```
let obj = { a: 1, b: 2 }
let ok = obj.keys()
@`R ok=${ok}|END reply ok`
```
EXPECTED: a bare `{ field: expr }` outside the two carve-outs (`params:`
defaults, single Pi-tool positional arg) is `loom/parse/bare-object-literal`
(`docs/reference/grammar.md` §"Object construction";
`docs/spec_topics/expressions.md` §"Object construction").
OBSERVED: the file loads with NO diagnostic and the literal evaluates as a plain
object (`ok=["a","b"]`). `parseObjectLiteral(null, …)`
(`src/parser/loom-document.ts:1943`) accepts it silently.
VERDICT: **borderline** — a mandated strictness diagnostic is missing, but the
resulting behaviour (treating it as an object value) is itself reasonable and
harmless; not covered by the README "type-layer diagnostics" known gap (this is
a parse diagnostic).

## EXPR-4 — A `fn`/loom whose tail is a bare function call returns `null`

Repro (`bchain.loom`, drive `/bchain`):
```
fn h3(n: integer): integer { n }
fn h2(n: integer): integer { h3(n) }
fn h1(n: integer): integer { h2(n) }
let r = h1(7)
@`R=${r}|END reply ok`
```
EXPECTED: `r = 7`. A function/loom's final value is its tail expression's value
(`docs/spec_topics/functions.md` FN-5; `#fn-5`). `fn h2(n){ h3(n) }` must return
`h3(n)`.
OBSERVED: `R=null`. A bare-call tail is lost. Controls confirm the value survives
in every other position: `fn outer(n){ inner(n) + 100 }` → 106; `return inner(n)`
and `let v = inner(n)\n v` both return the value.
VERDICT: **bug** — violates FN-5 for the most basic delegation form
`fn f(n){ g(n) }`.

## EXPR-5 — Recursion in a tail-expression operand mis-evaluates

Repro (`btailrec.loom`, drive `/btailrec`):
```
fn s(n: integer): integer {
  if n <= 0 {
    return 0
  }
  n + s(n - 1)
}
let r = s(3)
@`R=${r}|END reply ok`
```
Also (`fns.loom`): `fn fact(n){ if n<=1 {return 1}\n n * fact(n-1) }`, `fact(5)`.
EXPECTED: `s(3) = 6`, `fact(5) = 120` (`docs/spec_topics/return.md` recursion
example; FN-5).
OBSERVED: `s(3) = 3` and `fact(5) = 0`. The recursive call sits in a tail-position
operand and resolves to `null` at depth (`n * null === 0`, `n + null === n`).
The identical arithmetic is CORRECT when written with an explicit `return`
(`return n + s(n-1)` → 6) or a `let`-bound intermediate (`let rest = s(n-1)\n n + rest`
→ 6).
VERDICT: **bug** — recursion through the tail expression (the canonical Rust-style
form the spec uses) computes wrong results; likely the same root cause as EXPR-4
(tail-position call evaluation).

## EXPR-6 — A bound enum interpolates JSON-quoted, not as the bare wire value

Repro (`enumb.loom`, drive `/enumb`):
```
enum Color {
  Red,
  Green,
}
let c = Color.Red
@`R c=${c}|END reply ok`
```
EXPECTED: `c=Red`. QRY-18 renders an enum interpolation as its bare wire value
UNQUOTED (`src/render/query-render.ts` `stringifyInterpolatedValue`, enum arm:
`String(value)`; `docs/spec_topics/runtime-value-model.md` enum row —
`JSON.stringify` yields the bare wire string).
OBSERVED: `c="Red"` (JSON-quoted). Root cause: `stringifyPathValue` calls
`JSON.stringify` on the enum value; the enum runtime value is a boxed `String`
object (`makeEnumValue` in `src/runtime/value.ts`), so `typeof` is `"object"` and
it is JSON-serialised with quotes rather than rendered bare.
VERDICT: **bug** — the model receives a quoted `"Red"` instead of `Red`.

## EXPR-7 — Direct `${Enum.Variant}` interpolation aborts the loom

Repro (`enumd.loom`, drive `/enumd`):
```
enum Color {
  Red,
  Green,
}
@`R d=${Color.Red}|END reply ok`
```
EXPECTED: `d=Red`. `Enum.Variant` is an admissible expression form
(`docs/reference/grammar.md` §"Expression sublanguage"), and interpolation takes
any expression (`docs/spec_topics/expressions.md` §"Supported forms").
OBSERVED: the loom registers but produces NO user turn — it aborts. The dotted-
path interpolation resolver (`resolveInterpolationPath`,
`src/extension/production-loom-producer.ts:1320`) resolves the head `Color` to a
non-local (enum) arm → `null`, then does `evaluateMemberAccess(null, "Red")`,
which throws `NullMemberAccessPanic`. Unlike the `let`-RHS evaluator, the
interpolation resolver has no `Enum.Variant` case.
VERDICT: **bug** — interpolating an enum variant directly crashes the loom.

## EXPR-8 — Interpolation only resolves dotted identifier paths, not expressions

Repro (`iexpr.loom`, drive `/iexpr`):
```
let x = 5
let arr = [10, 20, 30]
let s = 'hi'
fn dbl(n: integer): integer { n * 2 }
@`R plus=${x + 1}|prod=${x * 2}|idx=${arr[0]}|call=${dbl(x)}|meth=${s.toUpperCase()}|len=${s.length}|END reply ok`
```
EXPECTED: `plus=6 prod=10 idx=10 call=10 meth=HI len=2`. "The same grammar applies
wherever an expression is expected: … inside `${...}` template interpolations"
(`docs/spec_topics/expressions.md` §Supported forms); only nested templates,
`@`-queries, and `match` are excluded inside `${...}`.
OBSERVED: `plus=null prod=null idx=null call=null meth=undefined len=2`.
`renderQueryText` sends the raw interpolation source to `resolveInterpolationPath`,
which treats it as `Ident ('.' Ident)*` (splits on `.`, resolves the head, walks
`.field` segments). Arithmetic (`x + 1`), indexing (`arr[0]`), calls (`dbl(x)`)
resolve to `null`; a method call (`s.toUpperCase()`) resolves to the literal
string `undefined` (JS property lookup of `"toUpperCase()"`). Only bare dotted
paths work (`s.length` → 2, because `.length` is a real JS property).
Note: the QRY-18 machinery (`stringifyInterpolatedValue`) that would handle typed
expressions exists but is bypassed by the shipped render path.
VERDICT: **bug** — the documented "any expression in `${...}`" contract is not
honoured; only dotted paths render, everything else emits `null`/`undefined` into
the model prompt. EXPR-1, EXPR-6, EXPR-7 and EXPR-8 share the root cause: the
shipped `renderQueryText` uses `resolveInterpolationPath` + `stringifyPathValue`
instead of parsing/evaluating the interpolation and applying QRY-18.

---

## Summary

| id | title | verdict |
|---|---|---|
| EXPR-1 | `Infinity`/`NaN` interpolate as `"null"` | bug |
| EXPR-2 | `array.concat` unimplemented at runtime → loom aborts | bug |
| EXPR-3 | bare object literal accepted without diagnostic | borderline |
| EXPR-4 | bare-call tail (`fn f(n){ g(n) }`) returns `null` | bug |
| EXPR-5 | recursion in a tail-expression operand mis-evaluates | bug |
| EXPR-6 | bound enum interpolates JSON-quoted, not bare wire value | bug |
| EXPR-7 | direct `${Enum.Variant}` interpolation aborts the loom | bug |
| EXPR-8 | interpolation only resolves dotted paths, not expressions | bug |

Probe files: `exprflow-arith`, `exprflow-stdlib`, `exprflow-control`,
`exprflow-functions`, `exprflow-fn-tail-bug`, `exprflow-interp`,
`exprflow-scoping` (`.test.ts`). 14 loom drives in the final suite (all green,
pinning observed behaviour); additional exploratory drives were used for bisection.
