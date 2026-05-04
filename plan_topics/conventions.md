# Plan structure and conventions

Three kinds of phase:

1. **Horizontal phases (H1–H4).** Project scaffold, dependency-injection skeleton, diagnostics primitive, Pi-extension shell.
2. **MVP phase (M).** The smallest end-to-end `.loom` that runs as a Pi slash command — single hard-coded untyped query, prompt mode.
3. **Vertical slices (V1–V18, broken into leaf phases).** Each leaf is the smallest feature that can ship independently *and* be tested independently. Leaves carry IDs like `V4b`. Their grouping (V4) is editorial only — leaves are the unit of work.

Slices are roughly ordered by dependencies; non-linear deps are stated in each leaf's **Deps** field. Reorder freely as long as the deps DAG is respected.

## Per-phase TDD ritual (mandatory)

Every phase, leaf or otherwise, runs the same loop:

1. **Tests first.** Write the failing tests for *every* spec rule the phase introduces. One assertion per rule where practical. A test that would pass when prerequisites are missing is a defect — fix it before writing code.
2. **Implement.** Write the minimum code that turns red tests green. No speculative APIs.
3. **Run.** All tests green; type-check clean; lint clean.
4. **Self-review.** Re-read the spec section, the diff, the test list. Check: any rule unverified? any silent skip? any `catch(...)` that should be a specific type? any global / static / singleton creeping in?
5. **Fix review issues.** Iterate from step 3 until the review is clean.
6. **Phase exit gate.** "Ships when" criterion observable; tag commit `<id>-complete`.

A phase is **not** complete until its exit gate is met. No "we'll fix it next slice" carry-overs.

## Leaf format

Each leaf has the same fields, in the same order:

- **Spec.** Page(s) under [`../spec_topics/`](../spec_topics/) the leaf implements.
- **Adds.** One sentence — what the leaf introduces.
- **Tests.** Bullet list — one bullet per spec rule.
- **Deps.** Other leaf IDs that must be complete first. Listed `-` if none beyond the previous-leaf-in-the-group.
- **Ships when.** A concrete, externally observable change.

## Cross-cutting rules (every phase)

- **No globals, statics, singletons.** All collaborators passed by constructor. Architectural test in H1 enforces.
- **Specific exception types only.** No `catch (e)` / `catch (Error)` without rethrow-on-mismatch. ESLint rule wired in H1.
- **Sequential by default.** No `Promise.all` / `Promise.race` outside slices that have a documented spec reason.
- **No silent test skipping.** `assert.fail` / `panic` when prerequisites are missing — never silent `return` early.
- **Spec drift.** If implementation reveals the spec is wrong, ambiguous, or under-specified, **stop**, fix the spec first in a dedicated commit, then resume.
- **Doc updates.** After each leaf, update `README.md`'s status table and append a one-line dated entry to `CHANGELOG.md`. The plan itself is updated only when the **plan** changes; non-plan discoveries go to `notes.md`.
