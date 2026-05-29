# Bindings and Mutability

Loom follows Rust's *immutable-by-default, opt-in mutability* convention. The two binding forms:

```loom
let x = 0          // immutable; rebinding x is a parse error (loom/parse/immutable-rebinding)
let mut count = 0  // mutable; count may be reassigned
```

`let` requires an initialiser. `let x: T` (annotation, no initialiser) is `loom/parse/let-without-initialiser` — Loom has no `undefined` value, no per-type "zero" default, and no definite-assignment analysis, so a binding with no value cannot be type-soundly admitted. The full grammar for `let` lives in [Grammar Appendix — `let` form](./grammar.md#let-form). To bind once at the point a value is available, restructure the surrounding control flow; for an explicitly-mutable counter, write `let mut x: T = <initial>`.

**Reassignment** is a statement, never an expression. The plain form and the compound forms `+=`, `-=`, `*=`, `/=`, `%=` are all legal on `let mut` bindings; the RHS must be compatible with the binding's declared or inferred type per [Type System — Type compatibility](./type-system.md#type-compatibility). The same compatibility relation governs the initialiser of every `let` (typed or inferred) and is the canonical referent of every "same rules as `let`" cross-link elsewhere in the spec.

```loom
let mut count = 0
count = count + 1
count += 1

let mut findings: array<Finding> = []
findings = findings.concat([new_finding])
```

Because assignment is statement-only, `if (x = 1) { ... }` is `loom/parse/assignment-as-expression`. Use a separate `let mut` + `if` instead.

**Mutability is binding-level only.** loom 1.0 does not support `obj.field = ...` or `arr[i] = ...` (`loom/parse/assignment-to-member-or-index`). Update by rebinding the whole value — `concat`, `slice`, etc. already return fresh values, and `let mut` lets you swing the binding to point at the new one. This keeps data structurally immutable (no aliasing semantics to define) and matches the rest of the stdlib's pure-function style.

**Immutable contexts.** The following bindings are always immutable; `mut` on any of them is `loom/parse/mut-on-immutable-context`:

- Function parameters
- `for` iteration variables (`for x in xs { ... }` — `x` is a fresh immutable binding per iteration)
- `match` pattern bindings
- The discard form `let _ = ...` (also: `let mut _ = ...` is `loom/parse/mut-on-discard` — `_` cannot be reassigned)

Function parameters being immutable is a deliberate loom 1.0 simplification. See [Future Considerations](./future-considerations.md) for the deferred-feature inventory.

**Increment / decrement.** `++` and `--` are `loom/parse/increment-decrement`. Use `count += 1` / `count -= 1`. Same Rust rationale: one obvious way, no prefix-vs-postfix confusion. See [Diagnostics](./diagnostics.md) for the full code registry.
