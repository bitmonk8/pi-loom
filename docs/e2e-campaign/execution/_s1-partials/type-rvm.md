# S1 coverage partial — TYPE + RVM

Areas: TYPE (type-system, the `⊑` relation) and RVM (runtime-value-model).
Source rows: `docs/e2e-campaign/analysis/spec-requirements.md:262-297`.
Deferred appendix consulted: Cluster 1 `docs/e2e-campaign/analysis/spec-requirements.md:1242-1258`
(the `⊑`-widening deferral at line 1254 confirms REQ-TYPE-13's *rejection* is in-scope;
the non-Node-host deferral at line 1256 pairs with REQ-RVM-12).
Tier legend: `docs/e2e-campaign/test-plan.md:30-45` — M1 offline-unit, M2 conformance
(production composition, no model), M4 inspection (code/doc file:line).
Every covering path:line below was verified by reading the cited test.

## AREA: TYPE (type-system)

| REQ id | Covering test path:line | UNCOVERED / notes |
|---|---|---|
| REQ-TYPE-1 | `tests/type-grammar.test.ts:60` (generic-arity: `array` arity 1), `tests/type-grammar.test.ts:71` (`Result` arity 2); form builders exercised in `tests/type-compat.test.ts:38-64` (prim/named/array/union/literal/object) | M1. PARTIAL. The `array<T>`-only rule — rejection of the `T[]`/`[T]` inline-array shorthand — has NO test (no `T[]` case in `tests/whole-program-parser.test.ts` or `tests/lexer-core.test.ts`). Anonymous inline-object form is only exercised as a compat builder, not parsed from source. |
| REQ-TYPE-2 | `tests/type-grammar.test.ts:88` (void in value position fires `loom/parse/void-in-non-return-position`; return position does not) | M1. Covered. "void does not participate in `⊑`" is implicit (never fed to `checkCompatible`); not a direct assertion. |
| REQ-TYPE-3 | `tests/type-compat.test.ts:74-315` — single `checkCompatible` relation + three per-site seams `checkLetRhsCompat`/`checkFnArgCompat`/`checkCommonType` (`:238`, `:267`, `:285`) | M1. PARTIAL. The relation seam and 3 of the enumerated sites are exercised; `invoke<T>` return annotation, `+` mixed-numeric, and `params:` default sites are NOT each asserted against the same relation here. |
| REQ-TYPE-4 | — | UNCOVERED. No test asserts the "`T₁ ⊑ T₂` ⇒ every `T₁` value AJV-validates against lowered `T₂`" property, nor "AJV necessary-but-not-sufficient / parser rejection authoritative". `tests/schema-subset-gate.test.ts` covers the lowering keyword allowlist, not this implication. |
| REQ-TYPE-5 | `tests/type-compat.test.ts:76` (reflexivity: identical primitive `:80`, identical named schema `:83`) | M1. Covered. |
| REQ-TYPE-6 | `tests/type-compat.test.ts:92` (`integer ⊑ number` holds `:93`; reverse `= "integer-narrowing"` `:94`; `loom/parse/integer-narrowing` fires `:100`) | M1. Covered. M2 production witness: `tests/type-layer-diagnostics-production.test.ts:165` (`number → integer` fires in production). |
| REQ-TYPE-7 | `tests/type-compat.test.ts:117` (`"validation"⊑string` `:118`; `42⊑integer`/`42⊑number`/`true⊑boolean`/`null⊑null` `:122`; unrelated-primitive fails `:128`) | M1. Covered. |
| REQ-TYPE-8 | `tests/type-compat.test.ts:135` (variant `A ⊑ U` `:141`; non-member `C` not `⊑ U` `:145`) | M1. Covered. |
| REQ-TYPE-9 | `tests/type-compat.test.ts:154` (`T ⊑ T\|U` `:156`; non-arm fails `:161`) | M1. Covered. |
| REQ-TYPE-10 | `tests/type-compat.test.ts:170` (`T₁\|T₂ ⊑ T₃` iff each arm `:172`; one bad arm fails `:181`) | M1. Covered. |
| REQ-TYPE-11 | `tests/type-compat.test.ts:197` (`array<T₁> ⊑ array<T₂>` iff `T₁⊑T₂` `:199`; incompatible element fails `:204`) | M1. Covered. |
| REQ-TYPE-12 | `tests/type-compat.test.ts:215` (same field set, order-irrelevant `:216`; field mismatch `:221`; extra field never widens — `additionalProperties:false` `:227`) | M1. Covered. |
| REQ-TYPE-13 | `tests/type-compat.test.ts:94` (`number ⊑ integer` rejected → integer-narrowing); `tests/type-compat.test.ts:227` (excess-property tolerance rejected) | M1. PARTIAL — in scope (Deferred appendix line 1254 defers only the *widening*, so the rejection is testable now). Function-parameter contravariance rejection and optional-field-widening rejection have NO test. |
| REQ-TYPE-14 | `tests/type-compat.test.ts:238` (`loom/parse/let-rhs-type-mismatch`), `:267` (`loom/parse/fn-arg-type-mismatch`), `:285` (`loom/parse/array-element-type-mismatch` vs sink), `:302` (`loom/parse/array-no-common-type`) | M1. Covered. M2 production witnesses: `tests/type-layer-diagnostics-production.test.ts:139` (array-no-common-type), `:151` (return-no-common-type). |
| REQ-TYPE-15 | `tests/type-compat.test.ts:318` (two distinct named schemas not `⊑` `:324`; named not `⊑` inline of same shape `:327`; inline not `⊑` named `:331`) | M1. PARTIAL. "two distinct schemas with byte-identical lowered fragments are incompatible" is exercised only via distinct-named `Cat`/`Dog`, not an explicit byte-identical-lowering pair. |
| REQ-TYPE-16 | `tests/type-compat.test.ts:338` (alias transparency: literal-union alias `:345`, primitive-union alias `:355`, object-schema alias unfolds to nominal `:362`); `tests/disc-unions-recursion.test.ts:220` (`loom/parse/type-alias-cycle` pure-alias cycle fires `:231`, object-hop cycle accepted `:242`) | M1. Covered. |
| REQ-TYPE-17 | — | UNCOVERED. No test asserts the parse-time `⊑` check is *skipped* when an operand is past the static view (inferred binding on a parse-invisible Pi-tool schema, or `invoke` against a `loom/load/callee-has-errors` callee) with runtime AJV as the net. |
| REQ-TYPE-18 | `tests/type-grammar.test.ts:88` (return position admits `void`, value position rejects) | M1. PARTIAL. Only the return-vs-value `void` distinction is pinned; "same grammar in every annotation position" (schema fields, `params:`, `let x:T`, fn params, `@<T>` query schemas) is not asserted per-position. |

## AREA: RVM (runtime-value-model)

| REQ id | Covering test path:line | UNCOVERED / notes |
|---|---|---|
| REQ-RVM-1 | `tests/wire-name-translation.test.ts:47` (object schema → plain object keyed by loom-side names), `:121` (nested-object recursion); array/object handling in `tests/runtime-value-model.test.ts:63-70` | M2/conformance. PARTIAL. The primitive rows of the JS-mapping table (`string`→string, `number`/`integer`→JS number *same value*, `boolean`→boolean, `null`→null) have NO dedicated assertion; only object-keying and array recursion are witnessed. |
| REQ-RVM-2 | `tests/runtime-value-model.test.ts:40` (`JSON.stringify` of enum → bare wire string `:43`; tag never in JSON `:44`) | M2. Covered (`makeEnumValue`). |
| REQ-RVM-3 | `tests/runtime-value-model.test.ts:48` (`isWireLowerable(Ok/Err) = false` `:49`, primitive lowerable `:52`); `tests/type-grammar.test.ts:107` + `tests/schema-subset-gate.test.ts:193` (`loom/parse/result-in-schema-position`); `tests/match-result.test.ts:73` (`?` operand), `:257` (constructor-pattern `match` binds Result inner) | M1+M2. Covered — tagged, observed via ctors/`match`/`?`, not lowerable, never crosses wire. |
| REQ-RVM-4 | `tests/runtime-value-model.test.ts:59` (structural deep equality `:61`; cross-type → `false`, no parse-fail/panic `:72`) | M2. Covered. `!=` → `true` inverse is implied, not directly asserted. |
| REQ-RVM-5 | `tests/runtime-value-model.test.ts:63` (arrays element-wise `:64`, objects key-set order-irrelevant `:65`), `:80` (`NaN==NaN` true), `:84` (`+0==-0` true) | M2. Covered. |
| REQ-RVM-6 | `tests/runtime-value-model.test.ts:91` (enum: same tag+wire equal `:94`, cross-enum matching wire → false `:98`, differing wire → false `:102`), `:107` (Result Ok/Err discriminator + payload recurse) | M2. Covered. |
| REQ-RVM-7 | `tests/runtime-value-model.test.ts:87` (`42 == 42.0` is `true`) | M2. Covered. |
| REQ-RVM-8 | `tests/wire-name-translation.test.ts:41` (inbound rebuild loom-side names after AJV), `:58` (inbound reattach declaring-enum tag), `:164` (outbound produces wire-named JSON) | M2. Covered. "nowhere else" supported by the defaults-bypass proof `:143`, not directly asserted. |
| REQ-RVM-9 | `tests/wire-name-translation.test.ts:76` (named-enum tagged vs anonymous string-literal-union untagged; `Severity.Low == "low"` false `:103`) | M2. Covered. |
| REQ-RVM-10 | `tests/wire-name-translation.test.ts:143` (frontmatter default arrives already branded + loom-side-named, bypasses inbound pass) | M2. Covered. |
| REQ-RVM-11 | `tests/wire-name-translation.test.ts:53` (inbound: wire key gone, loom code never sees wire), `:171` (outbound: loom key gone, external sees wire) | M2. PARTIAL. Both directions witnessed; the model/JSON-Schema-consumer facing side is inferred from outbound, not separately asserted. |
| REQ-RVM-12 | INSPECTION (M4). Spec: `docs/spec_topics/runtime-value-model.md:45` (non-checked-invariant Node engine assumptions), `:47` (Node-exclusive). Code: `src/extension/capability-probe.ts:67` (`NODE_FLOOR = ">=22.19.0"`), `:94` (reads `process.versions.node`), `:240` (refuses on unparseable SemVer) | M4 — testability is manual/inspection per spec row; mapped to code/spec file:line, NOT a vitest test. Deferred pair: appendix line 1256 (non-Node hosts out of scope). |
| REQ-RVM-13 | INSPECTION (M4). Spec: `docs/spec_topics/runtime-value-model.md:53` (no file/network/process primitive; effects via query/tool/invoke bounded by `tools:` allowlist). Code: `src/parser/callable-set.ts` (allowlist / callable-set construction); adjacent behavioural witness `tests/callable-set-runtime-enforcement.test.ts` | M4 — testability is manual/inspection per spec row; the "no primitive" is an absence claim evidenced by inspection (no file/network/process form in the expression/statement grammar). Mapped to file:line, NOT a vitest test. |

## Behaviourally-important UNCOVERED reqs warranting NEW tests

1. **REQ-TYPE-4** — the `⊑`-implies-AJV-validation soundness property and the "parser rejection is authoritative / AJV necessary-but-not-sufficient" relationship. No test at all; core to the type/runtime safety contract.
2. **REQ-TYPE-17** — parse-time `⊑` check *skipped* on unresolvable operands (parse-invisible Pi-tool schema; `invoke` against `loom/load/callee-has-errors` callee) with runtime AJV as the net. The skip path is untested and is the type-system's escape hatch.
3. **REQ-TYPE-13 (residual)** — rejection of **function-parameter contravariance** and **optional-field widening** (in scope per Deferred appendix line 1254). Only `number ⊑ integer` and excess-property rejection are covered.
4. **REQ-TYPE-1 (residual)** — rejection of the `T[]` / `[T]` inline-array shorthand (spec pins `array<T>` as the only array form).
5. **REQ-RVM-1 (residual)** — the primitive JS-mapping table: `number`/`integer` → JS number *at the same runtime value*, plus `string`/`boolean`/`null` mappings. Only object-keying and array recursion are witnessed.
6. **REQ-TYPE-15 (residual)** — two *distinct* named schemas with **byte-identical lowered fragments** are incompatible (nominal-identity-over-shape at the strongest case).
