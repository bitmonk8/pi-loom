// Load-time (compose-pass) wiring for the `.warp` import subsystem the shipped
// pipeline previously never ran (imports.md §"Path resolution" / §"Unknown
// imported symbol" / §"Cycles" / IMP-1). Each check reuses an existing,
// unit-tested checker/resolver rather than reimplementing it (mirrors the
// invoke static-check compose pass in invoke-static-checks.ts):
//
//   - IMP-1 — `RelativeWarpResolver` + `loadWarpImport` over each
//     `import { … } from "./x.warp"` site: an unresolvable spec is
//     `loom/load/unresolvable-warp-path` and the importing loom does NOT
//     register.
//   - IMP-3 — `computeWarpExports` over the resolved `.warp`'s top-level forms,
//     then `checkImportedSymbols` against the importing specifiers
//     (`loom/parse/import-unknown-symbol` / `loom/parse/import-name-collision`).
//   - IMP-4 — the resolved `.warp` is parsed through `parseLoomDocument`, whose
//     `.warp`-keyed top-level check emits `loom/parse/warp-top-level-statement`;
//     those diagnostics are surfaced here so an illegal `.warp` top-level form
//     un-registers the importing loom.
//   - IMP-5 — `detectImportCycle` over the per-load-pass static `.warp` import
//     graph (`loom/load/import-cycle`).
//
// The resolved `.warp`'s exported declarations are also materialised into the
// importing loom's runtime environment (imports.md §Visibility): an imported
// `fn` becomes callable (IMP-6) and — because its body runs through the caller's
// executor deps — its `@`-queries drive the caller's conversation (IMP-7).
//
// Spec: spec_topics/imports.md (§"`.warp` file rules", §"Path resolution",
// IMP-1, §Visibility, §"Unknown imported symbol", §Cycles),
// diagnostics/code-registry-parse.md, diagnostics/code-registry-load.md.

import { posix } from "node:path";
import type { Diagnostic } from "../diagnostics/diagnostic";
import type { FileSystem } from "../seams/file-system";
import {
  RelativeWarpResolver,
  checkImportedSymbols,
  computeWarpExports,
  detectImportCycle,
  loadWarpImport,
  type ImportSpecifier,
  type ReExportSpecifier,
  type Resolver,
  type WarpDeclaration,
  type WarpDirectoryProbe,
  type WarpImportGraph,
  type WarpModuleForms,
} from "../parser/imports";
import {
  parseLoomDocument,
  type ImportDecl,
  type LoomBody,
  type LoomDocument,
  type ParseLoomDocumentDeps,
} from "../parser/loom-document";
import type { MaterializedImport } from "../runtime/lexical-environment";
import type { LoomCompositionInput } from "./loom-composition-producer";

/** Forward-slash-normalise a host path so the posix-based resolver joins cleanly. */
function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

/** The `.warp` file stem (basename minus `.warp`), used as the cycle-graph node id. */
function warpStem(path: string): string {
  const base = posix.basename(normalizePath(path));
  return base.endsWith(".warp") ? base.slice(0, -".warp".length) : base;
}

/** The top-level `import` declarations of a parsed body, in source order. */
function collectImports(body: LoomBody): ImportDecl[] {
  const out: ImportDecl[] = [];
  for (const stmt of body.statements) {
    if (stmt.kind === "import") {
      out.push(stmt);
    }
  }
  return out;
}

/** The importing file's top-level declaration names (the collision-check arm). */
function collectTopLevelNames(body: LoomBody): string[] {
  const names: string[] = [];
  for (const stmt of body.statements) {
    if (stmt.kind === "schema" || stmt.kind === "enum" || stmt.kind === "fn") {
      names.push(stmt.name);
    }
  }
  return names;
}

/**
 * Extract the top-level forms of a resolved `.warp` module that bear on
 * downstream visibility (imports.md §Visibility + §Re-exports): every top-level
 * `schema` / `enum` / `fn` (auto-exported), every `export … from` re-export, and
 * every plain `import` local. The parser tracks no `as` alias for a specifier,
 * so each specifier's source and local/exported name are the same token.
 */
function extractWarpForms(body: LoomBody): WarpModuleForms {
  const declarations: WarpDeclaration[] = [];
  const reExports: ReExportSpecifier[] = [];
  const plainImports: ImportSpecifier[] = [];
  for (const stmt of body.statements) {
    if (stmt.kind === "schema" || stmt.kind === "enum" || stmt.kind === "fn") {
      declarations.push({ kind: stmt.kind, name: stmt.name });
    } else if (stmt.kind === "export") {
      for (const symbol of stmt.symbols) {
        reExports.push({
          source: symbol,
          exported: symbol,
          fromPath: stmt.path,
          range: stmt.range,
        });
      }
    } else if (stmt.kind === "import") {
      for (const symbol of stmt.symbols) {
        plainImports.push({ source: symbol, local: symbol, range: stmt.range });
      }
    }
  }
  return { declarations, reExports, plainImports };
}

/**
 * Materialise one imported symbol from the resolved `.warp`'s body into a
 * runtime binding (imports.md §Visibility): an imported `fn` carries its
 * `FnDecl` body (callable), an imported `schema` / `enum` registers its
 * constructor / variants. Returns `undefined` when the symbol names no
 * top-level declaration (an unknown symbol — already diagnosed by IMP-3).
 */
function materializeSymbol(
  symbol: string,
  body: LoomBody,
): MaterializedImport | undefined {
  for (const stmt of body.statements) {
    if (stmt.kind === "fn" && stmt.name === symbol) {
      return { name: symbol, kind: "fn", fn: stmt };
    }
    if (stmt.kind === "schema" && stmt.name === symbol) {
      return { name: symbol, kind: "schema" };
    }
    if (stmt.kind === "enum" && stmt.name === symbol) {
      return { name: symbol, kind: "enum", variants: stmt.variants ?? [] };
    }
  }
  return undefined;
}

/** Only error-severity parse/load diagnostics block registration (warnings still register). */
function isRegistrationError(diagnostic: Diagnostic): boolean {
  return (
    diagnostic.severity === "error" &&
    (diagnostic.code.startsWith("loom/parse/") ||
      diagnostic.code.startsWith("loom/load/"))
  );
}

/**
 * A `WarpDirectoryProbe` backed by an async pre-populated cache: the resolver's
 * synchronous `entries` / `entryReadable` read from a cache the load pass fills
 * (via `precache`) before each `resolve` call — the byte-for-byte enumeration
 * IMP-1 requires, without a synchronous filesystem call.
 */
class CachingWarpProbe implements WarpDirectoryProbe {
  /** Parent dir (forward-slash) → its byte-exact entry names, or `null` when unreadable. */
  private readonly entriesCache = new Map<string, readonly string[] | null>();
  /** `${dir}\u0000${name}` → whether the byte-exact entry is readable. */
  private readonly readableCache = new Map<string, boolean>();

  constructor(private readonly fs: FileSystem) {}

  /** Pre-read the directory a `spec` resolves against, so a later `resolve` reads it synchronously. */
  async precache(spec: string, fromFile: string): Promise<void> {
    if (!spec.startsWith("./") && !spec.startsWith("../")) {
      return; // non-relative spec: the resolver throws before touching the probe.
    }
    if (!spec.endsWith(".warp")) {
      return; // non-`.warp` spec: the resolver throws before touching the probe.
    }
    const resolved = posix.join(posix.dirname(fromFile), spec);
    const parent = posix.dirname(resolved);
    if (this.entriesCache.has(parent)) {
      return;
    }
    // An unreadable parent directory is an unresolvable path: a `null` cache
    // entry makes `entries` throw, which `loadWarpImport` treats as the
    // resolution-failure signal (IMP-1). The `.then(ok, err)` rejection arm
    // (not a broad `try`/`catch`) is the pipeline's sanctioned I/O-boundary
    // pattern (mirrors `parseDiscoveredLoom`'s `fs.readBytes` read).
    const names = await this.fs.readdir(parent).then(
      (value) => value,
      () => null,
    );
    this.entriesCache.set(parent, names);
    if (names !== null) {
      for (const name of names) {
        // A byte-exact entry `readdir` listed is readable; the EACCES / broken-
        // symlink refinement is not exercised by the shipped host seam here.
        this.readableCache.set(`${parent}\u0000${name}`, true);
      }
    }
  }

  entries(dir: string): readonly string[] {
    const names = this.entriesCache.get(dir);
    if (names === undefined || names === null) {
      throw new Error(`.warp parent directory not readable: ${dir}`);
    }
    return names;
  }

  entryReadable(dir: string, name: string): boolean {
    return this.readableCache.get(`${dir}\u0000${name}`) ?? false;
  }
}

/** A parsed `.warp` module, cached per resolved path across the load pass. */
interface ParsedWarp {
  readonly document: LoomDocument;
}

/** The outcome of the per-loom `.warp` import resolution pass. */
export interface LoomImportCheck {
  /** Every diagnostic; an error-severity entry un-registers the importing loom. */
  readonly diagnostics: Diagnostic[];
  /** The resolved `.warp` symbols materialised into the runtime environment (IMP-6 / IMP-7). */
  readonly imports: MaterializedImport[];
}

/**
 * Run the load-time `.warp` import checks for one discovered loom, returning
 * every diagnostic (error-severity entries un-register the loom) and the
 * resolved imported symbols to materialise into its runtime environment.
 *
 * A loom with no top-level `import` (or an in-memory loom with no source path)
 * resolves nothing and yields an empty result — the passing valid-import control
 * is preserved: a resolvable `.warp` whose exports satisfy every specifier
 * produces no diagnostic and registers cleanly.
 */
export async function checkLoomImports(
  input: LoomCompositionInput,
  deps: {
    readonly fs: FileSystem;
    readonly parseDeps: ParseLoomDocumentDeps;
  },
): Promise<LoomImportCheck> {
  const diagnostics: Diagnostic[] = [];
  const imports: MaterializedImport[] = [];
  const importDecls = collectImports(input.body);
  if (importDecls.length === 0 || input.sourcePath === undefined) {
    return { diagnostics, imports };
  }

  const fromFile = normalizePath(input.sourcePath);
  const probe = new CachingWarpProbe(deps.fs);
  const resolver: Resolver = new RelativeWarpResolver(probe);
  const parseCache = new Map<string, ParsedWarp | undefined>();

  const parseWarp = async (resolvedPath: string): Promise<ParsedWarp | undefined> => {
    if (parseCache.has(resolvedPath)) {
      return parseCache.get(resolvedPath);
    }
    // Resolved-but-unreadable (or unparseable) `.warp` → `undefined`, treated as
    // no forms/exports. The `.then(ok, err)` rejection arm is the pipeline's
    // sanctioned I/O-boundary pattern (not a broad `try`/`catch`): a read
    // rejection OR a synchronous parse throw inside the fulfil arm both settle
    // to `undefined`.
    const parsed: ParsedWarp | undefined = await deps.fs
      .readBytes(resolvedPath)
      .then(
        (bytes) => ({
          document: parseLoomDocument({ path: resolvedPath, bytes }, deps.parseDeps),
        }),
        () => undefined,
      );
    parseCache.set(resolvedPath, parsed);
    return parsed;
  };

  // Build the static `.warp` import graph transitively from this loom's direct
  // imports (imports.md §Cycles). Nodes are `.warp` stems; an edge `A → B`
  // exists when `A.warp` has a resolvable `import … from "./B.warp"`.
  const graphEdges = new Map<string, string[]>();
  const walked = new Set<string>();
  const walkWarp = async (resolvedPath: string): Promise<void> => {
    if (walked.has(resolvedPath)) {
      return;
    }
    walked.add(resolvedPath);
    const stem = warpStem(resolvedPath);
    const parsed = await parseWarp(resolvedPath);
    const targets: string[] = [];
    if (parsed !== undefined) {
      for (const decl of collectImports(parsed.document.body)) {
        await probe.precache(decl.path, normalizePath(resolvedPath));
        const load = loadWarpImport(resolver, decl.path, normalizePath(resolvedPath), {
          file: resolvedPath,
          range: decl.range,
        });
        if (load.registered && load.resolvedPath !== undefined) {
          targets.push(warpStem(load.resolvedPath));
          await walkWarp(load.resolvedPath);
        }
      }
    }
    graphEdges.set(stem, targets);
  };

  const localTopLevelNames = collectTopLevelNames(input.body);
  const entryStems: string[] = [];

  for (const decl of importDecls) {
    const spec = decl.path;
    const site = { file: input.sourcePath, range: decl.range };

    // A wrong-extension / backslash import already produced its parse error
    // (IMP-2, at whole-file parse); do not resolve it (it can never resolve).
    if (!spec.endsWith(".warp")) {
      continue;
    }

    // IMP-1: resolve the spec; a throw from the resolver is
    // `loom/load/unresolvable-warp-path` and the loom does not register.
    await probe.precache(spec, fromFile);
    const load = loadWarpImport(resolver, spec, fromFile, site);
    diagnostics.push(...load.diagnostics);
    if (!load.registered || load.resolvedPath === undefined) {
      continue;
    }
    const resolvedPath = load.resolvedPath;
    entryStems.push(warpStem(resolvedPath));

    // IMP-4: parse the resolved `.warp`; its `.warp`-keyed top-level check
    // (and any nested import extension error) surfaces here so an illegal form
    // un-registers the importing loom.
    const parsed = await parseWarp(resolvedPath);
    if (parsed === undefined) {
      continue;
    }
    for (const diagnostic of parsed.document.diagnostics) {
      if (isRegistrationError(diagnostic)) {
        diagnostics.push(diagnostic);
      }
    }

    // IMP-3: compute the resolved `.warp`'s export set and check every
    // importing specifier against it (unknown-symbol / name-collision).
    const forms = extractWarpForms(parsed.document.body);
    const resolvedExports = computeWarpExports(forms);
    const specifiers: ImportSpecifier[] = decl.symbols.map((symbol) => ({
      source: symbol,
      local: symbol,
      range: decl.range,
    }));
    diagnostics.push(
      ...checkImportedSymbols({
        file: input.sourcePath,
        specPath: spec,
        specifiers,
        resolvedExports,
        localTopLevelNames,
      }),
    );

    // IMP-6 / IMP-7: materialise each resolved symbol so an imported `fn` is
    // callable and its query body drives the caller's conversation.
    for (const symbol of decl.symbols) {
      const materialized = materializeSymbol(symbol, parsed.document.body);
      if (materialized !== undefined) {
        imports.push(materialized);
      }
    }

    // Seed the cycle graph from this resolved `.warp`.
    await walkWarp(resolvedPath);
  }

  // IMP-5: walk the static import graph from each directly-imported `.warp`;
  // the first cycle discovered un-registers the importing loom.
  const graph: WarpImportGraph = { edges: graphEdges };
  for (const entry of entryStems) {
    const cycle = detectImportCycle(entry, graph, {
      file: input.sourcePath,
      range: input.body.statements[0]?.range ?? {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 1 },
      },
    });
    if (cycle !== undefined) {
      diagnostics.push(cycle);
      break;
    }
  }

  return { diagnostics, imports };
}
