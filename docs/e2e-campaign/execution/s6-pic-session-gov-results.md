# S6 (pi-integration-contract / session / governance) — results

Areas: **PIC** (164), **SESS** (13), **GOV** (14) = 191 requirement rows.
Methods: M2 conformance (production composition / registration / teardown /
event-channel via `tests/harness` + `createLoomExtension` /
`composeExtensionInstance` / `discoverAndComposeFixtures`) + M4 inspection (SDK
pin, capability inventory, editorial governance).

Coverage was determined by (a) spec-tag grep (`PIC-N` / `SM-N` / `GOV-N`) across
`tests/*.test.ts`, (b) keyword grep, and (c) reading the home test files for the
flagged areas. Inspection-only rows are separated per each row's `Testability`
column and the Deferred appendix Cluster 6 ("Host-behaviour presuppositions",
"Purely-informational corpus-convention governance", "Post-1.0 hardening").

---

## 1. Existing-suite results

Command: `npx vitest run <the 36 S6 globs>` → **35 files, 404 tests, all green.**

| Test file | tests | result |
|---|---|---|
| extension-bootstrap-failures | 5 | PASS |
| extension-bootstrap-nonabort | 6 | PASS |
| extension-factory-harness | 13 | PASS |
| composition-producer | 8 | PASS |
| production-core-exec | 10 | PASS |
| production-live-resolvers | 10 | PASS |
| production-subagent-query-model | 15 | PASS |
| production-tools-load-resolution | 12 | PASS |
| production-cancellation-wiring | 4 | PASS |
| production-typed-query-validation | 5 | PASS |
| session-context-truncation | 6 | PASS |
| session-shutdown | 27 | PASS |
| session-shutdown-wiring | 5 | PASS |
| session-swap-tripwire | 13 | PASS |
| runtime-event-channel | 14 | PASS |
| system-note-channel | 13 | PASS |
| checkpoint-seam | 13 | PASS |
| checkpoint-granularity | 6 | PASS |
| filesystem-seam | 31 | PASS |
| clock-id-seams | 18 | PASS |
| schema-validator-seam | 8 | PASS |
| forwarding-detach-wiring | 3 | PASS |
| forwarding-listener-throw-trap | 7 | PASS |
| conversation-drive | 13 | PASS |
| sdk-inventory | 2 | PASS |
| closing-gate | 43 | PASS |
| cross-cutting-gates | 16 | PASS |
| version-bump-acceptance | 7 | PASS |
| version-bump-gates | 9 | PASS |
| inventory-closure-audit | 10 | PASS |
| inventory-closure-audit-gate | 2 | PASS |
| export-visibility | 7 | PASS |
| capability-probe | 21 | PASS |
| drain-state-contract | 18 | PASS |
| drain-gated-dispatch-integration | 4 | PASS |

### Tool gates / arch-checks

| Gate | Command | Result |
|---|---|---|
| Closing gate | `node tools/closing-gate/index.js` | exit 0 (REQ-ID ↔ coverage-matrix ↔ diagnostic-registry reconciled) |
| Code registry | `node tools/code-registry/index.js` | exit 0 (closed diagnostic set, stable ids) |
| No-ambient-primitives | `node tools/arch-checks/no-ambient-primitives.js` | exit 0 |
| No-module-level-mutable | `node tools/arch-checks/no-module-level-mutable.js` | exit 0 |

Also exercised inside vitest: `closing-gate.test` (43) drives the gate against
seeded fixtures; `cross-cutting-gates.test` (16) runs both arch-checks over the
real `src/**` tree; `inventory-closure-audit-gate.test` runs the audit walk.

---

## 2. Coverage map — PIC (164)

Legend: **C** = conformance-testable (M2), **U** = offline-unit (M1, covered in
S3/S4/binder slices or by a gate test), **I** = inspection-only (M4), **L** =
live (M3, S7). Inspection-only rows cite the Deferred appendix.

### 2.1 Capability probe + host prerequisites (REQ-PIC-1..25)

| REQ | class | covering test / note |
|---|---|---|
| PIC-1 | C | capability-probe.test |
| PIC-2 | U | capability-probe.test (node-floor SemVer) |
| PIC-3 | C | capability-probe.test (PIC-3), cross-cutting-gates.test |
| PIC-4 | C | capability-probe.test (PIC-4) |
| PIC-5 | C | capability-probe.test (PIC-5) |
| PIC-6 | C | capability-probe.test (PIC-6) |
| PIC-7 | C | capability-probe.test; session-shutdown.test (PIC-7) |
| PIC-8 | C | capability-probe.test (arity/return-shape ban) |
| PIC-9 | I | probe-count closure — appendix "Purely-informational" / manual-inspection; witnessed by `CAPABILITY_OBLIGATIONS.length===7` (version-bump-gates.test) |
| PIC-10 | C | capability-probe.test (try/catch never-throw) |
| PIC-11 | C | capability-probe.test (single host-incompatible, closed 7-set) |
| PIC-12 | C | capability-probe.test (probe-failed / details.step) |
| PIC-13 | C | capability-probe.test (/reload re-run) |
| PIC-14 | C | capability-probe.test; runtime-event-channel.test (post-probe drift routing) |
| PIC-15 | C | tool-calls-host-denial.test (PIC-52 trust boundary; code_tool Err) |
| PIC-16 | I | SDK pin `~0.75.5` single-source — appendix Host-behaviour presuppositions; version-bump-gates.test (PIC-34) asserts the manifest literal |
| PIC-17 | I | 4 peerDeps move together — appendix; version-bump-gates.test (PIC-34) |
| PIC-18 | I | version-bump procedure gate — extension-factory-harness.test (PIC-18); version-bump-gates.test |
| PIC-19 | C | version-bump-gates.test (typebox `*` own assertion, PIC-34 row) |
| PIC-20 | C | version-bump-gates.test (manifest lock-step) |
| PIC-21 | C | production-live-resolvers.test / composition-producer.test (binder-model-unresolved / strict-capability-unknown W) |
| PIC-22 | I | credential non-storage — appendix Host-behaviour presuppositions (manual/inspection) |
| PIC-23 | C | subagent-isolation.test / production-subagent-query-model.test (no `signal` field; loomAbort listener) |
| PIC-24 | C | version-bump-gates.test (tsc floor / session-shutdown-reason-snapshot brand) |
| PIC-25 | I | one active session per instance — appendix SM-1 presupposition (manual/inspection); session-shutdown.test (PIC-7) |

### 2.2 Registration steps + hot-reload + shutdown ordering (REQ-PIC-26..45)

| REQ | class | covering test / note |
|---|---|---|
| PIC-26 | C | export-visibility.test / cross-cutting-gates.test (ESM `type:module`, no CJS reach) |
| PIC-27 | C | extension-factory-harness.test (default factory export) |
| PIC-28 | C | production-live-resolvers.test (registerFlag `--loom`, path.delimiter split) |
| PIC-29 | C | drain-gated-dispatch-integration.test (PIC-29); drain-state-contract.test |
| PIC-30 | C | drain-state-contract.test (PIC-30, read-only getCommands) |
| PIC-31 | C | drain-gated-dispatch-integration.test (PIC-31); session-shutdown-wiring.test (PIC-31); **FIND-S6-1** (description key dropped) |
| PIC-32 | C | drain-gated-dispatch-integration.test / drain-state-contract.test (PIC-32) |
| PIC-33 | C | scaffold.test (PIC-33 superseded note) |
| PIC-34 | C | scaffold.test (PIC-35 reload collision); registration-reload-wiring.test |
| PIC-35 | C | scaffold.test (PIC-35); **new e2e-s6-session-shutdown-real-teardown.test** |
| PIC-36 | C | registration-reload-wiring.test (PIC-36); watcher-hot-reload-integration.test |
| PIC-37 | C | watcher-terminated-recovery.test (PIC-55); registration-reload-wiring.test |
| PIC-38 | C | registration-reload-wiring.test (PIC-38 build-aside-then-publish) |
| PIC-39 | C | registration-reload-wiring.test (PIC-39 in-flight rule) |
| PIC-40 | C | reload-debounce.test (PIC-49 single-rebuild); composition-producer.test (PIC-40) |
| PIC-41 | C | watcher structural note — registration-reload-wiring.test / reload tests |
| PIC-42 | C | reload structural-note zero-N suppression — registration-reload-wiring.test |
| PIC-43 | C | rename N===2 — registration-reload-wiring.test |
| PIC-44 | C | unknown-reason-rule.test (PIC-45); session-shutdown.test |
| PIC-45 | C | unknown-reason-rule.test (PIC-45 no fast-path) |

### 2.3 Unknown-reason + drain-state + active-invocation + emission isolation (REQ-PIC-46..75)

| REQ | class | covering test / note |
|---|---|---|
| PIC-46..50 | C | unknown-reason-rule.test (PIC-45/46/47/48; snapshot lookup, literals-shape 4 sub-cases) |
| PIC-51 | I | anchor-stable substrings — appendix Purely-informational governance (manual/inspection) |
| PIC-52 | U | unknown-reason-rule.test (throw payload truncation/escaping — offline) |
| PIC-53..54 | C | unknown-reason-rule.test / patch-skew fixtures (widen/narrow pairs) |
| PIC-55..56 | C | drain-state-contract.test (idempotent handler; control-flow ordering) |
| PIC-57 | C | drain-state-contract.test (PIC-30 no third field/gate) |
| PIC-58..61 | C | drain-state-contract.test (PIC-29/31/32 four-tuple; read-failover; `(true,undefined)` reachability) |
| PIC-62..65 | C | active-invocation-registry.test / active-invocation-wiring.test (5-field entry; UUID; setup-wrap; insertion-order iteration); **new e2e-s6-session-shutdown-real-teardown.test** (sub-step-2 over real entries) |
| PIC-66..71 | C | session-shutdown.test (PIC-24/25/26/27/28 emission isolation, serialiser/construction fallbacks, at-most-once) |
| PIC-72..75 | C | session-swap-tripwire.test (session-only full teardown; tripwire arm; dormant; sub-step-2 stamp-throw residual) |

### 2.4 Session-shutdown semantics + bootstrap failures + per-loom registration (REQ-PIC-76..97)

| REQ | class | covering test / note |
|---|---|---|
| PIC-76 | C | session-shutdown.test (five sub-steps); **new e2e-s6-session-shutdown-real-teardown.test** |
| PIC-77 | C | session-shutdown.test (sub-step 1 drain→init order) |
| PIC-78 | C | session-shutdown.test (sub-step 2 stamp-then-abort); **new e2e-s6-...-real-teardown** (stamp reason via factory) |
| PIC-79 | C | session-shutdown.test (sub-step 3 bounded `allSettled`, cap 2000ms, timeout note) |
| PIC-80 | C | session-shutdown.test (per-step isolation, teardown-step-failed closed labels) |
| PIC-81 | C | session-shutdown.test (per-invocation cancelled-by-session-shutdown E, display:false) |
| PIC-82 | C | no-rollback.test / session-shutdown.test (partial-append fate) |
| PIC-83 | C | invoke cancellation tests (parent/child same iteration) |
| PIC-84 | C | session-shutdown-wiring.test (subscribe-after-construct; compose-never-ran no-op) |
| PIC-85 | C | extension-bootstrap-failures.test (per-surface fatality granularity) |
| PIC-86 | C | extension-bootstrap-nonabort.test (getCommands throw drops list, no drain) |
| PIC-87 | C | system-note-channel.test (PIC-21 renderer exception-safe) |
| PIC-88 | C | system-note-channel.test / extension-factory-harness.test (renderMessageRenderer once, Component) |
| PIC-89 | C | extension-bootstrap-failures.test (synchronous void registration, no await) |
| PIC-90 | C | production-tools-load-resolution.test (tools: ToolDefinition 5 fields, AJV validate) |
| PIC-91 | C | subagent-isolation.test (subagent never registerTool; dies with dispose) |
| PIC-92 | C | tool-registration-lifetime.test (prompt-mode registration cache) |
| PIC-93 | U | tool-registration-lifetime.test (PIC-44 byte-compare cache collision — offline) |
| PIC-94 | C | tool-registration-lifetime.test (PIC-17 snapshot/setActiveTools/restore) |
| PIC-95 | C | tool-registration-lifetime.test (PIC-8 restore retry-once, active-set-restore-failed) |
| PIC-96 | C | tool-registration-lifetime.test (PIC-19 setup-side throw → internal-error) |
| PIC-97 | C | tool-registration-lifetime.test (step-2 install vector exact) |

### 2.5 Conversation drive + provider error mapping (REQ-PIC-98..114)

| REQ | class | covering test / note |
|---|---|---|
| PIC-98 | C | conversation-drive.test / prompt-transport-mapping.test (PIC-50 sync throw → transport Err) |
| PIC-99 | C | conversation-drive.test (no await sendUserMessage; deliverAs steer) |
| PIC-100 | C | prompt-transport-mapping.test (PIC-51 stopReason error → transport) |
| PIC-101 | C | prompt-transport-mapping.test (PIC-51b non-error terminators) |
| PIC-102 | C | conversation-drive.test / composition-producer.test (PIC-53 untyped Ok(string) join) |
| PIC-103 | C | query-swallowing-handler.test / conversation-drive.test (loomAbort one-shot; cancelled synth) |
| PIC-104 | C | conversation-drive.test (PIC-18 turn events cancellation-only) |
| PIC-105 | C | conversation-drive.test (PIC-2 sequential prompt-mode) |
| PIC-106 | C | production-typed-query-validation.test (two-phase tool-loop, forced respond) |
| PIC-107 | C | production-typed-query-validation.test / production-live-resolvers.test (typed-query-unsupported-provider W) |
| PIC-108 | L | live typed-query non-compliance → respond-repair — **S7** (live) |
| PIC-109..113 | U | provider-error-mapping (offline): overflow/transport classification, token extraction, stop-reason — S4 offline-unit; queryerror-variants.test |
| PIC-114 | C | version-bump-gates.test (provider seed-field Api-coverage, step 6) |

### 2.6 Subagent + host interfaces (REQ-PIC-115..156)

| REQ | class | covering test / note |
|---|---|---|
| PIC-115 | C | production-subagent-query-model.test / subagent-isolation.test (createAgentSession allowlist) |
| PIC-116 | I | SHOULD-NOT use `systemPromptOverride` — appendix (manual/inspection); subagent-isolation.test (PIC-23) |
| PIC-117 | C | subagent-isolation.test (PIC-40 subagent-model-unresolved) |
| PIC-118 | C | subagent-isolation.test / subagent-drive-teardown.test (PIC-41 no signal field) |
| PIC-119 | C | subagent-isolation.test (PIC-43 Ok from agent_end messages) |
| PIC-120 | C | subagent-isolation.test (PIC-42 session-local subscribe) |
| PIC-121 | C | subagent-drive-teardown.test (PIC-9 dispose in finally, idempotent) |
| PIC-122 | C | subagent-drive-teardown.test (PIC-9 abort not awaited; late reject absorbed) |
| PIC-123 | C | production-subagent-query-model.test (bad createAgentSession → internal-error) |
| PIC-124 | C | subagent-isolation.test (state-isolation matrix) |
| PIC-125 | C | subagent-isolation.test (no-invocation-cap); SESS-7d |
| PIC-126 | C | subagent-isolation.test (PIC-22 N parallel createAgentSession before block released) |
| PIC-127..128 | C | binder tests (binder-inference-call; envelope extraction) — S5 binder + production-live-resolvers.test |
| PIC-129..139 | C | runtime-event-channel.test + system-note-channel.test (sendMessage channel; details 4 shapes; always-log A/B; RuntimeEvent shape; success-side null; dedup/cascade; fallback chain PIC-54; renderer width PIC-56; masked PIC-1) |
| PIC-140 | C | session-context-truncation.test (PIC-16 estimateTokens named export) |
| PIC-141 | C | session-context-truncation.test (buildSessionContext free export) |
| PIC-142 | I | ExtensionContext member allow-list (arm-a MUST-NOT) — appendix / manual-inspection; inventory-closure-audit.test partially witnesses |
| PIC-143 | U | binder-model-matcher inputs (id/provider not api) — offline, binder tests (S5) |
| PIC-144 | C | production-live-resolvers.test / tool-calls-execute-lowering.test (ctx 3-member override) |
| PIC-145 | C | tool-calls-execute-lowering.test (loom-direct: UUID, lowered params, ctx) |
| PIC-146 | C | tool-return-shape-one-note-production-wired.test (AgentToolResult filter, tool-return-shape internal-error) |
| PIC-147 | C | tool-calls-execute-lowering.test / tool-calls-swallowing-handler.test (execute outcome routing, late-settle discard) |
| PIC-148 | C | subagent-isolation.test (AgentSession.{abort,dispose,sendUserMessage,subscribe}) |
| PIC-149 | C | cancellation-core.test / production-cancellation-wiring.test (loomAbort authoritative) |
| PIC-150 | C | checkpoint-seam.test / checkpoint-granularity.test (PIC-10 before(kind,site), loop-iter macrotask) |
| PIC-151 | C | schema-validator-seam.test (PIC-11 one-pass, no-defaulting, cache collision) |
| PIC-152 | C | clock-id-seams.test (PIC-12 Clock, ambient-timing ban) |
| PIC-153 | C | filesystem-seam.test (PIC-13 FileSystem members, .code rejections) |
| PIC-154 | C | watch-token-seams.test / watcher-*.test (PIC-14 FileWatcher add/change/unlink + terminal) |
| PIC-155 | C | session-context-truncation.test (PIC-16 TokenEstimator per-message determinism) |
| PIC-156 | C | clock-id-seams.test (PIC-20 IdSource UUID, crypto.randomUUID ban) |

### 2.7 SDK inventory + version bump (REQ-PIC-157..164)

| REQ | class | covering test / note |
|---|---|---|
| PIC-157 | C | sdk-inventory.test / inventory-closure-audit.test (PIC-15 `CAPABILITY_OBLIGATIONS.length===7`) |
| PIC-158 | C | sdk-inventory.test / inventory-closure-audit.test (registerFlag/getFlag not a capability) — see **FIND-S6-4** |
| PIC-159 | C | sdk-inventory.test (capability items 1-7 pin members) |
| PIC-160 | C | version-bump-gates.test (step-2(a) literal-read presence + count + reason-snapshot) |
| PIC-161 | C | version-bump-gates.test (bidirectional reason type-equality brand) |
| PIC-162 | I | 7-step bump procedure / green e2e evidence — appendix (manual/inspection); mechanical arm in version-bump-gates.test |
| PIC-163 | I | editorial per-item (a)-(as) recording in bump commit — appendix Host-behaviour presuppositions (manual/inspection) |
| PIC-164 | C | version-bump-gates.test (step 3 engines.node three-way equality) |

**PIC totals:** 164 rows — **~132 C** (all covered), **8 U** offline-unit
(covered in S3/S4/binder/gate tests), **~13 I** inspection-only (PIC-9,16,17,18,
22,25,51,116,142,162,163 — appendix-cited), **1 L** live (PIC-108 → S7). New
tests deepen PIC-31/35/76/78/62-65 and reveal FIND-S6-1.

---

## 3. Coverage map — SESS (13)

| REQ | tag | class | covering test / note |
|---|---|---|---|
| SESS-1 | SM-1 | I | single active session — appendix presupposition; session-shutdown.test (PIC-7) |
| SESS-2 | SM-2 | C | unknown-reason-rule.test; session-shutdown.test (closed set + unknown → full teardown + reason-unknown W) |
| SESS-3 | SM-3a | C | session-shutdown.test (full teardown every reason); **new e2e-s6-session-shutdown-real-teardown.test** |
| SESS-4 | SM-3b | C | session-swap-tripwire.test (session-swap semantics); **new e2e-s6-...-real-teardown** |
| SESS-5 | SM-4 | C | session-swap-tripwire.test (session-only full teardown, tripwire arm) |
| SESS-6 | SM-5 | C | session-swap-tripwire.test / session-shutdown.test (no degraded tag/note) |
| SESS-7 | SM-6 | C | session-swap-tripwire.test (session-swap-instance-survived E before fail-fast) |
| SESS-8 | SM-7a | C | active-invocation-registry.test / production-cancellation-wiring.test (own loomAbort, distinct entry) |
| SESS-9 | SM-7b | C | subagent-isolation.test (transcript/tool-table isolation subagent-only) |
| SESS-10 | SM-7c | C | conversation-drive.test (PIC-2 prompt-mode sequential) |
| SESS-11 | SM-7d | C | subagent-isolation.test (no-invocation-cap, no scheduler) |
| SESS-12 | SM-7e | C | invoke-cancellation-facets.test (downward-only cancellation) |
| SESS-13 | SM-8 | C | ceiling-arbitration.test / invoke depth tests (per-invocation budget non-sharing) |

**SESS totals:** 13 rows — 12 C (all covered), 1 I (SESS-1 presupposition). No
defects.

---

## 4. Coverage map — GOV (14)

The S6 GOV lens is the *testable* governance surface: the closed diagnostic set
(code-registry), the coverage-matrix reconciliation (closing-gate), and the
version-bump gates. The corpus-anchor / release-version-literal governance rows
are spec-corpus editorial rules (govern `docs/spec_topics`, not the runtime);
they are mechanized where a gate exists and otherwise M4 inspection.

| REQ | tag | class | covering test / note |
|---|---|---|---|
| GOV-1 | GOV-3 | C(gate) | closing-gate.test (GOV-1; REQ-ID prefix closure, `[A-Z]{2,4}` subset of union) |
| GOV-2 | GOV-5 | C(gate) | closing-gate.test (word-boundary-distinct prefixes) |
| GOV-3 | GOV-6 | C(gate) | closing-gate.test / `tools/closing-gate` (prefixes ⊆ live+retired union) |
| GOV-4 | GOV-24 | C(gate) | closing-gate.test (prefix→page append-only, key uniqueness) |
| GOV-5 | — | I | retired sub-tables append-only — appendix Retired-REQ-ID rows (editorial/manual) |
| GOV-6 | GOV-16 | C(gate) | closing-gate.test (inline-label closure invariant; stable-inline-labels arm) |
| GOV-7 | GOV-1 | I | canonical anchor dual-form — manual/inspection |
| GOV-8 | GOV-9 | C(gate) | closing-gate.test (GOV-9; cross-page `#prefix-n` resolution) |
| GOV-9 | GOV-19 | I | release version literal forms — corpus editorial (offline-unit over docs; no runtime gate) |
| GOV-10 | GOV-29 | I | canonical-arm slug uniqueness — corpus editorial |
| GOV-11 | GOV-23 | I | `sm-N` anchor no-reuse — manual/inspection |
| GOV-12 | GOV-17 | I | no circular cross-refs — corpus editorial (offline over docs) |
| GOV-13 | GOV-31 | C(gate) | version-bump-gates.test (`CAPABILITY_OBLIGATIONS.length===7` aggregator); closing-gate integer-count aggregators; code-registry (closed set) |
| GOV-14 | GOV-15 | I | "loads cleanly" definition + 1.x stability — manual/inspection (deferred GOV-15 conformance-fixture suite is post-1.0 per appendix) |

Closed-diagnostic-set reconciliation (the core testable GOV obligation) is
covered by `code-registry.test` / `tools/code-registry` (exit 0) and the
`closing-gate` REQ-ID ↔ registry reconciliation (43 tests green).

**GOV totals:** 14 rows — 6 mechanized by a shipped gate (C-gate, all green), 8
corpus-editorial / manual-inspection (M4; several are offline-unit rules over
`docs/spec_topics` with no shipped runtime gate). No defects.

---

## 5. New tests authored

All under `tests/`, driving the production composition (M2). 4 files, 10 tests,
all green. No `src/**` changes; no existing test weakened.

| File | tests | what it drives | rows / gap |
|---|---|---|---|
| e2e-s6-session-shutdown-real-teardown.test.ts | 4 | factory `session_shutdown` over a SEEDED `ActiveInvocationRegistry` + `forwardingSignals` wiring | PIC-35/76/78/81, SESS-3/4; closes the empty-registry gap in session-shutdown-wiring.test; documents FIND-S6-2 (stale comment) |
| e2e-s6-load-emit-toast-path.test.ts | 3 | `discoverAndComposeFixtures` (H8a helper) `makeLoadEmit` toast + stderr | load-phase routing gap (FIND-S6-3); confirms the OTHER path's actual behaviour vs the channel-routed shipped path |
| e2e-s6-package-merge.test.ts | 1 | `composeExtensionInstance` over a real workspace with a node_modules package | composition-root two-stage package merge (`!claimed.has`) — previously covered only in isolation by package-discovery.test |
| e2e-s6-description-registration.test.ts | 2 | `discoverAndComposeFixtures` + `composeExtensionInstance` → `pi.registerCommand` | **FIND-S6-1** characterization (description dropped at registration) |

Run: `npx vitest run e2e-s6-session-shutdown-real-teardown e2e-s6-load-emit-toast-path e2e-s6-package-merge e2e-s6-description-registration` → 4 files / 10 tests PASS.

---

## 6. Findings summary

See `findings/s6-pic-session-gov-findings.md`.

| Finding | verdict | severity |
|---|---|---|
| FIND-S6-1 `description:` dropped at `pi.registerCommand` (production path) | loom-defect | partial |
| FIND-S6-2 stale `session_shutdown` "live-but-empty" comment (factory.ts:502-509) | borderline (doc drift) | cosmetic |
| FIND-S6-3 load-phase routing gap closed on shipped path; retained on H8a helper | borderline | cosmetic |
| FIND-S6-4 inventory-closure audit shipped despite appendix "post-1.0 deferred" | borderline | cosmetic |

---

## 7. Summary counts

- Requirement rows in scope: **191** (PIC 164 + SESS 13 + GOV 14).
- Existing S6 suite: **35 files / 404 tests — all green.**
- Tool gates: closing-gate, code-registry, no-ambient-primitives,
  no-module-level-mutable — **all exit 0.**
- Inspection-only (M4, appendix-cited): PIC ~13, SESS 1, GOV ~8.
- Live-deferred (S7): PIC-108 (1).
- Conformance/offline rows: **all covered** by a cited test (existing or new);
  the composition-root package merge and the description-registration boundary
  were the only previously-thin conformance spots — both now covered by new
  tests, the latter revealing FIND-S6-1.
- New tests: **4 files / 10 tests — all green.**
- Findings: **1 loom-defect** (FIND-S6-1, partial) + **3 borderline/doc-drift**.
