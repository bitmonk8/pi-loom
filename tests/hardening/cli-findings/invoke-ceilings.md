# Findings — invoke / subagent boundary, cross-mode & hard ceilings (real CLI)

Real `pi` CLI, `-ne -e ./extensions --loom <DIR> --model claude-haiku-4-5 -p "/<stem>"`.
Observation channels: registration (registered loom dispatches; unregistered → the
model replies to the literal `/stem` text), streamed prompt-mode sentinel (`Repeat
verbatim …`), exit code. Lens dedupe: INV-1..9 (prior findings) are FIXED/adjudicated
and are NOT re-reported; the items below are new divergences seen only through the CLI.

Verified-good (no finding, recorded for provenance):
- **Ceiling #1 (invoke-chain depth 32) fires cleanly.** A 37-deep distinct-loom
  chain (`link0`→…→`link36`, no static cycle) run via `/link0` does NOT reach the
  head's post-chain sentinel and does NOT hang or crash; a short 2-deep chain does
  reach it. INV-7 is fixed; the cap aborts the chain without a host hang.
- **Malformed `invoke` looms correctly fail to register** (INV-1/3/4 fixes hold):
  `invoke("./x.warp")`, arity-too-many/too-few, wrong-typed positional arg, and a
  self-cycle `invoke("./self.loom")` each un-register their own loom (E-level).
- **Typed `invoke<Schema>` return validation works** (INV-6 holds): `invoke<number>`
  of a `number`-returning child yields the value; of a `string`-returning child the
  parent aborts before its sentinel (return-validation `Err` propagates via `?`).

---

## FINDING INVCEIL-1: a literal `invoke` of a missing callee breaks the whole `--loom` source (and intermittently crashes/hangs the host)

- **repro:** a dir with two looms:
  ```
  # ghostinv.loom
  ---
  mode: subagent
  ---
  let _ = invoke("./ghost.loom")?   // ghost.loom does not exist on disk
  1
  ```
  ```
  # good.loom  (unrelated, no invoke)
  ---
  mode: prompt
  ---
  @`Repeat verbatim and output nothing else: GOOD-REGISTERED`
  ```
  `MSYS_NO_PATHCONV=1 timeout 60 pi -ne -e ./extensions --loom <DIR> --model claude-haiku-4-5 -p "/good"`
- **expected:** discovery-cli.md §Static resolution — an unreadable callee reached by
  a *literal* `invoke(...)` is `loom/load/callee-has-errors` **severity warning**:
  "parent registers; static checks skipped; runtime AJV is the safety net". At runtime
  the invoke yields `Err(InvokeInfraError{cause:"load_failure"})` (errors-and-results.md,
  `InvokeInfraError.cause` = `"load_failure" // callee file unreadable`). Unrelated
  siblings (`good.loom`) must register regardless.
- **observed:** `good.loom` fails to register in **every** run (model replies to the
  literal `/good`); `ghostinv.loom` also never registers. i.e. the presence of one
  loom whose `invoke(...)` names a nonexistent callee un-registers the **entire**
  discovery source. Intermittently the run instead crashes the host with an uncaught
  Node error (exit 1):
  ```
  node:fs:562
      getValidatedPath(path),
      at Object.openSync (node:fs:562:5)
      at Object.readFileSync (node:fs:445:35)
      at getSourceSync (node:internal/modules/esm/load:41:17)
      at defaultLoadSync (node:internal/modules/esm/load:157:34)
  ```
  (reproduced 2/5 direct runs of `/ghostinv`), or hangs to the 60 s `timeout`.
  Controlled comparison: dirs whose extra loom references an *existing* callee but is
  otherwise malformed (`invoke("./x.warp")`, arity errors, self-cycle) leave `good.loom`
  registering normally — only a **missing** callee triggers the source-wide failure.
- **verdict: bug.** A spec-designated *warning* (parent + siblings still register,
  runtime `load_failure` safety net) is instead a source-wide registration failure,
  with an intermittent uncaught `node:fs`/ESM-loader crash (non-zero exit, no
  diagnostic) or hang. One authoring typo (a mistyped callee path) takes down every
  loom in the directory.

## FINDING INVCEIL-2: a child runtime panic is not converted to `Err(InvokeInfraError{cause:"panic"})` at the invoke boundary — it escapes uncatchably through `?` and `match`

- **repro:**
  ```
  # rc_panic.loom
  ---
  mode: subagent
  ---
  let a = [1]
  a[9]                     // loom/runtime/index-out-of-bounds panic
  ```
  ```
  # panicmatch.loom
  ---
  mode: prompt
  ---
  let r = match invoke("./rc_panic.loom") {
    Ok(_)  => "ok",
    Err(_) => "caught"
  }
  @`Repeat verbatim and output nothing else: PANICMATCH-${r}`
  ```
  Also `panicparent.loom` = `let _ = invoke("./rc_panic.loom")?` then a sentinel.
- **expected:** errors-and-results.md §Runtime panics — "Panics surface to the caller
  as: … **`invoke` parent** — `Err(QueryError { kind: "invoke_infra", cause: "panic",
  message: <message>, … })`" (also hard-ceilings.md ceiling-#1: "an overflow inside a
  chain surfaces to the parent as `Err(InvokeInfraError{cause:"panic"})`"). The child
  panic is a *value* at the parent's invoke site, so the `Err(_)` arm catches it →
  `PANICMATCH-caught`; a `?` parent propagates that `Err` to the SLSH-4 note
  *SNK-i* "invoke of `<callee_path>` failed (panic)".
- **observed (deterministic, re-run identical):** the child panic propagates
  **through** both `match` and `?`, aborting the parent as a raw Pi extension error:
  ```
  Extension error (command:panicmatch): index out of bounds: 9 not in 0..1
  Extension error (command:panicparent): index out of bounds: 9 not in 0..1
  ```
  `PANICMATCH-…` is never produced; the `Err(_)` arm never runs. Corroborating: a
  *direct* `/rc_panic` also surfaces as `Extension error (command:rc_panic): index out
  of bounds: 9 not in 0..1` instead of the spec's slash/prompt-mode panic note
  `loom /rc_panic aborted: <message>` (errors-and-results.md §Runtime panics).
- **verdict: bug.** The invoke boundary does not wrap a callee panic into
  `InvokeInfraError{cause:"panic"}`; the raw host throw escapes the loom runtime,
  bypassing the parent's `match`/`?` entirely. A panic anywhere in an invoke subtree
  (index-OOB, null access, non-exhaustive match, depth-ceiling overflow) is therefore
  uncatchable by the parent, contradicting the documented value-form surface. (Note:
  the message string itself matches the `index out of bounds: <i> not in 0..<length>`
  template — only the routing/wrapping is wrong.)

## FINDING INVCEIL-3: untyped `invoke(...)` returns the child's final value instead of the documented `null`

- **repro:**
  ```
  # rc_child_num.loom     ->  subagent, body: 42
  # untypeddiscard.loom
  ---
  mode: prompt
  ---
  let r = invoke("./rc_child_num.loom")?
  @`Repeat verbatim and output nothing else: DISCARD-[${r}]`
  ```
- **expected:** discovery-cli.md §`invoke` invocation / Typed return — "Untyped
  `invoke(...)` returns `Result<null, QueryError>` (child return value discarded)."
  So `r == null` → `DISCARD-[null]`.
- **observed:** `DISCARD-[42]` (consistent across dispatched runs) — the child's final
  value `42` flows into `r`; it is not discarded and `r` is not `null`.
- **verdict: bug (strong-borderline).** Contract violation: untyped invoke is
  specified to discard the callee value and yield `null`; instead it returns the raw,
  **unvalidated** child value, erasing the typed/untyped distinction (the only thing
  `invoke<T>` is documented to add over `invoke` is AJV validation of that same value).
  Downstream code written to the spec (expecting `null`) will mis-behave.
