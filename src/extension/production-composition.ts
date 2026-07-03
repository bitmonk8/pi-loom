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
import { parseLoomDocument } from "../parser/loom-document";
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
  });

  const fixtures: LoomFixture[] = [];
  for (const loom of discovered) {
    const parsed = await parseDiscoveredLoom(fileSystem, loom, {
      systemNote,
      modelMatcher,
    });
    if (parsed === undefined) {
      continue;
    }
    fixtures.push(composeLoomFixture(parsed, producerDeps));
  }
  return fixtures;
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
  if (document.frontmatter === null) {
    return undefined;
  }
  return {
    slashName: loomBasename(absolute),
    sourcePath: absolute,
    frontmatter: document.frontmatter,
    body: document.body,
  };
}

/** The `.loom` basename (minus extension) of a path, for the callee slash name. */
function loomBasename(path: string): string {
  const base = path.slice(path.replace(/\\/g, "/").lastIndexOf("/") + 1);
  return base.endsWith(".loom") ? base.slice(0, -".loom".length) : base;
}

/** Read + parse one discovered `.loom` into its `V19a` frontmatter + body AST. */
async function parseDiscoveredLoom(
  fs: FileSystem,
  loom: DiscoveredLoom,
  deps: Parameters<typeof parseLoomDocument>[1],
): Promise<LoomCompositionInput | undefined> {
  const bytes = await fs.readBytes(loom.path).then(
    (value) => value,
    () => undefined,
  );
  if (bytes === undefined) {
    return undefined;
  }
  const document = parseLoomDocument({ path: loom.path, bytes }, deps);
  if (document.frontmatter === null) {
    // A well-formed `.loom` carries `mode:` frontmatter; a frontmatter-less
    // file cannot be composed into a runnable fixture. Its load-phase
    // diagnostics were aggregated by the parser and routed above.
    return undefined;
  }
  return {
    slashName: loom.name,
    sourcePath: loom.path,
    frontmatter: document.frontmatter,
    body: document.body,
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
