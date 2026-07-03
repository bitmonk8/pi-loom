# `V7e` — `loom-system-note` renderer render-width contract

**Spec.** [`../spec_topics/pi-integration-contract/runtime-event-channel.md`](../spec_topics/pi-integration-contract/runtime-event-channel.md).

**Adds.** Pins the `loom-system-note` message renderer's render-width contract (`PIC-56`): the renderer's returned `Component.render(width)` MUST fit every returned line to the supplied render width so the host TUI never rejects an over-wide line. _(The behaviour was fixed under the H6a manual-smoke findings — `system-note-renderer.ts` now wraps each line ANSI-aware to `width` via pi-tui `wrapTextWithAnsi` — see [`../../CHANGELOG.md`](../../CHANGELOG.md) H6a-smoke; this leaf governs that behaviour under the `PIC-56` anchor and lands its citing test.)_

**Tests.**
- `PIC-56` ([runtime-event-channel.md — system-note renderer render-width contract](../spec_topics/pi-integration-contract/runtime-event-channel.md#pic-56)): `npm test` asserts the `loom-system-note` renderer's `Component.render(width)` emits no line whose visible width exceeds `width`.

**Deps.** `V7e-T`, `V7d`

**Ships when.** `npm test` includes a `PIC-56`-citing assertion that the `loom-system-note` renderer fits every rendered line to the supplied render width.
