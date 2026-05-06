# pi-loom — Extension Specification

`pi-loom` is a [Pi Coding Agent](https://github.com/badlogic/pi-mono) extension that adds a domain-specific scripting language for prompts and agentic operations.

A `.loom` file interleaves code with literal text destined for the model. Loom evaluation appends turns to a conversation: the *caller's* current conversation in `prompt` mode, or a separate conversation in `subagent` mode that does not inherit the caller's transcript, system prompt, or *ambient tool set* (the host Pi session's currently-active tools, distinct from the loom's own *callable set* — see [Glossary — `callable set`](./spec_topics/glossary.md)). Mode is selected per-loom by the required `mode:` frontmatter field — see [Parameters and Frontmatter](./spec_topics/frontmatter.md). Evaluation also produces a final value (the loom's last expression or `return expr`) consumed by `invoke` callers and propagated across the subagent boundary; looms do not write files.

Loom evaluation produces one of three terminal outcomes: it succeeds (turns appended; final value available to programmatic callers), it fails (by returning `Err`, by panicking, or by exhausting a runtime limit), or it is cancelled (per the `AbortSignal` plumbed through `ctx.signal`). In every case turns appended *before* the terminal event remain in the conversation the loom was driving — the caller's conversation in `prompt` mode, or the disposable subagent conversation in `subagent` mode — and the runtime performs no implicit rollback. See [Errors and Results](./spec_topics/errors-and-results.md) and [Diagnostics](./spec_topics/diagnostics.md) for the per-stage error surfaces and the partial-append contract; [Cancellation](./spec_topics/cancellation.md) is the normative source for cancellation semantics, with [Invocation from Pi](./spec_topics/slash-invocation.md) and [Pi Integration Contract — Cancellation source](./spec_topics/pi-integration-contract.md) covering the prompt-mode delivery path.

A loom is stored in one of two file extensions that share a single grammar and type system. `.loom` files are invocable as slash commands (see [Slash-Command Invocation](./spec_topics/slash-invocation.md)); `.warp` files are library modules whose top level is restricted to the declaration forms enumerated in [Imports — Permitted top-level forms](./spec_topics/imports.md#permitted-top-level-forms) (currently five: `import`, `export`, `fn`, `schema`, `enum`). `.warp` files are never directly invoked. Path literals and discovery enforce these extensions per the rules in [Imports](./spec_topics/imports.md), [Invocation](./spec_topics/invocation.md), and [Discovery](./spec_topics/discovery.md); see those pages for the diagnostic codes that fire on each violation. See [Discovery — File-extension namespace](./spec_topics/discovery.md#file-extension-namespace) for the namespace-clearance note.

<!-- DO NOT inline the permitted-form list here; see imports.md. -->

---

## Orientation

### Prerequisites

**Pi SDK and capabilities.** *Orientation; this paragraph is informative.* The host is `@mariozechner/pi-coding-agent`, with `pi-agent-core`, `pi-ai`, and `pi-tui` riding along transitively at the same minor-version line. The version pin, lock-step rule, and `peerDependencies` build-time gate are owned by [Pi Integration Contract — Host prerequisites — Pi SDK pin](./spec_topics/pi-integration-contract.md). At extension-factory entry the runtime runs the capability probe owned by [Pi Integration Contract — Step 0 (Capability probe)](./spec_topics/pi-integration-contract.md#entry-capability-probe), which is the single load-bearing check; install-time `peerDependencies` enforcement is package-manager-dependent and is non-load-bearing. The probe's algorithm, refusal rule, `details.kind` discriminators, and the `loom/load/host-incompatible` emission contract live entirely on that page; this paragraph carries no MUSTs of its own. The seven capabilities the runtime depends on are anchored under [SDK capability inventory](./spec_topics/pi-integration-contract.md#sdk-capability-inventory); the bullets below name-link each item back to its anchored obligation:

- **Slash-command registration** — see [Pi Integration Contract — SDK capability inventory item 1](./spec_topics/pi-integration-contract.md#sdk-cap-slash-command-registration).
- **Prompt-mode conversation drive** — see [Pi Integration Contract — SDK capability inventory item 2](./spec_topics/pi-integration-contract.md#sdk-cap-prompt-conversation-drive).
- **Subagent-mode isolated session** — see [Pi Integration Contract — SDK capability inventory item 3](./spec_topics/pi-integration-contract.md#sdk-cap-subagent-isolated-session).
- **Tool registration and gating** — see [Pi Integration Contract — SDK capability inventory item 4](./spec_topics/pi-integration-contract.md#sdk-cap-tool-registration-gating).
- **Cancellation propagation** — see [Pi Integration Contract — SDK capability inventory item 5](./spec_topics/pi-integration-contract.md#sdk-cap-cancellation-propagation).
- **Custom-message channel and renderer** — see [Pi Integration Contract — SDK capability inventory item 6](./spec_topics/pi-integration-contract.md#sdk-cap-custom-message-renderer).
- **Binder LLM model** — see [Pi Integration Contract — SDK capability inventory item 7](./spec_topics/pi-integration-contract.md#sdk-cap-binder-llm-model).

The re-validation obligation that gates widening `peerDependencies` against this surface is owned by [Pi Integration Contract — SDK capability inventory — Re-validation on `peerDependencies` widening](./spec_topics/pi-integration-contract.md#sdk-cap-peer-dep-revalidation).

**Host runtime.** *Orientation aggregator (per [Governance — GOV-12](./spec_topics/governance.md)).* The loom runtime executes inside the Pi extension host process under four host preconditions. Obligations 1–3 are operative rules whose detection / refusal / discriminator surfaces live entirely in [Pi Integration Contract — Step 0 (Capability probe)](./spec_topics/pi-integration-contract.md#entry-capability-probe); the bullets below carry only orientation context and forward-link there. Obligation 4 (the JavaScript engine value model) is a non-checked invariant by design. The ordinal labels are kept for citation continuity (“Host runtime obligation N”) but no longer carry normative weight on this page.

1. **Node version floor.** *Orientation; the operative rule lives in PIC.* The runtime requires Node `>=20.6.0`, matching `@mariozechner/pi-coding-agent`'s `engines.node` floor. The literal, the `semver`-based comparator, the `details.kind = "node-floor"` discriminator, and the `loom/load/host-incompatible` emission contract are all owned by [Pi Integration Contract — Step 0 (a)](./spec_topics/pi-integration-contract.md#entry-capability-probe); a Pi minor bump that moves the floor follows [Pi Integration Contract — Pi version bump procedure](./spec_topics/pi-integration-contract.md#pi-version-bump-procedure).

2. **Pi-supplied `AbortSignal` / `AbortController` shape.** *Orientation; the canonical member-with-kind enumeration lives in PIC.* The runtime requires the WHATWG `AbortSignal` and `AbortController` constructors and a small set of named members; the canonical enumeration with per-member kind tags (the source of truth the H1 surface-inventory test consumes) lives at [Pi Integration Contract — Step 0 (b)](./spec_topics/pi-integration-contract.md#entry-capability-probe). Runtime call sites for each member are described in [Pi Integration Contract — Host prerequisites #4 and Cancellation source](./spec_topics/pi-integration-contract.md) and [Cancellation](./spec_topics/cancellation.md).

3. **Pi SDK named-capability surface.** *Orientation; the operative rule lives in PIC.* The seven SDK capabilities the runtime depends on are anchored under [Pi Integration Contract — SDK capability inventory](./spec_topics/pi-integration-contract.md#sdk-capability-inventory). Five (items 1, 2, 3, 4, 6) are factory-probable and verified at extension-factory entry; item 5 (cancellation propagation) is covered by obligation 2 above; item 7 (binder LLM model) is verified at per-loom load time and surfaces as `loom/load/binder-model-unresolved` per [Slash-Command Argument Binding — Strict-capability requirement](./spec_topics/binder.md#strict-capability-requirement), not as `loom/load/host-incompatible`. The detection algorithm, refusal rule, and the `details.kind` discriminator surface for the factory-probable subset are owned by [Pi Integration Contract — Step 0 (c)+(d)](./spec_topics/pi-integration-contract.md#entry-capability-probe).

4. **JavaScript engine value model.** The runtime value model assumes a JavaScript engine with IEEE-754 numbers, native `Map`/`Set`, native `JSON.stringify`, and `Object.is` semantics for primitive equality (see [Runtime Value Model](./spec_topics/runtime-value-model.md) and [Cancellation](./spec_topics/cancellation.md)). Behaviour is undefined if the host violates any of these assumptions; the runtime does not feature-detect, does not polyfill, and emits no diagnostic on violation. This is a non-checked invariant, in contrast to obligations 1–3.

### Scope

This subsection pins four cross-cutting V1 dispositions that no single topic page enumerates as a unit. The bullets are *informative orientation*: each one forward-links the topic page that owns the normative contract, and the V1 dispositions recorded here as scope disclaimers (trust boundary, source-language migration) are also recorded under [Future Considerations — Known V1 limitations (no seam expected)](./spec_topics/future-considerations.md). The aggregator-vs-source lock-step convention for keeping these bullets honest as topic pages evolve is owned by [Governance — GOV-12](./spec_topics/governance.md).

- **Trust boundary.** V1 looms execute inside the Pi extension-host process at full host privilege. V1 imposes no loom-level sandbox: filesystem, network, and Pi-API access are bounded only by what Pi grants to extensions and by the per-loom `tools:` allowlist (see [Pi Integration Contract — Tool-registration lifetime and visibility](./spec_topics/pi-integration-contract.md)). A future per-loom capability model is not in V1; see [Future Considerations](./spec_topics/future-considerations.md).

- **Source-language stability.** A `.loom` or `.warp` file that loads cleanly under V1.0 is intended to load and behave identically under every V1.x release. V1.0 ships *without* a mechanical regression gate for this property: equivalence between two V1.x releases for a given source file is a release-process aspiration enforced by review, not by a fixture suite. `GOV-8`'s REQ-ID lifecycle (split / merge / deletion-plus-add, never in-place rewording) is the bookkeeping discipline that keeps substantive edits visible to that review; it is *not* a behaviour-equivalence proof, and the spec does not claim otherwise. A V1.0 conformance fixture suite that mechanically diffs return values, ordered system-note codes, and diagnostic batches against a frozen V1.0 baseline is a recognised follow-up; it is deferred to a post-V1.0 maintenance pass and is tracked under [Future Considerations — Known V1 limitations (no seam expected)](./spec_topics/future-considerations.md). Reviews of `spec.md` SHOULD NOT re-raise the absence of this gate as a V1.0 correctness finding. Migration across major versions is out of V1 scope; see [Future Considerations](./spec_topics/future-considerations.md).

- **Runtime observability.** Operator-facing runtime failure events are emitted on the Pi `loom-system-note` channel via the always-log set defined in [Pi Integration Contract — Runtime event channel](./spec_topics/pi-integration-contract.md). Diagnostics for parse / load / type / runtime-panic batches share the same channel under a disjoint `details` shape (see [Diagnostics](./spec_topics/diagnostics.md)). Aggregation, latency histograms, per-loom token reports, and a consumer-facing read API are deferred (see [Future Considerations — Richer runtime-event telemetry](./spec_topics/future-considerations.md)).

- **Hard runtime ceilings.** The complete V1 set of hard runtime ceilings is: `invoke`-chain nesting depth 32 ([Invocation — Invocation depth bound](./spec_topics/invocation.md)); `tool_loop.max_iterations` per query, default 25 ([Parameters and Frontmatter — `tool_loop`](./spec_topics/frontmatter.md)); at most 3 binder LLM calls per slash invocation ([Slash-Command Argument Binding — Failure modes](./spec_topics/binder.md)); JSON-document depth 5 against typed-query / tool-arg / `params` schemas ([Schema Subset](./spec_topics/schema-subset.md)). No additional implicit nesting, iteration, or recursion limit applies in V1. (This bullet is an aggregator under [Governance — GOV-12](./spec_topics/governance.md); a future V1 leaf that introduces a new ceiling updates this bullet and the new ceiling's owner page in the same commit by editorial convention.)

### Reading order

Read these two topics first to understand the design:

- [Overview and Conceptual Model](./spec_topics/overview.md) — what a loom is, query-and-await, prompt vs. subagent mode.
- [Comparison with Existing Pi Features](./spec_topics/comparison.md) — loom vs. Pi `prompt` / `subagent`.

**Background (non-normative).** Skippable; explains design provenance, not requirements.

- [Influences](./spec_topics/influences.md) — what loom borrows from Rust, TypeScript, and what it doesn't.

---

## Language

Surface and semantics of the Loom language (shared by `.loom` and `.warp` files).

- [Lexical Structure](./spec_topics/lexical.md) — identifiers, keywords, comments, strings, numbers.
- [Type System](./spec_topics/type-system.md) — primitive, named, generic, union, literal, inline-object types.
  - [Schema Declarations](./spec_topics/schemas.md) — `schema X { ... }`, `schema X = ...`, `enum`, discriminated unions, recursion, wire-name renaming.
  - [Descriptions](./spec_topics/descriptions.md) — `///` doc comments, field separators.
  - [Schema Subset](./spec_topics/schema-subset.md) — JSON-Schema subset and lowering algorithm.
- [Parameters and Frontmatter](./spec_topics/frontmatter.md) — frontmatter fields, `params`, `tools`, `system`, `respond_repair`, template interpolation.
- [Query](./spec_topics/query.md) — `@`-templates, schema inference, respond-repair, `QueryError`.
- [Expression Sublanguage](./spec_topics/expressions.md) — supported forms, stdlib, operator precedence, grammar disambiguation, object/array construction.
- [Bindings and Mutability](./spec_topics/bindings.md) — `let`, `let mut`, reassignment.
- [Control Flow](./spec_topics/control-flow.md) — `if`, `for`, `while`, `break`, `continue`.
- [Errors and Results](./spec_topics/errors-and-results.md) — `match`, pattern grammar, `Result`, `?`, runtime panics.
- [Return Statement](./spec_topics/return.md) — `return expr` rules.
- [Function Definitions](./spec_topics/functions.md) — `fn`, hoisting, tail-expression returns.
- [Tool Calls](./spec_topics/tool-calls.md) — `<name>(args)`, `CodeToolError`.
- [Invocation](./spec_topics/invocation.md) — `invoke(...)`, cross-mode matrix, invoke errors, cycle detection.
- [Imports](./spec_topics/imports.md) — `.warp` library files, `import`/`export`, cycles.

---

## Extension Architecture

How loom integrates with the Pi runtime.

- [Pi Extension Integration](./spec_topics/pi-integration.md) — overall extension shape and index of subtopics.
- [Discovery](./spec_topics/discovery.md) — discovery sources, priority, cross-format collisions.
- [Slash-Command Invocation](./spec_topics/slash-invocation.md) — prompt-mode `Err` formatting, no-params overflow, call-chain note.
- [Slash-Command Argument Binding](./spec_topics/binder.md) — LLM-driven binder: model, context, envelope, defaulting, echo, failure modes.
- [Cancellation](./spec_topics/cancellation.md) — `AbortSignal` rules.
- [Diagnostics](./spec_topics/diagnostics.md) — diagnostic shape, code-registry rules, placeholder rendering, normative code registry, multi-error reporting.

---

## Implementation Notes

Implementer-facing notes about the runtime and Pi SDK contract.

- [Implementation Notes](./spec_topics/implementation-notes.md) — parser contract, runtime behaviour, schema-validation contract, single-threaded execution.
- [Runtime Value Model](./spec_topics/runtime-value-model.md) — JS representation of loom values, equality, wire-name translation.
- [Pi Integration Contract](./spec_topics/pi-integration-contract.md) — the named `@mariozechner/pi-coding-agent` surface the runtime depends on.
- [Future Considerations](./spec_topics/future-considerations.md) — out-of-scope features.

---

## Appendix

- [Glossary](./spec_topics/glossary.md) — alphabetised list of coined terms with pointers to their canonical defining pages.
- [Grammar Appendix](./spec_topics/grammar.md) — normative productions for the literal sublanguage and the surface-syntax forms no single topic page owns.
- [Governance](./spec_topics/governance.md) — REQ-ID prefix table, retirement registry, and the GOV-1 through GOV-8 rules that govern REQ-ID coining, anchoring, retirement, and gating.
- [Related Work](./spec_topics/related-work.md) — orchestration-layer and inference-layer neighbours.
