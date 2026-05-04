# V15 — `invoke`, registered loom callees, cross-mode

## V15a — `invoke("./path.loom", ...)` parsing and resolution

- **Spec.** [Invocation — Resolution, Static resolution](../spec_topics/invocation.md#static-resolution).
- **Adds.** Path is a string literal; resolved at parse time relative to calling loom; must end in `.loom`. Dynamic dispatch rejected. The callee is opened, parsed, and lowered into the parent's per-load-pass static-resolution cache; the walk is transitive across callee `invoke` literals and `tools:` `.loom` entries. Each visited file is parsed once per pass.
- **Tests.** Relative paths resolve; non-string path rejected; non-`.loom` extension rejected; same callee referenced twice (e.g. from two distinct `invoke(...)` sites in the same parent) is parsed exactly once per load pass.
- **Deps.** V12.
- **Ships when.** `invoke` syntax works and the static-resolution cache is populated.

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

- **Spec.** [Invocation — Argument binding](../spec_topics/invocation.md), [Invocation — Static resolution](../spec_topics/invocation.md#static-resolution).
- **Adds.** Arguments bind positionally to callee `params:` in declaration order; type-checked against the callee's declared schema when the callee is statically resolvable per the load-pass cache populated by V15a; otherwise the runtime AJV check is the safety net.
- **Tests.** Type mismatch where callee is statically resolvable → `loom/parse/invoke-arg-type-mismatch`; type mismatch where callee is unresolvable (parent saw `loom/load/callee-has-errors` warning) → no parse error, runtime AJV rejects with `Err(InvokeFailure { reason: "validation", ... })`.
- **Deps.** V15a, V3b.
- **Ships when.** Args reach callee correctly typed.

## V15e — `.loom` paths in `tools:` (default basename naming)

- **Spec.** [Parameters and Frontmatter](../spec_topics/frontmatter.md) (`tools:`), [Tool Calls](../spec_topics/tool-calls.md) (registered loom callee), [Invocation — Static resolution](../spec_topics/invocation.md#static-resolution).
- **Adds.** `./summarise.loom` in `tools:` becomes `summarise` callable; basename hyphen → underscore (`./code-review.loom` → `code_review`); resolution relative to calling loom. The callee is opened/parsed/lowered into the same per-load-pass static-resolution cache V15a populates. A callee whose file fails to parse or lower at this site emits `loom/load/callee-has-errors` (severity `error` for `tools:`) and prevents parent registration; the callee's own diagnostic codes are carried via `related`.
- **Tests.** Default name correct; hyphens converted; resolution relative; entry callable from both code (`<name>(...)`) and model; broken callee in `tools:` → `loom/load/callee-has-errors` error at the entry site, parent does not register, `related` enumerates the callee's own codes; same callee reached via both a `tools:` entry and an `invoke(...)` literal in the same parent is parsed exactly once.
- **Deps.** V14a, V15a.
- **Ships when.** Loom paths register as named callables and parse failures surface at the parent.

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

- **Spec.** [Invocation](../spec_topics/invocation.md) (failures), [Invocation — Static resolution](../spec_topics/invocation.md#static-resolution).
- **Adds.** `kind:"invoke_failure"` with `reason` enum: `load_failure`, `parse_failure`, `validation`, `cancelled`, `panic`. Carries `callee_path`. The runtime variant fires when a code-issued `invoke(...)` reaches a callee that fails at the moment of invocation — distinct from the parent-load-time `loom/load/callee-has-errors` warning, which is a parent diagnostic emitted when the static-resolution walk first observed the callee in a broken state. Both surfaces can fire for the same broken callee: the load-time warning at parent registration plus the runtime `InvokeFailure { reason: "parse_failure" | "load_failure" }` when the call actually executes.
- **Tests.** Each reason synthesised and surfaces correctly. Callee broken at parent load → parent diagnostics drain contains `loom/load/callee-has-errors`; subsequent runtime invoke against the same callee → `Err(InvokeFailure { reason: "parse_failure", callee_path, ... })`. Callee that parses cleanly at parent load but is deleted before invocation → no load-time warning; runtime `Err(InvokeFailure { reason: "load_failure", ... })`.
- **Deps.** V15a, V5g.
- **Ships when.** Invoke-infra failures uniformly typed.

## V15m — `InvokeCalleeError` variant with recursive `inner`

- **Spec.** [Invocation](../spec_topics/invocation.md) (failures).
- **Adds.** `kind:"invoke_callee_error"` with recursive `inner: QueryError`.
- **Tests.** Cascade of two-level invoke surfaces inner-of-inner correctly; AJV accepts recursive schema definition.
- **Deps.** V15l, V11g.
- **Ships when.** Callee errors propagate without information loss.

## V15n — Parse-time cycle detection

- **Spec.** [Invocation — Cycle detection](../spec_topics/invocation.md), [Invocation — Static resolution](../spec_topics/invocation.md#static-resolution).
- **Adds.** Walk the per-load-pass static-resolution graph V15a builds; detect cycles; report `loom/load/invocation-cycle` with full path. Unresolvable callees (those that produced `loom/load/callee-has-errors`) are walk leaves — the walker does not descend through them, and a cycle routed through such a node is not detected at this load. After a watcher-driven re-walk that lifts the unresolvability, the cycle (if any) is caught on the next pass.
- **Tests.** Self-cycle (`A → A`); two-step (`A → B → A`); three-step; cycle through warp `fn` invokes too (deps on V17j); cycle routed through an unparseable callee → no cycle diagnostic at first load (only `callee-has-errors`); after the callee is fixed and the watcher re-walks, the cycle surfaces as `loom/load/invocation-cycle`.
- **Deps.** V15a.
- **Ships when.** Static cycles caught with the load-pass leaf rule for unresolvable nodes.
