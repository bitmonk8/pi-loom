# Hardening findings — Discovery / CLI / slash-name validity / collisions / settings

Live probes: `tests/hardening/discovery-cli.test.ts` (11 probes; 10 zero-token,
1 single-drive for SLSH-1). Run:

```
npx vitest run --config vitest.hardening.config.ts tests/hardening/discovery-cli.test.ts
```

Observation caveat (affects every probe in this area): the shipped composition
root routes **only error-severity** diagnostics to `ctx.ui.notify`
(`src/extension/production-composition.ts` `emitDiagnostic`: `if (severity ===
"error") ctx.ui.notify(...)`). All warning-severity load diagnostics
(`case-collision`, `cross-source-shadow`, `non-canonical-extension`,
`settings-unreadable`, `settings-invalid-json`, `unreadable`) are silently
dropped and never reach a user surface. This is called out in-code as a
deferred routing gap ("full `loom-system-note` routing for discovery
diagnostics is deferred"), so it is treated here as a documented gap, not a
finding — but it is the amplifier that makes DISC-1 below produce *zero* output.

---

## DISC-1 — A missing settings `loomPaths` path emits NO diagnostic (mandated `loom/load/missing-source` error never fires)

**Verdict: BUG.**

### Repro
`.pi/settings.json`:
```json
{ "loomPaths": ["/definitely/missing/xyz123/looms"] }
```
(also reproduced with a relative entry `"nope-does-not-exist"` whose parent
`.pi/` exists). No `--loom`, one unrelated project loom present.

### Expected (with citation)
`docs/spec_topics/discovery/discovery-sources.md` DISC-2 failure-modes table:
> | Settings `loomPaths` entry | **error** (config names a missing path) | … |

`docs/spec_topics/diagnostics/code-registry-load.md`, `loom/load/missing-source`
row: severity **error** for explicit references (settings `loomPaths` entries,
`--loom` flags); message `discovery source path does not exist: <descriptor>`.

The DISC-2 implementation note is explicit that this must work cross-platform:
> "The rule applies uniformly on POSIX and Windows — the implementation has no
> platform branch … resolves the case where Windows surfaces … the same
> `ENOENT` from `fs.readdir`."

So a missing settings path must surface exactly one `loom/load/missing-source`
**error**.

### Observed
`probe.diagnostics === []`. No diagnostic of any kind. `registeredNames` is just
the unrelated loom. The user gets zero feedback that their configured
`loomPaths` entry does not exist.

### Root cause
`src/discovery/discovery-walk.ts` `properAncestors()` reconstructs ancestor
paths by splitting the normalised forward-slash path on `/` and re-joining with
a leading `/`. For a Windows absolute path
`C:/Users/.../.pi/nope-does-not-exist` this yields ancestors `"/C:"`,
`"/C:/Users"`, … which do not exist on Windows. `ancestorsClean()` therefore
returns `false`, so `classifyPath()` maps the genuine clean-leaf `ENOENT` to
`{ kind: "unreadable" }` instead of `{ kind: "missing" }`. For the Settings
source `unreadable` is severity **warning** (`SETTINGS_MODES.unreadable`), and
warnings are then dropped by the `emitDiagnostic` error-only filter — net
result: silence. Even absent the warning-suppression, the emitted code
(`unreadable-source`) and severity (warning) would both be wrong vs. the
mandated `missing-source` error.

The unit test `tests/discovery-walk.test.ts` ("DISC-2: … missing settings entry
is an error") passes only because it uses POSIX absolute paths under
`FakeFileSystem`, where the reconstructed `/…` ancestors do exist. The bug is
invisible to the POSIX-only unit fixtures and appears on the real Windows host.

The same `classifyPath`/`ancestorsClean` code services the CLI `--loom` source
(also `missing = error`), so a missing `--loom` path is expected to be affected
identically (not independently reproducible through the harness, which only sets
`--loom` to an existing directory).

---

## DISC-2 — SLSH-1 no-params overflow note is never emitted by the shipped dispatch

**Verdict: BUG.**

### Repro
A no-params prompt loom `greet.loom`:
```
---
mode: prompt
bind_model: claude-opus-4-8
---
@`Reply with exactly the single word: READY`
```
Invoke with trailing arguments: `/greet these are extra arguments the loom takes no params`.

### Expected (with citation)
`docs/reference/discovery-cli.md` SLSH-1 and
`docs/spec_topics/slash-invocation.md`:
> **SLSH-1 (no-params overflow).** For a no-params loom the binder is bypassed;
> the runtime trims slash-argument whitespace, and if the remainder is non-empty
> emits a single `loom /<name>: ignoring extra arguments — this loom takes no
> parameters` note before running.

So the trailing arguments must produce one `loom-system-note` before the body
runs.

### Observed
The loom body runs (deterministic user-turn text
`Reply with exactly the single word: READY` observed), the extra arguments are
silently swallowed, and no "ignoring extra arguments" text surfaces on any
observable channel. No throw.

### Root cause
The SLSH-1 logic lives in `src/runtime/slash-dispatch.ts`
(`dispatchNoParamsLoom`, `renderNoParamsOverflowNote`) and is exercised only by
the isolated unit test `tests/slash-dispatch.test.ts`. A repository-wide search
shows **neither symbol is referenced by any production module** under
`src/extension/` or the real dispatch path:

```
$ grep -rn "dispatchNoParamsLoom\|renderNoParamsOverflowNote\|ignoring extra arguments" src/ | grep -v slash-dispatch.ts
(no output)
```

The shipped no-params path is `ProductionLoomProducer.runBinder`
(`src/extension/production-loom-producer.ts`): when `params` is absent or the
bypass decision is non-`binder`, it returns `{ bound: true, args: {} }` (or the
bypass args) and runs the body — with **no** trailing-argument check and **no**
overflow-note emission. SLSH-1 is implemented and unit-tested in a module that
is never wired into the shipped extension, so the note never fires in real use.

---

## Borderline / not reported

- **`loom/load/invalid-slash-name` message names no file.** Every rejected stem
  emits the identical generic message `slash names must be lowercase kebab/snake;
  rename the file (e.g. \`code-review.loom\`)` with no path — six bad files
  produce six indistinguishable toasts. The `Diagnostic.file` field is populated
  but `emitDiagnostic` forwards only `.message` to `ctx.ui.notify`. The message
  matches the code-registry *Message* column verbatim (spec-defined generic
  string), and the file-dropping is the same deferred routing gap noted above,
  so this is borderline/documented rather than a distinct bug. (Other codes —
  `invalid-extension`, `settings-value-out-of-range` — do embed the path.)

## Confirmed-correct behaviour (baseline guards, no bug)

Slash-name regex rejects `Foo`/`foo bar`/`foo!`/`.foo`/`--help`/`café` and
accepts `0`/`a`/`a-b_c9`; `.warp` never registers; subdirectories are not
recursed; `Plan.LOOM` (non-canonical ext) does not register; CLI outranks
project (single registration); same-priority loom-vs-loom collision drops both
with a `cross-format-collision` error naming both paths; settings non-`.loom`
file / glob-matched `.md` → `invalid-extension` error; malformed top-level
`loomPaths`/`looms`/non-object-root and out-of-range scalars
(`scanPackagesMaxFiles: 0` / `25.5`, `binderModel: ""`, `null`) →
`settings-value-out-of-range` error; `2000.0` accepted as integer; non-string
`loomPaths` entries → `settings-invalid-entry` (per entry); glob `!` exclusion
honoured; settings-entry-equals-project-dir dedupes to a single registration.
