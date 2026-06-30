// V10c / V10c-T — Settings-source reads, validation, and merge.
//
// The loom extension owns its own `settings.json` keys (`loomPaths` plus the
// four `looms.*` scalars); Pi does not surface them. The extension reads the
// same two files Pi uses for its own settings, through the injected
// `FileSystem` seam, and merges them with Pi's precedence rule (project over
// global; deep-merge objects, replace arrays/scalars — DISC-7).
//
// Resolved file locations (POSIX-joined, project before global):
//   project: `<FileSystem.cwd()>/.pi/settings.json`
//   global:  `<FileSystem.homedir()>/.pi/agent/settings.json`
//
// V10c-T (tests-task) declares the seam shape and stubs the two behaviour-
// bearing functions with inert, empty results so the failing tests compile and
// red on their own primary assertions (no diagnostics emitted, no merged keys
// produced). The paired V10c implementation leaf fills these in.
//
// Spec: discovery/package-and-settings.md (DISC-7, the settings file reads,
// the top-level / scalar-key validation surface, and the `loomPaths` entry
// schema), with diagnostic codes/messages sourced from
// diagnostics/code-registry-load.md.

import type { Diagnostic } from "../diagnostics/diagnostic";
import type { FileSystem } from "../seams/file-system";

/** A parsed JSON object (the on-disk shape of one settings file's root). */
export type JsonObject = Record<string, unknown>;

/** The four recognised `looms.*` scalar keys (post-validation, cleaned view). */
export interface LoomsSettings {
  /** `looms.binderModel` — a non-empty model identifier; no built-in default. */
  readonly binderModel?: string;
  /** `looms.scanPackages` — boolean (default `true` when absent). */
  readonly scanPackages?: boolean;
  /** `looms.scanPackagesMaxFiles` — integer ≥ 1 (default `2000`). */
  readonly scanPackagesMaxFiles?: number;
  /** `looms.scanPackagesTimeoutMs` — integer ≥ 1 (default `2000`). */
  readonly scanPackagesTimeoutMs?: number;
}

/**
 * The merged, validated loom-extension settings view. A recognised key whose
 * value failed validation, or that no file supplied, is absent here (the
 * consumer applies the built-in default).
 */
export interface LoomSettings {
  /** `loomPaths` — the validated string entries (non-string entries dropped). */
  readonly loomPaths?: readonly string[];
  /** The `looms.*` scalar namespace. */
  readonly looms?: LoomsSettings;
}

/** The result of reading and merging the two settings files. */
export interface SettingsLoadResult {
  readonly settings: LoomSettings;
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * DISC-7 deep merge of two parsed settings objects: `project` over `global`,
 * deep-merging nested objects key-by-key, replacing arrays and scalars
 * wholesale. Keys present in only one operand are kept as-is.
 *
 * V10c-T stub: returns an empty object so the merge tests red on their own
 * assertions; V10c implements the recursive merge.
 */
export function mergeSettings(global: JsonObject, project: JsonObject): JsonObject {
  void global;
  void project;
  return {};
}

/**
 * Read both settings files through the `FileSystem` seam, validate each file
 * independently (top-level shape, scalar-key type/range, `loomPaths` entries),
 * emit one load-phase diagnostic per offending key/entry per file, then merge
 * the two cleaned objects per `mergeSettings`.
 *
 * V10c-T stub: returns an empty settings view and no diagnostics so the
 * file-read / validation / merge tests red on their own assertions; V10c
 * implements the reads, validation, and merge.
 */
export async function loadSettings(fs: FileSystem): Promise<SettingsLoadResult> {
  void fs;
  return { settings: {}, diagnostics: [] };
}
