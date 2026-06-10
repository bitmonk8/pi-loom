# `V3b-T` — Bindings and mutability (tests)

**Spec.** [`../spec_topics/bindings.md`](../spec_topics/bindings.md).

**Adds.** Failing tests for the paired `V3b` implementation leaf.

**Tests.**
- `loom/parse/immutable-rebinding`: reassignment of a `let` (non-`mut`) binding fires.
- `loom/parse/assignment-to-member-or-index`: `obj.field = …` / `arr[i] = …` member or index assignment fires.
- `loom/parse/mut-on-immutable-context`: a `mut` modifier on a function parameter, `for` iteration variable, or `match` binding fires.
- `loom/parse/increment-decrement`: `++`/`--` are rejected.
- `loom/parse/let-without-initialiser`: a `let` without an initialiser fires.

**Deps.** `V2b`, `V3a`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
