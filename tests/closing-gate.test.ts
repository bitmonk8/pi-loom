import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error — JS closing-gate module, no type declarations.
import { loadCorpus, runClosingGate, extractReqIds, parsePrefixTable, parseRetiredReqIds, parseCoverageMatrix, parseRegistryCodes, extractAssertedCodes, extractCitingReqIds } from "../tools/closing-gate/index.js";

// H5a — REQ-ID / diagnostic-code closing-gate automation. These assertions ARE
// the closing gate "wired into npm test": they run the gate against the seeded
// fixtures under the dedicated test-fixtures root (test-fixtures/closing-gate/,
// outside docs/spec_topics/** and outside this live vitest corpus), green
// against the no-violation fixture and non-empty (red) against each seeded
// violation fixture this leaf owns. Each block cites the conventions.md
// convention it operationalises.

const FIXTURES = fileURLToPath(
  new URL("../test-fixtures/closing-gate", import.meta.url),
);

interface Finding {
  kind: string;
  subject: string;
  detail: string;
}

function gate(scenario: string): Finding[] {
  return runClosingGate(loadCorpus(path.join(FIXTURES, scenario))) as Finding[];
}

function kinds(findings: Finding[]): string[] {
  return findings.map((f) => f.kind);
}

describe("H5a — closing gate against the seeded no-violation fixture", () => {
  it("runs green: every spec REQ-ID mapped, every mapped REQ-ID cited, every registry code asserted", () => {
    expect(gate("no-violation")).toEqual([]);
  });

  it("(Convention: REQ-ID discipline) excludes the loom/typecheck/* brand from registry reconciliation — the no-violation fixture's typecheck brand has no asserting test yet stays green", () => {
    const findings = gate("no-violation");
    expect(
      findings.filter(
        (f) =>
          f.subject.startsWith("loom/typecheck/") ||
          f.kind === "registry-code-no-asserting-test",
      ),
    ).toHaveLength(0);
  });
});

describe("H5a — closing gate against each seeded violation fixture", () => {
  it("(Convention: REQ-ID discipline) fails when a fixture spec REQ-ID has no coverage-matrix row", () => {
    const findings = gate("unmapped-req-id");
    expect(kinds(findings)).toContain("unmapped-executable-req-id");
    expect(findings.find((f) => f.kind === "unmapped-executable-req-id")?.subject).toBe(
      "FOO-3",
    );
    // The unmapped REQ-ID carries no citing-test obligation: this fixture fires
    // exactly the unmapped arm and nothing else.
    expect(kinds(findings)).toEqual(["unmapped-executable-req-id"]);
  });

  it("(Convention: REQ-ID discipline — citing tests) fails when a mapped numbered REQ-ID has no citing test in the seeded test corpus", () => {
    const findings = gate("missing-citing-test");
    expect(kinds(findings)).toEqual(["mapped-req-id-no-citing-test"]);
    expect(findings[0]?.subject).toBe("FOO-2");
  });

  it("(Convention: Diagnostic message anchors) fails when a registry code has no asserting test", () => {
    const findings = gate("registry-code-no-test");
    expect(kinds(findings)).toEqual(["registry-code-no-asserting-test"]);
    expect(findings[0]?.subject).toBe("loom/runtime/orphan");
  });

  it("(Convention: Diagnostic message anchors) fails when a test asserts a diagnostic code absent from the registry", () => {
    const findings = gate("asserted-code-not-in-registry");
    expect(kinds(findings)).toEqual(["asserted-code-not-in-registry"]);
    expect(findings[0]?.subject).toBe("loom/runtime/ghost");
  });
});

describe("H5a — each returned finding is a structured entry tagged with its gap kind", () => {
  it("every finding carries kind / subject / detail fields", () => {
    for (const scenario of [
      "unmapped-req-id",
      "missing-citing-test",
      "registry-code-no-test",
      "asserted-code-not-in-registry",
    ]) {
      for (const f of gate(scenario)) {
        expect(typeof f.kind).toBe("string");
        expect(f.kind.length).toBeGreaterThan(0);
        expect(typeof f.subject).toBe("string");
        expect(typeof f.detail).toBe("string");
      }
    }
  });
});

// Unit coverage of the gate's reconciliation surfaces and extractors, so each
// arm reds out in isolation rather than only through the assembled fixtures.
describe("H5a — gate reconciliation arms (unit)", () => {
  const prefixTable = [
    "## REQ-ID prefix table",
    "| Page | Prefix |",
    "|---|---|",
    "| foo.md | FOO |",
    "",
    "## Retired REQ-IDs",
    "- FOO-2 (retired)",
  ].join("\n");

  it("parsePrefixTable reads the second column tokens; parseRetiredReqIds reads the retirement section", () => {
    expect(parsePrefixTable(prefixTable)).toEqual(["FOO"]);
    expect(parseRetiredReqIds(prefixTable)).toEqual(["FOO-2"]);
  });

  it("extractReqIds excludes the non-executable GOV family and ignores REQ-IDs inside code spans / fences", () => {
    const sources = [
      {
        path: "p.md",
        text: [
          "**FOO-1.** rule.",
          "**GOV-9.** corpus rule — excluded.",
          "`FOO-9` is in an inline code span and must not extract.",
          "```",
          "FOO-8 inside a fence — excluded.",
          "```",
        ].join("\n"),
      },
    ];
    expect(extractReqIds(sources, ["FOO", "GOV"]).sort()).toEqual(["FOO-1"]);
  });

  it("parseCoverageMatrix expands `X-n … X-m` inclusive ranges and comma lists", () => {
    const text = [
      "| REQ-ID | Closing leaf(s) |",
      "|---|---|",
      "| FOO-1 … FOO-3 | `V1a` |",
      "| BAR-1, BAR-4 | `V1b` |",
    ].join("\n");
    expect(parseCoverageMatrix(text).sort()).toEqual([
      "BAR-1",
      "BAR-4",
      "FOO-1",
      "FOO-2",
      "FOO-3",
    ]);
  });

  it("parseRegistryCodes drops the loom/typecheck/* brand; extractAssertedCodes drops it too", () => {
    expect(
      parseRegistryCodes("| `loom/parse/x` | | `loom/typecheck/brand` |"),
    ).toEqual(["loom/parse/x"]);
    expect(
      extractAssertedCodes([
        { path: "t.test.ts", text: 'a("loom/parse/x"); b("loom/typecheck/brand");' },
      ]),
    ).toEqual(["loom/parse/x"]);
  });

  it("extractCitingReqIds collects inline PREFIX-N citations from test sources", () => {
    expect(
      extractCitingReqIds([{ path: "t.test.ts", text: "// FOO-1 and BAR-2 cited" }]).sort(),
    ).toEqual(["BAR-2", "FOO-1"]);
  });

  it("flags a retired/live ID clash and a per-prefix numbering hole", () => {
    const corpus = {
      prefixTableText: [
        "## REQ-ID prefix table",
        "| Page | Prefix |",
        "|---|---|",
        "| foo.md | FOO |",
        "",
        "## Retired REQ-IDs",
        "- FOO-1",
      ].join("\n"),
      // FOO-1 is retired yet appears live (clash); FOO-2 absent → hole below max 3.
      specSources: [{ path: "foo.md", text: "**FOO-1.** x **FOO-3.** y" }],
      coverageMatrixText: "| REQ-ID | Closing leaf(s) |\n|---|---|\n| FOO-1, FOO-3 | `V1a` |",
      registryText: "",
      testSources: [{ path: "t.test.ts", text: "// FOO-1 FOO-3" }],
    };
    const findings = runClosingGate(corpus) as Finding[];
    expect(kinds(findings)).toContain("retired-live-id-clash");
    expect(findings.find((f) => f.kind === "per-prefix-numbering-hole")?.subject).toBe(
      "FOO-2",
    );
  });
});
