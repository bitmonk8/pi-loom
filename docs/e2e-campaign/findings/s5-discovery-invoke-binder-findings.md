# S5 (discovery-slash-invoke-binder) — findings

Slice S5 areas: DISC, SLSH, INV, BINDER (126 requirements). Method: M1 + M2.
Companion results: `execution/s5-discovery-invoke-binder-results.md`.

Two findings. No blocks-spec-compliance loom-defects were found in the S5 surface;
the baseline candidate CAND-2 resolves to a **test-artifact** (the loom emits the note
correctly), and one **borderline** forward-compat seam divergence was pinned.

---

### FIND-S5-1: `InvokeExpr` AST node carries no `style: "positional" | "named"` discriminator
- Requirement: REQ-INV-20 (spec tag INV-2 seam carrier)
- Spec citation: `docs/spec_topics/invocation.md:40` — "The invocation AST node carries a `style: 'positional' | 'named'` discriminator; loom 1.0's only invocation surface is positional, so only the `'positional'` arm has defined behaviour (named-argument surface deferred)."
- Method: M1 (offline parse via `parseLoomDocument`)
- Repro: `tests/e2e-s5-invoke-untyped-style.test.ts` — the `describe("REQ-INV-20 …")` block; parse `invoke("./child.loom", 1)` and read the `InvokeExpr.style` field.
- Expected: the parsed `invoke(...)` node exposes `style === "positional"`.
- Observed: the shipped `InvokeExpr` (`src/parser/loom-document.ts:157-168`) carries `{ kind, path, returnSchema, args }` only — there is no `style` field (`node.style === undefined`). The `InvokeStmt` wrapper (`:392-395`) adds none either.
- Verdict: borderline
- Severity: cosmetic
- Notes: loom 1.0's only invocation surface is positional and the parser has exactly one (positional) parse path, so the missing discriminator has **no** observable loom-1.0 behavioural consequence — it is a forward-compatibility (INV-2 named-argument) seam the spec says the AST should already carry but the impl elides. The named-argument *behaviour* is deferred (Deferred appendix, `spec-requirements.md:1300`), but REQ-INV-20 frames the discriminator's *presence* as a testable 1.0 seam. The test encodes it with `it.fails` (the repo's known-red spec-repro idiom): the suite is green today and the block flips to a hard failure the moment production grows the discriminator (promote `it.fails`→`it` then). Candidate for spec-vs-impl reconciliation (either add the field or downgrade the spec statement to "the parser models the positional surface; the `style` discriminator lands with the named surface").

---

### CAND-2 (baseline candidate) — binder echo note absent on acceptance stdout → **test-artifact**
- Requirement: REQ-BINDER-21 (`ok` arm success echo), REQ-SLSH-2 (echo policy), REQ-BINDER-36 (`bind_echo` suppression)
- Spec citation: `docs/spec_topics/binder/defaulting-system-note-echo.md` §"Echo policy" (BND-1) — on a successful bind the runtime appends the one-line `Running /<name>: …` echo system note on the `loom-system-note` channel before the loom starts; `docs/spec_topics/slash-invocation.md:9`.
- Method: M2 (production `ProductionLoomProducer.runBinder()` driven with a scripted binder model; live `complete()` replaced via module mock)
- Repro: `tests/e2e-s5-binder-echo-emission.test.ts` — scripts an `ok` free-text envelope (`{"kind":"ok","args":{…}}`) and observes `pi.sendMessage`.
- Expected: exactly one `loom-system-note` custom message with `display: true` whose content is `Running /code-review: topic=async, audience=team`; a `needs_info` envelope instead emits exactly one failure note `loom /code-review: argument binding needs more info — <message>`; `bind_echo: false` emits zero echo notes.
- Observed: **all of the above hold deterministically.** The production echo emitter (`src/extension/production-loom-producer.ts:618` `#emitBinderEchoNote` → `:647` `pi.sendMessage({ customType: "loom-system-note", content: "Running /…", display: true }, { triggerTurn: false })`) fires on the `ok` arm, the failure emitter (`:823` `#emitBinderFailureNote`) fires on the `needs_info` arm, and `bind_echo: false` short-circuits before emission (`:619`). Test passes 4/4.
- Verdict: test-artifact
- Severity: partial (against the acceptance test/harness, not against loom)
- Analysis: the loom emits the success echo (and the failure note) on the correct channel (`loom-system-note`) with `display: true` and `triggerTurn: false`. The baseline `pi -p` acceptance observation of "no note on stdout" is therefore not a loom emission defect — it is a property of the black-box print-mode capture: a `display: true` custom-type message on the `loom-system-note` channel with `triggerTurn: false` does not add a user/assistant turn (BND-3 requires the binder be invisible to the conversation), so it is not part of the print-mode assistant-text stream the acceptance harness greps stdout for. The existing acceptance assertion (`tests/acceptance/noninteractive-acceptance.test.ts:260`) is already disjunctive (echo **or** failure note) and live-gated; the deterministic M2 test added here is the correct home for pinning the emission. No loom fix is owed. Recommended follow-up (against the test surface, not loom): assert binder-note emission at the M2 `runBinder`/system-note-channel layer (done here) rather than on `pi -p` stdout, which does not surface the invisible binder channel.

---

## Coverage gaps (not findings)

These in-scope requirements remain wholly or partly UNCOVERED but represent **missing
test coverage**, not observed noncompliance — the production behaviour was not exercised,
so no defect is asserted. Enumerated with method in the results doc §"Residual coverage
gaps". Notable weighty gaps left for a follow-up author: REQ-DISC-4 (flag-wiring probe),
REQ-DISC-8 (root-set caching), REQ-DISC-19 (post-mapping collision / abs-path dedup),
REQ-DISC-21/22/26 (package-root ordering, `@`-scope descent, package-identity dedup),
REQ-SLSH-24 (top-level-Err note `details.event` payload), REQ-BINDER-41 (abort-after-`ok`
/ pre-AJV binder sub-case). Deferred items (Deferred appendix Cluster-5) were not tested
as shipped, per plan §2.
