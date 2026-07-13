# S6 (pi-integration-contract / session / governance) — findings

Slice S6 areas: PIC, SESS, GOV. Methods: M2 (production composition /
registration / teardown / event-channel via the `tests/harness` +
`createLoomExtension`/`composeExtensionInstance`/`discoverAndComposeFixtures`
entry points) + M4 (SDK pin, capability inventory, editorial governance by
inspection).

One confirmed loom-defect (FIND-S6-1: `description:` dropped at registration on
the production composition path). Three borderline / documentation-drift notes
(FIND-S6-2 stale `session_shutdown` comment; FIND-S6-3 load-phase routing gap;
FIND-S6-4 inventory-closure audit implemented despite being appendix-deferred).
No SESS or GOV runtime defects found.

---

### FIND-S6-1: loom `description:` is dropped at `pi.registerCommand` on the production composition path
- Requirement: REQ-PIC-31 (spec-requirements.md:1064) — "registers survivors via `pi.registerCommand(name,{description,handler})` (only `description`+`handler` keys)"; DESC area / frontmatter-fields-a.md (`description` populates the autocomplete dropdown entry).
- Spec citation: `pi-integration-contract/registration-steps.md` §slash-handler-registration; `frontmatter/frontmatter-fields-a.md` §description.
- Method: M2 (production composition via `discoverAndComposeFixtures` and `composeExtensionInstance` through the real `createLoomExtension` factory).
- Repro: `tests/e2e-s6-description-registration.test.ts` (both `it`s). A loom `---\nmode: prompt\ndescription: HELLO-DESC\n---\n@\`hi\``:
  - `discoverAndComposeFixtures(...)` returns a composed runnable whose keys are `slashName,sourcePath,frontmatter,body,callableSet,run` — top-level `description` is **absent**, though `frontmatter.description === "HELLO-DESC"`.
  - Driving the same loom through the shipped `composeExtensionInstance` path, `pi.registerCommand("hi", options)` is called with `options` carrying **no** `description` property.
- Root cause: `src/extension/production-composition.ts:533` reconstructs each runnable loom as `looms.push({ ...composedInput, run: fixture.run })`. `composedInput` carries the nested `frontmatter.description` but not the **top-level** `description` that `composeLoomFixture` computed at `src/extension/loom-composition-producer.ts:300-303` ("Thread the loom's `description:` onto the fixture so factory registration passes it to `pi.registerCommand`"). Only `fixture.run` is picked, so `fixture.description` is discarded. The factory then registers with `fixture.description` (`src/extension/factory.ts:370`), which is `undefined`, so the `description` key is omitted.
- Scope: affects BOTH production paths (`composeExtensionInstance` and `discoverAndComposeFixtures`) because both flow through `runComposePass`. The H4a static-fixture path (`deps.fixtures` composed directly by `composeLoomFixture`) is unaffected.
- Expected: `pi.registerCommand("hi", { description: "HELLO-DESC", handler })`.
- Observed: `pi.registerCommand("hi", { handler })` — the autocomplete entry registers untexted; `///` doc-comment-lowered descriptions and explicit `description:` frontmatter are both lost.
- Verdict: loom-defect
- Severity: partial (dispatch/registration is correct; only the operator-facing autocomplete description is degraded). Fix candidate: spread `description` into the pushed object at `production-composition.ts:533`, e.g. `looms.push({ ...composedInput, ...(fixture.description !== undefined ? { description: fixture.description } : {}), run: fixture.run })`.
- Note: `tests/e2e-s6-description-registration.test.ts` is a CHARACTERIZATION test asserting the current non-conforming behaviour (so the suite stays green). When this defect is fixed, invert the two assertions marked `// FIND-S6-1`.

### FIND-S6-2: stale `session_shutdown` "live-but-empty until Increment B" comment contradicts the wired tree
- Requirement: REQ-PIC-35/76/78/81 (spec-requirements.md:1068, :1096-1101); REQ-SESS-3/SESS-4 (spec-requirements.md:1200-1201).
- Spec citation: `pi-integration-contract/session-shutdown-semantics.md` (five-sub-step teardown).
- Method: M2 (factory teardown wiring).
- Repro: `tests/e2e-s6-session-shutdown-real-teardown.test.ts` — seeding a real `ActiveInvocationRegistry` entry + real `forwardingSignals` source into the `ExtensionInstanceWiring` and firing `session_shutdown` proves sub-step 2 aborts+stamps every entry and sub-step 5 detaches every listener through the shipped factory wiring.
- Expected: the factory comment describes the shipped behaviour.
- Observed: `src/extension/factory.ts:502-509` states sub-steps 2/3/5 are "live-but-empty ... until Increment B threads the real shared registry + signal list", but the shipped tree threads `liveActiveInvocations`/`liveForwardingSignals` (`factory.ts:483-487`) from `production-composition.ts:652/661`, so those sub-steps operate on REAL entries. The code is CORRECT; only the comment is stale (matches code-surface.md §5 "session_shutdown comment/code drift").
- Verdict: borderline (documentation drift; behaviour is spec-conforming and now covered by the new test).
- Severity: cosmetic.

### FIND-S6-3: the "load-phase routing gap" is closed on the shipped path; retained only on the H8a helper path
- Requirement: REQ-PIC-11/85/86 surfacing; error-model.md pre-evaluation-failure surfacing.
- Spec citation: `errors-and-results/error-model.md` (pre-eval failures surface on the `loom-system-note` channel, `triggerTurn:false`).
- Method: M2.
- Repro: existing `tests/load-phase-pre-eval-routing.test.ts` (shipped `composeExtensionInstance` path routes load failures onto the `loom-system-note` channel, not the toast) + new `tests/e2e-s6-load-emit-toast-path.test.ts` (the `discoverAndComposeFixtures` / H8a helper path uses the `ctx.ui.notify` toast + `process.stderr` mirror when `!hasUI`).
- Expected: load diagnostics surface consistently.
- Observed: `src/extension/production-composition.ts:120` comment ("full `loom-system-note` routing for discovery diagnostics is deferred") describes the `makeLoadEmit` toast path only. The shipped `default` export uses `composeInstance: composeExtensionInstance` (`factory.ts:609-615`), whose `emitLoadNote` (`production-composition.ts:632-642`) routes onto the channel — the gap is CLOSED in production. `makeLoadEmit` remains the fallback/off-channel emit and the H8a `discoverFixtures`/hardening-probe path; its toast+stderr behaviour is intentional (off-channel so a throwing `pi.sendMessage` cannot re-enter the channel — the PIC-54 fallback arm).
- Verdict: borderline (both paths' actual behaviour is now tested; the residual comment describes the non-shipped helper path).
- Severity: cosmetic.

### FIND-S6-4: the inventory-closure audit is implemented + gated despite being marked post-1.0/deferred in the appendix
- Requirement: REQ-PIC-157/158 (spec-requirements.md:1157-1158); appendix "Post-1.0 hardening (not a loom-1.0 merge gate)" (spec-requirements.md ~:1318).
- Spec citation: `inventory-audit-intro.md` §sdk-cap-inventory-closure-audit; test-plan §2 (a deferred item observed as shipped must be recorded as `borderline`).
- Method: M4 inspection + M2 (the audit gate runs green).
- Repro: `tests/inventory-closure-audit.test.ts` (10 tests) and `tests/inventory-closure-audit-gate.test.ts` (2 tests) both pass; `tools/` walks 134-135 modules and emits the `audit/canary/scan-floor/ok` + off-inventory seed record. The Deferred appendix says "The automated build-time inventory-closure audit ... [is] all deferred" post-1.0.
- Expected (per appendix): the automated audit is not a loom-1.0 gate.
- Observed: the audit surface-detection, `SDK_SURFACE_INVENTORY` join, `// allow-pi-surface:` exemption grammar, and `audit/<class>/<family>/<symptom>` wire format are implemented AND gated green today.
- Verdict: borderline (deferred item is observable/shipped — recorded per test-plan §2, not a failure). The mechanized surface-set closure it provides is a superset of the loom-1.0 MUST captured by REQ-PIC-160/162 (version-bump step-2 literal-read asserts), which are separately covered by `tests/version-bump-gates.test.ts`.
- Severity: cosmetic (extra coverage beyond the 1.0 gate; no spec contradiction).
