# Findings — Frontmatter, Tools/Callable Set & Parse/Load Diagnostics

Live probes: `tests/hardening/frontmatter-diagnostics.test.ts` (6 probes, all
zero-token — `drives: []`). Run:

    npx vitest run --config vitest.hardening.config.ts tests/hardening/frontmatter-*.test.ts

Observation channels: `probe.registeredNames` (did the loom register through the
real discovery+parse+compose pipeline) and `probe.diagnostics` (the error-severity
`ctx.ui.notify` messages the load phase emitted). Note: the production path only
routes `severity === "error"` diagnostics to `ctx.ui.notify`
(`src/extension/production-composition.ts:93`); warnings are not observable here,
so warning-level codes are out of scope for these probes.

---

## FM-1 — `tools:` comma short-form is broken; a legal `tools: read, grep` loom fails to load (BUG)

**Repro.** Project loom:
```
---
mode: prompt
tools: read, grep
---
@`hi`
```
Invocation: none (registration-only probe).

**Expected.** The loom registers with a two-entry callable set `{read, grep}`.
`docs/reference/frontmatter.md` §`tools:` and
`docs/spec_topics/frontmatter/frontmatter-fields-b-and-templates.md` §YAML-shape:
"`tools:` accepts a comma-separated short form and a YAML list form, both parsed
by the same per-entry grammar … The comma form is the YAML plain scalar split on
commas, each resulting entry trimmed of surrounding whitespace and then parsed by
that grammar." `docs/reference/frontmatter.md` shows the literal example
`tools: read, grep, bash`.

**Observed.** The loom does **not** register. The load phase emits
`cannot resolve .loom path 'read,'` (`loom/load/unresolvable-loom-path`). The YAML
list form (`- read` / `- grep`) and a single bare tool (`tools: read`) both
register correctly — the breakage is specific to the comma short-form with ≥2
entries.

**Root cause.** `src/parser/frontmatter.ts` `extractToolsList` returns the plain
scalar as a **single** list element (`["read, grep"]`) and never splits on commas.
The production callable-set resolver (`resolveLoomToolsAtLoad` in
`src/extension/production-composition.ts`) always feeds `{ kind: "list", items }`
to `resolveCallableSet`, so `resolveCallableSet`'s comma-splitting `kind:
"scalar"` path (the one exercised by `tests/callable-set.test.ts`) is never used
in production. The single element `"read, grep"` is split on whitespace by
`toolsEntrySpec`, yielding the token `read,`, which — not being identifier-shaped
— is classified as a `.loom` path and fails to resolve.

**Verdict: BUG.** A documented, spec-legal frontmatter spelling fails to load a
loom, with a misleading diagnostic. The two "interchangeable" spellings are not
interchangeable in the shipped extension.

---

## FM-2 — comma-form mis-parse masks the correct diagnostic for an unknown Pi tool (BUG)

**Repro.**
```
---
mode: prompt
tools: read, bogus_tool
---
@`hi`
```

**Expected.** `loom/load/unknown-tool` — message `unknown Pi tool 'bogus_tool'`
(`docs/reference/diagnostics.md`, `docs/reference/frontmatter.md` §`tools:`).

**Observed.** The loom un-registers, but with `cannot resolve .loom path 'read,'`
(`loom/load/unresolvable-loom-path`) — the wrong code and wrong message. The
unknown-tool check is never reached because FM-1's mis-parse fails first on the
mangled `read,` token.

**Verdict: BUG.** Same root cause as FM-1; reported separately because the
diagnostic surface is wrong (wrong code, wrong offending token) — an author fixing
the reported `read,` path error cannot recover, because the real problem is the
comma spelling itself.

---

## FM-3 — frontmatter / body parse-load errors un-register the loom SILENTLY (BUG)

**Repro.** Any of: `mode:` absent; `mode: agent`; `system:` on a `mode: prompt`
loom; `tool_loop.max_rounds: -1`; `params: null`; an unterminated string in the
body (`let x = "abc`). Each as its own project loom.

**Expected.** The loom un-registers **and** the author sees the normative
diagnostic. `docs/reference/diagnostics.md` DIAG-1: "Every author-visible
diagnostic carries a code from this registry." The composition root states its own
intent (`src/extension/production-composition.ts:88`): "Diagnostics surfaced
during discovery / parse route through a transient toast (`ctx.ui.notify`) for
errors." Expected messages, respectively: `frontmatter is missing required field
'mode:'`, `unknown 'mode:' value 'agent'; …`, `'system:' is not permitted on a
mode: prompt loom`, `frontmatter field 'tool_loop.max_rounds' must be a
non-negative integer; got -1`, `'params: null' is not permitted; …`,
`unterminated string literal`.

**Observed.** All six looms correctly un-register, but the load phase emits
**zero** diagnostics (`probe.diagnostics.length === 0`). The command silently
disappears with no explanation to the author.

**Root cause.** `parseDiscoveredLoom` (`src/extension/production-composition.ts`)
computes `document.diagnostics` from `parseLoomDocument` and returns `undefined`
when a load/parse error is present, but it never passes those diagnostics to
`emitDiagnostic`. Only `resolveLoomToolsAtLoad` and the discovery-walk /
settings diagnostics are emitted — which is why the `tools:`-surface errors
(FM-6) do surface while every frontmatter/body error is dropped. The in-code
comment claims "Its load-phase diagnostics were aggregated by the parser and
routed above," but there is no such routing.

**Verdict: BUG.** Contradicts the composition root's own stated error-routing
intent and DIAG-1. Not covered by README "Known gaps" (which lists only type-layer
diagnostics and nested control forms). A typo in `mode:` yields a silently missing
command — the single most likely first-run authoring error produces no feedback.

---

## FM-4 — missing closing frontmatter delimiter silently drops the body and registers an empty loom (BUG)

**Repro.**
```
---
mode: prompt
@`hello world`
```
(No closing `---`.)

**Expected.** Reasonable expectation: an unterminated frontmatter fence is
malformed — either a diagnostic and no registration, or the body is preserved. The
task brief explicitly lists "missing frontmatter delimiters" as a diagnostic
surface to cover.

**Observed.** The loom **registers** as `no-close` with an **empty body** — the
`@`hello world`` query is silently discarded — and emits no diagnostic.
`splitFrontmatter` (`src/parser/loom-document.ts`) handles the unterminated fence
by treating the whole file as frontmatter and returning an empty body.

**Verdict: BUG.** Silent data loss: the author's only query vanishes and a
do-nothing command is registered with no warning. Driving `/no-close` would run a
loom with no query at all.

---

## FM-5 — malformed YAML frontmatter is silently accepted (BUG)

**Repro.**
```
---
mode: prompt
params:
  x: : :
---
@`hi`
```

**Expected.** Malformed YAML in the frontmatter block is reported (or at minimum
blocks registration). The YAML parser itself flags the error: `parseDocument`
returns `doc.errors = [BLOCK_AS_IMPLICIT_KEY, BLOCK_AS_IMPLICIT_KEY]` for this
input.

**Observed.** The loom **registers** and no diagnostic is emitted.
`parseFrontmatter` (`src/parser/frontmatter.ts`) calls `parseDocument(...)` but
never inspects `doc.errors`; it consumes the recovering parser's partial `contents`
as if well-formed.

**Verdict: BUG (secondary).** The closed diagnostic registry has no
malformed-YAML code, so there is no prescribed message — but silently accepting
frontmatter the YAML parser has explicitly rejected is not reasonable behaviour.
Reported as secondary because the missing registry code makes the "correct"
surface underspecified.

---

## FM-6 — `.loom` callable-set rejections behave correctly (CONTROL / no bug)

**Repro / Observed.** Verified that these all un-register **and** surface the
correct diagnostic (via `resolveLoomToolsAtLoad`, which does emit):
- prompt-mode callee in `tools:` → `'tools:' entry './child-prompt.loom' points at
  a prompt-mode loom; only subagent-mode looms are permitted`.
- callee carrying its own body error → `callee './child-broken.loom' has errors;
  see related diagnostics`.
- invalid `as` rename target (`as Triage`) → `'as Triage' rename target must be
  lowercase-first; got 'Triage'`.
- name collision (`read` + `./read.loom`) → `tool name 'read' collides with
  another 'tools:' entry, top-level fn, or import`.
- unresolvable path (`./nope.loom`) → `cannot resolve .loom path './nope.loom'`.
And these register correctly: a subagent callee (`./child-sub.loom`), an `as`
rename to a lowercase-first target, a YAML list-form `tools:`, a single bare tool.

**Verdict: no bug.** Recorded as the control that scopes FM-1/FM-2 to the comma
spelling and FM-3 to the frontmatter/body-diagnostic path, rather than a
whole-surface failure. (Note: the `.loom`-callee surface emits diagnostics because
`resolveLoomToolsAtLoad` calls `emitDiagnostic`; the frontmatter/body surface in
FM-3 does not — the same root asymmetry.)

---

## Summary

| id | title | verdict |
|----|-------|---------|
| FM-1 | `tools:` comma short-form fails to load a legal loom | BUG |
| FM-2 | comma-form mis-parse masks the unknown-Pi-tool diagnostic | BUG |
| FM-3 | frontmatter/body parse-load errors un-register the loom silently | BUG |
| FM-4 | missing closing `---` drops the body and registers an empty loom | BUG |
| FM-5 | malformed YAML frontmatter silently accepted | BUG (secondary) |
| FM-6 | `.loom` callable-set rejections behave correctly | no bug (control) |

Probe count: 6 (all zero-token).
