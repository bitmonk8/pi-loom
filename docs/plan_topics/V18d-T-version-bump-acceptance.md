# `V18d-T` — Pi version-bump runtime-evidence acceptance gate and revert path (tests)

**Spec.** [`../spec_topics/pi-integration-contract/version-bump-intro.md`](../spec_topics/pi-integration-contract/version-bump-intro.md), [`../spec_topics/pi-integration-contract/version-bump-triggers.md`](../spec_topics/pi-integration-contract/version-bump-triggers.md), [`../spec_topics/pi-integration-contract/host-prerequisites.md`](../spec_topics/pi-integration-contract/host-prerequisites.md).

**Adds.** Failing tests for the paired `V18d` implementation leaf.

**Tests.**
- Runtime-evidence acceptance gate (output (c) of [`version-bump-triggers.md`](../spec_topics/pi-integration-contract/version-bump-triggers.md)): a failing test asserts the gate is composed correctly — that the [`H4a`](./H4a-factory-shell-and-harness.md) end-to-end harness is driven against the bumped pin and that a green surface-inventory run alone does not satisfy acceptance — exercised against a feature-free `H4a` harness double rather than an integrated `.loom`. The test fails red precisely because the gate is unwired, not because any integrated feature is missing; the integrated `.loom` (typed query + tool loop + invoke + schema validation + binder + cancellation) belongs to the impl-time acceptance run on [`V18d`](./V18d-version-bump-acceptance.md). The assertion's coverage is bounded by the `H4a` double's fidelity to the bumped pin.

**Deps.** `H4a`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
