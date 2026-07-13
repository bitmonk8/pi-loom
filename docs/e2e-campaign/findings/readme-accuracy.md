# README / landing-page accuracy verification

Scope: verify `README.md` (esp. the `## Status` section, README.md:30–55) against
the currently shipped `src/**`, after the e2e campaign fixed 10 diagnostic codes,
a schema-separator parse bug, and a dropped-`description` bug. All behavioural
verdicts are backed by a probe run against the real `parseLoomDocument` / the
production `executeBody` path (probes were temporary `tests/_probe-*.test.ts`
files, since deleted). No edits were made to `README.md` or `src/**`.

## Verdict summary

| # | Claim (README) | Verdict | Evidence |
|---|---|---|---|
| 1 | Type-layer diagnostics "are partial (e.g. non-boolean `if`, indexing a `string`, non-array `for`)" — README.md:40-42 | **stale / false** | all three cited examples now emit their diagnostic (probe below); checks are implemented |
| 2 | Nested control forms nested in a wholesale-evaluated pure expression (object-literal field, array element) "may still not evaluate in every position" — README.md:43-47 | **accurate** | probe: object-field / array-element nested `match` silently yields `null` (expected `1`); tail-position baseline yields `1` |
| 3a | `errors-and-results.md#final-value-fn-5` | **accurate** | heading `## Final value (FN-5)` → slug `final-value-fn-5` (errors-and-results.md:303) |
| 3b | `errors-and-results.md#terminal-outcomes-closed-set` | **accurate** | heading `## Terminal outcomes (closed set)` → slug `terminal-outcomes-closed-set` (errors-and-results.md:13) |
| 3c | `frontmatter.md#tools-callable-set` | **accurate** | heading ``## `tools:` (callable set)`` → slug `tools-callable-set` (frontmatter.md:97) |
| 4a | "core language surface … all work" list (binder, typed queries+schema validation, code-driven tool calls, invoke/subagent value passing, match/?, enums, user functions) — README.md:33-36 | **accurate** (feature-level) | full suite green (final-report.md: `npm test` 1870/0, conformance 26/26); features have passing coverage |
| 4b | "the specification is not yet fully implemented" — README.md:37-38 | **stale / conflicting** | contradicts documentation-plan.md §1 ("spec … **fully implemented**") and decision D-6; only residual is the bullet-2 gap |
| 4c | "production-path conformance suite … `npm run test:conformance`, outside the default `npm test`" — README.md:49-53 | **accurate** | script exists (package.json); `tests/conformance/production-conformance.test.ts` exists; `vitest.config.ts:18` excludes `tests/conformance/**` |
| 4d | Doc links Guide / Tutorial / How-to / Reference — README.md:59-68 | **accurate** | `docs/guide.md`, `docs/tutorial.md`, `docs/how-to/`, `docs/reference/` all present |
| 4e | Provenance spec-file citations — README.md:72-86 | **accurate (files) / internally-contradicted (posture)** | all cited files exist; terms match glossary.md; but D-6 posture cited at README.md:84-85 is violated by the enumerated Status list (see 4f) |
| 4f | Provenance: "Status posture per … decision D-6 (… no enumerated rough edges)" — README.md:84-85 | **false** | D-6 (documentation-plan.md:184-189) says the README does **not** enumerate rough edges "with no list"; the Status section enumerates two bullets — the README violates the posture it claims to follow |

## Bullet 1 — probe results (type-layer diagnostics)

Driver: `parseDoc` over the shipped `parseLoomDocument` (`tests/helpers/e2e-s1.ts`).

| Cited example | Source | Diagnostic emitted |
|---|---|---|
| non-boolean `if` | `if 1 { @\`hi\` }` | `loom/parse/non-boolean-condition` ✅ fires |
| indexing a `string` | `let s = "hello"` / `let c = s[0]` | `loom/parse/non-indexable-receiver` ✅ fires |
| non-array `for` iterand | `for x in 3 { @\`${x}\` }` | `loom/parse/non-array-iterand` ✅ fires |

All three fire. Emission sites: `src/parser/type-layer-checks.ts` (non-boolean /
non-array / non-indexable, ~lines 14-24, 830-905). Additionally the campaign wired
the codes README omits: `unknown-identifier` (`src/parser/loom-document.ts:3149`),
`unknown-method` (`type-layer-checks.ts:838`), `mixed-plus-operands`
(`type-layer-checks.ts:870`), `non-orderable-operands` (`type-layer-checks.ts:905`),
`extra-object-field` (`loom-document.ts:3705`), `missing-object-field`
(`loom-document.ts`, `literal-sublanguage.ts`), `bare-object-literal`
(`loom-document.ts:3683`). Coverage verified by the committed
`tests/e2e-s1-expr-diagnostics.test.ts`.

Conclusion: bullet 1 is **stale/false**. The three examples it names as evidence
of "partial" type-layer diagnostics all now diagnose; the type-layer surface is
implemented, not partial. Diagnostics fire only when operand/receiver types are
statically resolvable (conservative — no false positives; a
statically-unresolvable receiver defers).

## Bullet 2 — probe results (nested control forms in a pure position)

Driver: constructed the AST directly and drove the real production
`executeBody` via `bindPromptConversation` (mirrors
`tests/production-core-exec.test.ts`). Scrutinee `Ok(1)`, arms `Ok(v) => v`,
`_ => 0` (a nested `match` that should evaluate to `1`).

| Position | Body | Outcome | Value | Expected |
|---|---|---|---|---|
| tail expression (baseline) | tail = nested `match` | success | `1` | `1` ✅ executor handles it |
| object-literal field | `let p = Wrap { f: <match> }`; tail `p.f` | success | **`null`** | `1` ❌ gap |
| array element | `let a = [ <match> ]`; tail `a[0]` | success | **`null`** | `1` ❌ gap |

Conclusion: bullet 2 is **accurate** — the gap is real. A control/effect form
nested inside a wholesale-evaluated pure expression (object-literal field, array
element) silently evaluates to `null`; there is no diagnostic and no failure — the
outcome is `success` with a wrong (`null`) value. Root cause matches
`notes.md` DIVERGENCE-2 (~line 2541): the arm-body path was routed through the
real executor, but `evaluatePureExpression`'s `default: return null`
(`src/extension/production-loom-producer.ts:3935`) remains as an inert fallback
for deeper recursive pure positions the executor does not decompose. `case
"object"` / `case "array"` (lines 3856, 3865) recurse into
`evaluatePureExpression` per field/element, so a `match`/query/tool-call/invoke
there hits the `null` default.

Note: README's own wording ("may still not evaluate in **every** position") is
softer than reality — for these two positions it deterministically does **not**
evaluate; it silently yields `null`.

## Bullet 3 — anchor resolution

GitHub slug algorithm (lowercase; drop chars that are not letter/number/space/
hyphen; spaces → hyphens) applied to the target headings:

- `## Final value (FN-5)` (errors-and-results.md:303) → `final-value-fn-5` ✅
- `## Terminal outcomes (closed set)` (errors-and-results.md:13) → `terminal-outcomes-closed-set` ✅
- ``## `tools:` (callable set)`` (frontmatter.md:97) → `tools-callable-set` ✅

No broken anchors. (No explicit `<a id>`/`{#}` tags are used in these files; all
three rely on heading auto-slugs, which resolve.)

## Bullet 4 — other README claims

- **"core language surface … all work"** (README.md:33-36): accurate at the
  feature level — each named feature has passing production-path coverage
  (`npm test` 1870/0, `npm run test:conformance` 26/26 per final-report.md). The
  bullet-2 gap is a narrow sub-position defect, not a feature that "doesn't work".
- **"the specification is not yet fully implemented"** (README.md:37-38): conflicts
  with documentation-plan.md §1 (spec "fully implemented") and D-6. The only
  concrete residual is the bullet-2 pure-position gap; the type-layer claim
  (bullet 1) is no longer a gap.
- **Conformance suite / `npm run test:conformance` / excluded from `npm test`**
  (README.md:49-53): accurate. `package.json` has the script;
  `tests/conformance/production-conformance.test.ts` exists; `vitest.config.ts:18`
  excludes `tests/conformance/**`.
- **Doc links** (README.md:59-68): all targets exist.
- **Provenance spec files** (README.md:72-86): all six cited files exist
  (`glossary.md`, `overview.md`, `overview-and-orientation.md`,
  `language-and-architecture.md`, `documentation-plan.md`, `STYLE.md`); glossary
  terms match. **But** the D-6 citation (README.md:84-85, "no enumerated rough
  edges") is contradicted by the Status section, which enumerates a two-bullet
  list. Per D-6 (documentation-plan.md:184-189) the Status section should state
  the 1.0 first-release posture "in general terms only … with no list."

## Recommended Status rewrite

Concrete, sentence-level changes for the orchestrator:

1. **Delete bullet 1 entirely** (README.md:40-42). The type-layer diagnostics it
   cites all fire; keeping it understates capability and is false.

2. **Reconcile the D-6 conflict.** The Status section's enumerated-gap format
   itself violates D-6 (which the README cites in Provenance) and §1's
   "fully implemented" posture. Two coherent options:
   - **(A) Follow D-6 literally:** remove *both* known-gap bullets and the "the
     specification is not yet fully implemented" sentence (README.md:36-47);
     replace with a general first-release posture ("a first release may have
     undiscovered rough edges") and no list. This matches the cited Provenance
     posture — but note it would leave the real bullet-2 gap undocumented.
   - **(B) Keep one honest bullet:** drop bullet 1, keep a single tightened
     bullet-2, and *update the Provenance D-6 line* (README.md:84-85) to stop
     claiming "no enumerated rough edges" (since the campaign discovered one).
     If (B), rewrite bullet 2 to drop the softening: the forms nested in an
     object-literal field or array element **do not** evaluate — they silently
     yield `null` (no diagnostic), rather than "may still not evaluate in every
     position." Also drop the "not yet fully wired … not yet fully implemented"
     framing (README.md:36-38) down to the single concrete residual.

3. **Keep unchanged:** README.md:33-36 ("core language surface … all work"),
   the conformance-suite paragraph (README.md:49-53), the doc links, and the
   Provenance spec-file citations — all accurate.

Recommendation: option (B) is the more truthful rewrite (the bullet-2 gap is
real and worth documenting); it requires editing the Provenance D-6 line so the
README no longer cites a "no list" posture it does not follow.
