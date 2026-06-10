# `V3a-T` — Expression evaluator and stdlib (tests)

**Spec.** [`../spec_topics/expressions.md`](../spec_topics/expressions.md).

**Adds.** Failing tests for the paired `V3a` implementation leaf.

**Tests.**
- [expressions.md — Operator precedence](../spec_topics/expressions.md#operator-precedence) (EXPR code-keyed area): operator precedence and associativity match the spec table.
- [expressions.md — Evaluation order and short-circuiting](../spec_topics/expressions.md#evaluation-order-and-short-circuiting) (EXPR code-keyed area): a short-circuited right operand's observable effect does not run.
- [expressions.md — `String.replace` reference vectors](../spec_topics/expressions.md#built-in-methods-and-properties) (EXPR code-keyed area): the five normative `replace` vectors reproduce exactly; `concat` returns the LUB element type.
- [expressions.md — `string` stdlib members](../spec_topics/expressions.md#built-in-methods-and-properties) (EXPR code-keyed area): each loom-1.0 `string` member reproduces its normative behaviour and return type — `length` is the UTF-16 code-unit count, `toLowerCase()`/`toUpperCase()`/`trim()` return the locale-independent transforms, `startsWith(s)`/`endsWith(s)`/`includes(s)` return `boolean`, and `split(sep)` returns `array<string>` with the empty-separator case decomposing into one string per code unit.
- [expressions.md — `array<T>` stdlib members](../spec_topics/expressions.md#built-in-methods-and-properties) (EXPR code-keyed area): each loom-1.0 `array<T>` member reproduces its normative behaviour and return type — `length` is the element count, `join(sep)` concatenates string elements and a non-string element fires `loom/parse/non-string-array-join`, `includes(x)`/`indexOf(x)` use loom structural equality with `indexOf` returning `-1` when absent, and `slice(start, end?)` applies JS semantics including negative-index-from-end and exclusive `end`.
- [expressions.md — `object` stdlib members](../spec_topics/expressions.md#built-in-methods-and-properties) (EXPR code-keyed area): each loom-1.0 `object` member reproduces its normative behaviour and return type — `keys()` returns field names in schema declaration order for named schemas and insertion order otherwise, `values()` returns field values in the same order as `keys()`, and `has(k)` returns `false` for an unknown key without panic.
- [expressions.md — Equality / Ordering / Other arithmetic](../spec_topics/expressions.md#other-arithmetic) (EXPR code-keyed area): cross-type `==` is `false`; `integer ⊑ number` widening and div/mod-by-zero produce `Inf`/`NaN` without panic.

**Deps.** `V2b`, `V2c`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
