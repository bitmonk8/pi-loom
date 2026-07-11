# Session-semantics hardening — THE BINDER (typed-param extraction) + SLSH-1

Lens: the LLM binder that maps free-form slash arguments onto typed `params:`
(`docs/spec_topics/binder.md` + `binder/*`, `docs/reference/frontmatter.md`,
`docs/reference/discovery-cli.md` §Slash-command invocation / SLSH-1).

Driven through the SHIPPED extension against the LIVE model with
`tests/hardening/probe-harness.ts`; probes in
`tests/hardening/session-binder.test.ts`
(`npx vitest run --config vitest.hardening.config.ts tests/hardening/session-binder.test.ts`).

Observation channels: `turn.userTexts` (the binder-prompt turn + the loom body's
computed query — the body's `${param}` echo reveals what the binder extracted),
`turn.systemNotes` (SLSH-1 overflow + binder notes), `turn.assistantText`
(binder envelope leak, for confirming known state), `probe.registeredNames`,
`probe.diagnostics`.

Because the binder is model-driven, only CLEAR mis-binding is reported (wrong
value / crash / dropped param / wrong default); a defensible model
interpretation is not a finding.

**Dedupe.** BND-1 (success echo never emitted) and BND-3 (failure-envelope leak)
are KNOWN + deferred (need a design decision) in `cli-findings/binder.md` /
`cli-findings/SUMMARY.md`; BND-2 (defaulted param → null) is FIXED. This pass
confirms their current state briefly and does not re-report them. The finding
below (BIND-1) is a distinct, previously-unreported defect.

---

## FINDING BIND-1 (BUG): a NamedType param (body-level `enum` or `schema`) mis-classifies the loom as no-params — the binder is skipped, the param arrives null, and a false SLSH-1 "this loom takes no parameters" note fires

- **repro** (enum manifestation):
  ```loom
  ---
  description: t
  mode: prompt
  params:
    sev: Severity
  ---
  enum Severity { Low, High }
  @`Reply with exactly: OK. TRI s=${sev}`
  ```
  Invocation: `/triage the login page crashes on submit, high severity`.

  Schema manifestation (identical outcome):
  ```loom
  ---
  description: s
  mode: prompt
  params:
    p: P
  ---
  schema P { a: string }
  @`Reply with exactly: OK. SHAPERAN`
  ```
  Invocation: `/shape make a equal to hello`.

- **expected.** A loom that declares a non-empty `params:` block is NOT a
  no-params loom, so the binder must run and the SLSH-1 overflow note must NOT
  fire. NamedType params are a spec-supported surface:
  - `docs/spec_topics/binder/binder-bypass-and-envelope.md#bypass-cases` case 1:
    "**No-params bypass.** When `params:` is absent or `params: {}`, the loom
    takes no parameters and the binder does not run." (A `params:` block with a
    field is, by contradistinction, a genuine binder pass — "All other shapes …
    go through the binder.")
  - The same file's *Type display* table lists `Severity` (enum) and `Author`
    (named schema) as valid declared param types that render in the binder
    prompt, and the *Binder system prompt* example binds `author: Author`.
  - `docs/reference/frontmatter.md` §`params:` Type side: "A `NamedType`
    resolves against the file's body-level `schema`/`enum` declarations … .
    Resolution is whole-file — a frontmatter → body forward reference resolves."
  - `docs/reference/discovery-cli.md` **SLSH-1**: the overflow note is only for
    "a no-params loom".

  Expected observable for `/triage …`: a binder-prompt turn is issued, `sev`
  binds to `High` (or `Low`), the body renders `TRI s=High`, and no SLSH-1 note
  appears.

- **observed** (deterministic channels):
  - `probe.registeredNames` contains `triage` / `shape`; `probe.diagnostics` is
    empty — the loom registers with NO load warning or error.
  - `turn.userTexts.length === 1` for the enum loom (only the body turn; NO
    binder-prompt turn was ever issued) and `=== 0` for the schema loom (the
    body deref of the unbound param produced no turn).
  - Enum body (`turn.userTexts`): `Reply with exactly: OK. TRI s=null` — the
    enum param arrived as `null` in body scope.
  - `turn.systemNotes` for BOTH looms:
    `["loom /triage: ignoring extra arguments — this loom takes no parameters"]`
    / `["loom /shape: ignoring extra arguments — this loom takes no parameters"]`
    — the SLSH-1 no-params overflow note fires even though the loom declares a
    param.

  Isolation confirms the trigger is the NamedType reference, not the field
  count: `params: { city: string, days: integer }` (all primitive) runs the
  binder normally (2 user turns, `C=Paris D=3`); `params: { tags: array<string> }`
  runs the binder (`t=["red","green","blue"]`); `params: { note: string | null }`
  runs the binder (`ANN n=…`). Only a NamedType field (`enum`/`schema`) triggers
  the mis-classification — and a single NamedType field poisons the whole
  `params` block (the mixed `sev: Severity, note: string | null` loom drops
  BOTH params to null).

- **verdict: bug.** Root cause is visible in the shipped guard
  `src/extension/production-loom-producer.ts` `runBinder`:
  `if (params === undefined || params.loweredSchema === undefined) { …no-params
  branch… }`. A NamedType param leaves `params.loweredSchema` `undefined` (the
  params lowering does not produce a schema when a field references a body-level
  `enum`/`schema`), so the runtime takes the no-params branch: it emits the
  SLSH-1 overflow note and returns `{ bound: true, args: {} }`, the binder never
  runs, and the declared param reaches the body as `null`. This is a clear
  spec violation on a documented param-type surface (enum / named-schema
  params), it is silent (no load diagnostic), and it also emits a misleading
  "this loom takes no parameters" note contradicting the loom's own frontmatter.

---

## Confirmations of KNOWN / deferred state (not re-reported)

- **BND-1 (success echo never emitted) — confirmed still present.** The `greet`
  loom (`bind_echo: true`, default) and the `forecast` loom bound successfully;
  `turn.systemNotes` was `[]` in every success case — no `Running /<name>: …`
  echo note. Matches `cli-findings/binder.md` BND-1 (deferred; needs a design
  decision on binder-turn visibility). Not re-reported.

- **BND-3 (failure envelope leak) — confirmed still present.** The `register`
  loom (`params: { name: string, age: integer }`) invoked as `/register` (no
  bindable args) did NOT run its body (correct), but the binder's raw envelope
  leaked verbatim as `turn.assistantText`:
  `{"kind":"needs_info","message":"Please provide a name and age, e.g. /register
  name=Alice age=30"}`, and `turn.systemNotes` was `[]` (the spec-mandated
  `loom /register: argument binding needs more info — …` note was not emitted).
  Matches `cli-findings/binder.md` BND-3 (deferred). Not re-reported.

---

## Verified-conformant (bounds the search — these behave per spec)

- **Multi-param extraction + integer coercion.**
  `params: { city: string, days: integer }`.
  `/forecast weather in Paris for three days` → body `FCAST C=Paris D=3`
  (word "three" coerced to integer `3`);
  `/forecast weather in Paris for 3 days` → `FCAST C=Paris D=3`. Both params
  extracted to the correct slots and the integer typed correctly.

- **Defaulting for STRING and BOOLEAN defaults (extends BND-2 fix).**
  `params: { topic: string, tone: string = "neutral", verbose: boolean = false }`,
  `/greet cats` → body `GREET t=cats tone=neutral v=false`. The binder omits the
  unsupplied defaulted fields; the runtime fills the string default `"neutral"`
  and the boolean default `false` before the body runs
  (`defaulting-system-note-echo.md#defaulting` fill-if-absent). Confirms the
  BND-2 fix covers string and boolean defaults, not only integer.

- **Required param unsatisfiable → body does not run.** `/register` with no
  bindable args does not execute the loom body (binding-failure path halts
  execution; the leak of the envelope is the separate known BND-3).

- **Single-string bypass.** `params: { q: string }` (one defaultless string):
  `/search foo bar baz qux` → body `BYPASS q=foo bar baz qux` (whole trimmed
  slash-argument string bound verbatim, no binder LLM turn), and
  `turn.systemNotes === []` (echo auto-suppressed). Matches
  `binder-bypass-and-envelope.md#bypass-cases` case 2.

- **`array<string>` param.** `params: { tags: array<string> }`, `/arr red green
  blue` → body `t=["red","green","blue"]` (binder runs, structural type lowers).

- **Nullable/optional param.** `params: { note: string | null }`, `/annotate add
  a note about the crash` → binder runs (2 user turns), body `ANN n=add a note
  about the crash`. Nullable-of-primitive lowers correctly (contrast BIND-1:
  only NamedType references break).

- **SLSH-1 no-params overflow (positive control).** A `params:`-less loom
  invoked with trailing text emits exactly
  `loom /nop: ignoring extra arguments — this loom takes no parameters` on
  `turn.systemNotes` and still runs the body. This is the legitimate SLSH-1
  path; BIND-1's defect is that a *params-declaring* loom wrongly reaches it.

- **key=value syntax (§Slash-command invocation: "not part of the loom 1.0
  surface").** `params: { city: string, country: string }`,
  `/geo city=Paris country=France` → body `GEO c=Paris co=France`. The binder
  defensibly parses the `k=v` tokens into the right slots rather than binding the
  literal `city=Paris` string; no crash, no mis-slotting. Verified-conformant
  (defensible model interpretation — not a finding).
