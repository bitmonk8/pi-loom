# `V3b` — Bindings and mutability

**Spec.** [`../spec_topics/bindings.md`](../spec_topics/bindings.md).

**Adds.** `let` (immutable) and `let mut` bindings with mandatory initialisers, statement-only reassignment (including `+=`), binding-level-only mutation (no member/index assignment), and the immutable-context set (params, `for` var, match binds, `_`).

**Tests.**
- `loom/parse/immutable-rebinding`: reassignment of a `let` (non-`mut`) binding fires.
- `loom/parse/assignment-to-member-or-index`: `obj.field = …` / `arr[i] = …` member or index assignment fires.
- `loom/parse/mut-on-immutable-context`: a `mut` modifier on a function parameter, `for` iteration variable, or `match` binding fires.
- `loom/parse/increment-decrement`: `++`/`--` are rejected.
- `loom/parse/let-without-initialiser`: a `let` without an initialiser fires.

**Deps.** `V3b-T`, `V2b`, `V3a`

**Ships when.** `npm test` fires each binding/mutability code and accepts a valid `let mut` reassignment.
