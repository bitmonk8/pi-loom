# `V7e-T` — `loom-system-note` renderer render-width contract (tests)

**Spec.** [`../spec_topics/pi-integration-contract/runtime-event-channel.md`](../spec_topics/pi-integration-contract/runtime-event-channel.md).

**Adds.** A failing test for the paired `V7e` leaf: a `PIC-56`-anchored render-width contract test for the `loom-system-note` message renderer. It renders a system note whose content exceeds the supplied render width and asserts every returned line's visible width is ≤ the render width (wrap or truncate), with a blank line preserved and a non-positive width falling back to raw lines. _(Context: the render-width defect this pins was fixed under the H6a manual-smoke findings — see [`../../notes.md`](../../notes.md), 2026-07-02, and [`../../CHANGELOG.md`](../../CHANGELOG.md) H6a-smoke — and a width regression test was landed then; this leaf's role is to lock that behaviour under the governed `PIC-56` anchor. Its red-for-right-reason condition is the absence of a `PIC-56`-anchored contract test, not a re-introduction of the crash.)_

**Tests.**
- `PIC-56` ([runtime-event-channel.md — system-note renderer render-width contract](../spec_topics/pi-integration-contract/runtime-event-channel.md#pic-56)): the `loom-system-note` renderer's `Component.render(width)` returns only lines whose visible width is ≤ `width` for a content line longer than `width`; a blank content line is preserved as one blank line; a non-positive `width` falls back to the raw lines.

**Deps.** `V7d`

**Ships when.** The `PIC-56`-anchored render-width test exists and compiles; per the note above it fails red on the absence of the anchored contract test rather than on the crash (the underlying fix landed under the H6a smoke findings).
