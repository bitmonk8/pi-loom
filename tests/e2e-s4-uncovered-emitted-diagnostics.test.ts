import { describe, expect, it } from "vitest";
import type { Diagnostic } from "../src/diagnostics/diagnostic";
import type { LoomSource } from "../src/lexer/lexer";
import type { SystemNoteChannelDeps } from "../src/extension/system-note-channel";
import type { ModelReferenceMatcher } from "../src/parser/frontmatter";
import {
  parseLoomDocument,
  type ParseLoomDocumentDeps,
} from "../src/parser/loom-document";

// S4 e2e campaign — coverage for registry diagnostic codes that ARE emitted by
// the shipped parser but had no shape-asserting test (DIAG "UNCOVERED-emitted",
// per docs/e2e-campaign/execution/s4-errors-diagnostics-results.md). Each test
// drives the production offline pipeline (parseLoomDocument →
// src/parser/loom-document.ts:563) and asserts the emitted code + severity +
// message match the closed registry (DIAG-1/2/4). Expected message strings are
// sourced from the registry Message column (docs/spec_topics/diagnostics/
// code-registry-{parse,load}.md) with `<…>` placeholders interpolated.

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

function parse(src: string): readonly Diagnostic[] {
  const source: LoomSource = {
    path: "test.loom",
    bytes: new TextEncoder().encode(src),
  };
  return parseLoomDocument(source, makeDeps()).diagnostics;
}

function find(src: string, code: string): Diagnostic | undefined {
  return parse(src).find((d) => d.code === code);
}

describe("S4 — UNCOVERED-emitted load-phase frontmatter diagnostics", () => {
  it("loom/load/unknown-mode-value — an out-of-set mode: value (REQ-DIAG-132)", () => {
    const d = find("---\nmode: banana\n---\nhi", "loom/load/unknown-mode-value");
    expect(d).toBeDefined();
    expect(d?.severity).toBe("error");
    expect(d?.message).toBe(
      "unknown 'mode:' value 'banana'; expected 'prompt' or 'subagent'",
    );
  });

  it("loom/load/unknown-methodology-value — bad respond_repair.methodology (REQ-DIAG-133)", () => {
    const d = find(
      "---\nmode: prompt\nrespond_repair:\n  methodology: banana\n---\nhi",
      "loom/load/unknown-methodology-value",
    );
    expect(d).toBeDefined();
    expect(d?.severity).toBe("error");
    expect(d?.message).toBe(
      "unknown 'respond_repair.methodology:' value 'banana'; expected 'validator_error', 'schema_repeat', or 'none'",
    );
  });

  it("loom/load/unknown-bind-context-value — bad bind_context value (REQ-DIAG-134)", () => {
    const d = find(
      "---\nmode: prompt\nbind_context: banana\n---\nhi",
      "loom/load/unknown-bind-context-value",
    );
    expect(d).toBeDefined();
    expect(d?.severity).toBe("error");
    expect(d?.message).toBe(
      "unknown 'bind_context:' value 'banana'; expected 'none' or 'session'",
    );
  });

  it("loom/load/params-null — params: null is rejected (REQ-DIAG-129)", () => {
    const d = find("---\nmode: prompt\nparams: null\n---\nhi", "loom/load/params-null");
    expect(d).toBeDefined();
    expect(d?.severity).toBe("error");
    expect(d?.message).toBe(
      "'params: null' is not permitted; omit 'params:' or use 'params: {}'",
    );
  });
});

describe("S4 — UNCOVERED-emitted parse-phase diagnostics", () => {
  it("loom/parse/import-non-warp-extension — import path not ending in .warp (REQ-DIAG-28)", () => {
    const d = find('import { x } from "./y.loom"', "loom/parse/import-non-warp-extension");
    expect(d).toBeDefined();
    expect(d?.severity).toBe("error");
    expect(d?.message).toBe("import path './y.loom' does not end in .warp");
  });

  it("loom/parse/system-on-prompt-mode — system: on a prompt-mode loom (REQ-DIAG-106)", () => {
    const d = find("---\nmode: prompt\nsystem: hello\n---\nhi", "loom/parse/system-on-prompt-mode");
    expect(d).toBeDefined();
    expect(d?.severity).toBe("error");
    expect(d?.message).toBe("'system:' is not permitted on a mode: prompt loom");
  });

  it("loom/parse/system-interp-not-path — non-path system: interpolation body (REQ-DIAG-107)", () => {
    const d = find(
      "---\nmode: subagent\nparams:\n  a: string\nsystem: x ${1 + 2}\n---\nhi",
      "loom/parse/system-interp-not-path",
    );
    expect(d).toBeDefined();
    expect(d?.severity).toBe("error");
    expect(d?.message).toBe("'system:' interpolation body must be a bare identifier path");
  });

  it("loom/parse/system-interp-unknown-param — unknown param in system: interpolation (REQ-DIAG-108)", () => {
    const d = find(
      "---\nmode: subagent\nsystem: hello ${nope}\n---\nhi",
      "loom/parse/system-interp-unknown-param",
    );
    expect(d).toBeDefined();
    expect(d?.severity).toBe("error");
    expect(d?.message).toBe("'system:' interpolation references unknown param 'nope'");
  });
});
