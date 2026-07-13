import { describe, expect, it } from "vitest";
import type { Diagnostic } from "../src/diagnostics/diagnostic";
import type { LoomSource } from "../src/lexer/lexer";
import type { SystemNoteChannelDeps } from "../src/extension/system-note-channel";
import type { ModelReferenceMatcher } from "../src/parser/frontmatter";
import {
  parseLoomDocument,
  type ParseLoomDocumentDeps,
} from "../src/parser/loom-document";

// S4 e2e campaign — witnesses for the ten registry diagnostic codes that the
// shipped tree previously NEVER emitted. Each was a loom-defect: the closed
// registry (DIAG-1/2) mandated the code and its trigger, but the implementation
// could not produce it. Findings FIND-S4-1..10, see
// findings/s4-errors-diagnostics-findings.md.
//
// Phase-D src fixes (FIX-1 parser structural, FIX-2 type layer, FIX-3
// frontmatter advisory) closed all ten. Per D7 these witnesses have been
// reconciled from `it.fails` (defect-recording) to plain `it(...)` — they are
// now permanent POSITIVE gates asserting each code fires on its documented
// trigger. Do not weaken these back to `it.fails`.

function makeDeps(): ParseLoomDocumentDeps {
  const systemNote: SystemNoteChannelDeps = {
    pi: { sendMessage: (): void => {} },
    ui: { notify: (): void => {} },
    emitDiagnostic: (): void => {},
  };
  const modelMatcher: ModelReferenceMatcher = {
    resolve: (): "resolved" => "resolved",
  };
  return { systemNote, modelMatcher };
}

function codesOf(src: string): string[] {
  const source: LoomSource = {
    path: "test.loom",
    bytes: new TextEncoder().encode(src),
  };
  return parseLoomDocument(source, makeDeps()).diagnostics.map(
    (d: Diagnostic) => d.code,
  );
}

describe("S4 — control: the offline pipeline DOES emit code-level diagnostics", () => {
  it("a known parse error fires (proves the harness observes code, not literal text)", () => {
    expect(codesOf("let x =")).toContain("loom/parse/let-without-initialiser");
  });
});

describe("S4 — registry codes now emitted (permanent positive gates, D7-reconciled)", () => {
  // FIND-S4-1 — REQ-DIAG-69 / REQ-EXPR-23. code-registry-parse.md:59.
  it("loom/parse/unknown-identifier — undefined identifier in value position", () => {
    expect(codesOf("let x = doesNotExist")).toContain("loom/parse/unknown-identifier");
  });

  // FIND-S4-2 — REQ-DIAG-70 / REQ-EXPR-23 ("parse error, not a runtime failure").
  it("loom/parse/unknown-method — method not on the built-in list", () => {
    expect(codesOf('let x = "hi".frobnicate()')).toContain("loom/parse/unknown-method");
  });

  // FIND-S4-3 — REQ-DIAG-46. code-registry-parse.md:36.
  it("loom/parse/mixed-plus-operands — '+' on number and string", () => {
    expect(codesOf('let x = 1 + "a"')).toContain("loom/parse/mixed-plus-operands");
  });

  // FIND-S4-4 — REQ-DIAG-47. code-registry-parse.md:37.
  it("loom/parse/non-orderable-operands — '<' on two booleans", () => {
    expect(codesOf("let x = true < false")).toContain("loom/parse/non-orderable-operands");
  });

  // FIND-S4-5 — REQ-DIAG-54. code-registry-parse.md:44.
  it("loom/parse/extra-object-field — constructor lists an undeclared field", () => {
    expect(codesOf('schema S { a: string }\nlet x = S { a: "h", b: 2 }')).toContain(
      "loom/parse/extra-object-field",
    );
  });

  // FIND-S4-6 — REQ-DIAG-56. code-registry-parse.md:46.
  it("loom/parse/bare-object-literal — bare {…} in expression position", () => {
    expect(codesOf("let x = { a: 1 }")).toContain("loom/parse/bare-object-literal");
  });

  // FIND-S4-7 — REQ-DIAG-113. code-registry-parse.md:103.
  it("loom/parse/bind-echo-on-bypass — bind_echo:true on single-string bypass", () => {
    expect(
      codesOf("---\nmode: prompt\nparams:\n  q: string\nbind_echo: true\n---\nhi"),
    ).toContain("loom/parse/bind-echo-on-bypass");
  });

  // FIND-S4-8 — REQ-DIAG-131. code-registry-load.md:17.
  it("loom/load/bind-echo-without-params — bind_echo:true on a no-params loom", () => {
    expect(codesOf("---\nmode: prompt\nbind_echo: true\n---\nhi")).toContain(
      "loom/load/bind-echo-without-params",
    );
  });

  // FIND-S4-9 — REQ-DIAG-146. code-registry-load.md:32.
  it("loom/load/argument-hint-not-displayed — argument-hint without description", () => {
    expect(codesOf("---\nmode: prompt\nargument-hint: foo\n---\nhi")).toContain(
      "loom/load/argument-hint-not-displayed",
    );
  });

  // FIND-S4-10 — REQ-DIAG-127 / REQ-FRNT-23. code-registry-load.md:13.
  it("loom/load/deferred-frontmatter-field — a reserved/deferred frontmatter field", () => {
    // binder_temperature is enumerated in the Cluster-4 deferred appendix as a
    // deferred-frontmatter-field warning (spec-requirements.md:1264).
    expect(codesOf("---\nmode: prompt\nbinder_temperature: 0.5\n---\nhi")).toContain(
      "loom/load/deferred-frontmatter-field",
    );
  });
});

describe("S4 — FIND-S4-10 reserved-field routing (D7-reconciled)", () => {
  // FIX-3 added a deferred/reserved-field set to src/parser/frontmatter.ts, so a
  // reserved key (binder_temperature) now routes to the spec-correct
  // loom/load/deferred-frontmatter-field and NO LONGER falls through to the
  // generic unknown-frontmatter-field.
  it("binder_temperature now yields loom/load/deferred-frontmatter-field (correct code)", () => {
    const codes = codesOf("---\nmode: prompt\nbinder_temperature: 0.5\n---\nhi");
    expect(codes).toContain("loom/load/deferred-frontmatter-field");
    expect(codes).not.toContain("loom/load/unknown-frontmatter-field");
  });
});
