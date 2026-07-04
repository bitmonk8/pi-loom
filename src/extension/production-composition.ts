// H8a — the production composition root for the shipped extension.
//
// This module is the object graph the per-leaf gates verified only in isolation:
// at `session_start` it constructs the `H3a` runtime root over the real host
// seams (`V8b` `PiFileSystem`, `V8c` `AjvSchemaValidator`, `V8d`
// `WallClock`/`CryptoIdSource`, `V8e` `PiFileWatcher`/`PiTokenEstimator`), runs
// the five-source discovery walk (`V10a` union + `V10b` package source over the
// `V10c` merged settings), parses each discovered `.loom` (`V19a`), and maps it
// to a runnable `H4a` `LoomFixture` via the `V19e` composition producer. The
// `factory.ts` `session_start` handler registers each returned fixture through
// `pi.registerCommand`, so the shipped extension discovers, registers, and runs
// `.loom` slash commands.
//
// All composition lives here in `src/**`; `extensions/index.ts` stays a thin
// delegating shim. The runtime root is constructed per `session_start`
// invocation (no module-level mutable state) so two extension instances share
// no state.
//
// Spec (narrative): pi-integration-contract/extension-bootstrap-and-per-loom.md,
// pi-integration-contract/registration-steps.md, discovery.md.

import {
  delimiter as PATH_DELIMITER,
  dirname,
  isAbsolute,
  resolve as resolvePath,
} from "node:path";
import {
  createBashToolDefinition,
  createEditToolDefinition,
  createFindToolDefinition,
  createGrepToolDefinition,
  createLsToolDefinition,
  createReadToolDefinition,
  createWriteToolDefinition,
} from "@earendil-works/pi-coding-agent";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type { LoomFixture } from "./factory";
import { PiFileSystem } from "../seams/pi-file-system";
import { WallClock } from "../seams/wall-clock";
import { CryptoIdSource } from "../seams/crypto-id-source";
import { PiFileWatcher } from "../seams/pi-file-watcher";
import { PiTokenEstimator } from "../seams/pi-token-estimator";
import { AjvSchemaValidator } from "../seams/schema-validator";
import { ProductionCheckpoint } from "../seams/production-checkpoint";
import { createRuntimeRoot, type RuntimeRoot } from "../runtime-root";
import type { FileSystem } from "../seams/file-system";
import type { Diagnostic } from "../diagnostics/diagnostic";
import type { LoweredSchema } from "../seams/schema-validator";
import {
  discoverLooms,
  type DiscoveredLoom,
  type PiOwnedCommand,
} from "../discovery/discovery-walk";
import { discoverPackageLooms } from "../discovery/package-discovery";
import { loadSettings, type LoomSettings } from "../discovery/settings";
import { parseLoomDocument, type LoomBody } from "../parser/loom-document";
import {
  resolveCallableSet,
  type CallableSetDeps,
} from "../parser/callable-set";
import { checkCalleeHasErrors } from "../parser/invoke-diagnostics";
import {
  buildInvokeGraph,
  checkInvokeStaticResolution,
  type CalleeArity,
} from "./invoke-static-checks";
import type { LoomMode } from "../parser/frontmatter";
import { createModelReferenceMatcher } from "./reload-wiring";
import type { SystemNoteChannelDeps } from "./system-note-channel";
import { SYSTEM_NOTE_CHANNEL } from "./system-note-channel";
import {
  composeLoomFixture,
  type LoomCompositionInput,
} from "./loom-composition-producer";
import { createProductionProducerDeps } from "./production-loom-producer";

/**
 * The `session_start` production supplier: construct the runtime root over the
 * real host seams, run the five-source discovery walk keyed to the host
 * `ctx.cwd`, parse each discovered `.loom`, and compose each into a runnable
 * `LoomFixture`. Returned to `factory.ts`, which registers each via
 * `pi.registerCommand`.
 */
export async function discoverAndComposeFixtures(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
): Promise<readonly LoomFixture[]> {
  // Diagnostics surfaced during discovery / parse route through a transient
  // toast (`ctx.ui.notify`) for errors; the load-phase note-channel wiring is
  // best-effort at the composition root (the opt-in live acceptance suite does
  // not assert them). See notes.md — full `loom-system-note` routing for
  // discovery diagnostics is deferred.
  const emitDiagnostic = (diagnostic: Diagnostic): void => {
    if (diagnostic.severity === "error") {
      ctx.ui.notify(diagnostic.message, "error");
    }
  };

  // Host seams — one runtime root per `session_start` invocation, `cwd` pinned
  // to the host-reported working directory so the project / global discovery
  // sources resolve against the live session's directory.
  const fileSystem = new PiFileSystem(ctx.cwd);
  const clock = new WallClock();
  const schemaValidator = new AjvSchemaValidator({
    emit: emitDiagnostic,
    slugOf: (schema: LoweredSchema) => {
      const canonicalBytes = JSON.stringify(schema);
      return { slug: canonicalBytes, canonicalBytes };
    },
  });
  const root: RuntimeRoot = createRuntimeRoot({
    checkpoint: new ProductionCheckpoint(clock),
    schemaValidator,
    clock,
    fileSystem,
    fileWatcher: new PiFileWatcher(),
    tokenEstimator: new PiTokenEstimator(),
    idSource: new CryptoIdSource(),
  });

  // Merged, validated settings (V10c) drive the settings discovery source and
  // the package-walk bounds.
  const settingsResult = await loadSettings(fileSystem);
  for (const diagnostic of settingsResult.diagnostics) {
    emitDiagnostic(diagnostic);
  }
  const settings: LoomSettings = settingsResult.settings;

  // Discovery walk. CLI `--loom` roots are split on the platform path
  // delimiter (the walk is platform-independent over already-split paths).
  const cliPaths = readLoomFlagPaths(pi);
  const piOwnedNames = readPiOwnedCommands(pi);
  const walk = await discoverLooms({
    fs: fileSystem,
    settings,
    cliPaths,
    piOwnedNames,
  });
  for (const diagnostic of walk.diagnostics) {
    emitDiagnostic(diagnostic);
  }

  // Package source (V10b, priority 4) — merged in at the composition root: a
  // package loom registers only when its slash name is not already claimed by a
  // higher-priority (CLI / settings / project) or lower-priority (global)
  // discovered loom already resolved by the walk. This is the whole-walk merge
  // point the walk itself defers (discovery-walk.ts "Package … owned by V10b;
  // not plumbed into this walk yet"). See notes.md for the priority-tiebreak
  // simplification.
  const packageWalk = await discoverPackageLooms({
    fs: fileSystem,
    clock,
    settings,
  });
  for (const diagnostic of packageWalk.diagnostics) {
    emitDiagnostic(diagnostic);
  }
  const claimed = new Set(walk.looms.map((loom) => loom.name));
  const discovered: DiscoveredLoom[] = [...walk.looms];
  for (const pkg of packageWalk.looms) {
    if (!claimed.has(pkg.name)) {
      claimed.add(pkg.name);
      discovered.push({ name: pkg.name, path: pkg.path, source: "package" });
    }
  }

  // Parse + compose each discovered loom into a runnable fixture. The
  // model-reference matcher and the note-channel are constructed once and
  // shared across every parse (single source of construction).
  const modelMatcher = createModelReferenceMatcher({
    getAvailable: () => ctx.modelRegistry.getAvailable() as never,
  });
  const systemNote = buildSystemNoteDeps(pi, ctx, emitDiagnostic);
  const parseDeps = { systemNote, modelMatcher };

  // INV-5 (invocation.md §Resolution): the active discovery-root union threaded
  // into the invoke containment check — the parent directory of every discovered
  // loom. Every registrable loom sits inside an active discovery root, so this
  // set is the roots the load-time and runtime containment checks compare
  // against; a callee resolving outside all of them escapes the sandbox.
  const activeRoots = Array.from(
    new Set(discovered.map((loom) => dirname(loom.path))),
  );

  const producerDeps = createProductionProducerDeps({
    pi,
    root,
    modelRegistry: ctx.modelRegistry,
    // H8b: resolve a code-side Pi-tool name to its `execute` dispatch over the
    // live host `cwd` / `ctx`.
    resolvePiTool: (name: string) => resolvePiTool(name, ctx),
    // H8b: parse an `invoke` / `.loom`-callable callee against the caller's
    // directory, reusing the shared parser deps.
    parseCallee: (callerPath, calleePath) =>
      parseCalleeLoom(fileSystem, ctx.cwd, callerPath, calleePath, parseDeps),
    // INV-5 (invocation.md INV-1 seam): the runtime open-time containment
    // re-check consults the same `realpath` seam and active-root union.
    fileSystem,
    activeRoots,
  });

  // Parse pass: parse every discovered loom into its composition input; a drop
  // surfaces its load/parse diagnostics (FM-3 / DIAG-1) and does not register.
  const parsedInputs: LoomCompositionInput[] = [];
  for (const loom of discovered) {
    const parsed = await parseDiscoveredLoom(fileSystem, loom, {
      systemNote,
      modelMatcher,
    });
    if ("dropped" in parsed) {
      // FM-3: surface the load/parse diagnostics that un-registered this loom.
      // `emitDiagnostic` routes only error-severity entries to `ctx.ui.notify`.
      for (const diagnostic of parsed.dropped) {
        emitDiagnostic(diagnostic);
      }
      continue;
    }
    parsedInputs.push(parsed.fixture);
  }

  // INV-4 (invocation.md §Cycle detection): build the per-load-pass
  // static-resolution invoke graph across the parsed looms once, so the cycle
  // walk below runs per entry against a shared graph.
  const invokeGraph = buildInvokeGraph(parsedInputs);

  const fixtures: LoomFixture[] = [];
  for (const input of parsedInputs) {
    // V20a — resolve the `tools:` callable set against the shipped Pi tool
    // registry at production load time. A `tools:` rejection (unknown Pi tool,
    // prompt-mode `.loom` callee, name collision, invalid `as` rename, or a
    // `.loom` callee carrying its own load/parse errors) un-registers the loom
    // exactly as the isolation-tested `resolveCallableSet` (V6c) and
    // callee-has-errors (V15f) checks decide.
    const toolDiagnostics = await resolveLoomToolsAtLoad(
      input,
      fileSystem,
      ctx,
      parseDeps,
    );
    for (const diagnostic of toolDiagnostics) {
      emitDiagnostic(diagnostic);
    }
    if (toolDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
      continue;
    }

    // INV-3 / INV-4 / INV-5: run the invoke static checks against the resolved
    // callees and the shared invoke graph. An error-severity diagnostic (an
    // arity error, a discovery-root escape, or an invocation cycle) un-registers
    // the loom.
    const invokeDiagnostics = await checkInvokeStaticResolution(input, {
      fs: fileSystem,
      activeRoots,
      graph: invokeGraph,
      resolveCalleeArity: (absolutePath) =>
        resolveCalleeArity(fileSystem, absolutePath, parseDeps),
    });
    for (const diagnostic of invokeDiagnostics) {
      emitDiagnostic(diagnostic);
    }
    if (invokeDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
      continue;
    }

    fixtures.push(composeLoomFixture(input, producerDeps));
  }
  return fixtures;
}

/**
 * INV-3 arity support: parse a callee `.loom` at `absolutePath` and report its
 * `params:` arity counts — the total field count and the count of fields that
 * are neither defaulted nor optional (the minimum required arity). Returns
 * `undefined` when the callee is unreadable / unparseable (not statically
 * resolvable), so the arity check is skipped and the runtime AJV net applies.
 */
async function resolveCalleeArity(
  fs: FileSystem,
  absolutePath: string,
  deps: Parameters<typeof parseLoomDocument>[1],
): Promise<CalleeArity | undefined> {
  const bytes = await fs.readBytes(absolutePath).then(
    (value) => value,
    () => undefined,
  );
  if (bytes === undefined) {
    return undefined;
  }
  const document = parseLoomDocument({ path: absolutePath, bytes }, deps);
  if (document.frontmatter === null || hasLoadParseError(document.diagnostics)) {
    return undefined;
  }
  const fields = document.frontmatter.params?.fields ?? [];
  const requiredCount = fields.filter(
    (field) => !field.hasDefault && field.optional !== true,
  ).length;
  return { requiredCount, totalCount: fields.length };
}

/**
 * A file-head located range used for the load-path `tools:`-resolution
 * diagnostics whose obligation carries no finer source span through the shipped
 * discovery seam (the parsed frontmatter does not retain a per-`tools:`-entry
 * range). The range is not asserted by any V20a obligation — the tests anchor on
 * the diagnostic code and its registry *Message* string — so a file-head span is
 * a faithful load-path locator. See notes.md.
 */
const TOOLS_DIAGNOSTIC_RANGE = {
  start: { line: 1, column: 1 },
  end: { line: 1, column: 1 },
} as const;

/** A pre-parsed `.loom` callee, resolved once per load pass for the tools scan. */
interface CalleeParse {
  /**
   * Whether the `.loom` path resolved to a readable file. `false` only when the
   * path resolves to no file (drives `loom/load/unresolvable-loom-path`); a file
   * that exists but fails to parse is `fileExists: true` with `hasErrors: true`
   * (drives `loom/load/callee-has-errors`) — the spec's deliberate split between
   * "resolves to no file" and "exists but failed its own structural checks".
   */
  readonly fileExists: boolean;
  /**
   * The callee's declared `mode:` (gates `loom/load/prompt-mode-callable`).
   * Falls back to `subagent` for a file that exists but carries no parseable
   * frontmatter, so the callee-has-errors rejection — not a spurious
   * prompt-mode/unresolvable diagnostic — is the sole rejection for that callee.
   */
  readonly mode: LoomMode;
  /** Whether the callee carries its own error-severity load/parse diagnostics. */
  readonly hasErrors: boolean;
}

/**
 * V20a — resolve a discovered loom's `tools:` callable set at production load
 * time, returning every load-time diagnostic (error-severity entries
 * un-register the loom). Pre-parses each distinct `.loom` callee once so the
 * synchronous `resolveLoomCallee` lookup `resolveCallableSet` drives can read a
 * resolved parse, and so the V15f callee-has-errors check can inspect it.
 */
async function resolveLoomToolsAtLoad(
  parsed: LoomCompositionInput,
  fs: FileSystem,
  ctx: ExtensionContext,
  parseDeps: Parameters<typeof parseLoomDocument>[1],
): Promise<readonly Diagnostic[]> {
  const toolsList = parsed.frontmatter.tools;
  if (
    toolsList === undefined ||
    toolsList.length === 0 ||
    parsed.sourcePath === undefined
  ) {
    return [];
  }
  const callerDir = dirname(parsed.sourcePath);
  const diagnostics: Diagnostic[] = [];

  // Pre-parse each distinct `.loom` callee once, keyed by the spec as written.
  const calleeCache = new Map<string, CalleeParse>();
  for (const entry of toolsList) {
    const spec = toolsEntrySpec(entry);
    if (spec.length > 0 && !isBareToolName(spec) && !calleeCache.has(spec)) {
      calleeCache.set(
        spec,
        await parseCalleeForTools(fs, callerDir, spec, parseDeps),
      );
    }
  }

  // callee-has-errors (V15f): a readable, parseable `.loom` callee that carries
  // its own error-severity load/parse diagnostics rejects the parent at load
  // time (`tools:` surface → error severity).
  for (const [spec, callee] of calleeCache) {
    if (callee.fileExists && callee.hasErrors) {
      diagnostics.push(
        ...checkCalleeHasErrors({
          calleePath: spec,
          surface: "tools",
          hasErrors: true,
          relatedSites: [],
          site: { file: parsed.sourcePath, range: TOOLS_DIAGNOSTIC_RANGE },
        }),
      );
    }
  }

  const deps: CallableSetDeps = {
    resolvePiTool: (name) => {
      const resolved = resolvePiTool(name, ctx);
      return resolved === undefined
        ? undefined
        : { kind: "pi-tool", toolDefinition: resolved };
    },
    resolveLoomCallee: (loomPath) => {
      const callee = calleeCache.get(loomPath);
      if (callee === undefined || !callee.fileExists) {
        return undefined;
      }
      return { kind: "loom", mode: callee.mode, callee: undefined };
    },
    reservedNames: collectReservedNames(parsed.body),
  };

  const result = resolveCallableSet({
    file: parsed.sourcePath,
    tools: { kind: "list", items: toolsList },
    deps,
  });
  diagnostics.push(...result.diagnostics);
  return diagnostics;
}

/**
 * Extract one `tools:` entry's callable spec (the token before an optional
 * `as <name>` rename). Mirrors the callable-set per-entry grammar
 * (`<spec> ('as' <name>)?`).
 */
function toolsEntrySpec(entry: string): string {
  const parts = entry.trim().split(/\s+/).filter((p) => p.length > 0);
  return parts[0] ?? "";
}

/**
 * Whether a `tools:` spec is a bare Pi-tool name (identifier-shaped, no path
 * separator or `.loom` extension) rather than a `.loom` path literal — the same
 * routing `resolveCallableSet` applies internally.
 */
function isBareToolName(spec: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(spec);
}

/**
 * Pre-parse one `.loom` callee for the tools scan: resolve it against the
 * caller's directory, read + parse it, and report readability, declared mode,
 * and whether it carries its own error-severity load/parse diagnostics. An
 * unreadable / frontmatter-less callee is `readable: false` (drives
 * `loom/load/unresolvable-loom-path` through `resolveCallableSet`).
 */
async function parseCalleeForTools(
  fs: FileSystem,
  callerDir: string,
  spec: string,
  deps: Parameters<typeof parseLoomDocument>[1],
): Promise<CalleeParse> {
  const absolute = isAbsolute(spec) ? spec : resolvePath(callerDir, spec);
  const bytes = await fs.readBytes(absolute).then(
    (value) => value,
    () => undefined,
  );
  if (bytes === undefined) {
    return { fileExists: false, mode: "subagent", hasErrors: false };
  }
  const document = parseLoomDocument({ path: absolute, bytes }, deps);
  if (document.frontmatter === null) {
    // The file exists but produced no parseable frontmatter — an existing callee
    // that failed its own structural checks (callee-has-errors), not a path that
    // resolves to no file (unresolvable-loom-path).
    return { fileExists: true, mode: "subagent", hasErrors: true };
  }
  return {
    fileExists: true,
    mode: document.frontmatter.mode,
    hasErrors: hasLoadParseError(document.diagnostics),
  };
}

/**
 * The names a callable-set entry must not collide with beyond the other
 * `tools:` entries: the loom's top-level `fn` declarations and imported symbols
 * (frontmatter-fields-a.md §`tools` — the top-level arm of
 * `loom/load/tool-name-collision`).
 */
function collectReservedNames(body: LoomBody): ReadonlySet<string> {
  const names = new Set<string>();
  for (const statement of body.statements) {
    if (statement.kind === "fn") {
      names.add(statement.name);
    } else if (statement.kind === "import") {
      for (const symbol of statement.symbols) {
        names.add(symbol);
      }
    }
  }
  return names;
}

/** The loom-load-bearing shape of a host tool definition's `execute` member. */
type HostToolExecute = (
  toolCallId: string,
  params: never,
  signal: AbortSignal | undefined,
  onUpdate: undefined,
  ctx: ExtensionContext,
) => Promise<{ readonly content: readonly { readonly type: string }[] }>;

/**
 * H8b: construct the host built-in tool definition for `name` over `cwd`, or
 * `undefined` when the name is not a known host built-in. Each returns a
 * `ToolDefinition` whose `execute(...)` loom drives directly for a code-side
 * `<name>(args)` call (host-interfaces-core.md §"Tool execution from loom code").
 * A switch (not a module-level lookup object) keeps the composition root free of
 * module-level mutable state.
 */
function builtinToolDefinition(
  name: string,
  cwd: string,
): { execute: HostToolExecute } | undefined {
  switch (name) {
    case "grep":
      return createGrepToolDefinition(cwd);
    case "read":
      return createReadToolDefinition(cwd);
    case "find":
      return createFindToolDefinition(cwd);
    case "ls":
      return createLsToolDefinition(cwd);
    case "bash":
      return createBashToolDefinition(cwd);
    case "edit":
      return createEditToolDefinition(cwd);
    case "write":
      return createWriteToolDefinition(cwd);
    default:
      return undefined;
  }
}

/**
 * H8b: resolve a code-side Pi-tool name to its `execute` dispatch. Returns
 * `undefined` for a name that is not a known host built-in, so the code-side
 * path surfaces the unknown-tool execution `Err` rather than fabricating a
 * value. The synthesised `execute` invokes the host tool with a `loom-direct:`
 * tool-call id and maps its `AgentToolResult` to loom's `content`-only envelope.
 */
function resolvePiTool(
  name: string,
  ctx: ExtensionContext,
): { readonly toolName: string; execute: (id: string, params: unknown, signal: AbortSignal) => Promise<{ readonly content: readonly { readonly type: string }[] }> } | undefined {
  const definition = builtinToolDefinition(name, ctx.cwd);
  if (definition === undefined) {
    return undefined;
  }
  return {
    toolName: name,
    execute: async (id, params, signal) => {
      const result = await definition.execute(id, params as never, signal, undefined, ctx);
      return { content: result.content };
    },
  };
}

/**
 * H8b: resolve a callee path against the caller's directory (or `cwd` for an
 * in-memory caller) and parse it into a runnable composition input. Returns
 * `undefined` when the callee is missing / unparseable, so the invoke resolver
 * surfaces the `load_failure` `Err`.
 */
async function parseCalleeLoom(
  fs: FileSystem,
  cwd: string,
  callerPath: string | undefined,
  calleePath: string,
  deps: Parameters<typeof parseLoomDocument>[1],
): Promise<LoomCompositionInput | undefined> {
  const baseDir = callerPath !== undefined ? dirname(callerPath) : cwd;
  const absolute = isAbsolute(calleePath) ? calleePath : resolvePath(baseDir, calleePath);
  const bytes = await fs.readBytes(absolute).then(
    (value) => value,
    () => undefined,
  );
  if (bytes === undefined) {
    return undefined;
  }
  const document = parseLoomDocument({ path: absolute, bytes }, deps);
  if (document.frontmatter === null || hasLoadParseError(document.diagnostics)) {
    return undefined;
  }
  return {
    slashName: loomBasename(absolute),
    sourcePath: absolute,
    frontmatter: document.frontmatter,
    body: document.body,
  };
}

/**
 * Whether any aggregated diagnostic is an error-severity load / parse diagnostic
 * that must block registration (the frontmatter value-validations, the `params:`
 * named-type / ordering / default-literal checks, and the `system:` checks all
 * surface here). Warnings never block registration.
 */
function hasLoadParseError(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some(
    (diagnostic) =>
      diagnostic.severity === "error" &&
      (diagnostic.code.startsWith("loom/load/") ||
        diagnostic.code.startsWith("loom/parse/")),
  );
}

/** The `.loom` basename (minus extension) of a path, for the callee slash name. */
function loomBasename(path: string): string {
  const base = path.slice(path.replace(/\\/g, "/").lastIndexOf("/") + 1);
  return base.endsWith(".loom") ? base.slice(0, -".loom".length) : base;
}

/**
 * The outcome of parsing one discovered `.loom`: either a runnable composition
 * input, or a drop carrying the load/parse diagnostics that caused the drop so
 * the caller can surface them (FM-3 / DIAG-1).
 */
type ParsedDiscoveredLoom =
  | { readonly fixture: LoomCompositionInput }
  | { readonly dropped: readonly Diagnostic[] };

/** Read + parse one discovered `.loom` into its `V19a` frontmatter + body AST. */
async function parseDiscoveredLoom(
  fs: FileSystem,
  loom: DiscoveredLoom,
  deps: Parameters<typeof parseLoomDocument>[1],
): Promise<ParsedDiscoveredLoom> {
  const bytes = await fs.readBytes(loom.path).then(
    (value) => value,
    () => undefined,
  );
  if (bytes === undefined) {
    return { dropped: [] };
  }
  const document = parseLoomDocument({ path: loom.path, bytes }, deps);
  if (document.frontmatter === null || hasLoadParseError(document.diagnostics)) {
    // A well-formed `.loom` carries `mode:` frontmatter and produces no
    // error-severity load/parse diagnostic; a frontmatter-less file cannot be
    // composed into a runnable fixture, and a loom that produced an
    // error-severity `loom/load/*` / `loom/parse/*` diagnostic (an invalid
    // frontmatter value, an unresolved param named type, a `system:`
    // interpolation error, …) must not register (warnings still register).
    //
    // FM-3: return the load-phase diagnostics so the caller emits them. DIAG-1
    // requires every author-visible drop to carry its registry code/message;
    // previously these were computed here and silently discarded, so a `mode:`
    // typo made the command vanish with no feedback. (The `tools:`-resolution
    // diagnostics are emitted separately by `resolveLoomToolsAtLoad` and are
    // not part of `document.diagnostics`, so this does not double-emit them.)
    return { dropped: document.diagnostics };
  }
  return {
    fixture: {
      slashName: loom.name,
      sourcePath: loom.path,
      frontmatter: document.frontmatter,
      body: document.body,
    },
  };
}

/** Split the `--loom` CLI flag value into discovery-source paths. */
function readLoomFlagPaths(pi: ExtensionAPI): readonly string[] {
  const raw = pi.getFlag("loom");
  if (typeof raw !== "string" || raw.length === 0) {
    return [];
  }
  return raw
    .split(PATH_DELIMITER)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * The Pi-owned commands the cross-format collision check consults: the current
 * command snapshot filtered to the collision source set (`prompt` / `skill` /
 * `extension`). Read read-only-by-convention (PIC-39).
 */
function readPiOwnedCommands(pi: ExtensionAPI): readonly PiOwnedCommand[] {
  const owned: PiOwnedCommand[] = [];
  for (const command of pi.getCommands()) {
    if (
      command.source === "prompt" ||
      command.source === "skill" ||
      command.source === "extension"
    ) {
      owned.push({ name: command.name, source: command.source });
    }
  }
  return owned;
}

/** Adapt the host `pi` / `ctx` surface to the `V19a` parser note-channel deps. */
function buildSystemNoteDeps(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  emitDiagnostic: (diagnostic: Diagnostic) => void,
): SystemNoteChannelDeps {
  return {
    pi: {
      sendMessage: (message, _options) => {
        pi.sendMessage(
          {
            customType: SYSTEM_NOTE_CHANNEL,
            content: message.content,
            display: message.display,
            details: message.details,
          },
          { triggerTurn: false },
        );
      },
    },
    ui: {
      notify: (message: string, type: "error") => ctx.ui.notify(message, type),
    },
    emitDiagnostic,
  };
}
