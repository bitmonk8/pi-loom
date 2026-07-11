# Session-semantics hardening — SYSTEM-NOTE RENDERING FIDELITY (SLSH-3/4/5, SNK-a..k)

Lens: force each `QueryError` KIND to be returned (unhandled `?`) to the
slash-dispatch boundary and compare the emitted `loom-system-note` against the
SLSH-4 SNK templates VERBATIM. Probes: `tests/hardening/session-systemnotes.test.ts`
(`npx vitest run --config vitest.hardening.config.ts tests/hardening/session-systemnotes.test.ts`).

Observation channel: `turn.systemNotes` (read deterministically off the in-memory
`SessionManager` `loom-system-note` entries) + `turn.error`. Six of the seven
probes issue ZERO provider turns (empty-template short-circuit, code-tool
execution failure, invoke parse-failure, invoke_callee cascade); only SNK-a spends
one live model turn (depth-6 nested-schema trick).

Dedupe: distinct from the SLSH-1 overflow note (DISC-2 / SUMMARY.md DISC-2, used
here only as a positive control) and from QTL-1..5 / INVCEIL-2 (invoke panic
routing). No prior finding covers the SLSH-3/SLSH-4/SLSH-5 top-level-`Err` note
rendering surface.

---

## FINDING SNOTE-1 — FIXED: the SLSH-3/SLSH-4/SLSH-5 top-level-`Err` system note is never emitted — every top-level `Err` at the slash-dispatch boundary is silent

> **STATUS: FIXED.** The renderer is now wired into the shipped composition.
>
> - **Before:** `turn.systemNotes === []` for every top-level-`Err` variant; a
>   failed slash loom (prompt or subagent) produced no user-facing signal.
>   Prompt-mode `surface` returned `Ok(trailing-text)` even for a failed run,
>   masking the failure; `composeLoomFixture.run` discarded the terminal.
> - **After:** each variant emits its SNK note VERBATIM on the user session's
>   `loom-system-note` channel (em-dash U+2014). Observed live
>   (`session-systemnotes.test.ts`, all 7 green):
>   - SNK-b `loom /snkb returned Err: rendered query template was empty — no provider turn was issued`
>   - SNK-g `loom /snkg returned Err: tool read call failed (execution) — ENOENT: no such file or directory, access '<path>'`
>   - SNK-i `loom /snki returned Err: invoke of ./snki_broken.loom failed (load_failure)`
>   - SNK-a `loom /snka returned Err: model failed schema after 0 respond-repair attempts`
>   - SLSH-3 subagent `loom /snksub returned Err: rendered query template was empty — no provider turn was issued`
>   - SLSH-5 cascade `loom /snkchain returned Err: rendered query template was empty — no provider turn was issued` (correct LEAF row).
> - **Fix (src):**
>   1. `src/extension/production-loom-producer.ts` `bindPromptConversation`
>      `surface` — return the REAL terminal outcome (mirror the subagent
>      surface): `Ok(trailing-text)` on success, `makeErr(execution.error)` on
>      `?`-propagated fail, else `makeErr(cancelled)`. No longer masks failure.
>   2. `src/extension/production-loom-producer.ts` — new `emitTopLevelErrNote`
>      method routing `renderTopLevelErrNote({ loomName, error, chain: [] })`
>      through the same `pi.sendMessage` `loom-system-note` delivery as the
>      SLSH-1 overflow note.
>   3. `src/extension/loom-composition-producer.ts` `composeLoomFixture.run` —
>      capture `const terminal = binding.surface(execution)` and, when
>      `!terminal.ok`, call `deps.emitTopLevelErrNote(loom.slashName, error)`.
>      New `emitTopLevelErrNote` hook on `LoomProducerDeps`.
> - **DEFERRED refinement:** the SLSH-5 chain suffix
>   (` from <callee> invoked at <parent>:<line>`) is NOT emitted — the boundary
>   passes `chain: []` because invoke provenance is not readily available at the
>   slash-dispatch seam. The renderer walks the `invoke_callee` wrapper to its
>   leaf, so the LEAF row is correct for every reachable kind; only the
>   provenance suffix is deferred (would require threading V15g invocation
>   records to `run`).

### Original finding (pre-fix, retained for provenance)

- **repro** (one representative; all six variants below reproduce identically —
  empty `systemNotes`, no throw):
  ```loom
  ---
  description: snkb
  mode: prompt
  ---
  @`
  `?
  ```
  Invocation: `/snkb`. The rendered query body is a single newline → `""` →
  the empty-template short-circuit returns `Err(QueryError{kind:"validation",
  cause:"empty_template"})`; the top-of-loom `?` propagates it to the
  slash-dispatch boundary (no invoke parent).

- **expected** (spec, quoted):
  - `docs/spec_topics/slash-invocation.md` **SLSH-3**: "When a loom dispatched
    directly by a slash command — one with a slash caller and no invoke parent —
    terminates by returning `Err(QueryError)` to that boundary, Pi appends a
    one-line system note to the user's session formatted from the error, regardless
    of whether the loom ran in prompt or subagent mode."
  - **SLSH-4**: "Renderers MUST emit the surrounding template text verbatim … Every
    row above emits as a `loom-system-note`." The exact template for this repro is
    **SNK-b**: `loom /snkb returned Err: rendered query template was empty — no
    provider turn was issued` (em-dash = U+2014).
  - `docs/reference/discovery-cli.md` §Slash-command invocation reiterates SLSH-3
    and the SNK table.

- **observed** (deterministic, `turn.systemNotes`): the note channel is **empty**
  (`[]`) for every top-level-`Err` variant, and `turn.error` is `undefined` (the
  `?` propagates cleanly, no host throw). The loom simply ends silently — the user
  gets no indication the loom failed. Confirmed across all reachable KINDs:

  | Probe | KIND / cause | Vehicle (tokens) | Expected SNK template (VERBATIM, `—`=U+2014) | `systemNotes` |
  |---|---|---|---|---|
  | SNK-b | `validation` / `empty_template` | empty-template `?` (0) | `loom /snkb returned Err: rendered query template was empty — no provider turn was issued` | `[]` |
  | SNK-g | `code_tool` / `execution` | `read({path:"/no/such/…"})?` with `tools: read` (0) | `loom /snkg returned Err: tool read call failed (execution) — <message>` | `[]` |
  | SNK-i | `invoke_infra` | `invoke("./snki_broken.loom")?`, callee has a body parse error (0) | `loom /snki returned Err: invoke of <callee_path> failed (<cause>)` | `[]` (parent registered + ran) |
  | SLSH-5 | `invoke_callee` → leaf `empty_template` | subagent child returns `Err`, parent `invoke(...)?` cascades (0) | `loom /snkchain returned Err: rendered query template was empty — no provider turn was issued from <child_abs> invoked at <parent_abs>:5` | `[]` |
  | SLSH-3 (subagent) | `validation` / `empty_template` | direct `/snksub`, `mode: subagent`, empty-template `?` (0) | `loom /snksub returned Err: rendered query template was empty — no provider turn was issued` | `[]` |
  | SNK-a | `validation` / `schema_validation` | depth-6 nested schema `@<L1>…?` (1 live model turn) | `loom /snka returned Err: model failed schema after <n> respond-repair attempts` | `[]` |

- **root cause** (read-only source inspection, `src/**` not edited):
  - The SLSH-3/SLSH-4/SLSH-5 renderer exists and is template-correct —
    `src/runtime/err-note-render.ts` `renderTopLevelErrNote` / `renderLeafKindNote`
    emit each SNK row verbatim (em-dash U+2014) and walk `inner` leaf-first for the
    SLSH-5 chain suffix. **But it has no production caller** —
    `grep -rn "renderTopLevelErrNote\|renderLeafKindNote" src/` matches only its own
    definition file. Likewise `driveSlashPromptTurn` (the `slash-dispatch.ts` seam
    that would append the `err`/`cancelled` outcome note) has no production caller.
  - At the composition root the terminal `Err` is discarded:
    `src/extension/loom-composition-producer.ts` `composeLoomFixture.run` calls
    `binding.surface(execution)` and ignores its return; and
    `src/extension/production-loom-producer.ts` `bindPromptConversation`'s `surface`
    unconditionally returns `makeOk(extractTrailingTurnText(...))` — the execution
    outcome (`fail`/`error`) is never inspected and never routed to the note
    renderer. Subagent-mode `surface` builds `makeErr(...)` but the value is
    likewise dropped by `run`.
  - This is the campaign's dominant defect class (SUMMARY.md §"Dominant defect
    class"): a spec-mandated feature implemented + unit-tested in an isolated
    module (`err-note-render.ts`) but never wired into the shipped composition.

- **verdict: bug.** SLSH-3 is a MUST ("Pi appends a one-line system note"); SLSH-4
  makes the SNK templates normative ("Renderers MUST emit … Every row above emits
  as a `loom-system-note`"). A slash loom that fails at the top level currently
  produces **no** user-facing signal at all — in prompt mode the boundary even
  returns `Ok(trailing-text)` for a failed run, so a failure is indistinguishable
  from success. For a directly-slash-invoked subagent loom (SLSH-3's explicit
  case) the missing note is especially severe: the spec calls it "the only
  user-facing surface for the failure" (the transcript is private), so the failure
  is completely invisible. The positive control (SLSH-1 overflow note, same
  channel, same drive) proves the note surface is observable and the absence is
  real, not a harness artifact. Single root cause, six reachable manifestations.

### Comparison strings used (exact, for a fix's conformance assertion)

Compared against `err-note-render.ts` output form; em-dash is U+2014:

- SNK-b: `loom /<name> returned Err: rendered query template was empty — no provider turn was issued`
- SNK-a: `loom /<name> returned Err: model failed schema after <n> respond-repair attempts`
- SNK-g: `loom /<name> returned Err: tool <tool_name> call failed (<cause>) — <message>`
- SNK-i: `loom /<name> returned Err: invoke of <callee_path> failed (<cause>)`
- SLSH-5 suffix (per hop, leaf-first): ` from <callee_path> invoked at <parent_path>:<line>`

---

## Not independently reachable (recorded to bound coverage)

These SNK variants were not forced because no deterministic slash-boundary vehicle
exists (and the umbrella SNOTE-1 already establishes the note is unemitted for
every KIND, so a live attempt would only re-confirm `[]`):

- **SNK-c `transport`**, **SNK-d `model_tool`**, **SNK-e `context_overflow`** —
  require a provider/transport/context failure that cannot be forced
  deterministically without fault injection (429/transport are non-findings per
  the briefing).
- **SNK-f `cancelled`** — needs a mid-stream `AbortSignal`; owned by the
  cancellation lens, and SLSH-2/ERR-8 note ordering is a separate surface.
- **SNK-h `tool_loop_exhausted`** — needs the model to loop tools past
  `max_rounds` without terminating; non-deterministic and model-dependent (and
  prompt-mode tool availability is itself the QTL-4 surface).
- **SNK-k catch-all** — the runtime never emits an unlisted `kind` (ERR-15), so no
  loom-1.0-reachable vehicle produces it.

Given SNOTE-1's single root cause (the renderer is never invoked), each of these
would also emit `[]`; they are left unforced rather than spending tokens to
re-observe the same absence.

---

## Verified-conformant (bounds the search — not findings)

- **SLSH-1 overflow note (positive control).** `/ctlnoparams extra junk here` on a
  no-params loom emits exactly one note VERBATIM:
  `loom /ctlnoparams: ignoring extra arguments — this loom takes no parameters`
  (em-dash U+2014). This proves (a) the `loom-system-note` channel is observable in
  this harness and (b) `renderNoParamsOverflowNote` IS wired — so the SNOTE-1
  absence is a real gap, not a channel/harness artifact. (SLSH-1 basic case already
  verified in prior passes; recorded here only as the control.)
- **Clean `?` propagation.** Every top-level-`Err` probe ends with
  `turn.error === undefined` — the unhandled `?` propagates to the boundary without
  a host throw (consistent with QTL-4's "Unhandled `?` … → clean fail"). The defect
  is a *missing* note, not a crash.
- **No spurious note on handled paths.** No probe emitted a note where none is due;
  the failure mode is uniformly under-emission (missing), never over-emission.
- **Template correctness of the (unwired) renderer.** By source inspection,
  `err-note-render.ts` renders each SNK row and the SLSH-5 chain suffix exactly per
  spec (em-dash U+2014, leaf-first hop order, `respond` literal for a null
  `last_tool_name`). If/when it is wired, the strings above are the conformance
  targets.
