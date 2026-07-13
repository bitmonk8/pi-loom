# S5 (discovery-slash-invoke-binder) — execution results

Slice S5 of the pi-loom e2e campaign. Areas: **DISC** (discovery), **SLSH**
(slash-invocation), **INV** (invocation/invoke), **BINDER** (binder) — 126 in-scope
requirements. Primary methods M1 (offline-unit) + M2 (production-composition, no live
model). Companion findings: `findings/s5-discovery-invoke-binder-findings.md`.

CWD `C:/UnitySrc/pi-loom`. All citations are `path:line`.

---

## 1. Summary counts

| Area | Reqs | Covered (M1/M2) | Partial | Uncovered | Deferred |
|---|---|---|---|---|---|
| DISC | 40 | 27 | 6 | 5 | 2 |
| SLSH | 24 | 17 | 1 | 4 (2 live-only) | 0 |
| INV | 21 | 15 | 3 | 1 pinned (FIND-S5-1) | 2 |
| BINDER | 41 | 34 | 5 | 2 | ~3 (arm/loop) |
| **Total** | **126** | **93** | **15** | **12** | **~7** |

"Covered" = at least one test whose primary assertion binds the requirement. "Partial" =
exercised as a side-condition or one clause unasserted. Live-only rows (REQ-SLSH-1/3,
REQ-BINDER-1/2) are M3 and out of the S5 offline/conformance charter — noted, not counted
as offline gaps.

**Findings:** 1 borderline (FIND-S5-1, INV-20 AST `style` discriminator absent) + CAND-2
resolved as test-artifact. **Zero blocks-spec-compliance loom-defects.**

---

## 2. Existing S5 suite results (step 1)

`npx vitest run` over the 32 assigned files — **all green**:

```
Test Files  32 passed (32)
Tests      333 passed (333)
```

Per-file (tests): binder-bypass-envelope 14, binder-system-prompt 36, invoke-cross-mode 9,
invoke-prompt-suspend 5, reload-debounce 6, discovery-invalid-extension 2, capability-probe 21,
binder-call-cancellation 3, invoke-provenance 6, invocation-core 10, invoke-diagnostics 17,
binder-retry-taxonomy 10, settings-merge 13, discovery-walk 14, defaulting-revalidation 3,
package-discovery 10, invoke-depth-cycle 9, active-invocation-registry 7, invoke-ceiling-depth 5,
argument-echo 26, binder-inference-provider-mapping 33, binder-model-resolution 10,
invoke-swallowing-handler 4, watcher-terminated-recovery 2, binder-system-note-determinism 6,
bind-context-transcript 14, registration-reload-wiring 9, watch-token-seams 12,
active-invocation-wiring 4, minimal-slash-command 2, slash-dispatch 7, watcher-hot-reload-integration 4.

---

## 3. New tests authored (step 3) + pass/fail

All new files live under `tests/` and run in the default suite (`npm test`).

| File | Tests | Result | Closes |
|---|---|---|---|
| `tests/e2e-s5-binder-echo-emission.test.ts` | 4 | ✅ pass | CAND-2; REQ-BINDER-21 (ok-arm production echo), REQ-BINDER-36 (bind_echo:false suppression), REQ-BINDER-38 (needs_info note), determinism |
| `tests/e2e-s5-package-discovery-composition-root.test.ts` | 3 | ✅ pass | gap #3; REQ-DISC-1 (package source), REQ-DISC-25 (manifest wins), REQ-DISC-6 (project shadows package) — via the composition root |
| `tests/e2e-s5-disc-cli-settings.test.ts` | 6 | ✅ pass | REQ-DISC-5 (`--loom` `path.delimiter` join), REQ-DISC-14 (dir-validity/empty-dir silence + wrong-type-only-for-non-loom-non-dir), REQ-DISC-33 (unknown `looms.*` ignored, no diagnostic) |
| `tests/e2e-s5-invoke-untyped-style.test.ts` | 5 | ✅ pass (1 `it.fails`) | REQ-INV-1 (invoke sole inline-spawn / import-non-warp), REQ-INV-5 (untyped invoke `returnSchema===null`, discards child), REQ-INV-20 pinned as FIND-S5-1 via `it.fails` |
| `tests/e2e-s5-slsh-chain-suffix.test.ts` | 5 | ✅ pass | REQ-SLSH-23 (model-invoked `.loom`-callable tool-error surface emits NO chain suffix) |
| **Total** | **23** | **23 pass** | |

Combined new-suite run:

```
Test Files  5 passed (5)
Tests      23 passed (23)   (1 encoded it.fails = FIND-S5-1, reported green)
```

Constraints honoured: no `src/**` production code modified; no existing test weakened or
altered.

---

## 4. CAND-2 analysis (binder echo-note emission)

**Baseline observation** (`docs/e2e-campaign/test-plan.md` §5): the acceptance run produced
neither a `bind_echo` success note nor a failure note on `pi -p` stdout for a binder
off-session pass.

**Deterministic M2 reproduction** (`tests/e2e-s5-binder-echo-emission.test.ts`): drive the
production `ProductionLoomProducer.runBinder()` (`src/extension/production-loom-producer.ts:437`)
with the off-session `complete()` (`:750`) replaced by a scripted reply:

- scripted `{"kind":"ok","args":{"topic":"async","audience":"team"}}` → **one**
  `loom-system-note` `pi.sendMessage`, `display:true`, content
  `Running /code-review: topic=async, audience=team` (emitter `#emitBinderEchoNote`
  `:618`→`:647`).
- scripted `{"kind":"needs_info","message":"which repository?"}` → `bound:false` + **one**
  `loom-system-note` `loom /code-review: argument binding needs more info — which repository?`
  (emitter `#emitBinderFailureNote` `:823`).
- `bind_echo: false` on the same `ok` reply → `bound:true`, **zero** echo notes (`:619`).
- determinism: two identical `ok` passes emit byte-identical note content.

**Verdict: test-artifact** (not a loom-defect). The loom emits both the success echo and
the failure note on the correct channel (`loom-system-note`) with `display:true` and
`triggerTurn:false`. The `triggerTurn:false` + custom-channel delivery is exactly the
BND-3-mandated invisible-binder posture: the note is not a conversation turn, so the
black-box `pi -p` print-mode assistant-text capture the acceptance harness greps never
surfaces it. The absence on stdout is a property of the acceptance observation channel,
not a failure of loom to emit. No loom fix owed; the correct place to pin the emission is
the M2 layer added here (and the live acceptance assertion at
`tests/acceptance/noninteractive-acceptance.test.ts:260` is already disjunctive +
live-gated). See finding CAND-2 block for details.

---

## 5. Coverage map

Method key: **M1** offline-unit; **M2** production-composition/conformance; **M3** live;
`NEW` marks a status now closed by a §3 test.

### 5.1 DISC (discovery) — REQ-DISC-1..40

| REQ | Covered by | M |
|---|---|---|
| DISC-1 | **NEW** `tests/e2e-s5-package-discovery-composition-root.test.ts` (package source via comp root) + piecewise `discovery-walk.test.ts:338/:100/:158` | M2/M1 |
| DISC-2 | `hardening/discovery-cli.test.ts:59,:77` | M2 |
| DISC-3 | `hardening/discovery-cli.test.ts:59` | M2 |
| DISC-4 | UNCOVERED (flag-wiring / extension-coined surface not asserted) | — |
| DISC-5 | **NEW** `tests/e2e-s5-disc-cli-settings.test.ts:114` (`path.delimiter` join) | M1 |
| DISC-6 | **NEW** package/project shadow `e2e-s5-package-discovery-composition-root.test.ts` + priority `hardening/discovery-cli.test.ts:89`; PARTIAL: `cross-source-shadow` warning payload still unasserted | M2 |
| DISC-7 | `discovery-walk.test.ts:100,:115` | M1 |
| DISC-8 | UNCOVERED (root-set union/caching/recompute) | — |
| DISC-9 | `discovery-walk.test.ts:145,:158`; `hardening/discovery-cli.test.ts:184,:208` | M1/M2 |
| DISC-10 | `discovery-walk.test.ts:210` | M1 |
| DISC-11 | `discovery-walk.test.ts:145,:185` | M1 |
| DISC-12 | `discovery-walk.test.ts:145`; `hardening/discovery-cli.test.ts:163` | M1/M2 |
| DISC-13 | `discovery-walk.test.ts:194`; `hardening/discovery-cli.test.ts:185` | M1/M2 |
| DISC-14 | **NEW** `tests/e2e-s5-disc-cli-settings.test.ts:206,:219,:236,:253` (empty-dir silence + wrong-type-only-for-non-loom-non-dir); positive dir `hardening/session-discodyn.test.ts:189` | M1 |
| DISC-15 | `discovery-walk.test.ts:230` | M1 |
| DISC-16 | `discovery-walk.test.ts:250` | M1 |
| DISC-17 | `discovery-walk.test.ts:269`; `hardening/discovery-cli.test.ts:34` | M1/M2 |
| DISC-18 | `discovery-walk.test.ts:292,:315`; `hardening/discovery-cli.test.ts:101` | M1/M2 |
| DISC-19 | UNCOVERED (post-mapping name collision + abs-path dedup before detection) | — |
| DISC-20 | PARTIAL `discovery-walk.test.ts:315` (load-time loss); re-eval-on-next-cycle drop unasserted | M1 |
| DISC-21 | UNCOVERED (package-root five-root priority order + `isSymbolicLink()` filter) | — |
| DISC-22 | UNCOVERED (`@`-scope descent; package.json-parse-gated candidacy) | — |
| DISC-23 | `package-discovery.test.ts:197,:228` (isolation) | M1 |
| DISC-24 | `package-discovery.test.ts:172,:251`; `hardening/session-discodyn.test.ts:115` | M1/M2 |
| DISC-25 | **NEW** `tests/e2e-s5-package-discovery-composition-root.test.ts` (manifest wins, deterministic) + live `session-discodyn.test.ts:115` | M2 |
| DISC-26 | UNCOVERED (project/global package-identity dedup) | — |
| DISC-27 | `package-discovery.test.ts:297,:330` | M1 |
| DISC-28 | `package-discovery.test.ts:368,:395` | M1 |
| DISC-29 | `package-discovery.test.ts:350`; `hardening/session-discodyn.test.ts:166` | M1/M2 |
| DISC-30 | PARTIAL `settings-merge.test.ts:61,:77` (seam-directness/read-order unasserted) | M1 |
| DISC-31 | `settings-merge.test.ts:100,:115,:127,:162` | M1 |
| DISC-32 | `settings-merge.test.ts:61,:70,:77,:85` | M1 |
| DISC-33 | **NEW** `tests/e2e-s5-disc-cli-settings.test.ts:156` (unknown `looms.*` ignored, no diagnostic) | M1 |
| DISC-34 | `binder-model-resolution.test.ts:57,:195,:109`; `hardening/session-discodyn.test.ts:28,:53,:74` | M1/M2 |
| DISC-35 | `settings-merge.test.ts:142`; `hardening/discovery-cli.test.ts:141` | M1/M2 |
| DISC-36 | `settings-merge.test.ts:179,:207,:219`; `hardening/session-discodyn.test.ts:221` | M1/M2 |
| DISC-37 | `settings-merge.test.ts:236` (PARTIAL: path-root/`~`/glob clauses) | M1/M2 |
| DISC-38 | `discovery-invalid-extension.test.ts:86,:101`; `conformance/production-conformance.test.ts:606` | M1/M2 |
| DISC-39 | `reload-debounce.test.ts:34,:62,:81,:143,:169,:193` | M1 |
| DISC-40 | `registration-reload-wiring.test.ts:72,:99`; `watcher-hot-reload-integration.test.ts:241` | M1/M2 |

DEFERRED (not owed): object-form `loomPaths` entries; configurable per-read deadline
(`spec-requirements.md:1309-1310`).

### 5.2 SLSH (slash-invocation) — REQ-SLSH-1..24

| REQ | SNK | Covered by | M |
|---|---|---|---|
| SLSH-1 | — | live only (LLM param extraction) | M3 |
| SLSH-2 | — | echo value/annotation `argument-echo.test.ts:242,:260`; suppression side covered NEW by `e2e-s5-binder-echo-emission.test.ts` (bind_echo:false) | M1/M2 |
| SLSH-3 | — | live only | M3 |
| SLSH-4 | SLSH-1 | `slash-dispatch.test.ts:67,:90,:104` | M2 |
| SLSH-5 | — | prompt-mode Ok not surfaced — UNCOVERED offline (conformance) | M2 |
| SLSH-6 | — | subagent isolation — covered elsewhere (S6/subagent-*) | M2 |
| SLSH-7 | SLSH-2 | `slash-dispatch.test.ts:153,:175`; `minimal-slash-command.test.ts:28,:64` | M2 |
| SLSH-8 | SLSH-2 | `slash-dispatch.test.ts:183,:209` | M2 |
| SLSH-9 | SLSH-3 | `err-note-render.test.ts:148`; `slash-dispatch.test.ts:183` | M1/M2 |
| SLSH-10 | SLSH-4 | `err-note-render.test.ts:170` (verbatim block) | M1 |
| SLSH-11 | SNK-a | `err-note-render.test.ts:171/:173` | M1 |
| SLSH-12 | SNK-b | `err-note-render.test.ts:179/:181` | M1 |
| SLSH-13 | SNK-c | `err-note-render.test.ts:186/:188`; `slash-dispatch.test.ts:186` | M1 |
| SLSH-14 | SNK-d | `err-note-render.test.ts:193/:195` | M1 |
| SLSH-15 | SNK-e | `err-note-render.test.ts:200/:202` | M1 |
| SLSH-16 | SNK-f | `err-note-render.test.ts:207/:209`; `slash-dispatch.test.ts:212` | M1 |
| SLSH-17 | SNK-g | `err-note-render.test.ts:214/:216` | M1 |
| SLSH-18 | SNK-h | `err-note-render.test.ts:221/:228/:233` (null→`respond`) | M1 |
| SLSH-19 | SNK-i | `err-note-render.test.ts:238/:240` | M1 |
| SLSH-20 | SNK-k | `err-note-render.test.ts:245/:250/:256` (catch-all totality) | M1 |
| SLSH-21 | SLSH-4 | `err-note-render.test.ts:291,:318` (leaf-kind computation) | M1 |
| SLSH-22 | SLSH-5 | `err-note-render.test.ts:266,:277,:291,:318` (hop suffix) | M1 |
| SLSH-23 | SLSH-5 | **NEW** `tests/e2e-s5-slsh-chain-suffix.test.ts` (model-invoked tool-error → no suffix) | M1 |
| SLSH-24 | — | UNCOVERED (`details:{event:RuntimeEvent}` payload; session-not-aborted) | M2 |

SNK-a..k template table (each verbatim template asserted): SNK-a `err-note-render.test.ts:173`,
SNK-b `:181`, SNK-c `:188`, SNK-d `:195`, SNK-e `:202`, SNK-f `:209`, SNK-g `:216`,
SNK-h `:223/:233`, SNK-i `:240`, SNK-k `:250/:256`. (No SNK-j — the templates run a..k
skipping j, matching spec; renderer total over the nine-variant union + catch-all.)

### 5.3 INV (invocation/invoke) — REQ-INV-1..21

| REQ | Covered by | M |
|---|---|---|
| INV-1 | **NEW** `tests/e2e-s5-invoke-untyped-style.test.ts:88,:106` (import-non-warp + invoke sole inline surface) | M1 |
| INV-2 | `invoke-diagnostics.test.ts:244,:256,:278` | M1 |
| INV-3 | `invocation-core.test.ts:54,:63,:74,:88,:118` | M1 |
| INV-4 | `invocation-core.test.ts:139,:159,:103` (both channels; runtime re-check) | M1 |
| INV-5 | **NEW** `tests/e2e-s5-invoke-untyped-style.test.ts:129,:138` (untyped `returnSchema===null`, discards) + typed path `invoke-diagnostics.test.ts:110/:123/:138` | M1 |
| INV-6 | `invoke-diagnostics.test.ts:110,:123,:138` | M1 |
| INV-7 | PARTIAL `invoke-diagnostics.test.ts:138`; `invoke-ceiling-depth.test.ts:105` (empty-tail-callee `null` shape unasserted) | M1/M2 |
| INV-8 | `invocation-core.test.ts:221,:230` (single per-pass parse cache, diamond dedup) | M1 |
| INV-9 | `invoke-diagnostics.test.ts:301,:318,:332` | M1 |
| INV-10 | `invoke-diagnostics.test.ts:77,:92` (positional binding/exclusion PARTIAL) | M1 |
| INV-11 | `invoke-diagnostics.test.ts:156,:171,:185,:200,:212` | M1 |
| INV-12 | `invoke-cross-mode.test.ts:69,:74,:78,:96,:102,:108` | M1 |
| INV-13 | `invoke-cross-mode.test.ts:132` | M1 |
| INV-14 | `invoke-prompt-suspend.test.ts:75,:111,:148,:172,:196` | M1 |
| INV-15 | `invoke-cancellation-facets.test.ts:135,:163,:196`; `err-note-render.test.ts:126` | M1 |
| INV-16 | `err-note-render.test.ts:113-127`; `queryerror-variants.test.ts:92,:101,:102` (`cause` enum piecewise) | M1 |
| INV-17 | `invoke-depth-cycle.test.ts:261` (cycle at parse; message text/recursion-allowed PARTIAL) | M1 |
| INV-18 | `invoke-depth-cycle.test.ts:91,:96,:181,:193,:153` | M1 |
| INV-19 | `invoke-depth-cycle.test.ts:211,:228,:138` | M1 |
| INV-20 | **FIND-S5-1** — pinned `it.fails` in `tests/e2e-s5-invoke-untyped-style.test.ts` (AST `style` discriminator absent; borderline) | M1 |
| INV-21 | DEFERRED (per-call timeout; open-struct); closest `frontmatter-contract.test.ts:97` | M2 |

DEFERRED: named-argument surface (→ INV-20 named arm); per-call invoke timeout (INV-21);
symlink-resolution hardening (`openat2`) — `spec-requirements.md:1300-1302`.

### 5.4 BINDER — REQ-BINDER-1..41

| REQ | Covered by | M |
|---|---|---|
| BINDER-1 | live-gated `acceptance/noninteractive-acceptance.test.ts:220`; `slash-dispatch.test.ts:104` (PARTIAL) | M2/M3 |
| BINDER-2 | live-gated leak detector `noninteractive-acceptance.test.ts:243` (PARTIAL) | M2/M3 |
| BINDER-3 | `binder-model-resolution.test.ts:57,:195` | M2 |
| BINDER-4 | `binder-model-resolution.test.ts:57,:84` | M2 |
| BINDER-5 | `binder-model-resolution.test.ts:135,:155,:177,:109` (`false` path via synthetic fake; unreachable in prod under pin) | M2 |
| BINDER-6 | `binder-model-resolution.test.ts:255` | M2 |
| BINDER-7 | `binder-model-resolution.test.ts:226` | M2 |
| BINDER-8 | `bind-context-transcript.test.ts:358`; `binder-system-prompt.test.ts:301,:317` (PARTIAL) | M1 |
| BINDER-9 | `session-context-truncation.test.ts:217` | M1 |
| BINDER-10 | `binder-system-prompt.test.ts:372,:406` | M2 |
| BINDER-11 | `session-context-truncation.test.ts:89,:116,:141,:163,:182` | M1 |
| BINDER-12/13 | `bind-context-transcript.test.ts:127-244` (BNDR-7a..j) | M1 |
| BINDER-14 | `bind-context-transcript.test.ts:246,:271` | M1 |
| BINDER-15 | `bind-context-transcript.test.ts:295,:307` | M1 |
| BINDER-16 | `binder-system-note-determinism.test.ts:178`; `binder-inference-provider-mapping.test.ts:336,:370` | M1 |
| BINDER-17 | `binder-call-cancellation.test.ts:127,:149` | M2 |
| BINDER-18 | no-params bypass `binder-bypass-envelope.test.ts:187,:210,:227`; **warning arm `bind-echo-without-params` UNCOVERED** (only `it.fails` repro elsewhere) | M1 |
| BINDER-19 | `binder-bypass-envelope.test.ts:192,:216`; `production-core-exec.test.ts:322` | M1/M2 |
| BINDER-20 | `binder-bypass-envelope.test.ts:236` | M1 |
| BINDER-21 | schema `binder-bypass-envelope.test.ts:82,:99`; **NEW ok-arm production echo emission** `tests/e2e-s5-binder-echo-emission.test.ts` (CAND-2); needs_info/ambiguous `binder-retry-taxonomy.test.ts:146` | M1/M2 |
| BINDER-22 | `binder-bypass-envelope.test.ts:82,:99` | M1 |
| BINDER-23 | `binder-bypass-envelope.test.ts:113`; `binder-system-note-determinism.test.ts:136` | M1 |
| BINDER-24 | `binder-bypass-envelope.test.ts:247,:255` | M1 |
| BINDER-25 | `binder-bypass-envelope.test.ts:133,:157,:167` | M1 |
| BINDER-26/27/28 | `binder-system-prompt.test.ts:79-342` (8 obligations), `:185-251` (type display/param line), `:301,:317` | M1 |
| BINDER-29 | `defaulting-revalidation.test.ts:47,:63,:82` | M1 |
| BINDER-30/31 | `binder-system-note-determinism.test.ts:45,:69,:91,:121,:136` | M1 |
| BINDER-32/33/34/35 | `argument-echo.test.ts:30-238` (BNDR-6a..x), `:241,:257`; `canonical-number-render.test.ts` | M1 |
| BINDER-36 | **NEW `bind_echo:false` runtime suppression** `tests/e2e-s5-binder-echo-emission.test.ts`; **load-warning `bind-echo-on-bypass` still UNCOVERED** | M1/M2 |
| BINDER-37 | `binder-retry-taxonomy.test.ts:74,:85,:96,:108`; `binder-inference-provider-mapping.test.ts:69-296` | M2 |
| BINDER-38 | `binder-retry-taxonomy.test.ts:146,:166,:181,:192`; `bind-context-transcript.test.ts:307` (custom-type-unsafe); **NEW needs_info via production** `e2e-s5-binder-echo-emission.test.ts` | M1/M2 |
| BINDER-39 | `binder-retry-taxonomy.test.ts:192,:224,:252` | M1 |
| BINDER-40 | `binder-retry-taxonomy.test.ts:74,:85,:96,:108,:121` | M2 |
| BINDER-41 | `binder-call-cancellation.test.ts:177` (abort-during-retry); **abort-after-`ok`/pre-AJV sub-case PARTIAL** (only generic `cancellation-core.test.ts:416`) | M2 |

DEFERRED: binder refinement loop; auto context-escalation; `ambiguous.candidates`
rendering; `strictCapable:false` production path (unreachable under Pi-SDK pin)
(`spec-requirements.md:1302-1306`).

---

## 6. Residual coverage gaps (weighty, for follow-up)

Missing coverage (not observed noncompliance): REQ-DISC-4, DISC-8, DISC-19, DISC-21,
DISC-22, DISC-26 (package-root ordering / `@`-scope / package-identity dedup / flag-wiring /
root-set caching / post-mapping collision); REQ-DISC-6 `cross-source-shadow` warning payload;
REQ-SLSH-24 (`details.event` note payload); REQ-BINDER-18/36 load-warning arms
(`bind-echo-without-params`, `bind-echo-on-bypass`); REQ-BINDER-41 abort-after-`ok` sub-case;
REQ-INV-7 empty-tail-callee `null` shape. Methods and rationale per §5 rows.

---

## 7. Definition-of-done status (S5 scope)

- Coverage map: complete for all 126 in-scope reqs (§5); every req is covered, partial,
  uncovered-with-reason, or deferred.
- Existing 32-file S5 suite: **green** (333/333).
- New tests: **green** (23/23; 1 `it.fails` pins FIND-S5-1).
- Findings recorded: FIND-S5-1 (borderline) + CAND-2 (test-artifact) in
  `findings/s5-discovery-invoke-binder-findings.md`.
- No `src/**` modified; no existing test weakened.
