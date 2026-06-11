# Language and architecture

<!-- The cross-cutting NFR dispositions (Source-language stability, Runtime observability) are recorded in the Non-functional requirements section of overview-and-orientation.md#non-functional-requirements. -->

<a id="loom-1-0-non-goals-aggregator"></a><a id="v1-non-goals"></a>
### V1 non-goals

*Orientation aggregator (per [Governance — GOV-30](./governance.md)).* The consolidated loom 1.0 non-goals list — cross-cutting loom 1.0 scope decisions where loom 1.0 ships without a forward-compatibility seam (a future revision adding the disposition is not anticipated by loom 1.0 and will require a migration) — is owned by [Future Considerations — loom 1.0 non-goals](./future-considerations/model-changes-and-non-goals.md#loom-1-0-non-goals); the eight items, separated by `;` so that items whose inner punctuation includes commas and em-dashes remain visually distinguishable from the inter-item boundary, are: no per-loom sandbox or capability model; no formal source-language migration mechanism for major-version transitions; no non-Node JavaScript host support; no concurrent user sessions in the same host process; no reliance on a Pi extension-host stdio-capture facet — teardown-time `console.error` diagnostics are treated as best-effort, per [Future Considerations — No reliance on a Pi extension-host stdio-capture facet](./future-considerations/model-changes-and-non-goals.md#pi-stdio-capture-facet); no parallel-`invoke` surface; no parallel fan-out *to* prompt-mode `.loom` callees (a prompt-mode `.loom` callable cannot appear in another loom's `tools:` table at all — rejected at load time per [Parameters and Frontmatter — `tools`](./frontmatter/frontmatter-fields-a.md#tools) — so the model never sees one to fan out across, while Pi-host tools and subagent-mode `.loom` callees remain present in tool tables and may still be fanned out per [Tool Calls — Concurrency](./tool-calls.md#concurrency)); no admission cap on in-flight loom invocations.

The seam-vs-non-goal distinction is stated in category 4 of the intro list on [Future Considerations](./future-considerations.md); the canonical surface-extension inventory is owned by [Future Considerations — Surface extensions (loom 1.0 leaves a seam)](./future-considerations/surface-extensions.md#surface-extensions-v1-leaves-a-seam) (e.g. per-call timeouts on queries / tool calls / invokes, the per-query overrides cascade).

### Reading order

Read these two topics first to understand the design:

- [Overview and Conceptual Model](./overview.md) — what a loom is, query-and-await, prompt vs. subagent mode.
- [Comparison with Existing Pi Features](./comparison.md) — loom vs. Pi `prompt` / `subagent`.

For the runtime's session-level contract — session shutdown, concurrency isolation, and per-invocation budgets — see [Session Model](./session-model-and-appendix.md#session-model), which forward-links the topic-page owner for each session-model obligation.

**Background (non-normative).** Skippable; explains design provenance, not requirements.

- [Influences](./influences.md) — what loom borrows from Rust, TypeScript, and what it doesn't.

---

## Language

Surface and semantics of the Loom language (shared by `.loom` and `.warp` files).

- [Lexical Structure](./lexical.md) — identifiers, keywords, comments, strings, numbers.
- [Type System](./type-system.md) — primitive, named, generic, union, literal, inline-object types.
  - [Schema Declarations](./schemas.md) — `schema X { ... }`, `schema X = ...`, `enum`, discriminated unions, recursion, wire-name renaming.
  - [Descriptions](./descriptions.md) — `///` doc comments, field separators.
  - [Schema Subset](./schema-subset.md) — JSON-Schema subset and lowering algorithm.
- [Parameters and Frontmatter](./frontmatter.md) — frontmatter fields, `params`, `tools`, `system`, `respond_repair`, template interpolation.
- [Query](./query.md) — `@`-templates, schema inference, respond-repair, `QueryError`.
- [Expression Sublanguage](./expressions.md) — supported forms, stdlib, operator precedence, grammar disambiguation, object/array construction.
- [Bindings and Mutability](./bindings.md) — `let`, `let mut`, reassignment.
- [Control Flow](./control-flow.md) — `if`, `for`, `while`, `break`, `continue`.
- [Errors and Results](./errors-and-results.md) — `match`, pattern grammar, `Result`, `?`, runtime panics.
- [Return Statement](./return.md) — `return expr` rules.
- [Function Definitions](./functions.md) — `fn`, hoisting, tail-expression returns.
- [Tool Calls](./tool-calls.md) — `<name>(args)`, `CodeToolError`.
- [Invocation](./invocation.md) — `invoke(...)`, cross-mode matrix, invoke errors, cycle detection.
- [Imports](./imports.md) — `.warp` library files, `import`/`export`, cycles.

---

## Extension Architecture

How loom integrates with the Pi runtime.

- [Pi Extension Integration](./pi-integration.md) — overall extension shape and index of subtopics.
- [Discovery](./discovery.md) — discovery sources, priority, cross-format collisions.
- [Slash-Command Invocation](./slash-invocation.md) — prompt-mode `Err` formatting, no-params overflow, call-chain note.
- [Slash-Command Argument Binding](./binder.md) — LLM-driven binder: model, context, envelope, defaulting, echo, failure modes.
- [Cancellation](./cancellation.md) — `AbortSignal` rules.
- [Diagnostics](./diagnostics.md) — diagnostic shape, code-registry rules, placeholder rendering, normative code registry, multi-error reporting.
- <a id="concurrency-model"></a> **Concurrency model.** The mode-qualified isolation contract for concurrent loom invocations within a session — covering cancellation independence ([SM-7a](./session-model-and-appendix.md#sm-7a-cancellation-independence)), subagent-mode transcript and tool-table isolation ([SM-7b](./session-model-and-appendix.md#sm-7b-subagent-mode-isolation)), prompt-mode sequential execution ([SM-7c](./session-model-and-appendix.md#sm-7c-prompt-mode-sequential-execution)), the loom 1.0 no-cap / no-scheduler disposition ([SM-7d](./session-model-and-appendix.md#sm-7d-no-cap-no-scheduler)), and downward-only cancellation propagation ([SM-7e](./session-model-and-appendix.md#sm-7e-downward-only-cancellation)) — is owned by the [Session model — SM-7a … SM-7e](./session-model-and-appendix.md#sm-7-mode-qualified-concurrency) sub-units (with the per-invocation budget non-sharing rule owned by the sibling [SM-8](./session-model-and-appendix.md#sm-8-per-invocation-budget-non-sharing) sub-unit).

---
