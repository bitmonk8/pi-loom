# Real-CLI hardening campaign — harness brief (shared)

This campaign drives the **actual `pi` CLI binary** end-to-end, the way a real
user runs it — NOT the in-process `bootShippedExtension` test harness the prior
campaign used. The goal is to find behaviours where Loom does not match a
reasonable user's expectations and that are NOT explicitly called out as intended
in the spec/docs. Spec (`docs/spec_topics/`, `docs/reference/`) is more normative
than docs (`docs/guide.md`, `docs/tutorial.md`, `docs/how-to/`), but the spec is
not assumed 100% correct. Bug-ness is a judgement call: is the behaviour
reasonable given Loom's purpose? At this maturity most real bugs are obvious —
**ignore borderline cases**.

## Invocation pattern

Always from the repo root `C:/UnitySrc/pi-loom`. The `MSYS_NO_PATHCONV=1` prefix
is REQUIRED under Git Bash or the leading `/` in a slash command is mangled into a
Windows path. Always cap with `timeout`.

    MSYS_NO_PATHCONV=1 timeout 90 pi -ne -e ./extensions --loom <DIR> \
      --model claude-haiku-4-5 -p "/<stem> <args>"

- `-ne -e ./extensions` — disable all discovery, load ONLY the loom extension
  (from `extensions/index.ts`, which runs `src/**` TypeScript live).
- `--loom <DIR>` — a CLI discovery source; every `*.loom` in `<DIR>` registers as
  a slash command `/<stem>`. Comma-separate multiple dirs.
- `--model claude-haiku-4-5` — cheap model. ALWAYS pin it to bound token cost.
- Project discovery source: a `*.loom` under `<cwd>/.pi/looms/` also registers.
  To test that source, create a throwaway `cwd` with a `.pi/looms/` dir and run
  `pi` with `cd`.
- `--mode json` emits structured JSON events on stdout (useful for deterministic
  observation).

## Deterministic observation channels (PREFER THESE — near-zero model tokens)

- **Exit code** — `echo "EXIT: ${PIPESTATUS[0]}"` after a piped run.
- **`bind_echo: true`** frontmatter → prints a one-line JSON envelope
  `{"kind":"ok","args":{...}}` (or an error envelope) on stdout BEFORE the loom
  runs. This is the binder's deterministic output — ideal for argument-binding
  tests. It does not require a model turn to observe.
- **Registration** — a loom that fails to load does NOT register; its `/stem`
  is then sent to the model as literal chat text. So "did it register?" is
  observable: a registered loom runs (exit 0 / bind echo / streamed turn); an
  unregistered one makes the model reply to the literal `/stem ...` string.
- **Load diagnostics** — investigate whether/where they surface in `-p` mode.

## Semi-deterministic channel (uses model tokens — keep MINIMAL)

- **Prompt-mode streamed turn**: a `mode: prompt` loom streams the assistant turn
  to stdout. To observe a COMPUTED value deterministically, pin the reply:
  `@`Repeat this text verbatim and output nothing else: ${computed}`` then grep
  stdout for the expected string. Haiku follows a strict echo instruction
  reliably enough for pass/fail. Use sparingly.
- **Subagent-mode** success = exit 0 with empty stdout; the final value is NOT on
  stdout (documented — tutorial Step 3). Don't report that as a bug.

## Dedupe

Do NOT re-report anything already in `tests/hardening/SUMMARY.md` (25 fixed:
EXPR-1/2/4/5/6/7/8, QRY-1..6, FM-1..5, INV-1..8, IMP-1..7, DISC-1/2) or in the
prior findings under `tests/hardening/findings/*.md`. Those are FIXED or
adjudicated. Find NEW divergences, especially ones that only appear through the
real CLI (flag parsing, discovery walk, stdout/exit contract, project `.pi/looms`
source, package discovery, multi-source precedence, real slash dispatch).

## Finding format (one `## FINDING` block each)

    ## FINDING <LENS>-<n>: <one-line title>
    - repro: exact `.loom` text + exact command line
    - expected: what a reasonable user expects + spec/doc citation (path#anchor)
    - observed: exact stdout/exit/behaviour
    - verdict: bug | borderline | documented-gap — with one-line reasoning

Report only `bug` and strong `borderline`. Skip anything you judge borderline-weak.
</content>
</invoke>
