# Session findings — CROSS-MODE INVOKE value passing

Lens: what value crosses an `invoke` boundary across the 4-cell caller×callee
matrix, plus the two invoke-failure envelopes (`InvokeCalleeError`,
`InvokeInfraError`), typed/untyped return, and object/array/enum survival.

Harness: `tests/hardening/session-crossmode.test.ts` (shipped extension, live
model). All child looms make ZERO model turns (literal tails / empty-template
short-circuit); the only live turn per probe is the top prompt loom's final `@`
query, observed via the deterministic `userTexts` channel.

    npx vitest run --config vitest.hardening.config.ts tests/hardening/session-crossmode.test.ts

Dedupe: INV-1..9 (`findings/invoke-crossmode-ceilings.md`) and INVCEIL-1/2/3
(`cli-findings/invoke-ceilings.md`) are prior findings and are NOT re-reported.
INVCEIL-2 (callee **panic** not wrapped) is distinct from XMODE-1 below (callee
**Err** not wrapped).

Bug-verdict count: **1** (XMODE-1). Plus one borderline (XMODE-2).

---

## XMODE-1 — a callee that returns `Err` is not wrapped as `InvokeCalleeError`; the raw child `QueryError` propagates, and `e.inner` / `e.callee_path` access panics uncatchably — **FIXED**

> **STATUS: FIXED.** `runInvokeEffect` (`src/runtime/effectful-statement-host.ts`,
> `case "value"` branch) now wraps a callee-returned `Err` as
> `InvokeCalleeError` via the previously-unused
> `surfaceLoomCallableCalleeFailure(child.calleePath, inner, message)`
> (`src/runtime/tool-call.ts`). Only `invoke_infra` (trampoline-produced panic /
> internal_error / return_validation) and `cancelled` pass through unwrapped;
> every other callee `QueryError` — including a deeper hop's `invoke_callee` —
> is wrapped (each hop adds one wrapper, SLSH-5 chain). Applies to both untyped
> and typed invoke; the INVCEIL-3 `Ok`→`Ok(null)` behaviour is unchanged.
>
> **Before → after** (live probe, deterministic `userTexts`):
> - `/ek`  → was `K=K-validation`; now `K=K-callee` (`e.kind == "invoke_callee"`).
> - `/ekp` → was `KP=K-validation`; now `KP=K-callee` (prompt-mode callee).
> - `/ei`  → was `userTexts == []` (uncatchable panic on `e.inner.kind`); now
>   `I=INNER` (`e.inner.kind == "validation"` reads the callee's original error).
>
> Verified: `npm run typecheck` / `npm run lint` clean; `npm test` 1599 green;
> `session-crossmode.test.ts` 11 green against the live model.

- **repro:**
  ```
  # errchild.loom   (subagent — also tested identically as prompt)
  ---
  mode: subagent
  ---
  let _ = @` `?        // empty-template -> Err(ValidationError, cause=empty_template)
  1
  ```
  ```
  # ek.loom
  ---
  mode: prompt
  ---
  let r = match invoke("./errchild.loom") {
    Ok(_) => "NOERR",
    Err(e) => match e.kind {
      "invoke_callee" => "K-callee",
      "validation"    => "K-validation",
      _               => "K-other"
    }
  }
  @`K=${r}`
  ```
  Invocation: `/ek`. Corollary loom `ei.loom` replaces the inner arm with
  `Err(e) => match e.inner.kind { "validation" => "INNER", _ => "OTHER" }`.
  Companion `ekp.loom` invokes a **prompt**-mode `errpr.loom` with the same body.

- **expected:** `errors-and-results.md` §`InvokeCalleeError` — "Wraps an `Err` the
  callee itself returned; `inner: QueryError` is the callee's original failure",
  with `kind: "invoke_callee"`, `callee_path`, and `inner`. `invocation.md`
  §Failures repeats it ("`InvokeCalleeError` wraps an `Err` the callee itself
  returned; `inner: QueryError` is the callee's original failure") and
  §Final-value-propagation: on callee `Err` "the caller observes only the
  `InvokeCalleeError` (callee returned `Err`) … envelope". So the parent must see
  `e.kind == "invoke_callee"` and be able to read `e.inner.kind == "validation"`
  and `e.callee_path`. SLSH-5/SNK-i chain rendering (`discovery-cli.md`) also
  depends on the `invoke_callee` hop existing.

- **observed** (deterministic `userTexts`):
  - `/ek` → `K=K-validation` (subagent callee). The `Err` arm runs — the failure
    IS a catchable value — but `e.kind` is `"validation"` (the child's own error
    kind), **not** `"invoke_callee"`. No `InvokeCalleeError` wrapper is applied.
  - `/ekp` → `KP=K-validation` (prompt-mode callee). Identical: raw child error
    passes through unwrapped in the prompt→prompt cell too.
  - `/ei` → `userTexts == []`. Because `e` is the raw `ValidationError` (no
    `.inner` field), `e.inner.kind` hits `loom/runtime/missing-object-key` /
    `null-member-access` and **panics**, aborting the parent body before its query
    — the panic is not catchable by the surrounding `match`.

- **verdict: BUG.** The `InvokeCalleeError` envelope documented in two spec
  reference sections is never constructed for a callee `Err`; the callee's own
  `QueryError` crosses the boundary verbatim. Consequences for a parent written to
  the spec: (1) it cannot distinguish "my invoke's callee failed" from "my own
  query failed" — both present `kind: "validation"`; (2) it loses the
  `callee_path` context the envelope carries; (3) any access to `e.inner` or
  `e.callee_path` (the documented fields) **panics and aborts the parent
  uncatchably**, turning spec-conformant error-handling code into a crash. This is
  the `Err`-path analogue of INVCEIL-2 (which fixed the **panic** path →
  `InvokeInfraError{cause:"panic"}`); the `Err` path → `InvokeCalleeError` was
  never wired. Same root class as the campaign's dominant defect: a spec-mandated
  wrapper that is not applied in the shipped invoke boundary.

---

## XMODE-2 — an unsupported backtick-template / `match`-in-`${…}` value expression is silently accepted and evaluates to `null` instead of `loom/parse/unsupported-feature`

- **repro (A) — interpolating template as a `match`-arm value:**
  ```
  # tmatch.loom
  ---
  mode: prompt
  ---
  let r = match Ok(9) {
    Ok(n) => `V${n}`,
    Err(_) => "E"
  }
  let s = r + "!"
  @`C=${s}`
  ```
  Invocation: `/tmatch`.
- **repro (B) — `match` inside `${…}`:**
  ```
  # mdirect.loom
  ---
  mode: prompt
  ---
  @`D=${match Ok(9) { Ok(n) => n, Err(_) => 0 }}`
  ```
  Invocation: `/mdirect`.

- **expected:** `grammar.md` §Expression sublanguage — the supported forms list
  enumerates ``@`...` `` **query** templates as the only backtick form; a bare
  `` `...` `` template is not a value expression. The Not-supported list is
  explicit: "nested template strings inside `${...}`; ``@`...` `` and `match`
  inside `${...}`" → `loom/parse/unsupported-feature`. So both (A) and (B) should
  be rejected at parse with a diagnostic and the loom should not register — the
  way the parser already rejects the same construct elsewhere:
  `let r = \`V${w}\`` correctly emits `let binding 'r' has no initialiser` and
  fails to register, and a non-interpolating `` `STATIC` `` arm also fails to
  register.

- **observed** (deterministic `userTexts` / `diagnostics`):
  - (A) `/tmatch` → `C=null!`. The loom registers and runs; the interpolating
    template arm is accepted, but the `match` value is `null` (`null + "!"` →
    `"null!"`). The arm's computed string is silently dropped. Contrast (all
    conformant): `Ok(n) => n` → `9`; `Ok(_) => "PLAIN"` → `PLAIN`; a plain-string
    arm as a tail value → `TAILVAL`. Only the interpolating-template arm degrades.
  - (B) `/mdirect` → `D=null`, `registeredNames` contains `mdirect`,
    `diagnostics == []`. A construct the grammar lists as `unsupported-feature`
    registers cleanly and evaluates to `null` with no diagnostic on any channel.

- **verdict: borderline.** Not in the invoke value-passing contract per se — the
  root is a general expression/parser gap — but surfaced directly by the natural
  invoke error-handling idiom `match invoke(...) { Err(e) => \`err ${e.kind}\` }`,
  which silently yields `null`. Two related instances of the same shape: an
  unsupported expression form (interpolating backtick template as a value;
  `match`/``@`` inside `${…}`) is silently accepted and degrades to `null` instead
  of the documented `loom/parse/unsupported-feature`. The inconsistency is the
  instructive part — the identical `` `V${w}` `` is a clean parse rejection as a
  `let` initialiser but a silent-null when it lands in a `match` arm. Reported as
  borderline because the value-passing surface itself is unaffected and an author
  hitting it is using an unsupported construct; still a real footgun worth a
  diagnostic.

---

## Verified-conformant (bounds the search)

Confirmed working via deterministic `userTexts` (child looms spend zero tokens):

- **Object + array final value survives the subagent boundary intact.**
  `invoke<Thing>` of a subagent returning `{ name:"widget", count:7, tags:["alpha","beta"] }`
  → parent interpolates `OBJ=widget|7|alpha`. FN-5 propagation of structured
  values is correct across the boundary.
- **Enum final value survives.** `invoke<Wrap>` of a subagent returning
  `{ status: Status.Done }` → parent interpolates `ENUM=Done` (bare wire value, not
  quoted, not aborting).
- **subagent→subagent value flow.** `top(prompt) → mid(subagent) → leaf(subagent)`;
  `leaf` returns `5`, `mid` returns `w + 100`, top renders `SS=105`. Value flows up
  through two subagent boundaries.
- **subagent→prompt value flow.** `top(prompt) → mid(subagent) → leaf(prompt)`;
  `leaf` (prompt, literal tail `7`, attaches to `mid`'s private conversation)
  returns `7`, `mid` returns `107`, top renders `SP=107`.
- **Typed-return validation is catchable (INV-6 holds).** `invoke<number>` of a
  subagent returning the string `"a-string"` → catchable
  `Err(InvokeInfraError{kind:"invoke_infra", cause:"return_validation"})`; parent
  `match` resolves `Y=RETVAL`. Not a crash, not a silently-flowed value.
- **Untyped invoke returns `null` (INVCEIL-3 holds).** `let r = invoke("./numchild.loom")?`
  where the child's tail is `42` → `U=null` (child value discarded).
- **Callee `Err` is at least catchable (not a raw host throw).** The `Err` arm of a
  `match invoke(...)` runs when the callee returns `Err` — the failure reaches loom
  code as a value; the defect (XMODE-1) is only the missing wrapper/fields.
- **Plain-string and bare-value `match` arms, and `match` as a `let` initialiser or
  tail expression, all evaluate correctly** (`"PLAIN"` → PLAIN, `n` → 9,
  `"TAILVAL"` tail → TAILVAL) — isolating XMODE-2 to interpolating-template /
  `match`-in-`${…}` forms only.
