# `V3c-T` — Control flow (tests)

**Spec.** [`../spec_topics/control-flow.md`](../spec_topics/control-flow.md).

**Adds.** Failing tests for the paired `V3c` implementation leaf.

**Tests.**
- `CTRL-1`: the `for` iterand is evaluated exactly once at loop entry; its effect commits once even when the array is empty and the body is skipped; a mid-body `let mut` reassignment does not alter the snapshot.
- `loom/parse/non-array-iterand`: a `for x in expr` whose `expr` is not `array<T>` (iterating a string, object, or number) fires `loom/parse/non-array-iterand` (type phase) ([Control Flow — `for`/`in`](../spec_topics/control-flow.md)).
- `loom/parse/break-outside-loop`: a `break` outside any `for` / `while` body fires `loom/parse/break-outside-loop` (parse phase) ([Control Flow — `break`/`continue`](../spec_topics/control-flow.md)).
- `loom/parse/continue-outside-loop`: a `continue` outside any `for` / `while` body fires `loom/parse/continue-outside-loop` (parse phase) ([Control Flow — `break`/`continue`](../spec_topics/control-flow.md)).
- `loom/parse/break-with-value`: a `break expr` (loom 1.0 `break` carries no value) fires `loom/parse/break-with-value` (parse phase) ([Control Flow — `break`/`continue`](../spec_topics/control-flow.md)).

**Deps.** `V3a`, `V3b`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
