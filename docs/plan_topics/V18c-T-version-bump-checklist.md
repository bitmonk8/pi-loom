# `V18c-T` — Pi version-bump procedure and gates (tests)

**Spec.** [`../spec_topics/pi-integration-contract/version-bump-intro.md`](../spec_topics/pi-integration-contract/version-bump-intro.md), [`../spec_topics/pi-integration-contract/version-bump-step2.md`](../spec_topics/pi-integration-contract/version-bump-step2.md), [`../spec_topics/pi-integration-contract/version-bump-step2b.md`](../spec_topics/pi-integration-contract/version-bump-step2b.md), [`../spec_topics/pi-integration-contract/version-bump-triggers.md`](../spec_topics/pi-integration-contract/version-bump-triggers.md), [`../spec_topics/pi-integration-contract/host-prerequisites.md`](../spec_topics/pi-integration-contract/host-prerequisites.md).

**Adds.** Failing tests for the paired `V18c` implementation leaf.

**Tests.**
- Step 2(a): the positive surface-inventory test asserts each `SDK_SURFACE_INVENTORY` member is present on the pinned SDK.
- Step 2(b): the promote/co-edit obligation fires when a capability is added/removed.
- The `engines.node` literal-read test equals the SDK floor; the `peerDependencies` tilde line is asserted; the `loom/typecheck/session-shutdown-reason-snapshot` brand-string gate detects a reason-set skew.
- Runtime-evidence acceptance gate (output (c) of [`version-bump-triggers.md`](../spec_topics/pi-integration-contract/version-bump-triggers.md)): a failing test asserts the [`H4a`](./H4a-factory-shell-and-harness.md) end-to-end harness is driven against the bumped pin and that a surface-inventory green alone does not satisfy acceptance; the assertion's coverage is bounded by the `H4a` double's fidelity to the bumped pin.

**Deps.** `V18a`, `V18b`, `H4a`

**Ships when.** The tests above exist, compile, and fail red for the intended reason, including the runtime-evidence acceptance-gate test. The revert-path obligation is mirrored here: when the bump's acceptance evidence is red, the prior pin is restored before merge — reverting step 4's edit in one commit (the Pi-SDK pin literal at [`host-prerequisites.md#pi-sdk-pin`](../spec_topics/pi-integration-contract/host-prerequisites.md#pi-sdk-pin) and the four `@earendil-works/*` `peerDependencies` entries).
