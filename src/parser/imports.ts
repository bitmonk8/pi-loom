// V15c / V15c-T — `.thetalib` import resolution and diagnostics.
//
// This module owns the `.thetalib` import path: the permitted top-level forms
// (`import`/`export`/`schema`/`enum`/`fn`), relative `.thetalib`-only resolution
// through the named `Resolver` seam, and the import-cycle / unknown-symbol /
// name-collision / unresolvable-path diagnostics (per imports.md, incl. the
// IMP-1 resolver failure contract).
//
// V15c-T (tests-task) declares these seams and stubs each behaviour-bearing
// function inert so the failing tests compile and red on their own primary
// assertions. The paired V15c implementation leaf fills them in. Each stub
// returns a benign wrong value (no diagnostic / the empty string / a
// "registered" verdict with no resolved path) so the assertions red for the
// intended reason (implementation absent), never on a thrown harness error.
//
// Diagnostic *Message* strings are sourced from the diagnostics registry
// (diagnostics/code-registry-parse.md, diagnostics/code-registry-load.md) per
// the *Diagnostic message anchors* rule; `<path>` / `<name>` placeholders are
// rendered per diagnostics/placeholder-rendering-b.md (the path-literal text as
// written, no realpath normalisation).

import { posix } from "node:path";
import type { Diagnostic, SourceRange } from "../diagnostics/diagnostic";

/** A located `import` / `export … from` / top-level-form site. */
export interface ImportSite {
  readonly file: string;
  readonly range: SourceRange;
}

// ── theta/parse/thetalib-top-level-statement ─────────────────────────────────────

export const THETALIB_TOP_LEVEL_STATEMENT_CODE = "theta/parse/thetalib-top-level-statement";
export const THETALIB_TOP_LEVEL_STATEMENT_MESSAGE =
  "top-level statement not permitted in .thetalib file; move into a fn body";
export const THETALIB_TOP_LEVEL_STATEMENT_HINT = "Move the code into a fn body.";

/**
 * A `.thetalib` top-level form. The permitted forms are `import`, `export`,
 * `schema`, `enum`, and `fn`; any other top-level form — a bare statement, a
 * `let` binding, or a query — is `theta/parse/thetalib-top-level-statement`
 * (imports.md §"`.thetalib` file rules").
 */
export type ThetaLibTopLevelForm =
  | "import"
  | "export"
  | "schema"
  | "enum"
  | "fn"
  | "let"
  | "statement"
  | "query";

/** The five forms a `.thetalib` top level may contain (imports.md §"`.thetalib` file rules"). */
const PERMITTED_THETALIB_TOP_LEVEL_FORMS: ReadonlySet<ThetaLibTopLevelForm> = new Set([
  "import",
  "export",
  "schema",
  "enum",
  "fn",
]);

/**
 * Check a `.thetalib` file's top-level form, returning
 * `theta/parse/thetalib-top-level-statement` for a non-permitted form and
 * `undefined` for a permitted one.
 *
 * V15c-T stubs this inert (always `undefined`), so the non-permitted-form test
 * reds on its own primary assertion. The paired V15c leaf fills it in.
 */
export function checkThetaLibTopLevelForm(
  form: ThetaLibTopLevelForm,
  site: ImportSite,
): Diagnostic | undefined {
  if (PERMITTED_THETALIB_TOP_LEVEL_FORMS.has(form)) {
    return undefined;
  }
  return {
    severity: "error",
    code: THETALIB_TOP_LEVEL_STATEMENT_CODE,
    file: site.file,
    range: site.range,
    message: THETALIB_TOP_LEVEL_STATEMENT_MESSAGE,
    hint: THETALIB_TOP_LEVEL_STATEMENT_HINT,
  };
}

// ── theta/parse/import-non-thetalib-extension ────────────────────────────────────

export const IMPORT_NON_THETALIB_EXTENSION_CODE = "theta/parse/import-non-thetalib-extension";
export const IMPORT_NON_THETALIB_EXTENSION_HINT =
  "import paths must end in `.thetalib`; `.theta` files are not importable — use `invoke(...)` instead.";

/** `theta/parse/import-non-thetalib-extension` message (`<path>` as written). */
export function importNonThetaLibExtensionMessage(path: string): string {
  return `import path '${path}' does not end in .thetalib`;
}

/**
 * Check an `import` path literal's extension (`parse` phase), returning
 * `theta/parse/import-non-thetalib-extension` when the literal does not end in a
 * byte-exact lowercase `.thetalib` — including a `.theta`-suffixed path or a
 * non-lowercase `.THETALIB` / `.ThetaLib` variant, which reject on every host
 * regardless of the filesystem's case-equivalence model (imports.md §"Path
 * resolution"; lexical.md §"Extension matching"). Returns `undefined` for a
 * byte-exact `.thetalib` path.
 *
 * V15c-T stubs this inert (always `undefined`), so both the `.theta` and the
 * `.THETALIB` variant tests red on their own primary assertions. The paired V15c
 * leaf fills it in.
 */
export function checkImportExtension(
  pathLiteral: string,
  site: ImportSite,
): Diagnostic | undefined {
  // Byte-exact lowercase `.thetalib`: `.THETALIB` / `.ThetaLib` / `.theta` all reject, on
  // every host regardless of the filesystem's case-equivalence model.
  if (pathLiteral.endsWith(".thetalib")) {
    return undefined;
  }
  return {
    severity: "error",
    code: IMPORT_NON_THETALIB_EXTENSION_CODE,
    file: site.file,
    range: site.range,
    message: importNonThetaLibExtensionMessage(pathLiteral),
    hint: IMPORT_NON_THETALIB_EXTENSION_HINT,
  };
}

// ── theta/load/unresolvable-thetalib-path + the Resolver seam (IMP-1) ─────────────

export const UNRESOLVABLE_THETALIB_PATH_CODE = "theta/load/unresolvable-thetalib-path";
export const UNRESOLVABLE_THETALIB_PATH_HINT =
  "Use a relative `./` or `../` path ending in `.thetalib` that points at an existing, readable file.";

/** `theta/load/unresolvable-thetalib-path` message (`<path>` as written). */
export function unresolvableThetaLibPathMessage(path: string): string {
  return `cannot resolve .thetalib import '${path}'`;
}

/**
 * The exception a `Resolver` throws to signal an unresolvable spec (IMP-1). The
 * load pipeline treats a throw from `resolve` as a resolution failure.
 */
export class UnresolvableThetaLibPathError extends Error {
  readonly spec: string;
  constructor(spec: string) {
    super(unresolvableThetaLibPathMessage(spec));
    this.name = "UnresolvableThetaLibPathError";
    this.spec = spec;
  }
}

/**
 * Import-path resolution seam (imports.md §"Resolver interface"). theta 1.0.0
 * ships exactly one implementation (`RelativeThetaLibResolver`); the seam is what
 * lets the deferred package-style / project-rooted extensions land by
 * registering additional implementations rather than rewriting import sites.
 */
export interface Resolver {
  /** Resolve `spec` against `fromFile`'s directory; throw to signal unresolvable (IMP-1). */
  resolve(spec: string, fromFile: string): string;
}

/**
 * A byte-for-byte directory probe the relative resolver enumerates to satisfy
 * the byte-exact final-segment match rule (IMP-1). Enumerating the resolved
 * parent directory once is what lets the resolver reject a case-variant entry
 * (`Personas.thetalib` for a `personas.thetalib` literal) on a case-insensitive host,
 * which a single `exists` / `readText` could not.
 */
export interface ThetaLibDirectoryProbe {
  /** Entry names in `dir`, byte-for-byte as `FileSystem.readdir` returns them; throws if `dir` is unreadable. */
  entries(dir: string): readonly string[];
  /** Whether the byte-exact entry `dir`/`name` is readable (`EACCES` / `EPERM` / broken symlink → `false`). */
  entryReadable(dir: string, name: string): boolean;
}

/**
 * The single theta 1.0.0 `Resolver`: a relative-path resolver that joins `spec`
 * against the directory of `fromFile` and requires the `.thetalib` extension.
 * Non-relative specs (`@scope/pkg`, `/theta/...`), a missing byte-exact
 * final-segment directory entry, and a byte-exact-but-unreadable entry are all
 * unresolvable and throw `UnresolvableThetaLibPathError` (IMP-1).
 *
 * V15c-T stubs `resolve` inert (returns the empty string), so the IMP-1 throw
 * test reds (no throw is raised) and the success-path test reds (`""` is not
 * the resolved path). The paired V15c leaf fills it in.
 */
export class RelativeThetaLibResolver implements Resolver {
  constructor(private readonly probe: ThetaLibDirectoryProbe) {}

  resolve(spec: string, fromFile: string): string {
    // Only relative `./` / `../` specs are in scope for theta 1.0; a
    // package-style (`@scope/pkg`) or project-rooted (`/theta/...`) spec is
    // unresolvable and signalled by throwing (IMP-1).
    if (!spec.startsWith("./") && !spec.startsWith("../")) {
      throw new UnresolvableThetaLibPathError(spec);
    }
    // The relative resolver requires the `.thetalib` extension (byte-exact
    // lowercase); a non-`.thetalib` spec is unresolvable through this resolver.
    if (!spec.endsWith(".thetalib")) {
      throw new UnresolvableThetaLibPathError(spec);
    }

    // Join the spec against the importing file's directory, then match the
    // final segment byte-for-byte against the resolved parent directory's
    // entries — enumerating once via the probe rather than a single
    // `exists`/`readText`, so a case-variant entry (`Personas.thetalib` for a
    // `personas.thetalib` literal) rejects on a case-insensitive host (IMP-1).
    const resolved = posix.join(posix.dirname(fromFile), spec);
    const parent = posix.dirname(resolved);
    const finalSegment = posix.basename(resolved);

    // `entries` throws (unreadable parent directory) → unresolvable, and the
    // throw is the resolution-failure signal, so it propagates unchanged.
    const names = this.probe.entries(parent);
    if (!names.includes(finalSegment)) {
      throw new UnresolvableThetaLibPathError(spec);
    }
    if (!this.probe.entryReadable(parent, finalSegment)) {
      throw new UnresolvableThetaLibPathError(spec);
    }
    return resolved;
  }
}

/** The outcome of running an `import` spec through the load pipeline (IMP-1). */
export interface ThetaLibImportLoad {
  /** The resolved `.thetalib` path — present only when resolution succeeded. */
  readonly resolvedPath?: string;
  /** Whether the importing file is registered (a resolution failure does not register it). */
  readonly registered: boolean;
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Run an `import` spec through the load pipeline (IMP-1): call
 * `resolver.resolve` and, on an `UnresolvableThetaLibPathError` throw, emit
 * `theta/load/unresolvable-thetalib-path` against the importing file and do NOT
 * register it; on success, register the file and carry the resolved path.
 *
 * V15c-T stubs this inert — it reports the file as registered with no resolved
 * path and no diagnostic — so the IMP-1 failure test reds (no diagnostic /
 * `registered` not `false`) and the success test reds (no `resolvedPath`). The
 * paired V15c leaf fills it in.
 */
export function loadThetaLibImport(
  resolver: Resolver,
  spec: string,
  fromFile: string,
  site: ImportSite,
): ThetaLibImportLoad {
  let resolvedPath: string;
  try {
    resolvedPath = resolver.resolve(spec, fromFile);
  } catch (resolveError: unknown) { // allow-broad-catch: theta/load/unresolvable-thetalib-path — spec_topics/imports.md (IMP-1: the load pipeline treats *any* throw from `resolve` as a resolution failure)
    // IMP-1 mandates treating a throw from `resolve` as a resolution failure —
    // any throw, not only `UnresolvableThetaLibPathError` — so this does not
    // rethrow. The diagnostic renders the spec path as written (`<path>`), not
    // the thrown error's message.
    void resolveError;
    return {
      registered: false,
      diagnostics: [
        {
          severity: "error",
          code: UNRESOLVABLE_THETALIB_PATH_CODE,
          file: site.file,
          range: site.range,
          message: unresolvableThetaLibPathMessage(spec),
          hint: UNRESOLVABLE_THETALIB_PATH_HINT,
        },
      ],
    };
  }
  return { resolvedPath, registered: true, diagnostics: [] };
}

// ── theta/parse/import-unknown-symbol + theta/parse/import-name-collision ──────

export const IMPORT_UNKNOWN_SYMBOL_CODE = "theta/parse/import-unknown-symbol";
export const IMPORT_NAME_COLLISION_CODE = "theta/parse/import-name-collision";
export const IMPORT_NAME_COLLISION_HINT = "Resolve with `as`-aliasing.";

/** `theta/parse/import-unknown-symbol` message (`<name>` is the source symbol, not the alias). */
export function importUnknownSymbolMessage(name: string, path: string): string {
  return `imported symbol '${name}' is not declared or re-exported by '${path}'`;
}

/** `theta/parse/import-name-collision` message (`<name>` as written). */
export function importNameCollisionMessage(name: string): string {
  return `imported symbol '${name}' collides with another import or top-level declaration`;
}

/** A single `import { … }` / `export { … } from` specifier. */
export interface ImportSpecifier {
  /** The symbol as named in the resolved `.thetalib` file (the source symbol). */
  readonly source: string;
  /** The local binding — the `as` alias, or the source name when unaliased. */
  readonly local: string;
  readonly range: SourceRange;
}

/** Inputs to the imported-symbol check for one importing file. */
export interface ImportCheckInput {
  readonly file: string;
  /** The import path literal as written (rendered as `<path>` in the unknown-symbol message). */
  readonly specPath: string;
  readonly specifiers: readonly ImportSpecifier[];
  /** Top-level declarations + transitive `export … from` re-exports of the resolved `.thetalib` file. */
  readonly resolvedExports: readonly string[];
  /** Top-level declaration names in the importing file (for the same-file collision arm). */
  readonly localTopLevelNames: readonly string[];
}

/**
 * Unknown-symbol arm (`parse` phase): a specifier whose SOURCE symbol is
 * neither a top-level declaration nor a transitive re-export of the resolved
 * `.thetalib` file is `theta/parse/import-unknown-symbol`. The message names the
 * source symbol, not the `as` alias. No fast-fail — every offending specifier is
 * collected (multi-error batching rule). Scoped to a single `import … from`
 * decl because the export set is per-resolved-file.
 */
export function checkImportUnknownSymbols(
  file: string,
  specPath: string,
  specifiers: readonly ImportSpecifier[],
  resolvedExports: readonly string[],
): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const exported = new Set(resolvedExports);
  for (const specifier of specifiers) {
    if (!exported.has(specifier.source)) {
      diagnostics.push({
        severity: "error",
        code: IMPORT_UNKNOWN_SYMBOL_CODE,
        file,
        range: specifier.range,
        message: importUnknownSymbolMessage(specifier.source, specPath),
      });
    }
  }
  return diagnostics;
}

/**
 * Name-collision arm (`parse` phase): a LOCAL binding shared by two imports —
 * whether from two different `.thetalib` files or the same file imported twice — or
 * colliding with a same-file top-level declaration is
 * `theta/parse/import-name-collision` (imports.md §"Name collisions": no implicit
 * shadowing; resolve with `as`-aliasing). The message names the local name; each
 * colliding name is reported once. `specifiers` is the union of EVERY importing
 * `import … from` decl's specifiers for the file, so an import-vs-import collision
 * across two separate `import` statements is caught, mirroring the import-vs-
 * local-declaration arm rather than being lost to last-import-wins shadowing.
 */
export function checkImportNameCollisions(
  file: string,
  specifiers: readonly ImportSpecifier[],
  localTopLevelNames: readonly string[],
): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const localTopLevel = new Set(localTopLevelNames);
  const seenLocal = new Set<string>();
  const reported = new Set<string>();
  for (const specifier of specifiers) {
    const local = specifier.local;
    const collides = localTopLevel.has(local) || seenLocal.has(local);
    if (collides && !reported.has(local)) {
      diagnostics.push({
        severity: "error",
        code: IMPORT_NAME_COLLISION_CODE,
        file,
        range: specifier.range,
        message: importNameCollisionMessage(local),
        hint: IMPORT_NAME_COLLISION_HINT,
      });
      reported.add(local);
    }
    seenLocal.add(local);
  }
  return diagnostics;
}

/**
 * Check an importing file's specifiers (`parse` phase), returning
 * `theta/parse/import-unknown-symbol` for a specifier whose source symbol is
 * neither a top-level declaration nor a transitive re-export of the resolved
 * file (the message names the source symbol, not the alias), and
 * `theta/parse/import-name-collision` for a local binding shared by two imports
 * or colliding with a top-level declaration in the same file. Participates in
 * the multi-error batching rule (returns every diagnostic, no fast-fail).
 *
 * Retained as the single-decl composition of {@link checkImportUnknownSymbols}
 * and {@link checkImportNameCollisions}. The load pass (import-static-checks.ts)
 * calls the two arms separately — the unknown-symbol arm per resolved decl and
 * the collision arm once over the union of every decl's specifiers — so an
 * import-vs-import collision across two separate `import` statements is caught.
 */
export function checkImportedSymbols(
  input: ImportCheckInput,
): readonly Diagnostic[] {
  return [
    ...checkImportUnknownSymbols(
      input.file,
      input.specPath,
      input.specifiers,
      input.resolvedExports,
    ),
    ...checkImportNameCollisions(
      input.file,
      input.specifiers,
      input.localTopLevelNames,
    ),
  ];
}

// ── theta/load/import-cycle ──────────────────────────────────────────────────

export const IMPORT_CYCLE_CODE = "theta/load/import-cycle";

/**
 * `theta/load/import-cycle` message. `stems` is the cycle path as file-path
 * stems (the first stem repeated at the end); rendered as
 * `import cycle: a.thetalib → b.thetalib → a.thetalib` (each stem suffixed `.thetalib`, joined
 * by ` → `), per diagnostics/placeholder-rendering-b.md.
 */
export function importCycleMessage(stems: readonly string[]): string {
  return `import cycle: ${stems.map((s) => `${s}.thetalib`).join(" → ")}`;
}

/**
 * The static `.thetalib` import graph: `edges` maps each file stem to the stems it
 * imports.
 */
export interface ThetaLibImportGraph {
  readonly edges: ReadonlyMap<string, readonly string[]>;
}

/**
 * Walk the static `.thetalib` import graph from `entry`, returning
 * `theta/load/import-cycle` with the cycle path printed when a cycle is
 * discovered, and `undefined` for an acyclic graph (imports.md §"Cycles").
 *
 * V15c-T stubs this inert (always `undefined`), so the cycle test reds on its
 * own primary assertion. The paired V15c leaf fills it in.
 */
export function detectImportCycle(
  entry: string,
  graph: ThetaLibImportGraph,
  site: ImportSite,
): Diagnostic | undefined {
  const stack: string[] = [];
  const onStack = new Set<string>();
  const visited = new Set<string>();
  let cyclePath: readonly string[] | undefined;

  const walk = (node: string): void => {
    if (cyclePath !== undefined) {
      return;
    }
    stack.push(node);
    onStack.add(node);
    for (const next of graph.edges.get(node) ?? []) {
      if (onStack.has(next)) {
        // Back-edge: the cycle path runs from `next`'s first appearance on the
        // current stack, with `next` repeated at the end.
        const from = stack.indexOf(next);
        cyclePath = [...stack.slice(from), next];
        return;
      }
      if (!visited.has(next)) {
        walk(next);
        if (cyclePath !== undefined) {
          return;
        }
      }
    }
    stack.pop();
    onStack.delete(node);
    visited.add(node);
  };

  walk(entry);
  if (cyclePath === undefined) {
    return undefined;
  }
  return {
    severity: "error",
    code: IMPORT_CYCLE_CODE,
    file: site.file,
    range: site.range,
    message: importCycleMessage(cyclePath),
  };
}

// ── V15i / V15i-T — export visibility and re-exports ─────────────────────────
//
// The `.thetalib` export-visibility semantics layered on V15c's resolution
// (imports.md §"Visibility" + §"Re-exports", coverage-matrix code-keyed-area
// token `cka-48`): every top-level `schema`/`enum`/`fn` is implicitly exported
// (no `export` keyword, no privacy modifier); an aliased `export … from` re-export
// is visible downstream as its alias while creating NO local binding for the
// re-exported source symbol; and a plain `import` is NOT re-exported downstream.
//
// V15i-T (tests-task) declares these two seams and stubs each inert-but-wrong so
// the failing visibility tests compile and red on their own primary assertions.
// `computeThetaLibExports` returns the WRONG set — the plain-import locals, which
// are precisely the names that are NOT downstream-visible — and omits the
// auto-exported declarations and the `export … from` re-exports that ARE, so
// every positive/negative visibility assertion reds for the intended reason
// (implementation absent). `thetalibLocalBindings` symmetrically returns the
// re-export SOURCE names, which create no local binding, so the "no local
// binding for the re-exported symbol" assertion reds. The paired V15i leaf
// fills both in.

/** A top-level `.thetalib` declaration kind — each is implicitly exported (imports.md §Visibility). */
export type ThetaLibDeclarationKind = "schema" | "enum" | "fn";

/** A top-level `schema`/`enum`/`fn` declaration in a `.thetalib` file (auto-exported). */
export interface ThetaLibDeclaration {
  readonly kind: ThetaLibDeclarationKind;
  readonly name: string;
}

/**
 * An `export { A as B } from "./x.thetalib"` re-export form. Visible downstream as
 * `exported` (the `as` alias, or `source` when unaliased) and creating NO local
 * binding for `source` in the re-exporting file (imports.md §Re-exports).
 */
export interface ReExportSpecifier {
  /** The symbol as named in the re-exported-from `.thetalib` file (the source symbol). */
  readonly source: string;
  /** The downstream-visible name — the `as` alias, or `source` when unaliased. */
  readonly exported: string;
  /** The `.thetalib` path being re-exported from (as written). */
  readonly fromPath: string;
  readonly range: SourceRange;
}

/**
 * The top-level forms of one `.thetalib` module that bear on downstream visibility:
 * its auto-exported declarations, its `export … from` re-exports, and its plain
 * `import` specifiers (which bind locally but are NOT re-exported).
 */
export interface ThetaLibModuleForms {
  readonly declarations: readonly ThetaLibDeclaration[];
  readonly reExports: readonly ReExportSpecifier[];
  readonly plainImports: readonly ImportSpecifier[];
}

/**
 * Compute the set of names a `.thetalib` module makes visible to a downstream
 * importer (imports.md §Visibility + §Re-exports): every top-level declaration
 * name (auto-exported) plus every `export … from` re-export's downstream name
 * (`exported`); a plain `import` local is NOT included. This is exactly the
 * `resolvedExports` list `checkImportedSymbols` matches an importing specifier
 * against.
 *
 * Every top-level declaration is auto-exported (no `export` keyword, no privacy
 * modifier) and every `export … from` re-export is visible under its downstream
 * name (`exported`); a plain `import` local is excluded — a plain import is not
 * re-exported downstream (imports.md §Re-exports, negative half).
 */
export function computeThetaLibExports(forms: ThetaLibModuleForms): readonly string[] {
  return [
    ...forms.declarations.map((declaration) => declaration.name),
    ...forms.reExports.map((reExport) => reExport.exported),
  ];
}

/**
 * The names a `.thetalib` module binds locally: its top-level declarations plus its
 * plain `import` locals. An `export … from` re-export creates NO local binding
 * for its source symbol, so re-export sources are excluded (imports.md
 * §Re-exports — "a dedicated form that creates no local binding").
 *
 * A top-level declaration binds its own name locally and a plain `import` binds
 * its local (`as` alias or source name); an `export … from` re-export creates NO
 * local binding for its source symbol (imports.md §Re-exports — "a dedicated
 * form that creates no local binding"), so re-export sources are excluded.
 */
export function thetalibLocalBindings(forms: ThetaLibModuleForms): readonly string[] {
  return [
    ...forms.declarations.map((declaration) => declaration.name),
    ...forms.plainImports.map((specifier) => specifier.local),
  ];
}
