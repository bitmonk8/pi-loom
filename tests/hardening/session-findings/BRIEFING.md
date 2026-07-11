# Session-semantics hardening campaign — shared briefing

Third hardening pass. Prior passes (`tests/hardening/SUMMARY.md`,
`tests/hardening/cli-findings/SUMMARY.md`) exhausted the **static** surface
(parse / load / discovery / expressions / frontmatter / imports / invoke
parse+ceilings). This pass targets **real session runtime semantics** that only
manifest against a live model + real conversation: subagent isolation,
cross-mode invoke value passing, multi-turn conversation drive, the final value,
system-note rendering, the binder, cancellation, hot-reload.

## Goal

Find behaviours where Loom does not match a reasonable user expectation AND is
not explicitly called out as intended in the spec/docs. Spec (`docs/spec.md` +
`docs/spec_topics/`) is more normative than docs (`docs/guide.md`,
`docs/tutorial.md`, `docs/how-to/`, `docs/reference/`), but the spec is not
assumed 100% correct. Bug-ness is a judgement call: is the behaviour reasonable
given Loom's purpose? At this maturity most real bugs are obvious — **ignore
borderline cases**; only report a `borderline` verdict when it is genuinely
instructive. Do NOT re-report anything already in the two prior SUMMARY.md files
or the per-lens `findings/` and `cli-findings/` docs — read those first to dedupe.

## Harness

Drive real `.loom`/`.warp` files through the SHIPPED extension against the LIVE
model with `tests/hardening/probe-harness.ts` (`runProbe`). Read its header +
`tests/hardening/_smoke.test.ts` for the exact shape. Write your probes as a
vitest file under `tests/hardening/session-<lens>.test.ts` and run:

    npx vitest run --config vitest.hardening.config.ts tests/hardening/session-<lens>.test.ts

Observation channels (prefer deterministic ones; keep model turns MINIMAL — this
burns real tokens):
- `probe.registeredNames` — registration outcomes (ZERO tokens).
- `probe.diagnostics` — load-phase `ctx.ui.notify` diagnostics (ZERO tokens).
- `turn.userTexts` — exact user-turn text the loom CODE computed (deterministic).
- `turn.toolCalls` — code-driven tool calls + args (deterministic).
- `turn.systemNotes` — `loom-system-note` channel entries (SLSH-3/SNK notes,
  binder notes, SLSH-1 overflow) — deterministic-ish, the primary channel for
  system-note-rendering probes.
- `turn.assistantText` — streamed model reply (stochastic; only assert when the
  loom pins the reply with a deterministic sentinel instruction like
  ``@`Reply with exactly: OK` ``).
- `turn.error` — a throw while driving.

To force a deterministic model reply, instruct the model to echo a sentinel. To
force a deterministic *failure* without relying on the model misbehaving, use the
depth-6 nested-schema trick from `cli-findings/queries-toolloop.md`.

## Token discipline

Every `drives` entry is a live turn. Batch assertions into as few drives as
possible. Registration/diagnostic-only probes (empty `drives`) are free — use
them wherever the finding is a load-time outcome. Cap each probe file at a
handful of live drives.

## Reporting

Write ONE markdown file: `tests/hardening/session-findings/<lens>.md`. Per
finding: `id` (LENS-N), one-line title, `repro` (the `.loom` text + invocation),
`expected` (with spec/doc citation — quote the anchor), `observed` (what the
probe showed, with the deterministic channel it came from), `verdict`
(bug / borderline / documented-gap) + reasoning. Also keep a
"Verified-conformant" section listing what you confirmed works, to bound the
search. Do NOT edit any `src/**` production file — this is a test+report pass;
the orchestrator triages and dispatches fixes.
