# Findings — INVOKE, cross-mode semantics & hard ceilings

Live probes against the shipped extension (`tests/hardening/invoke-parse-load.test.ts`,
`tests/hardening/invoke-runtime-ceilings.test.ts`). Run:

    npx vitest run --config vitest.hardening.config.ts tests/hardening/invoke-*.test.ts

**Root cause shared by INV-1…INV-5, INV-8.** The invoke-literal check functions
exist and are unit-tested but are **never called** by the shipped parse/compose
pipeline. `src/lexer/literals.ts::validatePathLiteral`,
`src/parser/invoke-diagnostics.ts::{checkInvokeExtension,checkInvokeArity,checkInvokeCall,checkInvokeReturnType,checkInvokeArgTypes}`,
and `src/runtime/invoke-depth-cycle.ts::detectInvocationCycle` have no production
caller (`grep` shows only `checkCalleeHasErrors` is imported, by
`src/extension/production-composition.ts`). Consequently
`src/extension/production-composition.ts::parseDiscoveredLoom` never sees these
diagnostics — and its own comment ("Its load-phase diagnostics were aggregated by
the parser and routed above") is false for invoke checks: `document.diagnostics`
from `parseLoomDocument` are **not** passed to `emitDiagnostic`. Every invalid
`invoke(...)` therefore registers cleanly and misbehaves only at runtime (or not
at all). These are structural/lexical/graph/containment checks — **not** covered
by the README "Known gaps" (which enumerate only *type-layer diagnostics* and
*nested control forms*).

---

## INV-1 — `invoke` path-extension check not performed; `.warp`/`.LOOM` paths register, then fail silently

- **Repro:** `warpinv.loom` = `mode: prompt`, body `let _ = invoke("./lib.warp")?` then `` @`x` ``. Also `uppercase.loom` with `invoke("./child.LOOM")`.
- **EXPECTED:** invocation.md §Resolution + code-registry-parse.md: an `invoke(...)` path not ending byte-exact-lowercase `.loom` is `loom/parse/invoke-non-loom-extension` (severity **E**); the loom must not register.
- **OBSERVED:** loom registers (`registeredNames` contains `warpinv`/`uppercase`); **zero** diagnostics. At runtime (`/warpinv`) the body aborts at the invoke before `` @`x` `` — `userTexts == []`, `error == undefined`, `diagnostics == []` — a silent no-op failure.
- **Verdict: BUG.** Spec-mandated parse error is not produced; runtime failure is unobservable to code and operator.

## INV-2 — backslash in an `invoke` path literal not detected

- **Repro:** `backslash.loom` body `let _ = invoke(".\\child.loom")?`.
- **EXPECTED:** lexical.md §Path literals: a backslash in a path literal is `loom/parse/invalid-path-separator` (E).
- **OBSERVED:** loom registers; no diagnostic.
- **Verdict: BUG.** Lexical path-literal rule not enforced.

## INV-3 — `invoke` arity checks (too-many / too-few) not performed

- **Repro:** too-many: `invoke("./onep.loom","a","b","c")` where `onep` has one param. too-few: `invoke("./twop.loom","a")` where `twop` has two required params (both callees parse → statically resolvable).
- **EXPECTED:** invocation.md §Argument arity: too-many is **always** `loom/parse/invoke-arity-too-many`; too-few is `loom/parse/invoke-arity-too-few` when statically resolvable.
- **OBSERVED:** both parents register; no arity diagnostic.
- **Verdict: BUG.** Arity is structural (arg-count vs param-count), not type-layer; neither code fires.

## INV-4 — invocation cycle not detected at parse; self-cycle hangs the host unbounded

- **Repro (load):** `cyca.loom` invokes `./cycb.loom`, `cycb.loom` invokes `./cyca.loom`; also `selfcyc.loom` invokes `./selfcyc.loom`.
- **EXPECTED:** invocation.md §Cycle detection: a static cycle is `loom/load/invocation-cycle` at parse time.
- **OBSERVED (load):** all cyclic looms register; no cycle diagnostic.
- **OBSERVED (runtime):** driving `/selfcyc` does not terminate (>60 s; deliberately not in the committed suite). Because the self-invoke precedes the query, this is pure unbounded invoke recursion with **zero** model turns — see INV-7 for why nothing stops it.
- **Verdict: BUG.** Missing cycle detection turns a trivial authoring mistake into a host hang.

## INV-5 — `invoke` discovery-root containment (path escape) not enforced at load OR runtime (sandbox escape)

- **Repro:** `escparent.loom` in `.pi/looms` = `invoke("../../evil.loom")?` then `` @`x` ``; `evil.loom` planted at `<cwd>/evil.loom`, outside every active discovery root (`.pi/looms`, cli dir).
- **EXPECTED:** invocation.md §Resolution + INV-1 seam + code-registry-load.md: a resolved callee outside every active root is `loom/load/invoke-path-escape` (E), the parent does not register the call site, and the runtime open re-check fails closed with `Err(InvokeInfraError{cause:"load_failure"})`.
- **OBSERVED:** loom registers with no diagnostic; driving `/escparent` **invokes the out-of-root callee successfully** (`evil.loom` returns `42`) and the parent continues to run `` @`x` `` (`userTexts` contains `"x"`, `error == undefined`).
- **Verdict: BUG (security-relevant).** The discovery-root sandbox on `invoke` is not enforced on either channel; a loom can invoke arbitrary on-disk `.loom` files outside the sanctioned roots via a relative path.

## INV-6 — `invoke<Schema>` return value not AJV-validated at runtime

- **Repro:** `retparent.loom` = `let n: number = invoke<number>("./retstr.loom")?` then `` @`got ${n}` ``; `retstr.loom` (subagent) tail expr is the string literal `"a-string"`.
- **EXPECTED:** invocation.md §Typed return + hard-ceilings.md ceiling-#4 table: the runtime AJV-validates the child's return against the annotation; a `string` under `invoke<number>` is `Err(InvokeInfraError{cause:"return_validation"})`, aborting the parent before its query. (This is the runtime safety net, distinct from the type-layer parse check.)
- **OBSERVED:** the string `"a-string"` flows straight into `n`; the parent renders `userTexts` = `"got a-string"`. No validation, no error.
- **Verdict: BUG.** The documented typed-invoke runtime validation does not run; a wrongly-typed value silently crosses the boundary.
- **Positive control (INV-6-positive):** final-value propagation across the subagent boundary itself **works** — a subagent child's literal final value reaches the caller as the `Ok` payload (`GOT=payload-42`). FN-5 propagation is fine; only the validation is missing.

## INV-7 — invoke-chain depth ceiling #1 (cap 32) not enforced; deep chains run unbounded

- **Repro:** a bounded 40-deep chain of query-less subagent links (`head → link1 → … → link40`, `link40` returns `42`); the prompt head runs a `` @`REACHED-TAIL` `` sentinel *after* the chain returns.
- **EXPECTED:** invocation.md INV-4 / hard-ceilings.md ceiling #1: nesting is capped at 32; frame 33 raises `loom/runtime/invoke-depth-exceeded`. The 40-deep chain must abort ~frame 33 → the head never reaches its sentinel (`userTexts == []`).
- **OBSERVED:** the entire 40-deep chain returns in ~4 s and the head reaches its sentinel — `userTexts` contains `"REACHED-TAIL"`. No cap fires. (Subagent spawns are ~100 ms each, so INV-4's self-cycle hang is genuine unbounded recursion, not merely slow.)
- **Verdict: BUG.** The single documented hard ceiling on invoke nesting is absent; combined with INV-4 a self-referential loom hangs the host indefinitely.

## INV-8 — dynamic (non-literal) `invoke` path silently aborts the body with no diagnostic

- **Repro:** `dynparent.loom` = `let p = "./noq.loom"` then `let _ = invoke(p)?` then `` @`x` ``.
- **EXPECTED:** invocation.md §Resolution: "Dynamic dispatch (a runtime-computed path) is not supported in loom 1.0" — a clear, surfaced error.
- **OBSERVED:** `src/parser/loom-document.ts::parseInvoke` extracts `path = ""` when the first argument is not a string literal (`first.kind === "string" ? first.value : ""`); at runtime `invoke("")` aborts the body before `` @`x` `` with `userTexts == []`, `error == undefined`, `diagnostics == []`.
- **Verdict: BUG.** An unsupported construct is neither rejected at parse nor surfaced at runtime; it degrades to a silent empty-path no-op instead of a diagnostic.

## INV-9 — prompt→prompt invoke: the prompt-mode child's query is not a user-visible turn in the caller's conversation

- **Repro:** `ppro.loom` (prompt) = `invoke("./prokid.loom")?` then `` @`Say PROMPTPARENT once` ``; `prokid.loom` (prompt) = `` @`Say ATTACHEDKID once` ``. Companion prompt→subagent case (`psub`/`subkid`) as the isolation control.
- **EXPECTED:** invocation.md §Cross-mode semantics (prompt→prompt row): the child **attaches to the caller's current conversation** and "Child's queries are user-visible turns."
- **OBSERVED:** prompt→subagent isolation is correct (`ISOLATEDKID` absent from the caller transcript). prompt→prompt is **not** attached: the child's `ATTACHEDKID` query appears neither in the caller transcript (`userTexts`) nor in the caller session's streamed assistant text (`assistantText`), while the parent's own `PROMPTPARENT` turn does. The child ran isolated (or was skipped), not into the user's session.
- **Verdict: BUG.** The documented prompt→prompt attach/user-visibility semantics are not delivered; a prompt-mode callee's turns are invisible in the caller's conversation.

---

## Non-bugs / positives observed

- **Final-value propagation across the subagent boundary works** (INV-6-positive): a subagent child's final value reaches the invoke caller as the `Ok` payload.
- **prompt→subagent conversation isolation works** (INV-9 control): a subagent child's turns do not leak into the caller transcript.
