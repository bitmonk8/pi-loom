# Triaged Spec Review — spec.md

_Generated: 2026-05-07T13:35:00Z_
_Spec: spec.md_
_Process: bottom-up — the last finding (T21) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 1 high, 2 medium retained; 23 low discarded; 0 low findings merged into 0 medium findings; 19 nit dropped; 0 false dropped (13 false positives were filtered upstream by the enricher)._

---

# T01 — "loom-side name" vs "loom-side identifier": defined-term drift across topic pages

**Original heading:** "loom-side name" (glossary canonical) vs "loom-side identifier" (three topic pages)
**Original section:** spec_topics/ — Naming inconsistencies (multiple files)
**Kind:** naming
**Importance:** medium

## Finding

The glossary defines a single canonical pair — **`loom-side name`** vs **`wire name`** — and stipulates that the "loom-side name is the identifier a schema field is declared and referenced by in loom code." Three topic pages and one diagnostic message template use a competing phrasing, **`loom-side identifier(s)`**, for the same concept:

- `runtime-value-model.md` lines 12, 22, 28 ("JS plain object keyed by **loom-side identifiers**", "key set (loom-side identifiers)", "rebuilds the value with loom-side identifiers using each schema's translation map").
- `diagnostics.md` line 255, in both the *Description* and *Message* columns of `loom/parse/redundant-wire-name`: `redundant 'as' clause: wire name '<name>' equals the loom-side identifier`.
- `query.md` line 164 ("the loom-side identifiers an author writes never appear in the rendered prompt").

A fourth phrasing, **`loom-side field name`**, also appears (`diagnostics.md` line 339 in the `loom/runtime/missing-object-key` template; `expressions.md` line 95 in the `has(k)` row), giving four surface forms for one defined concept. One use of "loom-side identifier" is intentionally distinct: `diagnostics.md` line 81 ("Named schemas, enums, and type aliases by their loom-side identifier") refers to the lexical identifier *shape* fixed by `lexical.md`, not the loom-side-name/wire-name pairing. That single occurrence should be retained.

The drift matters because the glossary entry is cited as the authority for the term ("See: [Schema Declarations]…") and because the synonym `identifier` invites readers to suspect a second concept exists — particularly in `diagnostics.md` line 256 where `loom-side name` and `loom-side identifier` appear two lines apart in the same registry table.

## Spec Documents

- `spec_topics/glossary.md` — "loom-side name vs. wire name" entry (read-only)
- `spec_topics/runtime-value-model.md` — Representation table; equality bullets; inbound/outbound translation passes (edited)
- `spec_topics/diagnostics.md` — `loom/parse/redundant-wire-name` row (Description + Message); `loom/runtime/missing-object-key` row (edited)
- `spec_topics/query.md` — String-interpolation rendering bullet on outbound translation (edited)
- `spec_topics/expressions.md` — `has(k)` row in the built-in functions table (edited)
- `spec_topics/lexical.md` — Identifier-shape rules (read-only; cited as the rationale for retaining "loom-side identifier" at `diagnostics.md` line 81)
- `spec_topics/schemas.md` — `by <field>` discussion using "loom-side name" (read-only; reference exemplar)

## Plan Impact

**Phases:** Vertical V11, Vertical V13

**Leaves (implementation order):**

- V11d — Explicit `by <field>` form — (modified) — *Adds* says "Resolves to loom-side identifier"; *Tests* says "loom-side name accepted". Align both on `loom-side name`.
- V13b — Inbound wire-name translation — (modified) — *Adds* and *Ships when* both reference "loom-side identifiers"; align on `loom-side names`.
- V13c — Outbound wire-name translation — (modified) — Uses "loom-side value"; safe as-is, but the surrounding *Adds* should not reintroduce "identifier" when reworded.
- V13d — Discriminator detection on wire names — (modified) — Already uses "loom-side name"; keep, and ensure consistent with the renamed V11d/V13b text.

## Consequence

**Severity:** advisory

A reader of the diagnostic registry will encounter two terms (`loom-side name`, `loom-side identifier`) within adjacent rows for the same concept and reasonably ask whether the registry is distinguishing them. The diagnostic *message template* itself shipping with the inconsistent term means the runtime will emit text that contradicts its own glossary, which is awkward but not behavior-altering. Implementers writing the value-model walk and the AJV translation map will not produce divergent code, but tests asserting message strings (V18s diagnostic-code gate; V13a redundant-rename test) will lock in whichever phrasing is current at implementation time, making post-hoc renames a multi-leaf edit.

## Solution Space

**Shape:** single

### Recommendation

Standardize on the glossary canonical **`loom-side name`** (plural `loom-side names`) wherever the concept refers to the schema-field-declaration name paired with a wire name. Apply to:

1. `runtime-value-model.md` lines 12, 22, 28 — replace `loom-side identifier(s)` with `loom-side name(s)`.
2. `query.md` line 164 — replace `loom-side identifiers` with `loom-side names`.
3. `diagnostics.md` line 255 — both columns: change `loom-side identifier` to `loom-side name` in the Description sentence; rewrite the Message template to `redundant 'as' clause: wire name '<name>' equals the loom-side name`.
4. `diagnostics.md` line 339 and `expressions.md` line 95 — change `loom-side field name` to `loom-side name` (the "field" qualifier is redundant given the glossary definition already scopes the term to schema fields).

Retain the existing phrasing in two places:

- `diagnostics.md` line 81 ("Named schemas, enums, and type aliases by their loom-side identifier") — here `identifier` denotes the *lexical* identifier shape per `lexical.md`, not the wire-name pairing. The trailing parenthetical ("the identifier shape is fixed by [Lexical — Identifiers]") is what disambiguates; leave as-is.
- `runtime-value-model.md` line 31 (`loom-side-named`) — hyphenated adjectival form derived from the canonical noun; consistent and may stay.

Update plan leaves V11d, V13b, V13c, V13d to use `loom-side name(s)` in their *Adds* / *Tests* / *Ships when* prose so that diagnostic-message-string tests (V13a redundant-rename, V18s diagnostic-code gate) pin the canonical form.

Edge case for the implementer: the `loom/parse/redundant-wire-name` Message template change is a wire-visible diagnostic surface. If any test fixture or golden-output file already exists, it must change in lock-step. Grep for the literal string `equals the loom-side identifier` before merging.

## Relationships

None

---

# T02 — Object-value echo rendering: single-field case undefined

**Original heading:** Object value echo rendering for single-field schemas unspecified
**Original section:** spec_topics/binder.md
**Kind:** testability
**Importance:** medium

## Finding

The `bind_echo` echo-policy format rule for object values reads: *"Object values shown as `{first-field-value, …}` — just the first field's value as a hint."* The two normative reference renderings supplied in the table beneath the rule both describe two-field objects (`Cat { name, color }` → `{Whiskers, …}`; `Pet::Cat { kind, name }` → `{cat, …}`). No example or explicit clause covers an object whose declared schema has exactly one field — the case where the `…` token would, on the elision reading, signal nothing elided.

Two readings of the rule survive equally well from the prose:

1. The literal-format reading: `{<first-field-value>, …}` is the fixed shape; the `, …` is part of the format and is rendered for every object value, single-field or not. Under this reading `Cat { name: "Whiskers" }` renders as `{Whiskers, …}`. The wording *"first field's value as a hint"* and the contrast with the array rule (which carries an explicit `…+N more` count and an empty-array form `[]`) both lean this way: object echo never enumerates the dropped fields, so there is nothing for the marker to count and no reason for it to disappear when the count happens to be zero.
2. The elision-marker reading: `…` is an indicator that fields were elided, by analogy with the array rule's count-bearing marker. Under this reading a single-field object renders as `{Whiskers}` and the marker disappears whenever the count of remaining fields is zero.

Both readings are defensible from the current text, neither is contradicted, and the V16i conformance leaf — which already enumerates one assertion per echo format rule — has no input to disambiguate.

## Spec Documents

- `spec_topics/binder.md` — Echo policy → Format rules and Reference renderings table (edited)

## Plan Impact

**Phases:** V16 — Slash-command argument binder (LLM path)

**Leaves (implementation order):**

- V16i — `bind_echo` formatter — (modified)

## Consequence

**Severity:** correctness

Two reasonable implementers will diverge on the single-field rendering (`{val}` vs `{val, …}`) because both can be argued from the current text. The `bind_echo` echo is a user-facing system note appended verbatim before every loom run, and the V16i test suite already asserts rule 4 against synthetic params/args pairs. Without a normative tiebreak the conformance suite cannot pin this case at all, and any author whose params block declares a single-field nested object will see the rendering shape decided by whichever interpretation the implementer happened to take.

## Solution Space

**Shape:** single

### Recommendation

Pin the literal-format reading: the `, …` token is part of the fixed object-value format and MUST be rendered regardless of how many fields the declaring schema (or discriminated-union variant) has.

Add to the Format-rules bullet for object values, after the existing "first field's value as a hint" sentence:

> The trailing `, …` is part of the format and MUST be rendered for every object value, including objects whose declaring schema (or discriminated-union variant) declares exactly one field; the marker is fixed text, not an elided-field indicator (contrast with the array rule's count-bearing `…+N more`).

Add a third row to the Reference renderings table immediately after the two existing object rows:

| Value | Rendering |
| --- | --- |
| `Cat { name: "Whiskers" }` (schema declares only `name`) | `{Whiskers, …}` |

Edge cases the V16i test author must cover:

- Single-field plain object (the new reference row).
- Single-variant discriminated union whose variant declares exactly one field — same rule applies; `…` is still emitted.
- Single-field variant whose only declared field is the discriminator — `…` still emitted.
- Empty-object value: not reachable through the schema subset (objects must declare at least one field per `schema-subset.md`); the rule need not address it, but the test should assert that the V16i formatter is never called with one and panics or short-circuits if it is.

## Relationships

- T03 "Parameters block: indentation and per-field token order are not normative" — same-cluster (sibling testability gap in the same binder rendering surface; resolved independently)
- T15 "Compact-transcript format for the session-context block is unspecified" — same-cluster (third testability gap in binder rendering; resolved independently)
- T04 "Placeholder rendering exemption is open-ended; affected registry rows are not enumerated" — same-cluster (testability gap in a different rendering surface; resolved independently)

