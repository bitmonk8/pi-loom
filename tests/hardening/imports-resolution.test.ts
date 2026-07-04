import { describe, it, expect } from "vitest";
import { requireLiveProvider, runProbe } from "./probe-harness";

// IMPORTS & .warp MODULES — live probes against the shipped extension.
//
// Each probe plants a `.loom` under source:'project' (path 'main.loom' → the
// slash command `/main`) and a `.warp` alongside (also source:'project', so it
// lands in the same `.pi/looms/` dir and `./lib.warp` resolves relative to the
// loom's own directory). Most checks are ZERO-TOKEN: they observe
// `registeredNames` (did the loom register?) and `diagnostics` (did the load
// phase emit the spec-mandated import diagnostic?) with no model turn.

describe("imports & .warp — resolution and diagnostics", () => {
  const provider = requireLiveProvider();

  // Control: a well-formed `.loom` importing an existing symbol from an
  // existing `.warp` should register cleanly (baseline for the rest).
  it("IMP-control: a valid .warp import registers with no error diagnostics", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "main.loom",
          text: [
            "---",
            "description: control",
            "mode: prompt",
            "---",
            'import { Author } from "./lib.warp"',
            "@`say ok`",
          ].join("\n"),
        },
        {
          source: "project",
          path: "lib.warp",
          text: "schema Author {\n  name: string\n}\n",
        },
      ],
    });
    try {
      // eslint-disable-next-line no-console
      console.log("IMP-control registered:", JSON.stringify(probe.registeredNames));
      // eslint-disable-next-line no-console
      console.log("IMP-control diagnostics:", JSON.stringify(probe.diagnostics));
      expect(probe.registeredNames).toContain("main");
    } finally {
      await probe.dispose();
    }
  });

  // IMP-A — missing module file. Spec imports.md IMP-1: an unresolvable spec
  // MUST emit `loom/load/unresolvable-warp-path` and NOT register the file.
  it("IMP-A: import from a nonexistent .warp is not diagnosed / does not un-register", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "main.loom",
          text: [
            "---",
            "description: missing module",
            "mode: prompt",
            "---",
            'import { Author } from "./does-not-exist.warp"',
            "@`say ok`",
          ].join("\n"),
        },
      ],
    });
    try {
      const codes = probe.diagnostics.map((d) => d.message);
      // eslint-disable-next-line no-console
      console.log("IMP-A registered:", JSON.stringify(probe.registeredNames));
      // eslint-disable-next-line no-console
      console.log("IMP-A diagnostics:", JSON.stringify(codes));
      const hasUnresolvable = probe.diagnostics.some((d) =>
        /cannot resolve .warp import|unresolvable/i.test(d.message),
      );
      // Spec expects a diagnostic and no registration. Assert the spec so a
      // pass means the feature works and a fail documents the observed gap.
      expect(
        hasUnresolvable || !probe.registeredNames.includes("main"),
        `expected loom/load/unresolvable-warp-path OR /main un-registered; got registered=${JSON.stringify(
          probe.registeredNames,
        )} diagnostics=${JSON.stringify(codes)}`,
      ).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  // IMP-B — import path pointing at a .loom (wrong extension). Spec imports.md
  // §Path resolution + lexical §Extension matching: a non-`.warp` import path is
  // `loom/parse/import-non-warp-extension`.
  it("IMP-B: import from a .loom path is not rejected", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "main.loom",
          text: [
            "---",
            "description: import from loom",
            "mode: prompt",
            "---",
            'import { Author } from "./other.loom"',
            "@`say ok`",
          ].join("\n"),
        },
        {
          source: "project",
          path: "other.loom",
          text: ["---", "description: o", "mode: prompt", "---", "@`ok`"].join("\n"),
        },
      ],
    });
    try {
      const codes = probe.diagnostics.map((d) => d.message);
      // eslint-disable-next-line no-console
      console.log("IMP-B registered:", JSON.stringify(probe.registeredNames));
      // eslint-disable-next-line no-console
      console.log("IMP-B diagnostics:", JSON.stringify(codes));
      const hasExtErr = probe.diagnostics.some((d) =>
        /does not end in .warp|import-non-warp-extension/i.test(d.message),
      );
      expect(
        hasExtErr || !probe.registeredNames.includes("main"),
        `expected loom/parse/import-non-warp-extension OR /main un-registered; got registered=${JSON.stringify(
          probe.registeredNames,
        )} diagnostics=${JSON.stringify(codes)}`,
      ).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  // IMP-C — importing a symbol that isn't exported by the resolved .warp.
  // Spec imports.md §Unknown imported symbol: `loom/parse/import-unknown-symbol`.
  it("IMP-C: importing an undeclared symbol is not diagnosed", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "main.loom",
          text: [
            "---",
            "description: unknown symbol",
            "mode: prompt",
            "---",
            'import { NotExported } from "./lib.warp"',
            "@`say ok`",
          ].join("\n"),
        },
        {
          source: "project",
          path: "lib.warp",
          text: "schema Author {\n  name: string\n}\n",
        },
      ],
    });
    try {
      const codes = probe.diagnostics.map((d) => d.message);
      // eslint-disable-next-line no-console
      console.log("IMP-C registered:", JSON.stringify(probe.registeredNames));
      // eslint-disable-next-line no-console
      console.log("IMP-C diagnostics:", JSON.stringify(codes));
      const hasUnknown = probe.diagnostics.some((d) =>
        /is not declared or re-exported|import-unknown-symbol/i.test(d.message),
      );
      expect(
        hasUnknown || !probe.registeredNames.includes("main"),
        `expected loom/parse/import-unknown-symbol OR /main un-registered; got registered=${JSON.stringify(
          probe.registeredNames,
        )} diagnostics=${JSON.stringify(codes)}`,
      ).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  // IMP-D — a `.warp` top-level statement/query. Spec imports.md §.warp file
  // rules: a top-level statement/query in a .warp is
  // `loom/parse/warp-top-level-statement`.
  it("IMP-D: a .warp top-level query/statement is not diagnosed", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "main.loom",
          text: [
            "---",
            "description: warp toplevel",
            "mode: prompt",
            "---",
            'import { Author } from "./lib.warp"',
            "@`say ok`",
          ].join("\n"),
        },
        {
          source: "project",
          path: "lib.warp",
          // Illegal per spec: a top-level `let` binding and a top-level query.
          text: [
            "schema Author {",
            "  name: string",
            "}",
            "let leaked = 5",
            "@`this is a top-level query in a .warp`",
          ].join("\n"),
        },
      ],
    });
    try {
      const codes = probe.diagnostics.map((d) => d.message);
      // eslint-disable-next-line no-console
      console.log("IMP-D registered:", JSON.stringify(probe.registeredNames));
      // eslint-disable-next-line no-console
      console.log("IMP-D diagnostics:", JSON.stringify(codes));
      const hasWarpTopLevel = probe.diagnostics.some((d) =>
        /not permitted in .warp|warp-top-level-statement/i.test(d.message),
      );
      expect(
        hasWarpTopLevel,
        `expected loom/parse/warp-top-level-statement; got registered=${JSON.stringify(
          probe.registeredNames,
        )} diagnostics=${JSON.stringify(codes)}`,
      ).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  // IMP-E — a circular import between .warp modules. Spec imports.md §Cycles:
  // `loom/load/import-cycle`.
  it("IMP-E: a circular .warp import is not detected", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "main.loom",
          text: [
            "---",
            "description: cycle",
            "mode: prompt",
            "---",
            'import { A } from "./a.warp"',
            "@`say ok`",
          ].join("\n"),
        },
        {
          source: "project",
          path: "a.warp",
          text: ['import { B } from "./b.warp"', "schema A {\n  x: string\n}\n"].join("\n"),
        },
        {
          source: "project",
          path: "b.warp",
          text: ['import { A } from "./a.warp"', "schema B {\n  y: string\n}\n"].join("\n"),
        },
      ],
    });
    try {
      const codes = probe.diagnostics.map((d) => d.message);
      // eslint-disable-next-line no-console
      console.log("IMP-E registered:", JSON.stringify(probe.registeredNames));
      // eslint-disable-next-line no-console
      console.log("IMP-E diagnostics:", JSON.stringify(codes));
      const hasCycle = probe.diagnostics.some((d) =>
        /import cycle|import-cycle/i.test(d.message),
      );
      expect(
        hasCycle,
        `expected loom/load/import-cycle; got registered=${JSON.stringify(
          probe.registeredNames,
        )} diagnostics=${JSON.stringify(codes)}`,
      ).toBe(true);
    } finally {
      await probe.dispose();
    }
  });
});
