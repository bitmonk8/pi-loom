# Phase-E findings — final live/e2e retest

Recorded during the Phase-E retest (`execution/phase-e-retest-results.md`). Two
classes of hardening failure surfaced that are NOT the authorized D3
`probe.diagnostics`→`probe.systemNotes` channel repair and NOT plain
provider-infra:

- **FIND-E-1 (×3 instances)** — stale test fixtures using **bare object
  literals** where the shipped grammar (spec-correct) now requires named-schema
  construction. Verdict: **test-artifact**. The loom parser behaviour is
  provably spec-correct, so this is NOT a loom-defect and NOT a `src/**` fix.
  These are OUTSIDE the narrow test-fix authorization of this task (which covered
  only the D3 observation-channel repoint), so they are recorded here and
  escalated rather than rewritten unilaterally.

The three provider-infra timeouts (arith / XMODE-2 / fn-tail-bug) are documented
in the results file, not here (they are not findings per §5).

---

### FIND-E-1: hardening fixtures use bare object literals in value/tail position (stale grammar)
- Requirement: REQ-EXPR-35, REQ-GRAM-3, REQ-DIAG-56
- Spec citation:
  - `docs/e2e-campaign/analysis/spec-requirements.md:193` (REQ-EXPR-35): "A bare
    object literal (`{ field: expr }` with no schema name) is
    `loom/parse/bare-object-literal`, with exactly two carve-outs (frontmatter
    `params:` defaults; single positional Pi-tool call argument), both restricted
    to the literal sublanguage."
  - `docs/e2e-campaign/analysis/spec-requirements.md:133` (REQ-GRAM-3):
    "`BareObjectLit` is admitted only when an external schema supplies the type;
    `NamedObjectLit` is used where the type is not supplied externally…"
  - `docs/e2e-campaign/analysis/spec-requirements.md:670` (REQ-DIAG-56):
    `loom/parse/bare-object-literal` — Registered, Sev E, Phase parse.
- Method: M3 (surfaced live) → reduced to a **deterministic, zero-token,
  provider-independent** load-phase probe (see repro).
- Repro (deterministic; no model turn):
  Plant these `.loom` files as `project` sources through the shipped extension
  (`runProbe`, `drives: []`) and read `probe.systemNotes` / `registeredNames`:
  ```
  # objchild.loom  (mode: subagent)
  { name: "widget", count: 7, tags: ["alpha", "beta"] }

  # enumchild.loom (mode: subagent)
  enum Status { Active, Done }
  { status: Status.Done }

  # coll.loom (mode: prompt) — the offending line:
  let obj = { a: 1, b: 2 }
  ```
  Observed load-phase system notes (verbatim, live-host, model `claude-opus-4-8`):
  ```
  objchild.loom:5:1:  loom/parse/bare-object-literal: bare object literal not permitted in this position; name the schema (Schema { ... })
  enumchild.loom:6:1: loom/parse/bare-object-literal: bare object literal not permitted in this position; name the schema (Schema { ... })
  coll.loom:7:11:     loom/parse/bare-object-literal: bare object literal not permitted in this position; name the schema (Schema { ... })
  ```
  `registeredNames` = `["numchild"]` only (the three bare-literal looms are NOT
  registered — they fail load).
- Expected (spec): a bare `{ … }` object literal in a value/tail position with no
  external schema is `loom/parse/bare-object-literal` (Sev E, parse phase) and
  the loom fails to load. The shipped parser does exactly this. **Parser is
  spec-correct.**
- Observed (test impact): three hardening tests write bare object literals in
  positions the spec disallows, so the fixtures fail load and the tests fail:
  1. `tests/hardening/session-crossmode.test.ts:177` — "conformant: object/array
     final value survives + interpolates". Child `objchild.loom` returns a bare
     object literal tail. At runtime the parent's `invoke("./objchild.loom")`
     surfaces `Err: invoke of ./objchild.loom failed (load_failure)`; the top
     `@`-query never runs, `userTexts=[]`, assertion `toContain("OBJ=widget|7|alpha")`
     fails on `''`.
  2. `tests/hardening/session-crossmode.test.ts:207` — "conformant: enum final
     value survives boundary". Child `enumchild.loom` returns bare
     `{ status: Status.Done }`. Same `load_failure`; assertion `toContain("ENUM=Done")`
     fails on `''`.
  3. `tests/hardening/exprflow-stdlib.test.ts:111` — "array + object stdlib".
     `coll.loom` has `let obj = { a: 1, b: 2 }` (bare literal) → `/coll` fails
     load and is NOT registered → the driven `/coll` falls through to the model
     as a raw user prompt, `userTexts=["/coll"]`, assertion `toContain("alen=3|")`
     fails.
- Verdict: **test-artifact** (stale fixtures). NOT loom-defect; parser is
  spec-correct per REQ-EXPR-35 / REQ-GRAM-3 / REQ-DIAG-56. NOT provider-infra.
  NOT the D3 observation-channel artifact.
- Severity: partial (three hardening tests red; the loom production behaviour is
  correct — the assertions target invoke value-passing / stdlib evaluation, which
  cannot be reached because the fixtures fail to load).
- Suggested repair (NOT applied — outside this task's authorized test-fix scope,
  needs orchestrator decision on the fixture corpus): repoint each bare `{ … }`
  to a named-schema constructor in the child/loom itself, e.g. give `objchild.loom`
  its own `schema Thing { name: string, count: number, tags: array<string> }` and
  return `Thing { name: "widget", count: 7, tags: ["alpha", "beta"] }`; give
  `enumchild.loom` a `schema Wrap { status: Status }` and return
  `Wrap { status: Status.Done }`; in `coll.loom` name the object
  (`schema Pair { a: number, b: number }` → `Pair { a: 1, b: 2 }`). This keeps
  the tests' intent (value survives the invoke boundary / stdlib on objects)
  while conforming to the current grammar. Do NOT weaken/delete the assertions.
