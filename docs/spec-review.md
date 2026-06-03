# Triaged Spec Review - spec

_Generated: 2026-06-02T08:55:00Z_
_Spec: docs/spec.md_
_Process: bottom-up - the last finding (T11) is addressed first; the first finding (T10) is addressed last._

_Triage tally: 2 high retained (T10-T11); 9 medium findings (T01-T09) removed by request._

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
