# `V3c` — Control flow

**Spec.** [`../spec_topics/control-flow.md`](../spec_topics/control-flow.md).

**Adds.** `if` / `for` / `while` / `break` / `continue`, with the `CTRL-1` once-only iterand snapshot semantics.

**Tests.**
- `CTRL-1`: the `for` iterand is evaluated exactly once at loop entry; its effect commits once even when the array is empty and the body is skipped; a mid-body `let mut` reassignment does not alter the snapshot.
- `loom/parse/non-array-iterand`: a `for x in expr` whose `expr` is not `array<T>` (iterating a string, object, or number) fires `loom/parse/non-array-iterand` (type phase) ([Control Flow — `for`/`in`](../spec_topics/control-flow.md)).
- `loom/parse/break-outside-loop`: a `break` outside any `for` / `while` body fires `loom/parse/break-outside-loop` (parse phase) ([Control Flow — `break`/`continue`](../spec_topics/control-flow.md)).
- `loom/parse/continue-outside-loop`: a `continue` outside any `for` / `while` body fires `loom/parse/continue-outside-loop` (parse phase) ([Control Flow — `break`/`continue`](../spec_topics/control-flow.md)).
- `loom/parse/break-with-value`: a `break expr` (loom 1.0 `break` carries no value) fires `loom/parse/break-with-value` (parse phase) ([Control Flow — `break`/`continue`](../spec_topics/control-flow.md)).

**Deps.** `V3c-T`, `V3a`, `V3b`

**Ships when.** `npm test` proves an effectful empty-array iterand commits exactly once, and that the loop/branch reject paths fire `loom/parse/non-array-iterand`, `loom/parse/break-outside-loop`, `loom/parse/continue-outside-loop`, and `loom/parse/break-with-value`.
