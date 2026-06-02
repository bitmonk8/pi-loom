# Triaged Spec Review - spec

_Generated: 2026-06-02T08:55:00Z_
_Spec: docs/spec.md_
_Process: bottom-up - the last finding (T16) is addressed first; the first finding (T10) is addressed last._

_Triage tally: 7 high retained (T10-T16); 9 medium findings (T01-T09) removed by request._

---

# T10 - CLAUDE.md Exception Handling rule is written in C++ syntax

**Kind:** doc-alignment-broad
**Importance:** high
**Score:** 100
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

`CLAUDE.md`'s Code Style → Exception Handling bullet forbids `catch(...)` and `catch(std::exception&)` — both C++ syntax, neither legal TypeScript — even though pi-loom mandates a TypeScript runtime and `docs/plan_topics/conventions.md` already carries the authoritative TypeScript form of the same rule (the `Specific exception types only` bullet). CLAUDE.md is the top-of-context onboarding instruction loaded by every AI coding agent operating in the repo. An agent reading the rule literally either emits C++ syntax the TypeScript compiler rejects, or infers its own translation that may diverge from conventions.md's enumerated forbidden set and the `no-broad-catch` enforcer.

## Solution approach

Rewrite the CLAUDE.md Code Style → Exception Handling bullet to use TypeScript syntax mirroring conventions.md's `Specific exception types only` rule: forbid `catch (e)`, `catch (e: unknown)`, `catch (e: any)`, and `catch (e: Error)` plus the rethrow-on-mismatch pattern, directing the reader to bind to a specific subtype or let the exception propagate. Retain a forward-reference to `docs/plan_topics/conventions.md`.

## Solution constraints

- CLAUDE.md MUST keep a forward-reference to `docs/plan_topics/conventions.md` as the single source of truth and MUST NOT duplicate the `no-broad-catch` ESLint rule name or the coverage-matrix gate inline.

## Relationships

None

# T11 - Surface extensions → Automatic context escalation — embedded open decision

**Kind:** cruft, placement, scope
**Importance:** high
**Score:** 100
**Must-fix:** false
**Decision axes:** 3
**Shape:** single
**State:** reduced

## Problem

The *Automatic context escalation* bullet under `future-considerations.md`'s *Surface extensions (V1 leaves a seam)* sub-bucket carries a `*Decision required before this item can be scoped:*` marker (operator-only vs. user-visible turn). That sub-bucket is a committed-deferral inventory: per its intro and GOV-12, every bullet pins a settled loom 1.0 seam, and the sub-bucket is the source set for the "13 typed/structural seams" tally on `spec.md` Scope's *Forward-compatibility seams* bullet. An item gated on an undecided question is uncommitted, so its carrier-seam set is open — the currently-pinned `binder.md` *automatic context escalation* re-entrancy seam suffices only for the operator-only future, while a user-visible-turn future also composes with the binder refinement-loop carriers. The GOV-12 integer-count machinery still parses cleanly while one source item is structurally incomplete, and reviewers have no convention signalling that the marker downgrades the bullet's commitment status.

## Solution approach

Move the *Automatic context escalation* bullet out of the committed-seam *Surface extensions (V1 leaves a seam)* inventory into a sibling open-design sub-bucket whose intro states its items carry no forward-compatibility seam commitment and are excluded from the GOV-12 tally, mirroring the existing `id="surface-extensions-no-dedicated-seam"` carve-out. Reconcile the `binder.md` *loom 1.0 seam — automatic context escalation* blockquote and its cross-link to the bullet's new location, or retire it per GOV-7 if it served only this item.

## Solution constraints

- The `spec.md` Scope *Forward-compatibility seams* tally and the GOV-12 single-source-page / integer-count enumerations MUST stay consistent in the same commit as the move.

## Relationships

None
# T12 - Non-narrative pages with zero coined REQ-IDs make most spec obligations non-referenceable

**Kind:** traceability
**Importance:** high
**Score:** 100
**Must-fix:** false
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

The GOV-1 *REQ-ID prefix table* in `governance.md` registers a REQ-ID prefix for 28 non-narrative `spec_topics/*.md` pages, but only five prefixes (`ERR`, `BNDR`, `PIC`, `CIO`, and a single inline `**GOV-3.**`) are actually coined onto rules. The other 23 pages — including `lexical.md` (LEX), `grammar.md` (GRAM), `query.md` (QRY), `diagnostics.md` (DIAG), and the rest of the loom language definition — carry zero `**PREFIX-N.**` anchor sites despite hosting substantial MUST/SHALL/SHOULD obligations. Because no anchor exists on those pages, GOV-9's `#prefix-n` cross-link contract is unsatisfiable for them and any cross-reference degrades to a section slug that re-slugs on heading renames. GOV-1's *Per-page progressive normalisation* clause cannot drain the defect either: its trigger fires only when a commit touches an existing REQ-ID anchor token, and these pages have none.

## Solution approach

Add a `PREFIX-N` REQ-ID anchor at each defining obligation site across the 23 anchorless pages, using the dual-form layout GOV-1 already mandates and the prefixes already registered in the *REQ-ID prefix table*. Repoint in-corpus cross-references (including those in `spec.md`) to the new `#prefix-n` fragments per GOV-9. Optionally add a release-process obligation on or alongside GOV-15 requiring every non-narrative page in the prefix table to carry at least one `PREFIX-N` anchor before `loom 1.0.0` ships, as a deadline safety net.

## Solution constraints

- On `hard-ceilings.md` the anchorless prefix is `CEIL`; coining must not collide with or reuse the existing `CIO-1`..`CIO-6` sites.

## Relationships

None

# T13 - `loom/runtime/reload-teardown-timeout` — `hint` wire format unspecified

**Kind:** testability
**Importance:** high
**Score:** 100
**Must-fix:** false
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

The `loom/runtime/reload-teardown-timeout` registry row in `diagnostics.md` states only that `hint` carries the elapsed wall time, but does not specify the string form. Because `hint` is a top-level `string` field on the `Diagnostic` shape (per the *Internal diagnostic shape* block), a bare decimal (`"2003"`), a unit-suffixed form (`"2003ms"`), and a sentence form are all compatible with the prose, and the §4 *Numeric placeholders* rule reaches only `<…>` Message placeholders, not top-level `Diagnostic` fields. This is the only `hint`-carrying row whose source value is a number and the only one without an explicit serialisation, so both `details.diagnostics[i].hint` and the rendered `loom-system-note` line `  hint: <hint>` diverge across conformant implementations. The accompanying two-invocation timeout test vector asserts only `message`, leaving `hint` unconstrained.

## Solution approach

Rewrite the `loom/runtime/reload-teardown-timeout` row in `diagnostics.md` to pin `hint` to the decimal-integer rendering of the elapsed wall time (`Clock.now() - start`) with no unit suffix, consistent with the §4 *Numeric placeholders* rule (a 2003 ms elapsed time renders as `"2003"`). Extend the existing two-invocation timeout test vector in the *Test vectors* subsection to assert `hint` alongside the `message` it already pins.

## Solution constraints

- None.

## Relationships

- T16 "`loom/load/host-incompatible` — `<required>` placeholder rendering is undefined" - same-cluster (both concern category-4 numeric-rule scope and registry-row testability; resolve independently).
- T15 "`host-incompatible` kind `\"abortsignal-shape\"` — observed/required undefined for the `\"in\"` checks" - same-cluster (registry-row payload-field underspecification; independent fix).
- T14 "`host-incompatible` kind `\"sdk-capability-missing\"` — no failing-member discriminator" - same-cluster (registry-row `details` underspecification; independent fix).
# T14 - `host-incompatible` kind `"sdk-capability-missing"` carries no discriminator identifying which of the ten probed members failed

**Kind:** testability
**Importance:** high
**Score:** 100
**Must-fix:** false
**Decision axes:** 4
**Shape:** single
**State:** reduced

## Problem

Step 0 (c) of the capability probe (`pi-integration-contract.md` `#entry-capability-probe`, the **(c) Factory-probable SDK capabilities** paragraph) probes ten named SDK function members and routes any failure to `loom/load/host-incompatible` with `details.kind = "sdk-capability-missing"`, but the spec never pins what `details.observed` / `details.required` hold for this kind and adds no sibling field naming the failing member — unlike the `"peer-dep-*"` kinds, which carry `details.package`. The iteration order within step (c) is listed in prose but is not declared a normative short-circuit sequence, so a conformance test that removes exactly one of the ten members cannot deterministically predict which payload the runtime emits. The `diagnostics.md` `loom/load/host-incompatible` registry row compounds the gap by stating `"sdk-capability-missing"` covers one of **seven** factory-probable members, while Step 0 (c) lists **ten**. No test vector in `diagnostics.md`'s Message-template determinism block covers this kind.

## Solution approach

Add a sibling discriminator field to the `"sdk-capability-missing"` failure payload naming the failing member, mirroring the `details.package` precedent the peer-dep kinds establish, and add a per-kind contract pinning its `details.observed` / `details.required` values. Pin step (c)'s ten-member iteration as a normative first-failure short-circuit sequence in `pi-integration-contract.md` `#entry-capability-probe`. Reconcile the `diagnostics.md` `loom/load/host-incompatible` registry row's member count to ten. Add a `"sdk-capability-missing"` test vector to `diagnostics.md`'s Message-template determinism block.

## Solution constraints

- Out of scope: the `diagnostics.md` §8 category-4 `<observed>` / `<required>` placeholder reclassification and the per-kind closed-value table — owned by T16.
- `diagnostics.md` MUST cite the Step 0 (c) pinned-constants anchor for the ten capability paths rather than restating the literal list (single-source-of-truth pattern).

## Relationships

- T16 "`loom/load/host-incompatible` — `<required>` placeholder rendering is undefined" - decision-overlap (both design the per-kind `details.{observed,required}` contract on the host-incompatible row; the per-kind closed-value table is the natural home for this row — pick a consistent per-kind table).
- T15 "`host-incompatible` kind `\"abortsignal-shape\"` — observed/required undefined for the `\"in\"` checks" - decision-overlap (parallel `details.<discriminator>` sibling-field design — `details.capability` here mirrors `details.member` there; keep consistent naming across the two host-incompatible kinds).
# T15 - `host-incompatible` kind `"abortsignal-shape"` — `details.observed` / `details.required` undefined for the two `"in"`-based prototype-property checks

**Kind:** testability
**Importance:** high
**Score:** 100
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

Step 0 (b) of the capability probe (`#entry-capability-probe`) checks the two `prototype-property` members `aborted` and `reason` with `"<name>" in AbortSignal.prototype`, not `typeof === "function"`, because their getters throw when read off the prototype. The `loom/load/host-incompatible` registry row, the message template `host incompatible (<kind>): observed <observed>, required <required>`, and the `"abortsignal-shape"` carve-out only define `details.observed` / `details.required` for the `typeof`-based members (by analogy with `"typebox-shape"`). Neither Step 0 (b) nor the registry row defines what the runtime writes for an `aborted` or `reason` failure, whose check input is the `in`-operator boolean, not a `typeof` string, and no test vector covers either path. Two conformant implementations therefore diverge on the wire payload and the rendered message bytes for the same host defect.

## Solution approach

In `docs/spec_topics/pi-integration-contract.md` Step 0 (b) (`#entry-capability-probe`), pin `details.observed` and `details.required` for the two `prototype-property` members (`aborted`, `reason`) to literal strings naming the absent-property condition, distinct from the `in`-operator boolean. Mirror the same observed/required contract in the `"abortsignal-shape"` carve-out of the `loom/load/host-incompatible` row in `docs/spec_topics/diagnostics.md`. Add a test vector covering a `prototype-property` failure to the **Test vectors.** block following the `loom/load/*` registry.

## Solution constraints

- Out of scope: the §8 Category-4 `<observed>` / `<required>` placeholder reclassification — owned by T16.

## Relationships

- T16 "`loom/load/host-incompatible` — `<required>` placeholder rendering is undefined" - co-resolve (the §8 category-4 reclassification this finding's `"absent"`/`"present"` literals require is owned by that finding, and its per-kind table is the natural site for this `"in"`-check pin; their edits land in the same diagnostics.md sweep).
- T14 "`host-incompatible` kind `\"sdk-capability-missing\"` — no failing-member discriminator" - decision-overlap (parallel `details.<discriminator>` sibling-field design — `details.member` here mirrors `details.capability` there; consistent naming across the two host-incompatible kinds is desirable).
- T13 "`loom/runtime/reload-teardown-timeout` — `hint` wire format unspecified" - same-cluster (registry-row payload underspecification; independent fix).
# T16 - `loom/load/host-incompatible` — `<required>` placeholder rendering is undefined

**Kind:** testability
**Importance:** high
**Score:** 100
**Must-fix:** false
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

The `loom/load/host-incompatible` registry message renders `<observed>` and `<required>`, but `<required>` is listed under diagnostics.md's `### 4. Numeric placeholders`, whose shortest-decimal rule directly contradicts what this row actually renders for `<required>` — a SemVer range, a tilde pin, or the literal `"function"` — as the single normative test vector (`, required >=22.19.0`) confirms. The companion gap is that per-`kind` `<observed>`/`<required>` values are pinned for only some of the seven `kind` discriminators; for `abortsignal-shape`, `sdk-capability-missing`, and `probe-failed` no enumeration exists, so a conformance-test author cannot determine the expected substring. Category 4 mis-claims ownership of `<required>` for this row and nothing fills the gap it leaves, so the message is unconstrained.

## Solution approach

Narrow the `### 4. Numeric placeholders` rule in diagnostics.md so `<required>`/`<provided>` are numeric only at the arity-diagnostic emitting sites, and require non-numeric usages to be enumerated at their emitting registry row. Add a per-`kind` `<observed>`/`<required>` enumeration to the `loom/load/host-incompatible` registry row covering all seven `kind` discriminators, sourcing values from the Step 0 capability-probe prose in pi-integration-contract.md (`#entry-capability-probe`, `#pi-sdk-pin`). Add normative test vectors for the `kind` discriminators not currently covered.

## Solution constraints

- Out of scope: the `sdk-capability-missing` failing-member discriminator (owned by T14); pin only `<observed>`/`<required>` for that kind.

## Relationships

- T15 "`host-incompatible` kind `\"abortsignal-shape\"` — observed/required undefined for the `\"in\"` checks" - co-resolve (the per-kind table proposed here is the natural site for the `"in"`-checked observed/required pin that finding requests; edits land in the same diagnostics.md sweep).
- T14 "`host-incompatible` kind `\"sdk-capability-missing\"` — no failing-member discriminator" - decision-overlap (the per-kind table this finding adds is the surface that finding extends; keep the per-kind observed/required design consistent).
- T13 "`loom/runtime/reload-teardown-timeout` — `hint` wire format unspecified" - same-cluster (sibling category-4 testability gap on a different registry row; resolve independently).
