# CLI Findings — Frontmatter validation & load-diagnostic surfacing (real `pi -p`)

Lens: **do frontmatter/load diagnostics reach a real `-p` CLI user?** All probes
drive the shipped `pi` binary (0.75.5) end-to-end:

    MSYS_NO_PATHCONV=1 timeout 60 pi -ne -e ./extensions --loom <DIR> \
      --model claude-haiku-4-5 -p "/stem [args]"  2>err.txt ; echo "EXIT: $?"

Baseline control (a valid loom) confirmed working: `/ok hello` → streams
`OK_hello`, exit 0. The prior in-process findings FM-1..5 are FIXED; this lens
tests the *surfacing* of those now-emitted diagnostics through the real CLI, which
the in-process probe harness (which intercepts `ctx.ui.notify`) cannot observe.

---

## FINDING FMC-1: load-phase diagnostics never reach a `-p` CLI user — a broken loom silently degrades to chat (exit 0, empty stderr, no JSON event)

- repro: any loom that fails to load. Confirmed across the full drop-class matrix,
  each as its own `--loom` dir, invoked with `-p "/stem"`:

  | # | frontmatter defect | spec code | registers? | stdout | stderr | exit |
  |---|---|---|---|---|---|---|
  | 1 | `mode:` absent | `loom/load/missing-mode` (E) | no | model hallucinates about `/stem` | empty | 0 |
  | 2 | `mode: banana` | `loom/load/unknown-mode-value` (E) | no | model hallucination | empty | 0 |
  | 3 | `system:` on `mode: prompt` | `loom/parse/system-on-prompt-mode` (E) | no | model hallucination | empty | 0 |
  | 4 | no frontmatter fence at all | `loom/load/missing-mode` (E) | no | model hallucination | empty | 0 |
  | 5 | unterminated `---` fence | (FM-4 class) | no | model hallucination | empty | 0 |
  | 6 | duplicate `mode:` key | (malformed-YAML class) | no | model hallucination | empty | 0 |

  Example (#1):
  ```
  ---
  description: no mode field
  params:
    x: string
  ---
  @`Repeat this text verbatim and output nothing else: RAN_${x}`
  ```
  `pi -ne -e ./extensions --loom ./d --model claude-haiku-4-5 -p "/stem hello"`

- expected: the author/user sees the normative load diagnostic, and the failure is
  distinguishable from success. `docs/reference/diagnostics.md` DIAG-1: "Every
  author-visible diagnostic carries a code from this registry." `frontmatter.md`
  field-contract: a missing/invalid `mode:` is a load-time **error** and "the loom
  is not registered." The composition root states its own intent
  (`src/extension/production-composition.ts:88`): "Diagnostics surfaced during
  discovery / parse route through a transient toast (`ctx.ui.notify`) for errors."
  A `-p` user (or a script) reasonably expects the diagnostic on stderr, or a
  non-zero exit, or a structured event under `--mode json` — some signal that
  `/stem` did not run.

- observed: **none of those channels carries anything.** For every drop-class loom:
  - stdout contains only the model's turn — the model receives the literal
    `/stem …` as a chat message and hallucinates (e.g. "I don't recognize the
    `/stem` command. What would you like help with?"). The `agent_end` transcript
    confirms the user turn is the raw string `/stem hi`.
  - stderr is **0 bytes**.
  - exit code is **0**.
  - `--mode json` emits only `message_update`/`turn_end`/`agent_end` events — **no**
    diagnostic/notify event. The load error is absent from the structured stream.

  Root cause: the FM-3 fix now *does* emit the diagnostic
  (`production-composition.ts:219` `emitDiagnostic(diagnostic)` on the dropped
  loom), but `emitDiagnostic` routes it to `ctx.ui.notify(message, "error")`
  (`:100`). In headless `-p` mode that UI toast has no rendering surface, so the
  diagnostic is emitted into a channel the CLI user never sees. The in-process
  hardening probe passes because it intercepts `ctx.ui.notify`; the real CLI does
  not. The `.loom`-callable and settings/discovery diagnostics share the same sink
  and are equally invisible in `-p`.

- verdict: **bug.** The single most likely first-run authoring error (a `mode:`
  typo, a `mode: agent`, `system:` on the wrong mode) produces a command that
  silently vanishes, is replaced by a hallucinated model reply, and reports
  success (exit 0). The composition root's stated error-routing intent and DIAG-1
  are not met on the real CLI surface — the only surface a real user has in `-p`
  mode. This is the exact "only visible through the real CLI" class the campaign
  targets: distinct from the now-fixed in-process FM-3 (empty diagnostics list),
  because here the diagnostic *is* produced but routed to a dead channel.

---

## FINDING FMC-2: the un-run slash command (and its arguments) is billed to the model as chat, with no opt-out signal

- repro: same drop-class looms as FMC-1, invoked with real arguments, e.g.
  `-p "/stem <whatever the user typed>"`. `--mode json` shows the first `user`
  turn content is the verbatim string `/stem <args>` and a full assistant turn is
  generated and billed (observed `usage`/`cost` fields, e.g.
  `"cost":{"total":0.004488}` for a single hallucinated reply).

- expected: when a slash command fails to register, a reasonable user does not
  expect their `/stem <args>` line — which may carry paths, secrets, or free text
  they intended for a local loom binder, not the model — to be forwarded verbatim
  to the model and charged as a turn. At minimum the non-registration should be
  surfaced (FMC-1) so the user knows the text went to the model.

- observed: the literal command line is sent to the model as a user message,
  answered, and billed; the user is given no indication the loom did not run and
  that their input reached the model instead. Combined with FMC-1's exit 0, a
  scripted pipeline cannot detect the difference between "loom ran" and "loom was
  silently forwarded to the model."

- verdict: **borderline** (leaning bug). This is a downstream consequence of the
  Pi slash-dispatch fallback (an unregistered `/name` is treated as chat), so the
  root is arguably Pi-side, not Loom-side; but Loom owns the registration decision
  and the (invisible) diagnostic, and is the component that knows the loom is
  broken. Reported separately from FMC-1 because the harm dimension differs
  (silent data-to-model + billing, not just a missing error message).

---

## Control observations (no bug)

- **Unknown frontmatter field registers and runs.** A `mode: prompt` loom with
  `bogus_field: 1` **registered and executed** (`/stem` streamed `REG_C`), exit 0.
  This matches `frontmatter.md`: an unknown field is
  `loom/load/unknown-frontmatter-field` (**warning**) and "the loom still loads and
  registers." The warning itself is invisible in `-p` (warnings are dropped by
  `emitDiagnostic` even in-process), but since the loom works this is not a bug —
  recorded to scope FMC-1 to *error*-severity (drop) diagnostics only.
- **Flaky, NOT reported:** one of the seven runs (the unterminated-fence loom)
  exited 1 with a Node ESM-loader crash — `ERR_INVALID_ARG_VALUE ... path must be
  a string ... without null bytes` on a corrupted module path
  (`C:\User\x00s\...\typebox\...`) during interpreter module load. Two clean
  re-runs of the identical input returned exit 0 / empty stderr / unregistered
  (row 5 above). Judged a non-deterministic host/Node loader glitch unrelated to
  loom content; excluded.

## Summary

| id | title | verdict |
|----|-------|---------|
| FMC-1 | load-phase diagnostics never reach a `-p` CLI user; broken loom → silent chat, exit 0 | bug |
| FMC-2 | un-run `/stem <args>` forwarded to model verbatim and billed, no signal | borderline |
