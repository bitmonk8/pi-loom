# Real-CLI hardening findings — Discovery & CLI surface

Lens: the five discovery sources + slash registration, driven through the REAL
`pi` binary (`pi -ne -e ./extensions --loom <DIR> --model claude-haiku-4-5 -p …`).
Observation channels: registration (did `/stem` run a loom vs. did the model natter
at the literal text), exit code, stdout/stderr, `--mode json` event stream.

Harness note (not a loom bug, but load-bearing for reproduction): under Git Bash
the `--loom` value must be a **Windows-native** path (e.g. `cygpath -m`), not an
msys `/tmp/...` path — node resolves a leading `/tmp/...` against the current
drive root (`C:\tmp\...`), so an msys path silently registers nothing. Also, the
multi-path separator is `path.delimiter` (**`;`** on Windows), NOT the comma the
shared HARNESS brief suggests: `--loom "A,B"` is treated as one (nonexistent)
path and registers nothing; `--loom "A;B"` registers both. This matches the spec
(`discovery-cli.md` §"five discovery sources": "multiple paths joined with
`path.delimiter`"), so it is a HARNESS-brief inaccuracy, not a loom defect.

---

## FINDING DISCLI-1: repeated `--loom` flags silently discard the entire CLI discovery source

- repro:
  - Two dirs each with a valid loom:
    ```
    # A/onlya.loom, B/onlyb.loom (both):
    ---
    mode: prompt
    ---
    @`Repeat this text verbatim and output nothing else: ONLYA`   # / ONLYB
    ```
  - Command (A, B = `cygpath -m` Windows paths):
    ```
    MSYS_NO_PATHCONV=1 pi -ne -e ./extensions --loom "$A" --loom "$B" \
      --model claude-haiku-4-5 -p "/onlya"      # and again with -p "/onlyb"
    ```
- expected: a reasonable user repeating a flag (a common CLI idiom) expects at
  least last-wins or first-wins — one of the two dirs' looms to register. The
  spec models `--loom` as a single delimiter-joined flag
  (`discovery-cli.md` §"The five discovery sources"), so the *supported* form is
  `--loom "A;B"`; but even for the unsupported repeated form, silently dropping
  **every** user-supplied path with no diagnostic is not reasonable — at minimum
  a `loom/load/*` error or a last-wins value is expected.
- observed: **neither** `/onlya` nor `/onlyb` registered — both went to the model
  as literal text; exit 0; no stderr; no diagnostic. The single-flag control
  (`--loom "$A" -p "/onlya"`) registers `onlya` correctly, so the dirs/looms are
  valid — repeating the flag is the sole differentiator. Cause: the flag is
  declared `type: "string"` (`src/extension/factory.ts:208`); a repeated
  occurrence makes `pi.getFlag("loom")` return a non-string (array). Because
  `readLoomFlagPaths` (`src/extension/production-composition.ts` ~L688) does
  `if (typeof raw !== "string") return []`, the whole CLI source is discarded —
  not last/first-wins, but total silent loss of every path the user typed.
- verdict: **bug** (strong-borderline). Legitimate, explicitly-supplied `--loom`
  paths are silently and completely ignored, with a success exit code and zero
  feedback. The `type:"string"` array case is simply unhandled; the type-guard
  swallows it. New — not covered by prior DISC-* findings (those used a single
  `--loom` flag).

---

## FINDING DISCLI-2: in non-interactive `-p` mode, discovery/load ERROR diagnostics have no observable surface (silent exit 0)

- repro (three independent error-severity load diagnostics, each invisible):
  1. Missing `--loom` dir — spec DISC-2: CLI missing path = **error**
     (`loom/load/missing-source`):
     ```
     pi -ne -e ./extensions --loom "C:/…/DOES_NOT_EXIST" -p "hi"
     ```
  2. A **file** passed where a dir is expected — spec DISC-2: CLI wrong-type =
     **error** (`loom/load/wrong-type-source`):
     ```
     pi -ne -e ./extensions --loom "C:/…/afile.loom" -p "hi"
     ```
  3. An invalid-slash-name `.loom` (uppercase stem) as the only file in a
     `--loom` dir — spec: `loom/load/invalid-slash-name` (**error**):
     ```
     # dir/Foo.loom  →  error, file does not register
     pi -ne -e ./extensions --loom "$dir" -p "hi"
     ```
- expected: each is a spec-mandated **error**-severity diagnostic. The HARNESS
  brief explicitly asks to "investigate whether/where [load diagnostics] surface
  in `-p` mode." A CLI/CI user who mistypes a `--loom` path, or drops a badly
  named `.loom` in a discovery dir, expects *some* observable signal (a message
  on stderr and/or a non-zero exit for a fatal-for-that-entry error).
- observed: all three produce **empty stdout, empty stderr, exit 0** — the model
  simply answers the `hi` prompt as if nothing was configured. The extension
  routes error-severity diagnostics to `ctx.ui.notify`
  (`production-composition.ts` `emitDiagnostic`), but in headless `-p` mode
  `ctx.ui.notify` has no rendered surface, so *every* discovery/load error is
  swallowed. A scripted `pi --loom … -p "/stem"` run cannot distinguish
  "loom ran" from "loom never registered because my path was wrong."
- verdict: **borderline** (leaning bug). Partly a Pi-harness property
  (`ctx.ui.notify` is a no-op without a TUI), so not purely loom-owned — hence
  borderline, not a clean bug. But the user-facing effect is real and additive to
  the prior findings: the earlier `findings/discovery-cli.md` DISC-1 caveat
  established that *warnings* are dropped and asserted *errors* reach
  `ctx.ui.notify`; this shows that in the real `-p` CLI even **error**-severity
  diagnostics reach no observable channel, across the CLI source — including the
  `wrong-type-source` code, which is not the Windows-ancestor mis-classification
  that DISC-1 diagnosed. The invalid-slash-name case (a clean error, unrelated to
  path classification) makes the invisibility unambiguous.

---

## Confirmed-correct behaviour through the real CLI (baseline, no bug)

Verified spec-conformant (registration = a paired sentinel `@`-echo either ran or
did not):

- Stem validity: `Foo` (uppercase), `my.thing` (dot), `foo bar` (space), `café`
  (unicode) → do **not** register; `foo-bar` (hyphen), a 200-char all-`a` stem →
  **do** register. Matches the `^[a-z0-9][a-z0-9_-]*$` rule; no length cap.
- `lib.warp` in a `--loom` dir does **not** register as a slash command.
- A `.loom` in a nested subdir (`main/sub/nested.loom`) does **not** register —
  discovery is non-recursive.
- Invalid siblings (uppercase/dot/space/unicode) do not un-register the valid
  loom in the same dir — per-entry, non-fatal.
- `--loom "A;B"` (path.delimiter) registers both dirs' looms.
- Same-source collision: `dup.loom` in both `A` and `B` (both CLI source) →
  **neither** registers (DISC-4 loom-vs-loom drops all colliding).
- Project source `<cwd>/.pi/looms/*.loom` registers (when the spawned `pi`'s
  project-root resolution picks the intended cwd — a `package.json`/`.git`
  marker; absent a marker, Pi's cwd resolution — not loom — chose a different
  root, so the project source appeared inert. Host behaviour, not a loom bug).
- Cross-source precedence: a stem defined in both the project source and a
  `--loom` dir resolves to the **CLI** copy — CLI (priority 1) outranks project
  (priority 3).
- `--mode json` for a loom run emits the standard Pi agent event stream
  (`agent_start`/`message_update`/`turn_end`/`agent_end`/…); the loom's streamed
  reply appears as `text` events. Well-formed; nothing loom-specific broken.
</content>
</invoke>
