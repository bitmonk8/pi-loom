# Findings — Queries, Schemas & the Result/Error model

Live bug hunt against the shipped extension (real `AgentSession`, real model).
Probes: `tests/hardening/query-empty-template.test.ts`,
`tests/hardening/query-enums.test.ts`.

Run:

    npx vitest run --config vitest.hardening.config.ts tests/hardening/query-*.test.ts

**Harness limitation (affects all probes).** Only the *first* provider turn a
loom issues is observable via `turn.userTexts` (confirmed: a loom that issues
three queries surfaces only the first). Probes are shaped so the assertion
target is the first turn. Load-phase `ctx.ui.notify` diagnostics do **not**
surface in this harness (a syntax-error loom yields an empty `diagnostics`
array), so `registeredNames` (parse acceptance ⇒ registers; ERROR-severity
parse/type diagnostic ⇒ does not register) is the only load-phase signal;
diagnostic *codes/messages* cannot be asserted, only accept/reject.

---

## QRY-1 — empty-template short-circuit aborts the loom instead of yielding a catchable `Err`

**Verdict: BUG.**

**Repro** (`query-empty-template.test.ts`):

```loom
---
description: emptytmpl
mode: prompt
---
let r = @`
`
let tag = match r { Ok(_) => "ok", Err(_) => "err" }
@`FIRST tag=${tag}`
```

Invocation: `/emptytmpl`.

Control (`errctl.loom`, structurally identical but `r` bound from a non-query
`Err`):

```loom
let r = Err("boom")
let tag = match r { Ok(_) => "ok", Err(_) => "err" }
@`FIRST tag=${tag}`
```

**Expected.** The rendered body is a single newline → `""` (QRY-7 vector 6). Per
QRY-6 the runtime short-circuits to
`Err(QueryError { kind:"validation", cause:"empty_template", ... })` *without a
provider round-trip*, and per QRY-8 "a query never throws — both forms return a
`Result`." So `r` = that `Err`, `tag` = `"err"`, and the downstream query issues
`FIRST tag=err` — identical to the control.

Spec: `docs/spec_topics/query/query-forms.md` QRY-6
(`#degenerate-rendered-templates`); `docs/reference/errors-and-results.md`
(ValidationError `cause:"empty_template"`); `query/query-failure-and-repair.md`
QRY-8.

**Observed.** Control issues `["FIRST tag=err"]`. The empty-template loom issues
**no provider turn at all** (`assistantText == ""`, `userTexts == []`) and no
error is thrown. The downstream query is unreachable — the loom aborted at the
empty template. The `Err(empty_template)` is therefore not observable via
`match` (nor bindable), contradicting QRY-6/QRY-8. The only difference from the
green control is that `r` is sourced from an empty-template query, isolating the
cause.

---

## QRY-2 — enum interpolation renders a JSON-quoted string instead of the unquoted wire value

**Verdict: BUG.**

**Repro** (`query-enums.test.ts`, `/quoted`):

```loom
---
description: quoted
mode: prompt
---
enum Color { Red, Green }
let s: Color = Color.Red
@`VAL=${s}`
```

**Expected.** `VAL=Red`. QRY-18 stringification table:
"Enum variant | the variant's **wire** value, unquoted (the enum brand … is
dropped — the model only ever sees wire forms)."
Spec: `docs/spec_topics/query/query-escapes-stringification.md` QRY-18.

**Observed.** `userTexts == ['VAL="Red"']` — the wire value is JSON-quoted
(`"Red"`), not the bare `Red` the spec mandates. The model sees a quoted token
that no longer matches a bare enum wire form.

---

## QRY-3 — explicit enum values (`Low = "low"`) are dropped; the variant *name* is used as the wire value

**Verdict: BUG.**

**Repro** (`query-enums.test.ts`, `/explicit`):

```loom
---
description: explicit
mode: prompt
---
enum Severity { Low = "low", High = "high" }
let s: Severity = Severity.Low
@`VAL=${s}`
```

**Expected.** `VAL=low`. schemas.md §Enum declarations: "Explicit values override
that mapping: `Low = "low"` → the model produces `"low"`", and
`docs/reference/type-system.md` runtime value-model: `Enum.Variant` "evaluates to
the variant's underlying string value (the explicit RHS …)".
Spec: `docs/spec_topics/schemas.md` §Enum declarations / §Variant access.

**Observed.** `userTexts == ['VAL="Low"']`. Two defects compound: the explicit
value `"low"` is dropped and the variant **name** `Low` is used as the wire value
(quoting is QRY-2). Root cause visible in source: `parseEnum`
(`src/parser/loom-document.ts`) records variant *names* only and *skips* the
`= <literal>` value; `EnumDecl.variants` / `EnumRegistration.variants` carry
names only, so the explicit mapping never reaches lowering or `Enum.Variant`
resolution (`src/runtime/lexical-environment.ts` `resolveEnumVariant` →
`makeEnumValue(enumName, variant)` keyed by name).

---

## QRY-4 — direct enum-variant interpolation `${Color.Red}` aborts the loom

**Verdict: BUG.**

**Repro** (`query-enums.test.ts`, `/direct`):

```loom
---
description: direct
mode: prompt
---
enum Color { Red, Green }
@`VAL=${Color.Red}`
```

**Expected.** `VAL=Red` and a provider turn issued (QRY-18). `Color.Red` is a
legal enum-variant access expression and is accepted on the RHS of a `let`
(control `/g` and `/quoted` both bind `let s: Color = Color.Red` and issue a
turn).
Spec: `docs/spec_topics/query/query-escapes-stringification.md` QRY-18;
`docs/spec_topics/schemas.md` §Variant access.

**Observed.** No provider turn is issued (`userTexts == []`, no error). The same
value interpolated via a `let` binding (`/quoted`) *does* issue a turn — so an
enum-variant access appearing *directly* inside `${…}` evaluates inconsistently
and aborts the loom, whereas the identical value bound to a local renders. (The
rendered form via the local is still wrong per QRY-2, but a turn is issued.)

---

## QRY-5 — invalid enum *declarations* load instead of being rejected (parse checks unwired)

**Verdict: BUG.**

**Repro** (`query-enums.test.ts`, zero model turns; registration is the signal).
Controls confirm ERROR-severity diagnostics block registration:
`let x: integer = "hello"` (`ctl_typeerr`) and `schema Empty { }`
(`ctl_emptyschema`) both fail to register. The following invalid enum
declarations all **register** (each also references the enum via a `let` so
"declared-but-unused" is not the excuse):

| loom | source | expected diagnostic | observed |
|---|---|---|---|
| `emptyenum` | `enum EE { }` | `loom/parse/empty-enum-body` | registers |
| `nonstrenum` | `enum Bad { Low = 1, High = 2 }` | `loom/parse/non-string-enum-value` | registers |
| `boolenum` | `enum Bad2 { Yes = true }` | `loom/parse/non-string-enum-value` | registers |
| `dupname` | `enum D { Low, Low }` | `loom/parse/duplicate-enum-variant-name` | registers |
| `inlineenum` | `schema Q { sev: enum["a","b"] }` | `loom/parse/inline-enum` | registers |

**Expected.** Each is a parse-time error per `docs/spec_topics/schemas.md`
§Enum declarations (string values only; non-empty body; unique variant names;
`enum` top-level only) — the loom must not load.

**Observed.** All register (accepted at load). `parseEnum`
(`src/parser/loom-document.ts`) performs no validation — it collects names,
skips values, and never calls the `checkEnumDeclaration` / `checkInlineEnumForm`
seams in `src/parser/schema-declarations.ts`, which have **no callers** in
`src/` outside their own file and unit tests. The checks are implemented and
unit-tested in isolation but not wired into the shipped load pipeline (a
QRY-22-style integration gap, here on the enum surface). Note the discriminated-
union and type-alias-cycle checks *are* enforced when the schema is used
(`schema U = A | B` with no discriminator, `schema X = Y; schema Y = X` both fail
to register when referenced), so the gap is specific to the enum surface.

---

## QRY-6 — unknown enum-variant reference (`Enum.Missing`) is not rejected at parse

**Verdict: BUG.**

**Repro** (`query-enums.test.ts`, `/unkvar`, zero model turns):

```loom
---
description: unkvar
mode: prompt
---
enum C2 { Low, High }
let _c: C2 = C2.Nope
```

**Expected.** `loom/parse/unknown-variant` at load — the loom must not register.
Spec: `docs/spec_topics/schemas.md` §Variant access ("Unknown-variant references
(`Severity.Critical` when no such variant exists) are
`loom/parse/unknown-variant`.").

**Observed.** Registers. The `checkVariantAccess` seam
(`src/parser/schema-declarations.ts`) is never called by the load pipeline; at
runtime `resolveEnumVariant` returns `undefined` for the unknown variant, so the
error surfaces (if at all) only when the value is used, not as the mandated
load-time diagnostic.

---

## Non-findings / conformant behaviour observed

- **U+00A0-only template does not short-circuit** (QRY-6): `@`\u00A0`` issues a
  provider turn rather than short-circuiting to `empty_template` — matches the
  spec's explicit "non-ASCII whitespace issues a turn" rule.
- **Discriminated-union / type-alias-cycle checks are enforced** when the schema
  is referenced (`missing-discriminator`, `non-string-discriminator`,
  `duplicate-discriminator-value`, `type-alias-cycle` all block registration).
- **`schema Empty { }`** (`loom/parse/empty-schema-body`) is correctly rejected.
- **Well-formed schemas load**: recursion, `T | null`, nested objects,
  `array<T>`, wire-name rename, mixed unions (`string | Author`), and explicit
  `by <field>` discriminated unions all register.
- Declared-but-unused invalid discriminated unions are *not* checked (they
  register); treated as borderline (the checks fire once the union is used), not
  reported.
