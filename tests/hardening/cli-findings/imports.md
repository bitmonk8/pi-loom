# CLI hardening findings — Imports (`.warp` modules)

Lens: `.loom` importing `fn` / `schema` / `enum` from `.warp` modules, driven end-to-end
through the real `pi` CLI binary (`pi -ne -e ./extensions --loom <DIR> --model
claude-haiku-4-5 -p "/<stem> ..."`), per `HARNESS.md`. The prior in-process campaign
(`tests/hardening/findings/imports-warp.md`, IMP-1..7) reported the whole import subsystem
was unwired; those are now FIXED and NOT re-reported here.

## Method / observation channel

The prompt-mode `@`Repeat verbatim: SENTINEL`` echo channel proved **flaky** (Haiku
occasionally paraphrases, so "no sentinel" cannot be read as "did not register"). Switched
to a deterministic **subagent** channel with a query-free body (`let t = <sym>("X")` then a
tail `t`):

- **REGISTERED+CLEAN** — empty stdout, exit 0, no model turn → loom parsed, imports
  resolved, ran without a runtime error.
- **REGISTERED+RUNTIME-ERR** — stdout contains `Extension error (command:<stem>): ...` →
  parsed/registered but threw at run time.
- **NOT-REGISTERED** — non-empty model chatter on stdout → load/parse error blocked
  registration; the literal `/stem …` was sent to the model as chat.

Each anomaly re-run ≥2× for determinism.

### Scenario matrix (all under one `--loom` dir)

| # | scenario | result | spec-expected | ok? |
|---|---|---|---|---|
| 1 | valid `import { fn }`, fn used | REG+CLEAN | works | ✓ |
| 2/3 | import undeclared/unexported symbol | NOT-REG | `import-unknown-symbol` | ✓ |
| 4 | import from missing file | NOT-REG | `unresolvable-warp-path` | ✓ |
| 5 | import path `.loom` | NOT-REG | `import-non-warp-extension` | ✓ |
| 5b | import path `.WARP` (uppercase literal) | NOT-REG | `import-non-warp-extension` | ✓ |
| 5c | literal `./Mod.warp`, file `mod.warp` (case-variant) | NOT-REG | `unresolvable-warp-path` (byte-exact) | ✓ |
| 6 | `../`-relative path to real file | REG+CLEAN | works (relative allowed) | ✓ |
| 6b | absolute path | NOT-REG | non-relative → unresolvable | ✓ |
| 6d | **backslash separator** `.\mod.warp` | **REG+CLEAN** | `invalid-path-separator` | **✗ IMPORTS-1** |
| 7 | cycle a.warp↔b.warp | NOT-REG | `import-cycle` | ✓ |
| 8 | re-export chain `export { X } from` | REG+CLEAN | works | ✓ |
| 8c | aliased re-export `export { X as Y } from` | REG+CLEAN | works | ✓ |
| 9 | `.warp` top-level `let` + query | NOT-REG | `warp-top-level-statement` | ✓ |
| 10 | warp `fn` issues a query | query runs vs caller convo | works | ✓ |
| 11 | import name vs local decl | NOT-REG | `import-name-collision` | ✓ |
| 12 | **same symbol name from two imports** | **REG+CLEAN** | `import-name-collision` | **✗ IMPORTS-2** |

---

## FINDING IMPORTS-1: Backslash path separator in `import` is silently accepted and resolved

- **repro:** `--loom` dir with `mod.warp` = `fn tag(s: string): string { "WARP_" + s }` and
  a loom `b6d_backslash.loom`:

  ```
  ---
  description: "backslash path"
  mode: subagent
  ---
  import { tag } from ".\mod.warp"
  let t = tag("X")
  t
  ```

  `MSYS_NO_PATHCONV=1 timeout 55 pi -ne -e ./extensions --loom <DIR> --model claude-haiku-4-5 -p "/b6d_backslash Z"`

- **expected:** A backslash in a path literal is a parse error `loom/parse/invalid-path-separator`
  — `grammar.md` §Source files, "Path literals" ("use forward-slash separators only. A
  backslash is `loom/parse/invalid-path-separator`") and `spec_topics/imports.md` §Path
  resolution ("Path literals use forward-slash separators only — a backslash is a parse
  error per the 'Path literals' rule"). The loom must NOT register.

- **observed:** REGISTERED+CLEAN (empty stdout, exit 0) on 2/2 runs. The import not only
  parses without the mandated error, it **resolves** — the query-free body `tag("X")`
  runs without a runtime error, so `tag` bound successfully via the backslash spelling.
  A prompt-mode variant of the same loom echoed `WARP_X`, confirming resolution.
  (The forward-slash control `./mod.warp` also registers, so this is not a general
  parse failure — it is specifically the backslash rejection that is missing.)

- **verdict: bug.** The path-separator parse check is not applied to `import` specifiers.
  Every other import diagnostic in the matrix fires (unknown-symbol, unresolvable-path,
  non-warp-extension, cycle, warp-top-level, import-vs-local collision), so this is a
  targeted gap: the `.warp` resolver accepts a Windows-style separator the spec declares
  a host-independent parse error.

## FINDING IMPORTS-2: Import-vs-import name collision undetected — silent last-wins shadowing

- **repro:** `--loom` dir with `mod.warp` (`fn tag(s: string): string { "WARP_" + s }`) and
  `other2.warp` (`fn tag(s: string): string { "OTHER_" + s }`), and a loom:

  ```
  ---
  description: "cross collision value"
  mode: prompt
  ---
  import { tag } from "./mod.warp"
  import { tag } from "./other2.warp"
  let t = tag("X")
  @`Repeat this text verbatim and output nothing else: RESULT_${t}`
  ```

  `... -p "/px12 Z"`. Also the same-file duplicate `b12_twice.loom` (two identical
  `import { tag } from "./mod.warp"` lines) exercised in the subagent channel.

- **expected:** `spec_topics/imports.md` §Name collisions: "Two imports bringing in the
  same symbol name is `loom/parse/import-name-collision`. Resolve with `as`-aliasing." and
  "An imported symbol whose name collides with a top-level declaration in the same file is
  also `loom/parse/import-name-collision` — **no implicit shadowing**." Both the two-file
  case and the duplicate-import case must fail to register with `import-name-collision`.

- **observed:**
  - Two files, same name (`tag`): REGISTERED+CLEAN (2/2). Prompt echo returned
    `RESULT_OTHER_X` → the collision is silently resolved as **last-import-wins shadowing**
    (the second import overrides the first), exactly the "implicit shadowing" the spec
    forbids.
  - Same symbol twice from one file: REGISTERED+CLEAN (2/2); prompt echo `WARP_X`.
  - Contrast: import-vs-**local**-declaration (`import { tag }` + `fn tag(...)` in the same
    loom) IS correctly NOT-REGISTERED. So collision detection exists for import-vs-local
    but is missing for import-vs-import.

- **verdict: bug.** The canonical name-collision case from the spec (two `.warp` files
  exporting the same name, its `import { Author as AuthorA } / { Author as AuthorB }`
  example) is not diagnosed; the second binding silently shadows the first. The
  same-file duplicate is the weaker, borderline sub-case (a harmless dedupe is defensible),
  but the two-file last-wins behaviour is a clear divergence.

## FINDING IMPORTS-3: Import load/parse errors surface no diagnostic in `-p` mode; slash text leaks to the model

- **repro:** any registration-blocking import error, e.g. `import { tag } from "./nope.warp"`
  (missing file), `import { does_not_exist } from "./mod.warp"` (unknown symbol),
  `import { helper } from "./other.loom"` (wrong extension), a cycle, or a `.warp` with a
  forbidden top-level form. Run with `-p "/<stem> ..."`, and also `--mode json`, and with
  stdout/stderr split.

- **expected:** The spec correctly requires these to *not register* the loom
  (`imports.md` IMP-1: "does not register that file"), and that is honoured. A reasonable
  user additionally expects *some* signal that their command failed to load — the spec
  mandates a `loom/load/*` / `loom/parse/*` diagnostic be emitted. `HARNESS.md` explicitly
  flags this: "Load diagnostics — investigate whether/where they surface in -p mode."

- **observed:** No diagnostic anywhere. stdout, stderr, and `--mode json` contain **no**
  `loom/load/*` or `loom/parse/*` text. The unregistered `/stem …` is instead forwarded to
  the model as literal chat, which spends tokens and replies with a confused
  "I don't recognize the `/stem` command" turn. A typo'd import path or symbol therefore
  fails completely silently from the user's point of view while still incurring model cost.

- **verdict: borderline.** Cross-cutting (applies to any load/parse failure, not only
  imports) and possibly intended CLI-surface behaviour, so not filed as a hard bug — but
  strong for the imports lens because import-path/symbol typos are a common, easy user
  error and the failure mode (silent non-registration + token-spending model reply, zero
  error text) is user-hostile.

---

### Non-findings (verified correct)

- Valid `import` of an exported `fn` computes end-to-end (`WARP_Ada` observed).
- `../`-relative paths resolve; absolute and other non-relative specs correctly fail.
- Byte-exact extension (`.WARP`) and byte-exact filename (`Mod.warp` vs `mod.warp`) are
  both rejected on a case-insensitive host, matching IMP-1.
- Re-export chains (`export { X } from`, incl. `as` alias) resolve downstream.
- Import cycles, `.warp` forbidden top-level forms, unknown/unexported symbols, `.loom`
  import paths, and import-vs-local collisions all correctly block registration.
- A query inside an imported warp `fn` executes against the caller's conversation
  (IMP-7 confirmed fixed: `WARPQ_RAN` streamed on the caller's turn).
