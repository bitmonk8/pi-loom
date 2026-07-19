import { describe, expect, it } from "vitest";
import type { SourceRange } from "../src/diagnostics/diagnostic";
import {
  checkImportedSymbols,
  computeThetaLibExports,
  thetalibLocalBindings,
  IMPORT_UNKNOWN_SYMBOL_CODE,
  type ImportSpecifier,
  type ReExportSpecifier,
  type ThetaLibDeclaration,
  type ThetaLibModuleForms,
} from "../src/parser/imports";

// V15i-T — failing tests for the paired `V15i` "Imports — export visibility and
// re-exports" implementation.
//
// Spec: imports.md §"Visibility" + §"Re-exports". These three obligations carry
// no numbered REQ-ID; they are the code-keyed obligation area coverage-matrix.md
// records under token `cka-48` (auto-export of every top-level schema/enum/fn;
// the aliased `export … from` re-export that creates no local binding; the
// negative rule that a plain `import` is not re-exported downstream). Each test
// cites `cka-48` inline per the *Tests* code-citation discipline.
//
// These tests red because the V15i visibility bodies are absent: the V15i-T
// stub of `computeThetaLibExports` returns the WRONG set (the plain-import locals,
// which are precisely NOT downstream-visible) and omits the auto-exported
// declarations and the `export … from` re-exports that ARE, and the stub of
// `thetalibLocalBindings` returns the re-export SOURCE names (which a re-export does
// not bind locally). So each visibility assertion reds on its own primary
// assertion (a missing export, a wrongly-present export, a wrongly-present local
// binding, a missing / unexpected downstream diagnostic), not on a compile
// error, missing fixture, or harness throw.

/** A throwaway 1:1–1:2 span for the located specifiers. */
function span(): SourceRange {
  return { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } };
}

function decl(kind: ThetaLibDeclaration["kind"], name: string): ThetaLibDeclaration {
  return { kind, name };
}

function reExport(
  source: string,
  exported: string,
  fromPath = "./x.thetalib",
): ReExportSpecifier {
  return { source, exported, fromPath, range: span() };
}

function plainImport(source: string, local = source): ImportSpecifier {
  return { source, local, range: span() };
}

// --- cka-48 — auto-export visibility ----------------------------------------

describe("V15i-T — cka-48 auto-export visibility", () => {
  it("cka-48: a top-level schema, enum, and fn are each exported with no `export` keyword", () => {
    // A `.thetalib` file with three bare top-level declarations and nothing else —
    // no `export` keyword, no privacy modifier (imports.md §Visibility).
    const forms: ThetaLibModuleForms = {
      declarations: [
        decl("schema", "Author"),
        decl("enum", "Role"),
        decl("fn", "persona_block"),
      ],
      reExports: [],
      plainImports: [],
    };
    const exportsList = computeThetaLibExports(forms);
    // Each declaration is implicitly exported and therefore downstream-visible.
    expect(exportsList, "auto-exported schema").toContain("Author");
    expect(exportsList, "auto-exported enum").toContain("Role");
    expect(exportsList, "auto-exported fn").toContain("persona_block");
  });

  it("cka-48: an importing file resolves an auto-exported symbol with no diagnostic", () => {
    const forms: ThetaLibModuleForms = {
      declarations: [
        decl("schema", "Author"),
        decl("enum", "Role"),
        decl("fn", "persona_block"),
      ],
      reExports: [],
      plainImports: [],
    };
    // The importer's `resolvedExports` come from the resolved `.thetalib` file's
    // computed export set — so a bare `import { Author, Role, persona_block }`
    // binds with no `import-unknown-symbol`.
    const diagnostics = checkImportedSymbols({
      file: "app.theta",
      specPath: "./personas.thetalib",
      specifiers: [
        plainImport("Author"),
        plainImport("Role"),
        plainImport("persona_block"),
      ],
      resolvedExports: computeThetaLibExports(forms),
      localTopLevelNames: [],
    });
    expect(
      diagnostics.filter((d) => d.code === IMPORT_UNKNOWN_SYMBOL_CODE),
      "an auto-exported symbol resolves with no unknown-symbol diagnostic",
    ).toHaveLength(0);
  });
});

// --- cka-48 — re-export with alias ------------------------------------------

describe("V15i-T — cka-48 aliased re-export", () => {
  it("cka-48: `export { A as B } from \"./x.thetalib\"` is visible downstream as B, not A", () => {
    const forms: ThetaLibModuleForms = {
      declarations: [],
      reExports: [reExport("A", "B", "./x.thetalib")],
      plainImports: [],
    };
    const exportsList = computeThetaLibExports(forms);
    expect(exportsList, "the re-export is visible under its alias `B`").toContain(
      "B",
    );
    expect(
      exportsList,
      "the source name `A` is not itself re-exported (only the alias)",
    ).not.toContain("A");
  });

  it("cka-48: the aliased re-export creates no local binding for A (or B)", () => {
    const forms: ThetaLibModuleForms = {
      declarations: [],
      reExports: [reExport("A", "B", "./x.thetalib")],
      plainImports: [],
    };
    const locals = thetalibLocalBindings(forms);
    // A re-export is a dedicated form that binds nothing locally (imports.md
    // §Re-exports): neither the source symbol `A` nor the alias `B` is a local
    // binding of the re-exporting file.
    expect(locals, "no local binding for the re-exported source `A`").not.toContain(
      "A",
    );
    expect(locals, "no local binding for the alias `B`").not.toContain("B");
  });

  it("cka-48: a downstream importer binds the aliased re-export as B with no diagnostic", () => {
    const reExporter: ThetaLibModuleForms = {
      declarations: [],
      reExports: [reExport("A", "B", "./x.thetalib")],
      plainImports: [],
    };
    // A further downstream file `import { B } from "<re-exporting file>"` binds
    // because `B` is in the re-exporting file's computed export set.
    const diagnostics = checkImportedSymbols({
      file: "downstream.theta",
      specPath: "./reexporter.thetalib",
      specifiers: [plainImport("B")],
      resolvedExports: computeThetaLibExports(reExporter),
      localTopLevelNames: [],
    });
    expect(
      diagnostics.filter((d) => d.code === IMPORT_UNKNOWN_SYMBOL_CODE),
      "the alias `B` resolves downstream with no unknown-symbol diagnostic",
    ).toHaveLength(0);
  });
});

// --- cka-48 — a plain import is not re-exported -----------------------------

describe("V15i-T — cka-48 plain import is not re-exported", () => {
  it("cka-48: a plain `import { A }` does not add A to the importing file's exports", () => {
    const forms: ThetaLibModuleForms = {
      declarations: [],
      reExports: [],
      plainImports: [plainImport("A")],
    };
    // Only declarations and explicit `export … from` forms are visible to
    // downstream importers — a plain `import` is not re-exported (imports.md
    // §Re-exports, negative half).
    expect(
      computeThetaLibExports(forms),
      "a plain import is not re-exported downstream",
    ).not.toContain("A");
  });

  it("cka-48: a further downstream `import { A }` from the re-importing file is an unknown symbol", () => {
    // The re-importing file plainly imports `A` and re-exports nothing.
    const reImporter: ThetaLibModuleForms = {
      declarations: [],
      reExports: [],
      plainImports: [plainImport("A")],
    };
    // A downstream file `import { A } from "<re-importing file>"` sees `A` as
    // neither a declaration nor a re-export → `theta/parse/import-unknown-symbol`.
    const diagnostics = checkImportedSymbols({
      file: "downstream.theta",
      specPath: "./reimporter.thetalib",
      specifiers: [plainImport("A")],
      resolvedExports: computeThetaLibExports(reImporter),
      localTopLevelNames: [],
    });
    expect(
      diagnostics.find((d) => d.code === IMPORT_UNKNOWN_SYMBOL_CODE),
      "A is invisible downstream — a plain import is not re-exported",
    ).toBeDefined();
  });
});
