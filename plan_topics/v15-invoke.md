# V15 — `invoke`, registered loom callees, cross-mode

## V15a — `invoke("./path.loom", ...)` parsing and resolution

- **Spec.** [Invocation](../spec_topics/invocation.md).
- **Adds.** Path is a string literal; resolved at parse time relative to calling loom; must end in `.loom`. Dynamic dispatch rejected.
- **Tests.** Relative paths resolve; non-string path rejected; non-`.loom` extension rejected.
- **Deps.** V12.
- **Ships when.** `invoke` syntax works.

## V15b — Untyped `invoke` returns `Result<null, QueryError>`

- **Spec.** [Invocation](../spec_topics/invocation.md) (typed return).
- **Adds.** Child's return value discarded; only `Ok(null)` or `Err` reach parent.
- **Tests.** Successful child → `Ok(null)`; failed child → `Err`; child's actual return value not visible.
- **Deps.** V15a.
- **Ships when.** Fire-and-forget invokes work.

## V15c — Typed `invoke<Schema>` with AJV validation

- **Spec.** [Invocation](../spec_topics/invocation.md) (typed return).
- **Adds.** `invoke<Plan>("./plan.loom", ...)` validates child's return value against `Plan`.
- **Tests.** Valid return → `Ok(value)`; invalid → `Err({kind:"invoke_failure", reason:"validation"})`.
- **Deps.** V15a, V4.
- **Ships when.** Typed invokes safe.

## V15d — Positional argument binding for `invoke`

- **Spec.** [Invocation](../spec_topics/invocation.md) (argument binding).
- **Adds.** Arguments bind positionally to callee `params:` in declaration order; type-checked when callee is statically resolvable.
- **Tests.** Type mismatch → parse error when statically resolvable; runtime AJV check otherwise.
- **Deps.** V15a, V3b.
- **Ships when.** Args reach callee correctly typed.

## V15e — `.loom` paths in `tools:` (default basename naming)

- **Spec.** [Parameters and Frontmatter](../spec_topics/frontmatter.md) (`tools:`), [Tool Calls](../spec_topics/tool-calls.md) (registered loom callee).
- **Adds.** `./summarise.loom` in `tools:` becomes `summarise` callable; basename hyphen → underscore (`./code-review.loom` → `code_review`); resolution relative to calling loom.
- **Tests.** Default name correct; hyphens converted; resolution relative; entry callable from both code (`<name>(...)`) and model.
- **Deps.** V14a, V15a.
- **Ships when.** Loom paths register as named callables.

## V15f — `.loom` path with `as` rename

- **Spec.** [Parameters and Frontmatter](../spec_topics/frontmatter.md) (`tools:`).
- **Adds.** `./classify.loom as triage` overrides default name.
- **Tests.** Override applied; PascalCase rename rejected; collision with another final name is load error.
- **Deps.** V15e.
- **Ships when.** Loom callees fully renamable.

## V15g — Prompt-mode `.loom` callee in `tools:` is load error

- **Spec.** [Parameters and Frontmatter](../spec_topics/frontmatter.md) (`tools:`).
- **Adds.** Load-time check: a `.loom` path in `tools:` must point at a subagent-mode loom; prompt-mode is rejected.
- **Tests.** Prompt-mode callee → `loom/load/prompt-mode-callable` error; diagnostic mentions interleaving concern.
- **Deps.** V15e, V12a.
- **Ships when.** Footgun closed at load time.

## V15h — Cross-mode cell: prompt → prompt

- **Spec.** [Invocation](../spec_topics/invocation.md) (cross-mode matrix).
- **Adds.** Prompt-mode parent invoking prompt-mode child: child attaches to caller's current conversation; child's queries are user-visible turns.
- **Tests.** Child turns appear in parent's transcript; one fixture verifies end-to-end.
- **Deps.** V15a.
- **Ships when.** Cell verified.

## V15i — Cross-mode cell: prompt → subagent

- **Spec.** [Invocation](../spec_topics/invocation.md) (cross-mode matrix).
- **Adds.** Prompt-mode parent invoking subagent-mode child: child spawns fresh isolated conversation; only return value reaches parent.
- **Tests.** Parent transcript unchanged by child's intermediate turns; return value reaches parent.
- **Deps.** V15a, V12a.
- **Ships when.** Cell verified.

## V15j — Cross-mode cell: subagent → prompt

- **Spec.** [Invocation](../spec_topics/invocation.md) (cross-mode matrix).
- **Adds.** Subagent-mode parent invoking prompt-mode child: child attaches to caller subagent's own private conversation. Nothing leaks to grandparent.
- **Tests.** Grandparent (user session) transcript unchanged; subagent transcript contains child's turns.
- **Deps.** V15h, V12a.
- **Ships when.** Cell verified.

## V15k — Cross-mode cell: subagent → subagent

- **Spec.** [Invocation](../spec_topics/invocation.md) (cross-mode matrix).
- **Adds.** Sibling spawn (not nested under caller's).
- **Tests.** Two sibling sessions exist concurrently; neither sees the other's transcript.
- **Deps.** V15i.
- **Ships when.** Cell verified.

## V15l — `InvokeFailure` variant

- **Spec.** [Invocation](../spec_topics/invocation.md) (failures).
- **Adds.** `kind:"invoke_failure"` with `reason` enum: `load_failure`, `parse_failure`, `validation`, `cancelled`, `panic`. Carries `callee_path`.
- **Tests.** Each reason synthesised and surfaces correctly.
- **Deps.** V15a, V5g.
- **Ships when.** Invoke-infra failures uniformly typed.

## V15m — `InvokeCalleeError` variant with recursive `inner`

- **Spec.** [Invocation](../spec_topics/invocation.md) (failures).
- **Adds.** `kind:"invoke_callee_error"` with recursive `inner: QueryError`.
- **Tests.** Cascade of two-level invoke surfaces inner-of-inner correctly; AJV accepts recursive schema definition.
- **Deps.** V15l, V11g.
- **Ships when.** Callee errors propagate without information loss.

## V15n — Parse-time cycle detection

- **Spec.** [Invocation](../spec_topics/invocation.md) (cycle detection).
- **Adds.** Walk statically resolvable `invoke` paths; detect cycles; report `loom/load/invocation-cycle` with full path.
- **Tests.** Self-cycle (`A → A`); two-step (`A → B → A`); three-step; cycle through warp `fn` invokes too (deps on V17j).
- **Deps.** V15a.
- **Ships when.** Static cycles caught.
