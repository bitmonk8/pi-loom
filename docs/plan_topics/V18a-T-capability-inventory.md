# `V18a-T` — SDK capability and surface inventory (tests)

**Spec.** [`../spec_topics/pi-integration-contract/inventory-audit-intro.md`](../spec_topics/pi-integration-contract/inventory-audit-intro.md), [`../spec_topics/pi-integration-contract/capability-inventory-items.md`](../spec_topics/pi-integration-contract/capability-inventory-items.md).

**Adds.** Failing tests for the paired `V18a` implementation leaf.

**Tests.**
- `PIC-15`: the seven named SDK capabilities are pinned, each `CAPABILITY_OBLIGATIONS` entry carrying a partition flag classifying it factory-probed (Step 0) vs verified-otherwise — items 1/2/3/4/6 factory-probed, items 5/7 otherwise; `CAPABILITY_OBLIGATIONS.length === 7` asserts the cardinality at build time, and a build-time assertion verifies the set of factory-probed-flagged entries equals the Step-0 factory-probable capability set imported from `V9a`'s exported `FACTORY_PROBABLE_CAPABILITIES` constant (not a literal re-listed here), so a mis-classified entry reddens at build time.
- `PIC-15`: the non-capability `SDK_SURFACE_INVENTORY` rows the paired implementation leaf populates resolve — the category-(1) `pi.registerFlag` / `pi.getFlag` members and the `pi-engines-node` / `peer-dep-range` / `strict-capability-probe` / `api-coverage` rows, each tagged with its kind under the leaf-owned entry-kind taxonomy — so a missing row or an untagged/mis-tagged entry-kind reddens at build time. This assertion ranges over the `SDK_SURFACE_INVENTORY` surface set, not the capability subset, and does not restate the `CAPABILITY_OBLIGATIONS.length === 7` cardinality / `FACTORY_PROBABLE_CAPABILITIES` partition assertion the bullet above owns.

**Deps.** `V9a`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
