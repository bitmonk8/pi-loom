# S2 (frontmatter-imports) — findings

Slice S2 areas: FRNT, DESC, IMP. Method: M1 offline (`parseFrontmatter` /
`parseLoomDocument`). Three confirmed spec-noncompliances, all in the FRNT
advisory-diagnostic surface. No DESC or IMP defects found.

All three are the same shape: a **W-level advisory diagnostic present in the
closed diagnostic registry and required by an in-scope FRNT row is never emitted
by any `src/**` path**. Confirmed absent across the whole source tree
(`grep -rn <code> src` returns nothing) and confirmed at runtime through the
real parse entry (`tests/e2e-s4-probe.test.ts` PROBE output + the paired
`tests/e2e-s2-advisory-diagnostics.test.ts` `it.fails` repros). The parser
explicitly scopes the bypass warnings out at `src/parser/frontmatter.ts:759-762`
("the dedicated no-params / bypass warnings are out of scope").

---

### FIND-S2-1: reserved `binder_temperature` surfaces as generic `unknown-frontmatter-field`, not `deferred-frontmatter-field`
- Requirement: REQ-FRNT-23 (spec-requirements.md:328)
- Spec citation: docs/spec_topics/diagnostics/code-registry-load.md:13 (`loom/load/deferred-frontmatter-field`, W); docs/spec_topics/frontmatter/frontmatter-fields-a.md:32 (deferred field vocabulary — `binder_temperature`)
- Method: M1 (`parseFrontmatter` / `parseLoomDocument`)
- Repro: `tests/e2e-s2-advisory-diagnostics.test.ts` (`S2/FRNT-23`); frontmatter `---\nmode: prompt\nbinder_temperature: 0.5\n---`. Also `tests/e2e-s4-probe.test.ts` PROBE `deferred-frontmatter`.
- Expected: one `loom/load/deferred-frontmatter-field` (W) naming the reserved field; the loom still registers.
- Observed: one `loom/load/unknown-frontmatter-field` (W) `unknown frontmatter field 'binder_temperature'`; `deferred-frontmatter-field` never fires. There is no reserved-name discrimination — every non-vocabulary key routes to `unknown-frontmatter-field`.
- Verdict: loom-defect
- Severity: partial (advisory only; loom loads and registers correctly; the wrong-but-present warning is emitted)

### FIND-S2-2: `bind_echo: true` on a no-params loom emits no `bind-echo-without-params` warning
- Requirement: REQ-FRNT-22 (spec-requirements.md:327)
- Spec citation: docs/spec_topics/diagnostics/code-registry-load.md:17 (`loom/load/bind-echo-without-params`, W); frontmatter-fields-a.md:47
- Method: M1
- Repro: `tests/e2e-s2-advisory-diagnostics.test.ts` (`S2/FRNT-22`); frontmatter `---\nmode: prompt\nbind_echo: true\n---`. Also `tests/e2e-s4-probe.test.ts` PROBE `bind-echo-without-params` → `[]`.
- Expected: `loom/load/bind-echo-without-params` (W); no echo is produced regardless.
- Observed: no diagnostic emitted; `src/parser/frontmatter.ts:759-762` records the code is deliberately unimplemented ("out of scope").
- Verdict: loom-defect
- Severity: partial (advisory only)

### FIND-S2-3: `argument-hint` without `description` emits no `argument-hint-not-displayed` warning
- Requirement: REQ-FRNT-5 (spec-requirements.md:310)
- Spec citation: docs/spec_topics/diagnostics/code-registry-load.md:32 (`loom/load/argument-hint-not-displayed`, W); frontmatter-fields-a.md:38
- Method: M1
- Repro: `tests/e2e-s2-advisory-diagnostics.test.ts` (`S2/FRNT-5`); frontmatter `---\nmode: prompt\nargument-hint: <file>\n---`. Also `tests/e2e-s4-probe.test.ts` PROBE `argument-hint-no-desc` → `[]`.
- Expected: advisory `loom/load/argument-hint-not-displayed` (W) when `argument-hint:` is declared without `description:`.
- Observed: no diagnostic emitted; code absent from all `src/**`.
- Verdict: loom-defect
- Severity: partial (advisory only). Note: the *autocomplete gap itself* (Pi `RegisteredCommand` has no `argumentHint` slot) is a Future-Considerations non-goal (Deferred appendix, frontmatter-fields-a.md:51); the missing behaviour here is only the advisory diagnostic, which is in-scope and registry-listed.

---

## Cross-cutting note (not a separate finding)

All three codes are in the closed registry (DIAG-2). The H5a closing-gate
reconciliation (`tools/code-registry/index.js`) requires every registry code to
have an asserting test; a registry code that no `src` path can emit and no test
asserts should surface as `registry-code-no-asserting-test`. Whether the closing
gate currently masks these three is an S6/GOV (meta-gate) concern and is flagged
there, not resolved here. The `it.fails` repros in
`tests/e2e-s2-advisory-diagnostics.test.ts` will flip from pass→fail the moment
the emitters are added (Phase-D/E signal to delete the `.fails` markers and, if
appropriate, register the asserting tests).
