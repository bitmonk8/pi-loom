# H3 — Diagnostics primitive and multi-error accumulator

**Spec.** [Diagnostics](../spec_topics/diagnostics.md).

**Adds.** `Diagnostic` shape from the spec; `DiagnosticsAccumulator`; serialiser producing both the spec's line-format `content` string (`"<file>:<line>:<col>: <code>: <message>"`, with `"\n  hint: <hint>"` appended when a hint is present and indented lines appended for each related site; multi-error batches separate per-`Diagnostic` blocks with one blank line) and the structured `details: { diagnostics: Diagnostic[] }` payload, both shaped for the single `pi.sendMessage({ customType: "loom-system-note", content, display: true, details }, { triggerTurn: false })` call defined in `spec_topics/diagnostics.md` and registered by V18h; the closed code constants enumerated by the registry table in [`spec_topics/diagnostics.md`](../spec_topics/diagnostics.md), grouped by the four namespaces `loom/parse/*`, `loom/type/*`, `loom/load/*`, `loom/runtime/*` (the registry table is the single source of truth; the constants module is generated from — or asserted equal to — the parsed registry, per the V18s diagnostic-code closing gate). There is no `loom/lex/*` namespace: every `lex`-phase code in `spec_topics/diagnostics.md` routes through `loom/parse/*` (or `loom/load/invalid-encoding` for the UTF-8 / BOM case); `MultiErrorReporter` ordering by `(file, line, column)`; custom ESLint rule `loom/no-throw-diagnostic-code` that flags any `throw` whose argument is a `new Error(...)` (or string-literal expression) whose first message segment matches `/^loom\/(parse|load|type|runtime)\//`, with a path-based allow-list for `src/diagnostics/**` (the sink's own implementation legitimately constructs `Error` instances carrying `loom/...` codes when synthesising fallback notifications) and `test/**`; rule wired into the H1 ESLint preset at `error` severity.

**Tests.**
- Range is 1-indexed, end-exclusive.
- Serialised line shape: `"<file>:<line>:<col>: <code>: <message>"`.
- Hint appended as `"\n  hint: <hint>"`.
- Related sites appended as indented lines.
- Multi-error sort is stable on equal positions.
- No emitted code's namespace prefix falls outside the four-element constant set above (enforced by a unit test that scans every code emitted by the test suite).
- For each defined severity (`"error"`, `"warning"`), a `Diagnostic` value passed through the `DiagnosticsAccumulator` serialiser appears as `details.diagnostics[i].severity` on the resulting `loom-system-note` `pi.sendMessage` payload with the same string value (the line-format `content` string carries no severity field and is not asserted here).
- Running ESLint (programmatically, against an inline fixture string — not against repo-checked-in test files) over a fixture containing `throw new Error("loom/parse/binding-case-mismatch")` located outside `src/diagnostics/` reports `loom/no-throw-diagnostic-code` at the offending line.
- Running ESLint over a fixture containing `diagnosticsSink.report({ code: "loom/parse/binding-case-mismatch", ... })` and `throw new Error("internal invariant violated")` (no `loom/` prefix) does not report `loom/no-throw-diagnostic-code`.
- Reading `.eslintrc` (or the flat-config equivalent) confirms `loom/no-throw-diagnostic-code` is present and set to `error`.
- The rule's matcher is on the literal first segment of the message string only; dynamically composed messages (e.g. `` throw new Error(`loom/${ns}/foo`) ``) are out of scope for V1 and are the implementer's responsibility to avoid.
- The exported constants set equals the set of codes parsed from the registry table of [`spec_topics/diagnostics.md`](../spec_topics/diagnostics.md) (no extras, no omissions); this anchors the V18s diagnostic-code closing gate.

**Deps.** H2.

**Ships when.** H3's Tests pass; the `loom/no-throw-diagnostic-code` rule is wired at `error` severity and is observed by the ESLint-fixture Tests bullets above. Compliance of "later phases" is enforced mechanically by the rule running in `npm run lint` (the H1 Ships-when gate), not by manual audit.
