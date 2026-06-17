# `V9f` — Tool-registration lifetime and visibility

**Spec.** [`../spec_topics/pi-integration-contract/tool-registration-lifetime.md`](../spec_topics/pi-integration-contract/tool-registration-lifetime.md), [`../spec_topics/pi-integration-contract/extension-bootstrap-and-per-loom.md`](../spec_topics/pi-integration-contract/extension-bootstrap-and-per-loom.md) (§Per-loom registration — `ToolDefinition` field derivations).

**Adds.** The per-mode tool wiring (subagent `customTools` vs prompt-mode registration cache), the `Type.Unsafe` schema bridge, the snapshot/restore on the prompt path, the no-`unregisterTool` rule, cache-collision disambiguation, and the materialised `ToolDefinition.label` derivation — the loom file's basename with interior hyphens preserved and only the leading character capitalised (`code-review.loom` → `"Code-review"`), and the synthesised typed-query one-shot tool's literal label `"Loom typed-query response"`.

**Tests.**
- `PIC-8`: a step-4 restore throw triggers one re-attempt, then `active-set-restore-failed` (E) + a `display:true` note, and propagates the original error.
- `PIC-19`: a step-1/step-2 snapshot/swap-install throw surfaces as `internal-error` with no restore owed.
- The callable set's visibility tracks the invocation; `registration-cache-collision` disambiguates a slug clash.
- `extension-bootstrap-and-per-loom.md` §Per-loom registration `ToolDefinition.label` derivation (GOV-22 un-anchored residue): materialising `code-review.loom` yields `label: "Code-review"` (interior hyphen preserved, leading character capitalised), and the synthesised typed-query one-shot tool materialises `label: "Loom typed-query response"`.

**Deps.** `V9f-T`, `V9a`, `V5d`

**Ships when.** `npm test` asserts the restore-failure path (`PIC-8`), the install-failure path (`PIC-19`), and the `ToolDefinition.label` derivation (`code-review.loom` → `"Code-review"`; the synthesised typed-query one-shot tool → `"Loom typed-query response"`).
