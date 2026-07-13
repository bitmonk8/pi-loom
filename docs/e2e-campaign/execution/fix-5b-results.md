# FIX-5b — live / acceptance / hardening test-artifact repair + borderline verdicts

Scope: D1, D2, D3, D6 (test-artifacts) + verification of FIX-1's 8 fixture edits
+ borderline investigations E1, E2, E3. Tests-only task. A live provider is
configured (`anthropic`, `openrouter`, `unity*`). **No `src/**` was modified by
this task** (the `src/**` diffs present in the working tree are from the prior
FIX-1..4 workers on the shared tree; their own gates own them).

## Per-item status

| ID | Finding | Status | Change |
|---|---|---|---|
| D1 | S3-2 / S7-3 | fixed + green | `typedQueryLoom()` is now a **single-turn** typed query (dropped the trailing prose turn), so the whole streamed transcript is the typed JSON and the test's `JSON.parse(reply)` no longer chokes on a second turn. |
| D2 | S7-4 (CAND-2) | fixed + green | Acceptance (d) no longer asserts the `bind_echo` note on `pi -p` stdout (it is emitted on the `loom-system-note` channel, not print-mode stdout — DOC-73). Relaxed to the spec-promised stdout observables (no-error exit, permitted codes, no envelope leak). |
| D3 | S7-5 | fixed + green | ~24 hardening load/parse probes repointed from the empty `probe.diagnostics` (ctx.ui.notify) to `probe.systemNotes` (the shipped V4e `loom-system-note` channel). Expected codes/messages unchanged; only the observation channel changed. Per-diagnostic `type === "error"` checks dropped (every `systemNotes` entry is error-severity by construction — `emitLoadNote` is error-only). |
| D6 | S7-7 | fixed + green | `invoke-runtime-ceilings` INV-9 inverted: prompt→prompt child turn now asserted **present** (`ATTACHEDKID` IS user-visible), matching DOC-19 and the passing `session-invoke-attach.test.ts`. prompt→subagent isolation assertion retained. |

### D3 files + channel repoint detail
- `discovery-cli.test.ts` — `msgs()` helper + all 8 diagnostic assertions → `systemNotes` (6× invalid-slash-name, collision, invalid-extension, settings range/entry ×2, DISC-1 missing-source, DISC-1 unreadable-suppressed).
- `frontmatter-diagnostics.test.ts` — single `hasDiag()` helper → `systemNotes` (covers FM-1..FM-6).
- `imports-resolution.test.ts` — IMP-A..E `.some(...)` predicates + `codes` logs → `systemNotes`.
- `invoke-parse-load.test.ts` — `loadOnly()` helper `msgs` → `systemNotes` (INV-1,1b,2,3,3b,4,4b,5).
- `invoke-runtime-ceilings.test.ts` — INV-5r, INV-8, INV-1r diagnostic reads → `systemNotes`; INV-9 inverted (D6).

Note format confirmed empirically: `<[file:line:col:] >code: message` (e.g.
`main.loom:5:10: loom/parse/import-unknown-symbol: imported symbol 'NotExported' is not declared…`),
so the existing registry-message substrings remain valid `.includes(...)` matches.

## Verification of FIX-1's 8 fixture edits (D4 `respond` drops + D5 comma)

Confirmed on the stable `openrouter` / `anthropic/claude-haiku-4.5` provider —
`npm run test:acceptance` **10/10 green**:
- (b) `acc-typed-named.loom` — D5 comma added + `respond` dropped → response validates against the two-field `NAMED_REPLY_SCHEMA` (QRY-22). Green.
- (c) `acc-typed-inline.loom` — `respond` dropped → inline schema validates. Green.
- (d) `acc-params-binder.loom` — `respond` dropped (pure-literal body) + `bind_model: anthropic/claude-haiku-4-5` resolves → binder runs off-session, no envelope leak, exit 0. Green (with D2 assertion relaxation).
- (g) `acc-imports-invoke.loom` — `respond tagline()` → `tagline()` → import+invoke run clean, exit 0. Green.
- (h) `acc-match-queryerror.loom` — `respond outcome` → `outcome` → QueryError handled through the match arm, exit 0. Green.
- (f) `acc-code-tool-loop.loom` — `respond` before final query dropped → code-tool loop runs, exit 0. Green.
- Plus (a) prompt-sentinel, (e) subagent-success, (i) multi-source — green.

No fixture still fails on its own merits. (Earlier default-provider run: `unity-messages`
returned `403 Forbidden` on (g),(h) and two others → provider-infra per §5, not a fixture
defect; the openrouter re-run is fully green, confirming the fixtures parse+run to their
documented outcome.)

## Borderline verdicts

### E1 (FIND-S7-8) — `looms.binderModel` provider-qualified id → **NOT A DEFECT** (document expected format)
Provider-qualified ids **are** resolved by the binder-model resolver. Expected
format is `provider/<exact-registry-id>` (the exact `id` string as it appears in
`ModelRegistry.getAvailable()`). Direct matcher evidence:
```
anthropic/claude-haiku-4.5   => []                       (no match → binder-model-unresolved, correct)
anthropic/claude-haiku-4-5   => [anthropic/claude-haiku-4-5]        (resolves)
claude-haiku-4-5 (bare)      => 3 matches (anthropic + 2 unity)     (ambiguous → unresolved)
```
`matchAvailableModel`/`resolveChainReference` (`src/binder/binder-model.ts`) split
a `provider/modelId` reference at the first `/` and require `m.provider===provider
&& m.id===modelId`. The finding used `anthropic/claude-haiku-4.5` (**dot**), which
is not the anthropic registry id — the id is `claude-haiku-4-5` (**hyphen**). The
qualified form is required precisely because the bare id is 3-way ambiguous. The
corrected qualified id `anthropic/claude-haiku-4-5` resolves (proven live: acceptance
(d)'s `bind_model: anthropic/claude-haiku-4-5` binder pass is green; `session-binder.test.ts`
uses the same id and passes). Settings resolution is correct; no `src/**` change.

### E2 (FIND-S7-9) — reload debounced past dispose emits through stale `ctx.ui` → **ACCEPT (cosmetic), documented**
Reproduced (stderr `system-note delivery failed: loom/runtime/registry-swap-failed:
… ctx is stale after session replacement or reload`, from `ReloadDebouncer.runReload
→ rebuildAndSwap → emitRegistrySwapFailed → ctx.ui`). It fails **no** test — the
suites it appears under are green. The debouncer already carries the teardown guard
the spec names (`ReloadDebouncer.cancel()` clears the pending 250 ms timer, called
from `installHotReload().detach()` on `session_shutdown`, step 4). The residual noise
is a teardown race in the probe/live harnesses, which dispose the `AgentSession`
directly (`session.dispose()`) without draining the outstanding 250 ms debounce
window, so a timer scheduled by the file-planting writes fires a rebuild after the
ctx is already stale. A `#cancelled` flag on the debouncer would only short-circuit
a **not-yet-started** rebuild after `cancel()`, and would not eliminate this noise
when the harness never routes through `detach()`/`cancel()` at all; a fully robust
fix would require harness-teardown ordering or a disposed-ctx guard on the emit path.
Given it is cosmetic (no behavioural failure) and this is a tests-only task, accepted
per the finding's own `borderline/cosmetic` verdict; no `src/**` change.

### E3 (FIND-S4-11) — `RUNTIME_DEGRADED_CODE` "dead retired constant" → **ACCEPT (not dead), documented**
The constant is **not** dead. It is a member of the `NestedShapeEmission.code` union
type (`src/extension/session-shutdown.ts:313`) consumed by `emitNestedShapeDiagnostic`,
and it is exercised by `tests/session-shutdown.test.ts` (the runtime-degraded nested-
shape fallback assertions, ~5 refs) and referenced by the `session-swap-tripwire`
negative controls (which assert the production teardown emits **no**
`session-shutdown-runtime-degraded` row — `session-shutdown.ts:468`). The *production
emission* of the code was retired in favour of the session-swap tripwire, but the
constant remains a live type-surface + test-fixture symbol. Removing it would delete
the nested-shape fallback type member and break those tests — **not trivially safe**.
Accepted; no `src/**` change.

## Suite results (with triage)

| Suite | Command | Result |
|---|---|---|
| live | `npm run test:live` | **5/5 green** (incl. D1 typed-query). |
| acceptance | `test:acceptance` (default `unity-messages`) | 6/10 — 4 failures all `403 Forbidden` → **provider-infra (§5)**. |
| acceptance | `test:acceptance` on `PI_LOOM_ACC_PROVIDER=openrouter PI_LOOM_ACC_MODEL=anthropic/claude-haiku-4.5` | **10/10 green** (confirming re-run; D2 + FIX-1 fixtures verified). |
| hardening (D3 zero-token) | `discovery-cli`, `frontmatter-diagnostics`, `imports-resolution`, `invoke-parse-load` | **31/31 green**. |
| hardening (D3+D6) | `invoke-runtime-ceilings` | **7/7 green** (INV-5r/INV-8/INV-1r repointed; INV-9 inverted). |

Triage note (§5): the only red observed under a live/acceptance run was
`403 Forbidden` on the default `unity-messages` acceptance provider — a
provider-infra pattern (rate-limit/forbidden), matching the S7 provider footprint
note. Re-running on the stable `openrouter` provider is fully green, so no loom
finding is attributable. `typecheck` clean across all test edits.

## Files changed (tests only)
- `tests/live/live-production-acceptance.test.ts` — D1 (single-turn `typedQueryLoom`).
- `tests/acceptance/noninteractive-acceptance.test.ts` — D2 (drop bind_echo-on-stdout assertion + comment).
- `tests/hardening/discovery-cli.test.ts` — D3.
- `tests/hardening/frontmatter-diagnostics.test.ts` — D3.
- `tests/hardening/imports-resolution.test.ts` — D3.
- `tests/hardening/invoke-parse-load.test.ts` — D3.
- `tests/hardening/invoke-runtime-ceilings.test.ts` — D3 + D6.

No `src/**` changes. Borderlines E1/E2/E3 all accepted with documented verdicts.
