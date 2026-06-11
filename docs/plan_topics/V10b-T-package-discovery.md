# `V10b-T` — Package discovery (bounded walk) (tests)

**Spec.** [`../spec_topics/discovery/package-and-settings.md`](../spec_topics/discovery/package-and-settings.md), [`../spec_topics/discovery.md`](../spec_topics/discovery.md).

**Adds.** Failing tests for the paired `V10b` implementation leaf.

**Tests.**
- `DISC-5`: `pi.looms` must be `string[]`; minimatch and `!`/`+`/`-` apply in the fixed order; file/dir/other rules hold.
- `DISC-6`: the walk fires `loom/load/discovery-slow` at the `maxFiles`/`timeoutMs` bound and `package-read-timeout` at the per-read deadline; file-count is checked before time on a tie.
- `DISC-6` (settings-sourced bounds reach the walk): with merged settings `looms.scanPackages: false` the walk performs zero candidate `package.json` reads (the walk is skipped wholesale); a merged `looms.scanPackagesMaxFiles` value distinct from the `2000` default trips `loom/load/discovery-slow` at the operator value, not at `2000`; the same holds for a merged `looms.scanPackagesTimeoutMs` at its trip point — each bound flows into the walk from `V10c`'s merged settings, so an implementation that ignored the settings value and used the hardcoded `2000` constant fails.

**Deps.** `V10a`, `V10c`, `V8b`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
