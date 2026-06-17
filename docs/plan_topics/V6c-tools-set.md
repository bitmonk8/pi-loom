# `V6c` — `tools` callable set and resolution snapshot

**Spec.** [`../spec_topics/frontmatter/frontmatter-fields-a.md`](../spec_topics/frontmatter/frontmatter-fields-a.md).

**Adds.** The `tools:` callable set: Pi-tool and `.loom` entries, `as` rename, name-collision detection, the frozen resolution snapshot, the two YAML spellings, and the default for absent/empty `tools:`. Load-time rejection of prompt-mode `.loom` callees lands here.

**Tests.**
- `loom/load/prompt-mode-callable`: a prompt-mode `.loom` callee in `tools:` is rejected at load time.
- `loom/load/tool-name-collision`: a `tools:` name collision fires; `as` rename resolves.
- `loom/load/unresolvable-loom-path`: a `tools:` `.loom` entry whose path does not exist or is not readable is rejected at load time.
- `loom/load/invalid-tool-rename`: a `tools:` `as` rename target that is not loom-identifier-shaped (e.g. `as MyTool`) is rejected at load time.
- `loom/load/unknown-tool`: a `tools:` entry naming a Pi tool absent from the registry is rejected at load time.
- The resolved callable set is frozen (no ambient inheritance); both YAML spellings parse.

**Deps.** `V6c-T`, `V6a`, `V15a`, `V9f`

**Ships when.** `npm test` resolves `tools:`, rejects a prompt-mode callee, an unresolvable `.loom` path, an invalid `as` rename, and an unknown Pi tool, and freezes the snapshot.
