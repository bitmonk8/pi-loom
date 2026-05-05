# H3 — Diagnostics primitive and multi-error accumulator

**Spec.** [Diagnostics](../spec_topics/diagnostics.md).

**Adds.** `Diagnostic` shape from the spec; `DiagnosticsAccumulator`; serialiser to Pi's flat `{ path, error }` shape; typed code-namespace constants (`loom/parse/*`, `loom/type/*`, `loom/load/*`, `loom/runtime/*`) — these are the four namespaces in the V1 closed registry. There is no `loom/lex/*` namespace: every `lex`-phase code in `spec_topics/diagnostics.md` routes through `loom/parse/*` (or `loom/load/invalid-encoding` for the UTF-8 / BOM case); `MultiErrorReporter` ordering by `(file, line, column)`.

**Tests.**
- Range is 1-indexed, end-exclusive.
- Serialised line shape: `"<file>:<line>:<col>: <code>: <message>"`.
- Hint appended as `"\n  hint: <hint>"`.
- Related sites appended as indented lines.
- Multi-error sort is stable on equal positions.
- No emitted code's namespace prefix falls outside the four-element constant set above (enforced by a unit test that scans every code emitted by the test suite).
- For each defined severity (`"error"`, `"warning"`), a `Diagnostic` value passed through the `DiagnosticsAccumulator` serialiser appears as `details.diagnostics[i].severity` on the resulting `loom-system-note` `pi.sendMessage` payload with the same string value (the line-format `content` string carries no severity field and is not asserted here).

**Deps.** H2.

**Ships when.** All later phases emit through `DiagnosticsSink` exclusively (lint rule forbids `throw new Error` for spec-defined diagnostics).
