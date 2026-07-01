// V18a / V18a-T — the SDK capability + surface inventory seam.
//
// This module owns the two build-time pinned constants the inventory audit
// (`V18b`) and the version-bump gates (`V18c`) resolve against, per
// pi-integration-contract/inventory-audit-intro.md §"SDK capability inventory"
// and capability-inventory-items.md:
//
//   • `CAPABILITY_OBLIGATIONS` — the seven named SDK capabilities (items 1–7),
//     each carrying a `verification` partition flag classifying it as
//     factory-probed (Step 0) vs verified-otherwise. Items 1/2/3/4/6 are the
//     factory-probable subset `V9a` pins as `FACTORY_PROBABLE_CAPABILITIES`;
//     items 5/7 are verified otherwise. The build-time assertions reconcile the
//     factory-probed-flagged subset against that imported constant (not against
//     a literal list re-stated here) and pin the cardinality at seven.
//
//   • `SDK_SURFACE_INVENTORY` — the full Pi-side surface set, strictly broader
//     than the seven capabilities (inventory-audit-intro.md §SDK capability
//     inventory). Beyond the capability members it carries the non-capability
//     `pi.<member>` surfaces (`pi.registerFlag` / `pi.getFlag`, per §"Non-
//     capability `pi.<member>` surfaces") and the `pi-engines-node`,
//     `peer-dep-range`, `strict-capability-probe`, and `api-coverage` rows the
//     version-bump gates read as operands. Each row is tagged with its kind
//     under the leaf-owned entry-kind taxonomy (`SurfaceEntryKind`).
//
// V18a-T (this tests-task) declares the seam types and stubs both constants as
// empty frozen arrays so the paired failing tests compile and red on their own
// primary assertions (cardinality / partition / row-resolution). The paired
// `V18a` implementation leaf fills the two constants in.
//
// `Object.freeze` keeps these module-level constants off the *No globals,
// statics, singletons* mutable-binding scan (runtime-immutable lists).

import type { CapabilityId } from "./capability-probe";

/**
 * How an SDK capability's presence is verified: at factory time by the Step 0
 * capability probe (`V9a`), or by some other build-time / load-time mechanism.
 */
export type CapabilityVerification = "factory-probed" | "verified-otherwise";

/**
 * One row of the seven-capability inventory (capability-inventory-items.md
 * items 1–7). `item` is the 1-based inventory index; `verification` is the
 * partition flag the build-time assertion reconciles against
 * `FACTORY_PROBABLE_CAPABILITIES`.
 */
export interface CapabilityObligation {
  readonly item: CapabilityId;
  readonly name: string;
  readonly verification: CapabilityVerification;
}

/**
 * The leaf-owned entry-kind taxonomy for `SDK_SURFACE_INVENTORY` rows. The spec
 * names only the `namespace-function` kind (the `pi.<member>` function members);
 * the remaining non-`namespace-function` kinds are implementation-owned and
 * classify the non-capability operand rows the version-bump gates read.
 */
export type SurfaceEntryKind =
  | "namespace-function"
  | "engines-pin"
  | "peer-dep-range"
  | "strict-capability-probe"
  | "api-coverage";

/**
 * One row of the broader Pi-side surface inventory. `id` is the surface's
 * stable inventory key (e.g. `pi.registerFlag`, `pi-engines-node`); `kind`
 * tags it under the entry-kind taxonomy above.
 */
export interface SurfaceInventoryEntry {
  readonly id: string;
  readonly kind: SurfaceEntryKind;
}

/**
 * The seven named SDK capabilities (capability-inventory-items.md items 1–7).
 * V18a-T stub: empty; `V18a` populates all seven rows with their partition
 * flags.
 */
export const CAPABILITY_OBLIGATIONS: readonly CapabilityObligation[] =
  Object.freeze([]);

/**
 * The full Pi-side surface inventory — strictly broader than the seven
 * capabilities. V18a-T stub: empty; `V18a` populates the capability members and
 * the non-capability operand rows.
 */
export const SDK_SURFACE_INVENTORY: readonly SurfaceInventoryEntry[] =
  Object.freeze([]);
