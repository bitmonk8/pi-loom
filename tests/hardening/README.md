# Loom hardening — live bug hunt

Goal: find behaviours where Loom does not match reasonable user expectations and
that are NOT explicitly called out as intended in the spec/docs. Spec is more
normative than docs, but the spec is not assumed 100% correct. Bug-ness is a
judgement call: is the behaviour reasonable given Loom's purpose? At this maturity
most real bugs are obvious — ignore borderline cases.

## Harness

`tests/hardening/probe-harness.ts` boots the SHIPPED extension against a REAL
live model and drives real slash invocations. See `_smoke.test.ts` for the
template. Run a probe file:

    npx vitest run --config vitest.hardening.config.ts tests/hardening/<file>.test.ts

Observation channels (prefer deterministic ones; keep model turns minimal):
- `probe.registeredNames` — which slash commands registered (discovery / validity
  / collision outcomes; ZERO model turns).
- `probe.diagnostics` — every load-phase `ctx.ui.notify(message, type)`.
- `turn.userTexts` — exact user-turn text the loom CODE computed and sent
  (deterministic; reveals expression / control-flow / stdlib evaluation).
- `turn.toolCalls` — code-driven tool calls with computed args (deterministic).
- `turn.assistantText` — streamed model reply (stochastic; only assert when the
  loom pins the reply with a deterministic sentinel instruction).
- `turn.error` — a throw while driving.

## Findings

One markdown file per area under `findings/`. Each finding: id, one-line title,
repro (the `.loom` text + invocation), expected (with spec/doc citation),
observed, and a bug/borderline/documented-gap verdict with reasoning.
