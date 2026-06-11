# pi-loom — Implementation Plan

Companion to [`spec.md`](./spec.md). The plan is a set of per-phase leaf pages under [`plan_topics/`](./plan_topics/). An implementer working on a single leaf only needs to open that leaf's page plus the spec topics it references.

## How to use this plan

1. Read [`plan_topics/conventions.md`](./plan_topics/conventions.md) once — it covers the three phase categories (horizontal / MVP / vertical), the per-phase TDD ritual, the leaf format, and the project-wide cross-cutting rules.
2. Author new leaves by copying [`plan_topics/leaf-template.md`](./plan_topics/leaf-template.md) and saving under `plan_topics/<id>-<short-name>.md`. Link the new leaf into the appropriate section below. If the new leaf can introduce an executable REQ-ID, a citing test that *closes* a coverage-matrix-mapped numbered REQ-ID, or an un-anchored normative MUST, add it to [`H5b`](./plan_topics/H5b-warn-only-canary.md)'s **Deps** per [`conventions.md`](./plan_topics/conventions.md) §REQ-ID discipline (*Transitive-completeness plan-maintenance*), which states that obligation once and governs its exact triggers.
3. Pick the next leaf whose **Deps** are satisfied. Open that leaf's page; read only the leaf and the spec topic(s) listed under its **Spec** field.
4. Follow the per-phase TDD ritual. MVP and vertical features are two paired tasks — land the tests task `<id>-T` first (tag `<id>-T-complete`), then the implementation task `<id>` (tag `<id>-complete` when its **Ships when** condition is observable). Horizontal leaves are a single task tagged `<id>-complete`.
5. Maintain [`plan_topics/coverage-matrix.md`](./plan_topics/coverage-matrix.md) so every executable spec REQ-ID has at least one closing leaf by the loom 1.0 release gate, whose non-gating→gating activation is owned by the terminal [`H6a`](./plan_topics/H6a-live-corpus-activation.md) leaf.

---

## Scope

**In scope.** This plan implements loom 1.0 as defined by [`spec.md`](./spec.md) and its topics. Every leaf traces to a spec REQ-ID, or — for horizontal leaves — to a [`conventions.md`](./plan_topics/conventions.md) section.

**Out of scope.** The loom 1.0 non-goals and deferred forward-compatibility seams are owned by the spec, not this plan: see [`spec.md` — Scope](./spec_topics/overview-and-orientation.md#scope) and [Future Considerations — loom 1.0 non-goals](./spec_topics/future-considerations/model-changes-and-non-goals.md#v1-non-goals). No leaf implements a non-goal or a deferred seam; a step that appears to require one is scope creep — fix the spec first (per the **Spec drift** rule in [`conventions.md`](./plan_topics/conventions.md)) before planning it. Post-loom-1.0 surface extensions and model-level changes are likewise out of scope.

---

## Horizontal phases

Project scaffold, dependency-injection skeleton, diagnostics primitive, Pi-extension shell, end-to-end harness. Horizontal phases are infrastructure work — they operationalise [`conventions.md`](./plan_topics/conventions.md) rather than implement spec rules directly, so their leaves cite a **Convention.** field instead of a **Spec.** field.

- [`H1a` — Project scaffold and toolchain](./plan_topics/H1a-scaffold-and-toolchain.md)
- [`H2a` — Cross-cutting lint and architectural gates](./plan_topics/H2a-cross-cutting-gates.md)
- [`H3a` — Dependency-injection seam skeleton](./plan_topics/H3a-di-seam-skeleton.md)
- [`H4a` — Extension factory shell and end-to-end harness](./plan_topics/H4a-factory-shell-and-harness.md)
- [`H5a` — REQ-ID / diagnostic-code closing-gate automation](./plan_topics/H5a-closing-gate-automation.md)
- [`H7a` — Terminal integration-acceptance run (cross-slice end-to-end gate)](./plan_topics/H7a-integration-acceptance.md)

---

## MVP phase

The smallest end-to-end `.loom` that runs as a Pi slash command. One narrow vertical, end-to-end, to prove the pipeline before slice work begins.

- [`M-T` — Minimal end-to-end `.loom` slash command (tests)](./plan_topics/M-T-minimal-slash-command.md)
- [`M` — Minimal end-to-end `.loom` slash command](./plan_topics/M-minimal-slash-command.md)

---

## Vertical slices

Each slice is a coherent feature area (e.g. lexer, expressions, schemas, queries). Each leaf inside a slice is the smallest feature that can ship and be tested independently; slice grouping is editorial only. Leaves carry IDs like `V4b`. Slice numbering is an editorial grouping that only roughly tracks the dependency DAG (see `conventions.md` §3) — it is not a topological order. The canonical build order is dep-driven: pick the next leaf whose **Deps** are satisfied (How-to-use step 3), not the next slice number. Backward and non-linear cross-slice dependencies are expected; each is declared in the relevant leaf's **Deps** field. Each feature below is a paired `<id>-T` tests task and `<id>` implementation task; only the implementation leaf is linked, and its page lists its `-T` partner in **Deps**.

### V1 — Lexer and literals

- [`V1a` — Lexer core](./plan_topics/V1a-lexer-core.md)
- [`V1b` — String, number, and path literals](./plan_topics/V1b-literals-and-paths.md)

### V2 — Type system and values

- [`V2a` — Type grammar and loom literal sublanguage](./plan_topics/V2a-type-grammar.md)
- [`V2b` — Type-compatibility engine (`⊑`)](./plan_topics/V2b-type-compat-engine.md)
- [`V2c` — Runtime value model, equality, and wire-name translation](./plan_topics/V2c-value-model.md)
- [`V2d` — Canonical integer/number renderer](./plan_topics/V2d-number-rendering.md)

### V3 — Expressions, bindings, control flow, functions

- [`V3a` — Expression evaluator and stdlib](./plan_topics/V3a-expression-evaluator.md)
- [`V3b` — Bindings and mutability](./plan_topics/V3b-bindings.md)
- [`V3c` — Control flow](./plan_topics/V3c-control-flow.md)
- [`V3d` — Functions and return](./plan_topics/V3d-functions-and-return.md)

### V4 — Errors and results

- [`V4a` — `match`, `?`, and `Result`](./plan_topics/V4a-match-result.md)
- [`V4b` — Runtime panics](./plan_topics/V4b-runtime-panics.md)
- [`V4c` — Terminal outcomes, partial-append, and no-rollback](./plan_topics/V4c-terminal-outcomes.md)
- [`V4d` — `QueryError` variant schema](./plan_topics/V4d-queryerror-variants.md)
- [`V4e` — Pre-evaluation failures](./plan_topics/V4e-pre-evaluation-failures.md)

### V5 — Schemas, descriptions, schema-subset

- [`V5a` — Schema declarations (object / alias / enum)](./plan_topics/V5a-schema-decls.md)
- [`V5b` — Discriminated unions, recursion, and cycle detection](./plan_topics/V5b-disc-unions-recursion.md)
- [`V5c` — Descriptions (`///`)](./plan_topics/V5c-descriptions.md)
- [`V5d` — Schema-subset gate, lowering, and canonical hash](./plan_topics/V5d-subset-lowering.md)
- [`V5e` — JSON document depth enforcement (hard ceiling #4)](./plan_topics/V5e-depth-enforcement.md)

### V6 — Frontmatter

- [`V6a` — Frontmatter field contract](./plan_topics/V6a-frontmatter-contract.md)
- [`V6b` — `params` and defaults](./plan_topics/V6b-params-defaults.md)
- [`V6c` — `tools` callable set and resolution snapshot](./plan_topics/V6c-tools-set.md)
- [`V6d` — `system` template interpolation](./plan_topics/V6d-system-interpolation.md)
- [`V6e` — `respond_repair` and `tool_loop`](./plan_topics/V6e-respond-repair-tool-loop.md)

### V7 — Diagnostics

- [`V7a` — Diagnostics primitive and `loom-system-note` channel](./plan_topics/V7a-diagnostics-primitive.md)
- [`V7b` — Diagnostic code registry and closing gate](./plan_topics/V7b-code-registry.md)
- [`V7c` — Placeholder rendering](./plan_topics/V7c-placeholder-rendering.md)

### V8 — Pi host seams

- [`V8a` — `Checkpoint` and `SchemaValidator` seams](./plan_topics/V8a-checkpoint-validator-seams.md)
- [`V8b` — `Clock`, `FileSystem`, `IdSource`, `FileWatcher`, `TokenEstimator` seams](./plan_topics/V8b-clock-fs-id-watch-token-seams.md)

### V9 — Extension host integration

> **Interleave note.** V9 and V11 are not built as contiguous blocks. `V11a` (Binder-model resolution) depends on `V9b` and is itself a prerequisite of `V9c`/`V9i`/`V9j`, so the seam runs `V9b → V11a → V9c`/`V9i`/`V9j` — `V11a` lands mid-V9, not after all of V9. Separately, `V9h` (and therefore `V9g`) depend on `V18c` — the lightweight static-gates leaf from the `V18` SDK-gate slice (itself needing only `V18a`/`V18b`) — solely for its `session-shutdown-reason-snapshot` brand-string constant; they do **not** wait on the high-dependency runtime-evidence acceptance leaf `V18d`. Sequence by **Deps**, not slice number.

- [`V9a` — Capability probe (Step 0)](./plan_topics/V9a-capability-probe.md)
- [`V9b` — Registration steps and drain-state contract](./plan_topics/V9b-registration-drain-state.md)
- [`V9c` — Prompt-mode conversation drive and active-set gating](./plan_topics/V9c-conversation-drive.md)
- [`V9d` — Runtime-event channel and `masked` co-fire](./plan_topics/V9d-runtime-event-channel.md)
- [`V9e` — `ActiveInvocationRegistry`](./plan_topics/V9e-active-invocation-registry.md)
- [`V9f` — Tool-registration lifetime and visibility](./plan_topics/V9f-tool-registration-lifetime.md)
- [`V9g` — Session-shutdown teardown and emission isolation](./plan_topics/V9g-session-shutdown.md)
- [`V9h` — Session-only degraded state and unknown-reason rule](./plan_topics/V9h-degraded-unknown-reason.md)
- [`V9i` — Subagent-mode session isolation and lifecycle](./plan_topics/V9i-subagent-isolation.md)
- [`V9j` — Binder inference call and provider-error mapping](./plan_topics/V9j-binder-inference-provider-mapping.md)

### V10 — Discovery and settings

- [`V10a` — Discovery walk, sources, and collisions](./plan_topics/V10a-discovery-walk.md)
- [`V10b` — Package discovery (bounded walk)](./plan_topics/V10b-package-discovery.md)
- [`V10c` — Settings reads and merge](./plan_topics/V10c-settings-merge.md)

### V11 — Binder

> **Interleave note.** `V11a` depends on `V9b` and is a prerequisite of `V9c`/`V9i`/`V9j`, so it lands mid-V9 (seam `V9b → V11a → V9c`/`V9i`/`V9j`) rather than after the whole V9 slice. Sequence by **Deps**, not slice number.

- [`V11a` — Binder-model resolution and strict-capability probe](./plan_topics/V11a-binder-model-resolution.md)
- [`V11b` — Bind context, truncation, and transcript renderer](./plan_topics/V11b-bind-context-transcript.md)
- [`V11c` — Binder bypass and envelope schema](./plan_topics/V11c-bypass-envelope.md)
- [`V11d` — System-prompt builder, defaulting, and echo](./plan_topics/V11d-defaulting-echo.md)
- [`V11e` — Binder system-note rendering and determinism](./plan_topics/V11e-system-note-determinism.md)
- [`V11f` — Binder cancellation, per-class retry budget, and failure taxonomy](./plan_topics/V11f-binder-retry-taxonomy.md)

### V12 — Slash invocation

- [`V12a` — Slash dispatch, overflow, and streaming](./plan_topics/V12a-slash-dispatch.md)
- [`V12b` — Top-level `Err` formatting and chain attribution](./plan_topics/V12b-top-level-err-chain.md)

### V13 — Query

- [`V13a` — Query render and escapes](./plan_topics/V13a-query-render.md)
- [`V13b` — Query schema inference](./plan_topics/V13b-query-schema-inference.md)
- [`V13c` — Query tool loop and typed two-phase](./plan_topics/V13c-query-tool-loop.md)
- [`V13d` — Query failure and respond-repair](./plan_topics/V13d-query-failure-repair.md)

### V14 — Tool calls

- [`V14a` — Tool calls (code-side) and `CodeToolError`](./plan_topics/V14a-tool-calls.md)

### V15 — Invocation and imports

- [`V15a` — Invocation core](./plan_topics/V15a-invocation-core.md)
- [`V15b` — Invoke depth bound and cycle detection](./plan_topics/V15b-invoke-depth-cycle.md)
- [`V15c` — Imports (`.warp` library files)](./plan_topics/V15c-imports.md)

### V16 — Hard ceilings

- [`V16a` — Hard-ceiling interaction order and `masked` co-fire](./plan_topics/V16a-ceiling-order-masked.md)

### V17 — Cancellation

- [`V17a` — Cancellation core](./plan_topics/V17a-cancellation-core.md)

### V18 — Build-time SDK gates

- [`V18a` — SDK capability inventory](./plan_topics/V18a-capability-inventory.md)
- [`V18b` — Inventory-closure audit gate](./plan_topics/V18b-inventory-audit.md)
- [`V18c` — Pi version-bump static gates](./plan_topics/V18c-version-bump-checklist.md)
- [`V18d` — Pi version-bump runtime-evidence acceptance gate and revert path](./plan_topics/V18d-version-bump-acceptance.md)

---

## Release gate

This section is an editorial sub-grouping of the Horizontal phases above, not a fourth phase category: the release-gate leaves (`H5b`, `H6a`) are horizontal leaves in every respect — they cite a **Convention.** field and carry the `H<n><letter>` ID form — gathered here only because they run at release time.

A warn-only live-corpus canary ([`H5b`](./plan_topics/H5b-warn-only-canary.md)) runs the [`H5a`](./plan_topics/H5a-closing-gate-automation.md) closing gate over the live corpus without reddening CI, immediately before the terminal step ([`H6a`](./plan_topics/H6a-live-corpus-activation.md)) flips that gate from its seeded-fixture footing to its live-corpus footing. The canary's **Deps** name the complete coverage-producing set and carry the single statement of the transitive-completeness obligation; `H6a` sequences immediately after the canary (its **Deps** name `H5b`) and activates the loom 1.0 release gate referenced in item 5 above and in [`coverage-matrix.md`](./plan_topics/coverage-matrix.md). Reverting the `H6a` activation commit returns the gate to its `H5a` seeded-fixture footing.

- [`H5b` — Warn-only live-corpus canary (pre-activation pre-flight)](./plan_topics/H5b-warn-only-canary.md)
- [`H6a` — Live-corpus closing-gate activation (loom 1.0 release gate)](./plan_topics/H6a-live-corpus-activation.md)

---

## Spec coverage

- [Spec coverage matrix](./plan_topics/coverage-matrix.md) — every executable spec REQ-ID mapped to its closing leaf(s). Empty today; populated as leaves are authored.

## Authoring

- [Leaf template](./plan_topics/leaf-template.md) — copy this when adding a new leaf.
- [Conventions](./plan_topics/conventions.md) — phase categories, TDD ritual, leaf format, cross-cutting rules.
