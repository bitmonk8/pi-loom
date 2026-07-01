import { describe, expect, it } from "vitest";
import { FACTORY_PROBABLE_CAPABILITIES } from "../src/extension/capability-probe";
import {
  CAPABILITY_OBLIGATIONS,
  SDK_SURFACE_INVENTORY,
  type SurfaceEntryKind,
} from "../src/extension/sdk-inventory";

// V18a-T — failing tests for the SDK capability + surface inventory (paired
// V18a impl).
//
// Spec: pi-integration-contract/inventory-audit-intro.md §"SDK capability
// inventory" (PIC-15, the seven-capability cardinality claim and the
// non-capability `pi.<member>` surfaces) + capability-inventory-items.md
// (items 1–7). Each test cites PIC-15 inline.
//
// These are build-time (module-load) assertions over the two pinned constants:
// the tests read the constants directly rather than exercising runtime
// behaviour, so they red on the stubbed-empty constants (cardinality 0 ≠ 7,
// unresolved rows) and turn green when `V18a` fills them in.

describe("SDK capability inventory — CAPABILITY_OBLIGATIONS", () => {
  it("PIC-15: pins the seven named capabilities, each carrying a factory-probed/verified-otherwise partition flag that reconciles against V9a's FACTORY_PROBABLE_CAPABILITIES", () => {
    // Cardinality: the seven-capability count is pinned at build time against
    // the constant (inventory-audit-intro.md §SDK capability inventory).
    expect(CAPABILITY_OBLIGATIONS.length).toBe(7);

    // The seven rows cover items 1..7 exactly once.
    const items = CAPABILITY_OBLIGATIONS.map((o) => o.item).sort((a, b) => a - b);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7]);

    // Partition reconciliation — driven by the IMPORTED
    // `FACTORY_PROBABLE_CAPABILITIES` set, not a literal `[1,2,3,4,6]` re-listed
    // here (per the bullet's "not a literal re-listed here" clause). Every entry
    // in the factory-probable set MUST be flagged factory-probed; every other
    // entry MUST be flagged verified-otherwise.
    const probable = new Set<number>(FACTORY_PROBABLE_CAPABILITIES);
    for (const o of CAPABILITY_OBLIGATIONS) {
      const expected = probable.has(o.item) ? "factory-probed" : "verified-otherwise";
      expect(o.verification, `capability item ${o.item} partition flag`).toBe(expected);
    }

    // The set of factory-probed-flagged entries equals the Step-0
    // factory-probable capability set — a mis-classified entry reddens here.
    const flaggedProbed = CAPABILITY_OBLIGATIONS.filter(
      (o) => o.verification === "factory-probed",
    )
      .map((o) => o.item)
      .sort((a, b) => a - b);
    expect(flaggedProbed).toEqual([...probable].sort((a, b) => a - b));
  });
});

describe("SDK surface inventory — SDK_SURFACE_INVENTORY non-capability rows", () => {
  // The leaf-owned entry-kind taxonomy. The spec names only `namespace-function`
  // explicitly; the remaining kinds are implementation-owned. This test ranges
  // over the surface set, not the capability subset, and does not restate the
  // `CAPABILITY_OBLIGATIONS.length === 7` cardinality / partition assertion the
  // block above owns.
  const VALID_ENTRY_KINDS: readonly SurfaceEntryKind[] = [
    "namespace-function",
    "engines-pin",
    "peer-dep-range",
    "strict-capability-probe",
    "api-coverage",
  ];

  it("PIC-15: the non-capability rows (pi.registerFlag / pi.getFlag / pi-engines-node / peer-dep-range / strict-capability-probe / api-coverage) resolve and each carries a taxonomy kind", () => {
    const byId = new Map(SDK_SURFACE_INVENTORY.map((e) => [e.id, e]));

    const requiredRows = [
      "pi.registerFlag",
      "pi.getFlag",
      "pi-engines-node",
      "peer-dep-range",
      "strict-capability-probe",
      "api-coverage",
    ];

    for (const id of requiredRows) {
      const entry = byId.get(id);
      expect(entry, `SDK_SURFACE_INVENTORY row '${id}' must resolve`).toBeDefined();
      // Each row is tagged with a kind under the leaf-owned taxonomy — an
      // untagged / mis-tagged entry-kind reddens here.
      expect(VALID_ENTRY_KINDS, `row '${id}' entry-kind must be in the taxonomy`).toContain(
        entry?.kind,
      );
    }

    // The category-(1) `pi.<member>` rows are the spec-named `namespace-function`
    // kind (inventory-audit-intro.md §"Non-capability `pi.<member>` surfaces").
    expect(byId.get("pi.registerFlag")?.kind).toBe("namespace-function");
    expect(byId.get("pi.getFlag")?.kind).toBe("namespace-function");
  });
});
