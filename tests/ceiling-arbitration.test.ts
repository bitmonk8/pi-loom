// V16a-T — failing tests for the cross-ceiling arbitration seam (V16a).
//
// Spec: hard-ceilings.md, hard-ceilings/ceilings-3-and-4.md §"Interaction
// between ceilings" (CIO-1 … CIO-6) and §`masked` field (the closed identifier
// set, omit-when-empty rule), hard-ceilings/ceiling-invariants-and-audit.md.
//
// The synthesised-candidate strategy drives ceiling-candidates through the
// stateless seam in isolation, observing its `{ surfaced, masked }` output —
// NOT the live `invoke` entry / AJV boundary / round-boundary sites, which are
// built by downstream leaves (`V5e`, `V11f`, `V13c`, `V15b`) that do not exist
// when `V16a` is picked up. The seam witnesses only the CIO sub-properties
// decidable from co-present candidates (the cross-ceiling surfacing precedence,
// the within-site sub-check ordering as encoded by the arbitration, the
// at-most-one-ceiling rule, and the `masked` co-fire enumeration). The temporal
// cross-site relations — CIO-1's slash-load-before-runtime placement and CIO-5's
// never-interleaves property — are owned by the downstream enforcement-site
// leaves and by `H7a`'s integration run, per each test's citation, and are NOT
// asserted here.
//
// These tests red on their own primary assertions while the V16a arbitration is
// absent (the V16a-T stub deranges the site→ceiling map and never enumerates the
// co-fired siblings), per the per-phase TDD ritual's "fail red for the intended
// reason".

import { describe, expect, it } from "vitest";
import {
  arbitrate,
  type CeilingCandidate,
} from "../src/runtime/ceiling-arbitration";
import type { MaskedCeilingId } from "../src/runtime/runtime-event-channel";

describe("cross-ceiling arbitration seam (V16a)", () => {
  it("CIO-1: a candidate co-presenting ceiling #3 (binder retry) and a runtime-class ceiling surfaces #3, masking the runtime-class ceiling", () => {
    // ceilings-3-and-4.md#cio-1: ceiling #3 is arbitrated over any co-present
    // runtime-class ceiling (the precedence *decision*; the slash-load `params`
    // arm of #4 is routed by #3's templates). CIO-1's temporal
    // slash-load-before-runtime placement is witnessed downstream at the
    // load-time-vs-runtime consult split (`V4e`/`V11f` vs `V5e`/`V13c`/`V15b`),
    // not at this stateless seam.
    const candidate: CeilingCandidate = {
      site: "slash-load-binder",
      satisfied: ["ceiling#3", "ceiling#4"],
    };
    const result = arbitrate(candidate);
    // Primary: the arbitration decision surfaces ceiling #3 over the co-present
    // runtime-class ceiling #4.
    const surfaced: MaskedCeilingId = result.surfaced;
    expect(surfaced).toBe("ceiling#3");
    expect(result.masked).toEqual(["ceiling#4"]);
  });

  it("CIO-2: a candidate tagged as an `invoke`-entry event resolves ceiling #1 (`invoke` depth)", () => {
    // ceilings-3-and-4.md#cio-2: ceiling #1 is evaluated at `invoke` entry,
    // before the callee body runs. At the stateless seam this is the site→#1
    // mapping; the temporal "before the callee body" placement is owned by the
    // downstream `invoke`-entry enforcement site (`V15b`).
    const result = arbitrate({ site: "invoke-entry", satisfied: ["ceiling#1"] });
    expect(result.surfaced).toBe("ceiling#1");
    // No co-fire: `masked` is omitted (never `[]`).
    expect(result.masked).toBeUndefined();
  });

  it("CIO-3: a candidate tagged as an AJV-boundary event resolves ceiling #4 (JSON depth) as the first sub-check", () => {
    // ceilings-3-and-4.md#cio-3: ceiling #4's depth-walk is the first sub-check
    // at every AJV validation boundary, ordered *before* AJV. At the stateless
    // seam this is the AJV-boundary→#4 mapping; the depth-walk-before-AJV
    // ordering at a live boundary is owned by the downstream AJV-boundary sites.
    const result = arbitrate({ site: "ajv-boundary", satisfied: ["ceiling#4"] });
    expect(result.surfaced).toBe("ceiling#4");
    expect(result.masked).toBeUndefined();
  });

  it("CIO-4: a candidate tagged as a round-boundary event resolves ceiling #2 (`tool_loop.max_rounds`)", () => {
    // ceilings-3-and-4.md#cio-4: ceiling #2 is evaluated at the tool-call-round
    // boundary — post-slot-increment, pre-next-turn — and the `max_rounds: 0`
    // typed-query boundary takes the same `max_rounds`-final branch at start
    // (0 == 0). Those are within-#2 temporal/slot-accounting properties not
    // observable at the stateless seam; the seam witnesses only that a
    // round-boundary event resolves ceiling #2.
    const result = arbitrate({ site: "round-boundary", satisfied: ["ceiling#2"] });
    expect(result.surfaced).toBe("ceiling#2");
    expect(result.masked).toBeUndefined();
  });

  it("CIO-5: a candidate co-presenting ceiling #3 with #1/#2/#4 surfaces a single ceiling rather than interleaving", () => {
    // ceilings-3-and-4.md#cio-5: the seam-local arbitration form — a single
    // ceiling surfaces (the arbitration decision) even when #3 co-fires with all
    // runtime-class ceilings. CIO-5's cross-site "ceiling #3 never interleaves
    // with #1/#2/#4" is a binder-bypass / load-time-only temporal property
    // witnessed end-to-end by `H7a`'s co-occurring-breach integration run, not by
    // this stateless seam.
    const result = arbitrate({
      site: "slash-load-binder",
      satisfied: ["ceiling#3", "ceiling#1", "ceiling#2", "ceiling#4"],
    });
    // Primary: exactly one ceiling surfaces (a single identifier, not an array),
    // and it is ceiling #3.
    expect(typeof result.surfaced).toBe("string");
    expect(result.surfaced).toBe("ceiling#3");
    // The three co-present runtime-class ceilings are all masked, in the closed
    // set's canonical order.
    expect(result.masked).toEqual(["ceiling#1", "ceiling#2", "ceiling#4"]);
  });

  it("CIO-6: at most one ceiling surfaces per event and `masked` enumerates the co-fired siblings", () => {
    // ceilings-3-and-4.md#cio-6 (owned normatively by PIC-1): at most one ceiling
    // surfaces per event; the surface carries an optional `masked` field
    // enumerating any other ceiling whose precondition was also satisfied at the
    // same check site, drawn from the closed identifier set and omitted (never
    // `[]`) when no co-fire occurred.
    const coFire = arbitrate({
      site: "slash-load-binder",
      satisfied: ["ceiling#3", "ceiling#4"],
    });
    // Primary: `masked` enumerates the co-fired sibling(s).
    expect(coFire.masked).toEqual(["ceiling#4"]);
    // At most one ceiling surfaces: a single identifier drawn from the closed set.
    const closedSet: readonly MaskedCeilingId[] = [
      "ceiling#1",
      "ceiling#2",
      "ceiling#3",
      "ceiling#4",
    ];
    expect(closedSet).toContain(coFire.surfaced);
    expect(coFire.masked).not.toContain(coFire.surfaced);

    // Omit-when-empty: with no co-fire, `masked` is absent — never the empty array.
    const noCoFire = arbitrate({ site: "ajv-boundary", satisfied: ["ceiling#4"] });
    expect(noCoFire.masked).toBeUndefined();
    expect("masked" in noCoFire).toBe(false);
  });
});
