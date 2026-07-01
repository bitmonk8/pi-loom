// V6c / V6c-T — the `tools:` callable set and resolution snapshot seam.
//
// This module owns the loom-load-time resolution of the frontmatter `tools:`
// field into the frozen per-loom **callable set** described by
// frontmatter/frontmatter-fields-a.md §`tools` and its resolution-snapshot
// prose in frontmatter/frontmatter-fields-b-and-templates.md:
//
//   - the two interchangeable YAML spellings (comma-separated short form and
//     YAML list form) parsed by one per-entry grammar;
//   - Pi-tool entries (resolved against the host tool registry) and `.loom`-path
//     entries (resolved against the per-load-pass parse cache);
//   - the default name derivation (Pi-tool name verbatim; `.loom` basename with
//     hyphens replaced by underscores) and the `as <name>` rename override;
//   - the five load-time rejections — `loom/load/unknown-tool`,
//     `loom/load/unresolvable-loom-path`, `loom/load/prompt-mode-callable`,
//     `loom/load/invalid-tool-rename`, `loom/load/tool-name-collision`;
//   - the frozen resolution snapshot (no ambient inheritance): only the
//     explicitly-listed callables appear, and an absent / empty `tools:` yields
//     the empty callable set.
//
// V6c-T (tests-task) declares the seam shapes — `resolveCallableSet`, the
// injected `CallableSetDeps` lookups, the `ToolsField` input, and the
// `CallableSetSnapshot` / result records — and stubs `resolveCallableSet` as an
// inert seam (registers an empty, unfrozen snapshot; raises no diagnostic) so
// the failing V6c-T tests compile and red on their own primary assertions. The
// paired V6c implementation leaf fills it in.
//
// Spec: frontmatter/frontmatter-fields-a.md (§`tools`, FRNT-2, FRNT-3),
// frontmatter/frontmatter-fields-b-and-templates.md (§Resolution snapshot),
// lexical.md (§Extension matching, §Path literals).

import type { Diagnostic } from "../diagnostics/diagnostic";
import type { LoomMode } from "./frontmatter";

/**
 * The raw `tools:` frontmatter value in either accepted YAML spelling
 * (frontmatter-fields-b-and-templates.md §YAML-shape):
 *   - `absent`  — `tools:` omitted or `tools: []`; the empty callable set.
 *   - `scalar`  — the comma-separated short form (`tools: read, grep, bash`);
 *                 the YAML plain scalar split on commas, each entry trimmed.
 *   - `list`    — the YAML list form; one entry per sequence item.
 * Both spellings are parsed by the same per-entry grammar.
 */
export type ToolsField =
  | { readonly kind: "absent" }
  | { readonly kind: "scalar"; readonly text: string }
  | { readonly kind: "list"; readonly items: readonly string[] };

/**
 * A Pi tool resolved against the host tool registry — the resolution snapshot
 * holds a strong reference to the resolved `ToolDefinition` (its `execute`,
 * `parameters`, and metadata at the moment of load).
 */
export interface ResolvedPiTool {
  readonly kind: "pi-tool";
  /** Strong reference to the resolved Pi `ToolDefinition` (opaque to this seam). */
  readonly toolDefinition: unknown;
}

/**
 * A `.loom` callee resolved against the per-load-pass parse cache — the
 * resolution snapshot holds a strong reference to the parsed callee plus its
 * lowered tool spec. `mode` gates the `loom/load/prompt-mode-callable` check.
 */
export interface ResolvedLoomCallee {
  readonly kind: "loom";
  /** The callee loom file's declared `mode:`. */
  readonly mode: LoomMode;
  /** Strong reference to the parsed callee + lowered tool spec (opaque here). */
  readonly callee: unknown;
}

/** One resolved callable in the snapshot. */
export type ResolvedCallable = ResolvedPiTool | ResolvedLoomCallee;

/**
 * The frozen per-loom resolution snapshot: a `{ post-rename name → resolved
 * callable }` table (frontmatter-fields-b-and-templates.md §Resolution
 * snapshot). Frozen so no ambient inheritance or post-load mutation can widen
 * the callable set; subsequent calls dispatch through the held references.
 */
export interface CallableSetSnapshot {
  readonly entries: ReadonlyMap<string, ResolvedCallable>;
}

/** The injected host lookups the resolver consults at load time. */
export interface CallableSetDeps {
  /**
   * Resolve a Pi tool name against the host tool registry, returning a strong
   * reference to its `ToolDefinition`, or `undefined` when the name is absent
   * from the registry (drives `loom/load/unknown-tool`).
   */
  readonly resolvePiTool: (name: string) => ResolvedPiTool | undefined;
  /**
   * Resolve a `.loom` path (relative to the calling loom's directory) through
   * the per-load-pass parse cache, returning the parsed callee (carrying its
   * declared `mode:`), or `undefined` when the path does not exist or is not
   * readable (drives `loom/load/unresolvable-loom-path`).
   */
  readonly resolveLoomCallee: (loomPath: string) => ResolvedLoomCallee | undefined;
  /**
   * Names already bound at the loom's top level — top-level `fn` declarations
   * and imported symbols — that a callable-set name must not collide with
   * (drives the top-level arm of `loom/load/tool-name-collision`).
   */
  readonly reservedNames: ReadonlySet<string>;
}

/** Inputs to a callable-set resolution. */
export interface ResolveCallableSetInput {
  /** The source file path, for located diagnostics. */
  readonly file: string;
  /** The raw `tools:` frontmatter value (either YAML spelling). */
  readonly tools: ToolsField;
  /** The injected host lookups the resolver consults. */
  readonly deps: CallableSetDeps;
}

/** The outcome of a callable-set resolution: registration decision + diagnostics. */
export interface CallableSetResult {
  /**
   * Whether the loom is registered. `false` when any load-time rejection fired
   * (unknown tool, unresolvable / prompt-mode `.loom`, invalid rename, name
   * collision); `true` when the callable set resolved cleanly.
   */
  readonly registered: boolean;
  /** The frozen resolution snapshot, present iff `registered` is `true`. */
  readonly callableSet?: CallableSetSnapshot;
  /** Every diagnostic raised during resolution, in source order. */
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Resolve a loom's `tools:` field into its frozen callable set
 * (frontmatter-fields-a.md §`tools`, frontmatter-fields-b-and-templates.md
 * §Resolution snapshot):
 *
 *   - parse both YAML spellings by one per-entry grammar;
 *   - resolve each Pi-tool / `.loom` entry, applying the default-name / `as`
 *     rename rules;
 *   - reject an unknown Pi tool (`loom/load/unknown-tool`), an unresolvable
 *     `.loom` path (`loom/load/unresolvable-loom-path`), a prompt-mode `.loom`
 *     callee (`loom/load/prompt-mode-callable`), an invalid `as` rename target
 *     (`loom/load/invalid-tool-rename`), and a name collision
 *     (`loom/load/tool-name-collision`);
 *   - freeze the resulting snapshot (no ambient inheritance).
 *
 * The loom registers iff no error-severity diagnostic was raised.
 *
 * V6c-T stub: inert. Registers an empty, **unfrozen** snapshot and raises no
 * diagnostic, so every paired V6c-T test reds on its own primary assertion — an
 * absent expected diagnostic, a missing resolved entry, or an unfrozen snapshot
 * — not on a compile error, missing fixture, or harness throw. The paired V6c
 * implementation leaf fills this in.
 */
export function resolveCallableSet(
  input: ResolveCallableSetInput,
): CallableSetResult {
  void input;
  return {
    registered: true,
    callableSet: { entries: new Map<string, ResolvedCallable>() },
    diagnostics: [],
  };
}
