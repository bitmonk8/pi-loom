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
import { renderCanonicalNumber } from "../render/canonical-number";

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
  const merged: JsonObject = { ...global };
  for (const [key, projectValue] of Object.entries(project)) {
    const globalValue = merged[key];
    // Deep-merge only when both sides are plain objects; arrays and scalars are
    // replaced wholesale with the project value (DISC-7).
    if (isPlainObject(globalValue) && isPlainObject(projectValue)) {
      merged[key] = mergeSettings(globalValue, projectValue);
    } else {
      merged[key] = projectValue;
    }
  }
  return merged;
}

/** A JSON value that is a plain object (not an array, not `null`). */
function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The closed JSON-kind token set used by `<observed>` and `<kind>` placeholders. */
function jsonKind(
  value: unknown,
): "string" | "number" | "boolean" | "null" | "array" | "object" {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "string") return "string";
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  return "object";
}

/**
 * Render the `<observed>` substring for `loom/load/settings-value-out-of-range`
 * per the parsed-scalar carve-out (placeholder-rendering-b.md §"`<observed>` on
 * the parsed-scalar out-of-range codes"): a number canonically, a boolean as
 * `true`/`false`, `null` as the literal text `null`, a string bare when
 * identifier-shaped else double-quoted, and an `array` / `object` composite as
 * its JSON kind token.
 */
function renderObserved(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  switch (typeof value) {
    case "number":
      return renderCanonicalNumber(
        value,
        Number.isInteger(value) ? "integer" : "number",
      );
    case "boolean":
      return value ? "true" : "false";
    case "string":
      return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value)
        ? value
        : JSON.stringify(value);
    default:
      return "object";
  }
}

const SETTINGS_VALUE_OUT_OF_RANGE = "loom/load/settings-value-out-of-range";
const SETTINGS_INVALID_ENTRY = "loom/load/settings-invalid-entry";
const SETTINGS_INVALID_JSON = "loom/load/settings-invalid-json";
const SETTINGS_UNREADABLE = "loom/load/settings-unreadable";

/** The four recognised `looms.*` scalar keys, in their fixed inspection order. */
const LOOMS_SCALAR_KEYS = [
  "binderModel",
  "scanPackages",
  "scanPackagesMaxFiles",
  "scanPackagesTimeoutMs",
] as const;

/** Validate one `looms.*` scalar value against its declared type/range. */
function isScalarKeyValid(key: (typeof LOOMS_SCALAR_KEYS)[number], value: unknown): boolean {
  switch (key) {
    case "binderModel":
      return typeof value === "string" && value.length > 0;
    case "scanPackages":
      return typeof value === "boolean";
    case "scanPackagesMaxFiles":
    case "scanPackagesTimeoutMs":
      return typeof value === "number" && Number.isInteger(value) && value >= 1;
  }
}

/** POSIX-join a base directory with a relative tail (no trailing-slash dupes). */
function posixJoin(base: string, tail: string): string {
  const trimmed = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${trimmed}/${tail}`;
}

/** The outcome of reading + parsing one settings file. */
type FileReadOutcome =
  | { readonly kind: "unreadable" }
  | { readonly kind: "invalid-json" }
  | { readonly kind: "parsed"; readonly root: unknown };

/**
 * Read one settings file through the seam and parse its UTF-8 JSON root. A read
 * rejection (missing or unreadable) maps to `unreadable`; an invalid-UTF-8
 * decode or a JSON parse failure maps to `invalid-json`. Both discriminate via
 * Promise rejection handlers rather than `catch` clauses (Node fs errors carry
 * no narrow subtype to bind, and the broad-`catch` ban targets `catch`).
 */
async function readSettingsFile(fs: FileSystem, path: string): Promise<FileReadOutcome> {
  const bytes = await fs.readBytes(path).then(
    (value) => ({ ok: true as const, value }),
    () => ({ ok: false as const }),
  );
  if (!bytes.ok) {
    return { kind: "unreadable" };
  }
  const parsed = await Promise.resolve()
    .then(() => {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes.value);
      return JSON.parse(text) as unknown;
    })
    .then(
      (root) => ({ ok: true as const, root }),
      () => ({ ok: false as const }),
    );
  if (!parsed.ok) {
    return { kind: "invalid-json" };
  }
  return { kind: "parsed", root: parsed.root };
}

/**
 * Validate and clean one parsed settings file: top-level shape, `loomPaths`
 * entries, and `looms.*` scalar keys. Returns the cleaned object (only valid
 * recognised keys survive) plus the per-file diagnostics. Each malformed key /
 * entry is treated as absent and contributes exactly one diagnostic per file.
 */
function cleanSettingsFile(root: unknown, path: string): {
  readonly cleaned: JsonObject;
  readonly diagnostics: Diagnostic[];
} {
  const diagnostics: Diagnostic[] = [];
  const cleaned: JsonObject = {};

  // A root that parses but is not a JSON object has no keys to inspect: one
  // `(root)` diagnostic, no per-key cascade.
  if (!isPlainObject(root)) {
    diagnostics.push({
      severity: "error",
      code: SETTINGS_VALUE_OUT_OF_RANGE,
      file: path,
      message: `settings key (root) value is out of range; got ${renderObserved(root)}`,
    });
    return { cleaned, diagnostics };
  }

  // Top-level `loomPaths` — must be a JSON array; non-string entries rejected
  // per-entry.
  if (Object.prototype.hasOwnProperty.call(root, "loomPaths")) {
    const value = root["loomPaths"];
    if (Array.isArray(value)) {
      const kept: string[] = [];
      value.forEach((entry, index) => {
        if (typeof entry === "string") {
          kept.push(entry);
        } else {
          diagnostics.push({
            severity: "error",
            code: SETTINGS_INVALID_ENTRY,
            file: path,
            message: `settings 'loomPaths[${index}]' must be a string path; got ${jsonKind(entry)}`,
          });
        }
      });
      cleaned["loomPaths"] = kept;
    } else {
      diagnostics.push({
        severity: "error",
        code: SETTINGS_VALUE_OUT_OF_RANGE,
        file: path,
        message: `settings key loomPaths value is out of range; got ${renderObserved(value)}`,
      });
    }
  }

  // Top-level `looms` — must be a JSON object; a malformed `looms` logs once and
  // suppresses the nested cascade.
  if (Object.prototype.hasOwnProperty.call(root, "looms")) {
    const value = root["looms"];
    if (isPlainObject(value)) {
      const cleanedLooms: JsonObject = {};
      for (const key of LOOMS_SCALAR_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) {
          continue;
        }
        const scalar = value[key];
        if (isScalarKeyValid(key, scalar)) {
          cleanedLooms[key] = scalar;
        } else {
          diagnostics.push({
            severity: "error",
            code: SETTINGS_VALUE_OUT_OF_RANGE,
            file: path,
            message: `settings key looms.${key} value is out of range; got ${renderObserved(scalar)}`,
          });
        }
      }
      // Unknown `looms.*` keys are ignored without diagnostic (forward-compat).
      cleaned["looms"] = cleanedLooms;
    } else {
      diagnostics.push({
        severity: "error",
        code: SETTINGS_VALUE_OUT_OF_RANGE,
        file: path,
        message: `settings key looms value is out of range; got ${renderObserved(value)}`,
      });
    }
  }

  return { cleaned, diagnostics };
}

/** Read, validate, and clean one settings file end-to-end. */
async function loadOneFile(
  fs: FileSystem,
  path: string,
): Promise<{ readonly cleaned: JsonObject; readonly diagnostics: Diagnostic[] }> {
  const outcome = await readSettingsFile(fs, path);
  if (outcome.kind === "unreadable") {
    return {
      cleaned: {},
      diagnostics: [
        {
          severity: "warning",
          code: SETTINGS_UNREADABLE,
          file: path,
          message: `settings file '${path}' is unreadable`,
        },
      ],
    };
  }
  if (outcome.kind === "invalid-json") {
    return {
      cleaned: {},
      diagnostics: [
        {
          severity: "warning",
          code: SETTINGS_INVALID_JSON,
          file: path,
          message: `settings file '${path}' is not valid UTF-8 JSON`,
        },
      ],
    };
  }
  return cleanSettingsFile(outcome.root, path);
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
  const projectPath = posixJoin(fs.cwd(), ".pi/settings.json");
  const globalPath = posixJoin(fs.homedir(), ".pi/agent/settings.json");

  // Read sequentially (Sequential by default): global then project.
  const global = await loadOneFile(fs, globalPath);
  const project = await loadOneFile(fs, projectPath);

  const merged = mergeSettings(global.cleaned, project.cleaned);

  const settings: { loomPaths?: readonly string[]; looms?: LoomsSettings } = {};
  if (Array.isArray(merged["loomPaths"])) {
    settings.loomPaths = merged["loomPaths"] as readonly string[];
  }
  if (isPlainObject(merged["looms"])) {
    settings.looms = merged["looms"] as LoomsSettings;
  }

  return {
    settings,
    diagnostics: [...global.diagnostics, ...project.diagnostics],
  };
}
