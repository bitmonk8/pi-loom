# `V6c-T` — `tools` callable set and resolution snapshot (tests)

**Spec.** [`../spec_topics/frontmatter/frontmatter-fields-a.md`](../spec_topics/frontmatter/frontmatter-fields-a.md).

**Adds.** Failing tests for the paired `V6c` implementation leaf.

**Tests.**
- `loom/load/prompt-mode-callable`: a prompt-mode `.loom` callee in `tools:` is rejected at load time.
- `loom/load/tool-name-collision`: a `tools:` name collision fires; `as` rename resolves.
- `loom/load/unresolvable-loom-path`: a `tools:` `.loom` entry whose path does not exist or is not readable is rejected at load time.
- `loom/load/invalid-tool-rename`: a `tools:` `as` rename target that is not loom-identifier-shaped (e.g. `as MyTool`) is rejected at load time.
- `loom/load/unknown-tool`: a `tools:` entry naming a Pi tool absent from the registry is rejected at load time.
- The resolved callable set is frozen (no ambient inheritance); both YAML spellings parse.

**Deps.** `V6a`, `V15a`, `V9f`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
