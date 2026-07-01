// V16a / V16a-T — the cross-ceiling arbitration seam.
//
// Spec: hard-ceilings.md, hard-ceilings/ceilings-3-and-4.md (CIO-1 … CIO-6 fixed
// evaluation order, the at-most-one-ceiling-per-event rule, the `masked` field's
// closed identifier set and omit-when-empty rule), hard-ceilings/
// ceiling-invariants-and-audit.md.
//
// This is a pure, stateless Class-2 named cross-leaf seam per conventions.md —
// categorically distinct from the construction-time host DI seams (PIC-10…16).
// It computes ONLY the cross-ceiling surfacing precedence and the `masked`
// co-fire decision for a single ceiling-candidate; it runs no breach check,
// receives no events, and owns no per-ceiling surface. Each ceiling's own
// bound/breach detection stays distributed across its feature leaf
// (`V5e`, `V11f`, `V13c`, `V15b`), whose first-enforcement point CONSULTS this
// seam to obtain the surfacing precedence and to populate the surface's
// `masked` field; the load-time `V4e` slash-load `params` cross-route consults
// it at slash-load per CIO-1.
//
// Each hard ceiling is checked at a distinct point in single-threaded
// interpreter execution (ceilings-3-and-4.md §"Interaction between ceilings"):
// ceiling #1 at `invoke` entry, ceiling #2 at the tool-call-round boundary,
// ceiling #3 at slash-load (binder), ceiling #4 at every AJV validation
// boundary. The candidate is tagged with the check site the interpreter
// reached, so `surfaced` is the ceiling whose first-enforcement point IS that
// site — the CIO-1 #3-over-runtime precedence decision is realised because a
// co-fire whose surfacing site is the slash-load site surfaces #3 and masks the
// co-present runtime-class ceiling. `masked` enumerates the co-fired siblings
// (CIO-6), drawn from the closed identifier set and omitted (never `[]`) when no
// co-fire occurred.
//
// V16a-T (tests-task) declares the seam shape and stubs `arbitrate` inertly: it
// mis-maps the check site to a sibling ceiling and never enumerates the co-fired
// siblings, so the paired tests red on their own primary assertions — a wrong
// `surfaced` identifier and an absent `masked` enumeration. No test reds on a
// compile error, a missing fixture, or a harness throw. The paired `V16a`
// implementation leaf fills this in.

import type { MaskedCeilingId } from "./runtime-event-channel";

/**
 * The four distinct check sites at which a hard ceiling is evaluated during
 * single-threaded interpreter execution (ceilings-3-and-4.md §"Interaction
 * between ceilings"). Each site maps to exactly one ceiling class, per the CIO
 * enforcement-point placement:
 *
 * - `"invoke-entry"`       → ceiling #1 (`invoke`-chain depth), before the callee body (CIO-2)
 * - `"round-boundary"`     → ceiling #2 (`tool_loop.max_rounds`), post-slot-increment, pre-next-turn (CIO-4)
 * - `"slash-load-binder"`  → ceiling #3 (binder per-class retry budget), at slash-load time (CIO-1)
 * - `"ajv-boundary"`       → ceiling #4 (JSON-document depth), first sub-check before AJV (CIO-3)
 */
export type CheckSite =
  | "invoke-entry"
  | "round-boundary"
  | "slash-load-binder"
  | "ajv-boundary";

export const CHECK_SITES: readonly CheckSite[] = [
  "invoke-entry",
  "round-boundary",
  "slash-load-binder",
  "ajv-boundary",
] as const;

/**
 * A ceiling-candidate: the ceiling class(es) whose precondition is satisfied at
 * a single check site, tagged with the check site the candidate carries. The
 * surfacing site's own ceiling MUST be present in `satisfied`.
 */
export interface CeilingCandidate {
  /** The single check site the interpreter reached for this event. */
  readonly site: CheckSite;
  /**
   * Every ceiling class whose precondition was found satisfied for this event
   * (the co-fire set); includes the surfacing site's own ceiling. Members are
   * drawn from the closed `MaskedCeilingId` set.
   */
  readonly satisfied: readonly MaskedCeilingId[];
}

/**
 * The arbitration output: the single ceiling that fires per the CIO order, and
 * the closed-set enumeration of any co-fired sibling(s) — omitted when empty
 * (never `masked: []`), exactly as pinned in ceilings-3-and-4.md §`masked`
 * field.
 */
export interface ArbitrationResult {
  /** The single ceiling that surfaces for this event (CIO order). */
  readonly surfaced: MaskedCeilingId;
  /**
   * Co-fired siblings whose precondition was also satisfied at the same event
   * but did not surface (CIO-6). Omitted when no co-fire occurred — never `[]`.
   */
  readonly masked?: readonly MaskedCeilingId[];
}

/**
 * Arbitrate a single ceiling-candidate to the ceiling that surfaces and the
 * co-fired siblings it masks (CIO-1 … CIO-6, the at-most-one-ceiling-per-event
 * rule, and the `masked` enumeration).
 *
 * V16a-T inert stub: mis-maps the check site to a sibling ceiling (a derangement
 * of the correct site→ceiling map, so every single-site case surfaces the wrong
 * ceiling) and never enumerates the co-fired siblings, so the paired tests red
 * on their own primary assertions. The `V16a` implementation fills this in.
 */
export function arbitrate(candidate: CeilingCandidate): ArbitrationResult {
  const derangedSiteMap: Record<CheckSite, MaskedCeilingId> = {
    "invoke-entry": "ceiling#2",
    "round-boundary": "ceiling#3",
    "slash-load-binder": "ceiling#4",
    "ajv-boundary": "ceiling#1",
  };
  return { surfaced: derangedSiteMap[candidate.site] };
}
