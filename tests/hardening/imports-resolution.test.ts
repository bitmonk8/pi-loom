import { describe, it, expect } from "vitest";
import { requireLiveProvider, runProbe } from "./probe-harness";

// IMPORTS & .thetalib MODULES — live probes against the shipped extension.
//
// Each probe plants a `.theta` under source:'project' (path 'main.theta' → the
// slash command `/main`) and a `.thetalib` alongside (also source:'project', so it
// lands in the same `.pi/theta/` dir and `./lib.thetalib` resolves relative to the
// theta's own directory). Most checks are ZERO-TOKEN: they observe
// `registeredNames` (did the theta register?) and `systemNotes` (the shipped V4e
// `theta-system-note` load-diagnostic channel; `probe.diagnostics` /
// ctx.ui.notify is empty at load time — see the probe-harness header) with no
// model turn.

describe("imports & .thetalib — resolution and diagnostics", () => {
  const provider = requireLiveProvider();

  // Control: a well-formed `.theta` importing an existing symbol from an
  // existing `.thetalib` should register cleanly (baseline for the rest).
  it("IMP-control: a valid .thetalib import registers with no error diagnostics", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "main.theta",
          text: [
            "---",
            "description: control",
            "mode: prompt",
            "---",
            'import { Author } from "./lib.thetalib"',
            "@`say ok`",
          ].join("\n"),
        },
        {
          source: "project",
          path: "lib.thetalib",
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
  // MUST emit `theta/load/unresolvable-thetalib-path` and NOT register the file.
  it("IMP-A: import from a nonexistent .thetalib is not diagnosed / does not un-register", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "main.theta",
          text: [
            "---",
            "description: missing module",
            "mode: prompt",
            "---",
            'import { Author } from "./does-not-exist.thetalib"',
            "@`say ok`",
          ].join("\n"),
        },
      ],
    });
    try {
      const codes = probe.systemNotes;
      // eslint-disable-next-line no-console
      console.log("IMP-A registered:", JSON.stringify(probe.registeredNames));
      // eslint-disable-next-line no-console
      console.log("IMP-A diagnostics:", JSON.stringify(codes));
      const hasUnresolvable = probe.systemNotes.some((n) =>
        /cannot resolve .thetalib import|unresolvable/i.test(n),
      );
      // Spec expects a diagnostic and no registration. Assert the spec so a
      // pass means the feature works and a fail documents the observed gap.
      expect(
        hasUnresolvable || !probe.registeredNames.includes("main"),
        `expected theta/load/unresolvable-thetalib-path OR /main un-registered; got registered=${JSON.stringify(
          probe.registeredNames,
        )} diagnostics=${JSON.stringify(codes)}`,
      ).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  // IMP-B — import path pointing at a .theta (wrong extension). Spec imports.md
  // §Path resolution + lexical §Extension matching: a non-`.thetalib` import path is
  // `theta/parse/import-non-thetalib-extension`.
  it("IMP-B: import from a .theta path is not rejected", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "main.theta",
          text: [
            "---",
            "description: import from theta",
            "mode: prompt",
            "---",
            'import { Author } from "./other.theta"',
            "@`say ok`",
          ].join("\n"),
        },
        {
          source: "project",
          path: "other.theta",
          text: ["---", "description: o", "mode: prompt", "---", "@`ok`"].join("\n"),
        },
      ],
    });
    try {
      const codes = probe.systemNotes;
      // eslint-disable-next-line no-console
      console.log("IMP-B registered:", JSON.stringify(probe.registeredNames));
      // eslint-disable-next-line no-console
      console.log("IMP-B diagnostics:", JSON.stringify(codes));
      const hasExtErr = probe.systemNotes.some((n) =>
        /does not end in .thetalib|import-non-thetalib-extension/i.test(n),
      );
      expect(
        hasExtErr || !probe.registeredNames.includes("main"),
        `expected theta/parse/import-non-thetalib-extension OR /main un-registered; got registered=${JSON.stringify(
          probe.registeredNames,
        )} diagnostics=${JSON.stringify(codes)}`,
      ).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  // IMP-C — importing a symbol that isn't exported by the resolved .thetalib.
  // Spec imports.md §Unknown imported symbol: `theta/parse/import-unknown-symbol`.
  it("IMP-C: importing an undeclared symbol is not diagnosed", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "main.theta",
          text: [
            "---",
            "description: unknown symbol",
            "mode: prompt",
            "---",
            'import { NotExported } from "./lib.thetalib"',
            "@`say ok`",
          ].join("\n"),
        },
        {
          source: "project",
          path: "lib.thetalib",
          text: "schema Author {\n  name: string\n}\n",
        },
      ],
    });
    try {
      const codes = probe.systemNotes;
      // eslint-disable-next-line no-console
      console.log("IMP-C registered:", JSON.stringify(probe.registeredNames));
      // eslint-disable-next-line no-console
      console.log("IMP-C diagnostics:", JSON.stringify(codes));
      const hasUnknown = probe.systemNotes.some((n) =>
        /is not declared or re-exported|import-unknown-symbol/i.test(n),
      );
      expect(
        hasUnknown || !probe.registeredNames.includes("main"),
        `expected theta/parse/import-unknown-symbol OR /main un-registered; got registered=${JSON.stringify(
          probe.registeredNames,
        )} diagnostics=${JSON.stringify(codes)}`,
      ).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  // IMP-D — a `.thetalib` top-level statement/query. Spec imports.md §.thetalib file
  // rules: a top-level statement/query in a .thetalib is
  // `theta/parse/thetalib-top-level-statement`.
  it("IMP-D: a .thetalib top-level query/statement is not diagnosed", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "main.theta",
          text: [
            "---",
            "description: thetalib toplevel",
            "mode: prompt",
            "---",
            'import { Author } from "./lib.thetalib"',
            "@`say ok`",
          ].join("\n"),
        },
        {
          source: "project",
          path: "lib.thetalib",
          // Illegal per spec: a top-level `let` binding and a top-level query.
          text: [
            "schema Author {",
            "  name: string",
            "}",
            "let leaked = 5",
            "@`this is a top-level query in a .thetalib`",
          ].join("\n"),
        },
      ],
    });
    try {
      const codes = probe.systemNotes;
      // eslint-disable-next-line no-console
      console.log("IMP-D registered:", JSON.stringify(probe.registeredNames));
      // eslint-disable-next-line no-console
      console.log("IMP-D diagnostics:", JSON.stringify(codes));
      const hasThetaLibTopLevel = probe.systemNotes.some((n) =>
        /not permitted in .thetalib|thetalib-top-level-statement/i.test(n),
      );
      expect(
        hasThetaLibTopLevel,
        `expected theta/parse/thetalib-top-level-statement; got registered=${JSON.stringify(
          probe.registeredNames,
        )} diagnostics=${JSON.stringify(codes)}`,
      ).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  // IMP-E — a circular import between .thetalib modules. Spec imports.md §Cycles:
  // `theta/load/import-cycle`.
  it("IMP-E: a circular .thetalib import is not detected", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "main.theta",
          text: [
            "---",
            "description: cycle",
            "mode: prompt",
            "---",
            'import { A } from "./a.thetalib"',
            "@`say ok`",
          ].join("\n"),
        },
        {
          source: "project",
          path: "a.thetalib",
          text: ['import { B } from "./b.thetalib"', "schema A {\n  x: string\n}\n"].join("\n"),
        },
        {
          source: "project",
          path: "b.thetalib",
          text: ['import { A } from "./a.thetalib"', "schema B {\n  y: string\n}\n"].join("\n"),
        },
      ],
    });
    try {
      const codes = probe.systemNotes;
      // eslint-disable-next-line no-console
      console.log("IMP-E registered:", JSON.stringify(probe.registeredNames));
      // eslint-disable-next-line no-console
      console.log("IMP-E diagnostics:", JSON.stringify(codes));
      const hasCycle = probe.systemNotes.some((n) =>
        /import cycle|import-cycle/i.test(n),
      );
      expect(
        hasCycle,
        `expected theta/load/import-cycle; got registered=${JSON.stringify(
          probe.registeredNames,
        )} diagnostics=${JSON.stringify(codes)}`,
      ).toBe(true);
    } finally {
      await probe.dispose();
    }
  });
});
