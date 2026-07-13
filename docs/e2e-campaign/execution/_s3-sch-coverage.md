# S3 — SCH area test-coverage map

Scope: REQ-SCH-1..42 (`docs/e2e-campaign/analysis/spec-requirements.md:513-551`).
Method: read describe/it text of the SCH-adjacent test corpus and cite concrete
`file :: describe/it` or `path:line`. No coverage is claimed without a location.

Primary corpus read:
`tests/schema-declarations.test.ts`, `tests/schema-lowering-hash.test.ts`,
`tests/schema-subset-gate.test.ts`, `tests/schema-validator-seam.test.ts`,
`tests/disc-unions-recursion.test.ts`, `tests/wire-name-translation.test.ts`,
`tests/type-grammar.test.ts`, `tests/type-compat.test.ts`,
`tests/static-type-inference.test.ts`, `tests/depth-enforcement.test.ts`,
`tests/tool-calls-depth-ceiling.test.ts`, `tests/whole-program-parser.test.ts`,
`tests/closing-gate.test.ts`.
Cross-referenced: `tests/production-typed-query-validation.test.ts`,
`tests/typed-query-schema-integration.test.ts`, `tests/query-schema-inference.test.ts`,
`tests/query-schema-resolve.test.ts`, `tests/query-followup-render.test.ts`,
`tests/tool-registration-lifetime.test.ts`, `tests/invoke-ceiling-depth.test.ts`,
`tests/binder-inference-provider-mapping.test.ts`.

## Coverage table

| Campaign REQ | Spec tag | Testability | Covering test file :: describe/it (or path:line) | Status | Note |
|---|---|---|---|---|---|
| REQ-SCH-1 | — | offline-unit | `production-typed-query-validation.test.ts:242` :: "the lowered Triage schema is the declared shape…" (required + additionalProperties:false emitted); `type-grammar.test.ts:153` :: "loom/parse/missing-object-field: a constructor literal omitting a declared field fires" (every field required); `whole-program-parser.test.ts:264` :: "parses schema into a SchemaDecl node" | PARTIAL | Named-object decl + required + `additionalProperties:false` witnessed. The optional-field = `T\|null` / no `field?:T` / null-vs-absence conflation clause has no asserting test. |
| REQ-SCH-2 | — | offline-unit | `schema-declarations.test.ts:54` :: "loom/parse/empty-schema-body: `schema X { }` with no fields fires; a non-empty schema does not" | COVERED | Positive + negative pin. |
| REQ-SCH-3 | — | offline-unit | `schema-lowering-hash.test.ts:184` :: sidecar "captures a wire-name translation map (one entry per renamed field…)"; `wire-name-translation.test.ts:42` :: "inbound translation rebuilds loom-side names so loom code never sees wire names"; `:163` :: "outbound translation produces wire-named JSON from a loom-side value" | COVERED | Wire name attaches; loom-side name used in code; translated at boundary (in/out). |
| REQ-SCH-4 | — | offline-unit | `schema-declarations.test.ts:75`,`:95` :: "loom/parse/wire-name-collision…"; `:114` :: "loom/parse/redundant-wire-name (W): a rename whose wire name equals the loom name fires; a genuine rename does not" | COVERED | Both collision forms + redundant-rename warning. |
| REQ-SCH-5 | — | offline-unit | `disc-unions-recursion.test.ts:201` :: "loom/parse/by-on-object-schema: a `by` clause on an object body fires; the union form does not" (admits `by` on union) | PARTIAL | `by` on the union form admitted. The specific claims "discriminator detection runs on the WIRE name" and "explicit `by <field>` accepts the loom-side name and lowering resolves it to each variant's wire name" have no asserting test. |
| REQ-SCH-6 | — | offline-unit | `type-compat.test.ts:343` :: "TYPE-11: `\"low\" ⊑ Severity` for `schema Severity = …`"; `:353` :: "…`StringOrNumber ⊑ string \| number`…"; `:362` :: alias of object schema; `disc-unions-recursion.test.ts:221` (alias-kind nodes) | COVERED | `schema X = …` alias composing literal/primitive unions + refs, incl. alias→object. |
| REQ-SCH-7 | — | offline-unit | — | UNCOVERED | No test for PascalCase variant names, default value = variant-name string (`Low`→`"Low"`), or the `Low = "low"` explicit override. Error paths are REQ-SCH-8 only. |
| REQ-SCH-8 | — | offline-unit | `schema-declarations.test.ts:142` empty-enum-body; `:163` inline-enum; `:177` non-string-enum-value; `:204` duplicate-enum-variant-name (name-before-value ordering); `:230` duplicate-enum-value | COVERED | All five enum constraints + name-before-value ordering. |
| REQ-SCH-9 | — | offline-unit | `schema-declarations.test.ts:254` :: "loom/parse/unknown-variant: a reference to an undeclared variant fires; a declared one does not"; `wire-name-translation.test.ts:59` :: "reattaches the declaring-enum tag… compares equal to a locally constructed variant" | PARTIAL | Unknown-variant + enum-value branding witnessed. "Evaluates to the underlying string value but is statically typed `Enum`" not directly asserted as an evaluation+typing pair. |
| REQ-SCH-10 | — | offline-unit | `disc-unions-recursion.test.ts:120` missing-discriminator ("no shared single-literal field"); `:82` ambiguous-discriminator (uniqueness); `:54` non-string-discriminator (single string-literal) | COVERED | Present-in-every-variant / single-string-literal / unique-across-variants all witnessed across the three arms. |
| REQ-SCH-11 | — | offline-unit | `disc-unions-recursion.test.ts:54` :: "loom/parse/non-string-discriminator: an otherwise-qualifying field with a numeric literal fires with the offending kind" | PARTIAL | Numeric-literal rejection witnessed. "for both implicit detection AND the explicit `by <field>` form" and the wire-renamed-discriminator-keeps-string-constraint facets have no asserting test. |
| REQ-SCH-12 | — | offline-unit | `disc-unions-recursion.test.ts:82` ambiguous-discriminator (multiple qualifying); `:120` missing-discriminator (none qualifying) | COVERED | Both branches. |
| REQ-SCH-13 | — | offline-unit | `disc-unions-recursion.test.ts:201` :: "loom/parse/by-on-object-schema: a `by` clause on an object body fires; the union form does not" | COVERED | `by` illegal on object body; legal on `=` union form (both arms). |
| REQ-SCH-14 | — | offline-unit | `disc-unions-recursion.test.ts:145` duplicate-discriminator-value; `:174` nested-discriminator | COVERED | Both codes. |
| REQ-SCH-15 | — | offline-unit | `schema-lowering-hash.test.ts:167` :: "SUBS-1: a union with any non-primitive arm lowers to { anyOf: […] }" (`string \| Author`); `:138` all-primitive → `{type:[…]}` | COVERED | Mixed unions lower as `anyOf`; all-primitive as multi-type-array. |
| REQ-SCH-16 | — | offline-unit | `schema-lowering-hash.test.ts:167` (`$ref:"#/$defs/Author"` in the anyOf output); `query-schema-inference.test.ts:250` :: "unreachable $defs are pruned even when the reachable set is recursive (`Tree`→`Tree`)" | PARTIAL | `$ref` inside anyOf and recursion-terminates witnessed, but the `$ref` is a passed-in fragment and the pruning graph is abstract. No test that a NAMED-schema reference itself EMITS `{$ref:#/$defs/<Name>}`, nor that self/mutual recursion lowers transparently from source. |
| REQ-SCH-17 | — | offline-unit | `disc-unions-recursion.test.ts:221` (a cycle through an object-schema hop is accepted → recursive schema legal); `depth-enforcement.test.ts:92` :: "a depth-5 value passes… depth-6 trips" (runtime data cap) | PARTIAL | The two halves (recursive schema legal; data bounded by the runtime cap) are witnessed separately; no single test states the ceiling applies to runtime data depth and NOT the schema graph. |
| REQ-SCH-18 | — | offline-unit | `disc-unions-recursion.test.ts:221` :: "loom/parse/type-alias-cycle: a pure-alias cycle fires with the path (`X → Y → X`); a cycle through an object hop is accepted" | COVERED | Pure-alias cycle fires with printed path; object-hop cycle legal. "Runs after name resolution, before lowering" ordering not asserted. |
| REQ-SCH-19 | — | offline-unit | — | UNCOVERED | `schema-subset-gate.test.ts` allowlists the `type` KEYWORD but no test enumerates the emitted/enforced subset TYPES as exactly `string,number,integer,boolean,object,array,null`. |
| REQ-SCH-20 | — | offline-unit | `schema-subset-gate.test.ts:116` :: rejected-keyword loop (`oneOf,allOf,not,if,then,else` in `REJECTED_KEYWORDS`) → `loom/parse/unsupported-feature`; `:134` accepts `anyOf` | COVERED | `anyOf`-only; the four/five composition forms rejected at parse time. Draft-2020-12 declaration itself not asserted. |
| REQ-SCH-21 | — | offline-unit | `schema-subset-gate.test.ts:116` (full unsupported set incl. `pattern,format,min/maxLength,numeric bounds,multipleOf,item/count kws,patternProperties,propertyNames,unevaluated*,dependent*,nullable`); `:171` reject-by-default for non-enumerated out-of-subset keywords | COVERED | Allowlist reject gate, not a denylist. |
| REQ-SCH-22 | — | offline-unit | `schema-lowering-hash.test.ts:147` :: "`string \| null` … lowers to { type: [\"string\",\"null\"] } with null counted as a primitive, null last"; `schema-subset-gate.test.ts:116` rejects `nullable` | COVERED | Union-with-null lowering + `nullable:true` never emitted (keyword rejected). |
| REQ-SCH-23 | — | offline-unit | `depth-enforcement.test.ts:92` depth-5 pass/depth-6 trip; `:103` scalar & empty = depth 1; `:115` non-empty = 1+max(child); `:126` anyOf arms are not levels | COVERED | Counting algorithm + cap ≤5 + the anyOf-not-a-level rule. |
| REQ-SCH-24 | — | conformance | `depth-enforcement.test.ts:65` (the three loom-code Err rows), `:78` (the two non-Err rows); `tool-calls-depth-ceiling.test.ts:81` :: "the depth walk runs before AJV…"; `:135` (model-driven before tool body); `invoke-ceiling-depth.test.ts:44`,`:105` (invoke params/return before AJV) | COVERED | Walk-before-AJV witnessed at all five enforcement-site carriers across four files. |
| REQ-SCH-25 | — | offline-unit | `depth-enforcement.test.ts:42` :: "a depth-6 materialised value fires schema_keyword `maxDepth`, the canonical message, and cause `schema_validation`" | COVERED | `maxDepth` + "JSON document depth exceeds 5" + `cause:schema_validation`. |
| REQ-SCH-26 | — | conformance | `depth-enforcement.test.ts:65` (#1 ValidationError / #3 CodeToolError / #4 InvokeInfraError rows), `:78` (#2 model feedback, slash-load cross-route); `tool-calls-depth-ceiling.test.ts:40` (#3 CodeToolError validation), `:107` (#2 fed back, no Err); `invoke-ceiling-depth.test.ts:44` (#4 InvokeInfraError validation), `:105` (#5 InvokeInfraError return_validation); `production-typed-query-validation.test.ts:224` (retry/respond-repair at #1) | COVERED | All five boundary routes + retry-only-at-#1 witnessed across the four carriers. |
| REQ-SCH-27 | — | offline-unit | — | UNCOVERED | No test for: walk runs on the post-decode JSON value; a JSON-parse failure is a parse-validation (not depth) failure; primitive/`array<T>`-over-primitive `params` are structurally bounded at depth 2 with the walk a no-op but still installed. |
| REQ-SCH-28 | SUBS-1 | offline-unit | `schema-lowering-hash.test.ts:138` (`string\|number`→`{type:[…]}`), `:147` (`string\|null`→`{type:["string","null"]}`), `:167` (`string\|Author`→`{anyOf:[…]}`) | COVERED | All three normative SUBS-1 vectors. |
| REQ-SCH-29 | — | offline-unit | `query-schema-inference.test.ts:234` :: per-query `$defs` populated (A→B graph); `query-schema-resolve.test.ts:416` :: "keeps only the $defs reachable from the response-schema root" | PARTIAL | `$defs` population witnessed via the pruning graph (abstract refs). No test that EACH top-level named schema becomes one `$defs/<Name>`, and the transitively-`.warp`-imported facet is unwitnessed. |
| REQ-SCH-30 | — | offline-unit | `schema-lowering-hash.test.ts:239` schema-slug-collision (non-byte-identical); `:264` byte-identical dedup silently to one entry; `:284` distinct slugs kept while byte-identical pair dedups | COVERED | `__inline_<slug>` hoist + byte-identical-only merge + collision diagnostic. |
| REQ-SCH-31 | — | offline-unit | `production-typed-query-validation.test.ts:242` (object→properties/required/`additionalProperties:false`; literal-union→`enum`; boolean→`{type:"boolean"}`); `schema-lowering-hash.test.ts:167` ref-arm/primitive-arm forms | PARTIAL | Object, primitive, and enum/string-literal-union emission witnessed. The `array<T>`→`{type:"array",items:…}` and single-literal→`{const:<v>}` per-form emissions have no direct asserting test. |
| REQ-SCH-32 | — | offline-unit | — | UNCOVERED | No test that a discriminated OBJECT union lowers to `{anyOf:[…]}` with NO `discriminator` keyword and per-variant `const`-typed discriminator field. (`binder-bypass-envelope.test.ts` BNDR-1 witnesses an anyOf discriminated-on-`kind` envelope, but that is the binder envelope, not user-schema lowering.) |
| REQ-SCH-33 | — | offline-unit | `schema-subset-gate.test.ts:193` bare `Result<T,E>` rejected; `:207` `Result` inside `array<T>` element rejected (array order preserved); `type-grammar.test.ts:107` result-in-schema-position | COVERED | `loom/parse/result-in-schema-position` before lowering. |
| REQ-SCH-34 | — | offline-unit | `schema-subset-gate.test.ts:239` :: "checkSubsetKeywords returns one diagnostic per rejected keyword in input (array element) order"; `schema-lowering-hash.test.ts:138` source order, `:157` :: "`\"null\"` is emitted last whenever the union admits it, regardless of source position" | COVERED | Source-declaration order preserved; `"null"` last. |
| REQ-SCH-35 | — | conformance | `query-schema-inference.test.ts:234` (only transitively-reachable `$defs` copied), `:250` (recursive reachable set, orphan pruned); `query-schema-resolve.test.ts:416` | COVERED | Lazy per-query doc, root + reachable `$defs`, unused pruned. |
| REQ-SCH-36 | — | offline-unit | `schema-lowering-hash.test.ts:184` (wire-name map, un-renamed absent); `:207` (named-enum position keyed by JSON Pointer iff source is a named `enum`; anonymous string-literal-union absent) | COVERED | Both sidecar maps. |
| REQ-SCH-37 | — | offline-unit | — | UNCOVERED | No test for lowering step 6: post-lowering discriminator detection as a parse-time sanity check on the lowered `anyOf`, no extra discriminator marker, lowering pure / once-per-file-load. |
| REQ-SCH-38 | SUBS-2 | manual/inspection | `closing-gate.test.ts:90` :: "extractReqIds subtracts the per-ID terminology carve-out (FRNT-2/FRNT-3/SUBS-2)…" | MANUAL | Terminology REQ (source-of-truth for a future grep gate); explicitly excluded from the executable set by design. Not offline/conformance-testable. |
| REQ-SCH-39 | — | offline-unit | `schema-lowering-hash.test.ts:51` (canonical form: keys sorted by code point, no whitespace), `:95` (numeric const/enum binder-number-rendered: `1e21`→full base-10, `42.0`→`42`), `:114` (slug = first 16 hex of SHA-256 over canonical bytes, lowercase) | COVERED | Canonical form + digest + 16-hex slug. |
| REQ-SCH-40 | — | offline-unit | `__inline_<slug>` `schema-lowering-hash.test.ts:239`; `__loom_respond_<slug>` `tool-registration-lifetime.test.ts:307`; `__loom_callee_<slug>__<name>` `tool-registration-lifetime.test.ts:278`; `__loom_bind_<slug>` `binder-inference-provider-mapping.test.ts` :: `tool?.name === ln("triage")` | COVERED | All four synthesised-name forms witnessed (distributed across files); the "exactly four / authoritative list" closure is not a single assertion. |
| REQ-SCH-41 | — | conformance | `schema-lowering-hash.test.ts:239` (`loom/load/schema-slug-collision`); `schema-validator-seam.test.ts:192` (`loom/runtime/validator-cache-collision`, recompiles); `tool-registration-lifetime.test.ts:278` (`loom/runtime/registration-cache-collision`, counter-suffixed) | COVERED | Byte-equality-verify + disambiguation at all three slug-keyed sites. |
| REQ-SCH-42 | — | offline-unit | `schema-lowering-hash.test.ts:51` :: "canonical form sorts object keys by code point… Key sorting is independent of emitted entry order: both forms hash alike" | COVERED | Hash sorts keys for reproducibility; emitted order independent. |

## UNCOVERED offline/conformance REQs worth new tests

- **REQ-SCH-7** (offline-unit) — enum variant-name PascalCase + default value = variant-name string (`Low`→`"Low"`) + explicit `Low = "low"` override. No positive-value/typing test exists; only the error paths (REQ-SCH-8) are covered. New unit against the enum lowering/value seam.
- **REQ-SCH-19** (offline-unit) — the emitted/enforced subset types are exactly `{string,number,integer,boolean,object,array,null}`. `schema-subset-gate.test.ts` only allowlists the `type` keyword, not its value set. New unit enumerating accepted vs rejected `type` values.
- **REQ-SCH-27** (offline-unit) — walk on the post-decode value; JSON-parse failure ≠ depth failure; primitive / `array<T>`-over-primitive `params` structurally bounded at depth 2 with a no-op-but-installed walk. New unit against `depth-walk`/`params` install.
- **REQ-SCH-32** (offline-unit) — discriminated OBJECT union lowers to `{anyOf:[…]}` with NO `discriminator` keyword and per-variant `const`-typed discriminator. New unit on the discriminated-union lowering output.
- **REQ-SCH-37** (offline-unit) — lowering step 6: discriminator detection re-run on the lowered `anyOf` as a parse-time sanity check, no extra marker, pure/once-per-file. New unit on the lowering pass idempotence + no-marker output.

Partial rows worth incremental coverage (facet gaps, not full gaps): REQ-SCH-1
(optional `T\|null` conflation), REQ-SCH-5 (wire-name discriminator detection +
`by` loom→wire resolution), REQ-SCH-11 (`by`-form + wire-renamed discriminator),
REQ-SCH-16 (named-ref `$ref` emission + transparent self/mutual recursion),
REQ-SCH-29 (per-`$defs`-entry-per-named-schema + `.warp` import),
REQ-SCH-31 (`array<T>`→`items` and literal→`const` emission).

## manual/inspection-only REQs

- **REQ-SCH-38 (SUBS-2)** — `docs/e2e-campaign/analysis/spec-requirements.md:546`
  (`schema-subset.md:96`). Terminology obligation: use `schema slug` / bare
  `slug` for the 16-hex hash output; the synonyms `schema hash`, `schema-hash`,
  `sha12`, `lowered-schema hash`, `lowered-schema content hash` are drift.
  Source of truth for a future grep gate; explicitly carved out of the
  executable REQ-ID set at `closing-gate.test.ts:90`. Not offline/conformance
  testable — inspection/grep only.
