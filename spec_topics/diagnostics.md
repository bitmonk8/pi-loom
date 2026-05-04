# Diagnostics

Loom emits structured diagnostics that are then serialised to Pi's flat `{ path, error }` shape used by `LoadExtensionsResult.errors` and the standard slash-command error channel.

Internal diagnostic shape:

```
{
  severity: "error" | "warning",
  code:     string,                          // e.g., "loom/parse/binding-case-mismatch"
  file:     string,                          // absolute path
  range:    { start: { line, column }, end: { line, column } },  // 1-indexed; end exclusive
  message:  string,                          // single-line summary
  hint?:    string,                          // optional suggested fix
  related?: array<{ file, range, message }>, // related sites (e.g., the colliding declaration)
}
```

**Code namespaces:**

- `loom/parse/*` — lexer / parser errors (unknown token, case mismatch, missing brace, etc.).
- `loom/type/*` — type-system errors (unknown identifier, type mismatch, schema constraint violation).
- `loom/load/*` — file-load and registration errors (unreadable file, name collision, invalid frontmatter, unresolvable `tools:` entry).
- `loom/runtime/*` — runtime errors surfaced as panics (`MatchError`, index out of bounds, etc.) reported back to Pi as system notes.

**Serialisation to Pi's flat shape:** `"<file>:<line>:<col>: <code>: <message>"`, optionally followed by `"\n  hint: <hint>"` when a hint is present. Related sites are appended as additional indented lines.

**Multi-error reporting.** Every parse / type pass collects all errors from the full file (and from transitive `.warp` imports) before failing. The loom is rejected with the complete list in one diagnostics call rather than fast-failing on the first error — authors get every problem at once.
