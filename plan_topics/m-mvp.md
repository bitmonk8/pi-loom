# M — Minimal end-to-end loom

**Spec.** [Overview](../spec_topics/overview.md), [Pi Extension Integration](../spec_topics/pi-integration.md), [Pi Integration Contract — prompt-mode drive](../spec_topics/pi-integration-contract.md).

**Adds.** Lexer + parser limited to: frontmatter (`---` block with one line `mode: prompt`; `params:` absent or `params: {}`); body containing exactly one expression-statement of the form `` @`literal text` `` (no `${...}`, no `?`, no escapes other than `\``). Runtime: walks the body, calls `ConversationDriver.send` once, awaits `agent_end`. The MVP loom is no-params: `params:` absent and `params: {}` are equivalent, the binder is bypassed, and trailing slash text after the command name emits a single `customType: "loom-system-note"` formatted as `loom /<name>: ignoring extra arguments — this loom takes no parameters` before the loom runs (full rule in V3c). Discovery: `~/.pi/agent/looms/` and `.pi/looms/` only.

**Tests.**
- Minimal 4-line loom parses.
- Any unsupported keyword (`let`, `if`, `schema`, ...) → `loom/parse/unsupported-feature`.
- Missing closing backtick → `loom/parse/unterminated-template`.
- Run produces exactly one `send` call with the literal text.
- `/hello extra text` emits the no-params overflow system note (text matches spec verbatim) and still runs the loom.
- `/hello   ` (whitespace-only remainder) emits no note and runs the loom.
- AbortError surfaces as a system note.
- `~/.pi/agent/looms/hello.loom` registers `/hello`.
- Two files producing the same slash name across the two roots: only the project one registers; warning names both paths.

**Deps.** H1–H4.

**Ships when.** Manual: `hello.loom` placed in `.pi/looms/`, slash `/hello` produces an assistant turn in a real Pi session.
