import { describe, expect, it } from "vitest";
import {
  loadSettings,
  mergeSettings,
  type JsonObject,
} from "../src/discovery/settings";
import type { Diagnostic } from "../src/diagnostics/diagnostic";
import type { FileSystem } from "../src/seams/file-system";
import { FakeFileSystem } from "./helpers/fake-file-system";

// V10c-T — failing tests for the paired `V10c` settings reads-and-merge
// implementation (`src/discovery/settings.ts`). The bullets trace to DISC-7
// (the deep-merge precedence) and the four `loom/load/settings-*` codes in
// discovery/package-and-settings.md, with diagnostic messages sourced from the
// diagnostics/code-registry-load.md *Message* column.
//
// These tests red because the V10c `mergeSettings` / `loadSettings` bodies are
// absent — the stubs return an empty merge object and an empty
// settings/diagnostics result, so each assertion reds on the missing merged key
// or the missing diagnostic, not on a compile error, fixture, or harness throw.

// Resolved settings-file locations the seam reads (POSIX-joined per the module
// contract: project = `<cwd>/.pi/settings.json`, global =
// `<homedir>/.pi/agent/settings.json`).
const HOME = "/home/loom";
const CWD = "/project";
const PROJECT_PATH = "/project/.pi/settings.json";
const GLOBAL_PATH = "/home/loom/.pi/agent/settings.json";

/** One settings file's on-disk state: present-with-content, unreadable, or (omitted) missing. */
interface FileSpec {
  readonly content?: string;
  readonly error?: string;
}

/** A valid, empty settings file — contributes no keys and no diagnostics. */
const EMPTY: FileSpec = { content: "{}" };

/** Build a FileSystem fake placing the two settings files at their resolved paths. */
function build(project: FileSpec, global: FileSpec): FileSystem {
  const files: Record<string, string> = {};
  const errors: Record<string, string> = {};
  if (project.content !== undefined) files[PROJECT_PATH] = project.content;
  if (project.error !== undefined) errors[PROJECT_PATH] = project.error;
  if (global.content !== undefined) files[GLOBAL_PATH] = global.content;
  if (global.error !== undefined) errors[GLOBAL_PATH] = global.error;
  return new FakeFileSystem({ homedir: HOME, cwd: CWD, files, errors });
}

/** Diagnostics matching a registry code. */
function byCode(diagnostics: readonly Diagnostic[], code: string): readonly Diagnostic[] {
  return diagnostics.filter((d) => d.code === code);
}

// --------------------------------------------------------------------------
// DISC-7 — deep-merge precedence (objects deep-merge, arrays/scalars replace,
// project over global).
// --------------------------------------------------------------------------

describe("V10c-T — DISC-7 settings merge semantics", () => {
  it("DISC-7: nested objects deep-merge — project keys override, global-only keys retained", () => {
    const global: JsonObject = { looms: { scanPackages: true, scanPackagesMaxFiles: 100 } };
    const project: JsonObject = { looms: { scanPackagesMaxFiles: 200 } };
    const merged = mergeSettings(global, project);
    const looms = merged.looms as { scanPackages?: boolean; scanPackagesMaxFiles?: number } | undefined;
    expect(looms?.scanPackagesMaxFiles).toBe(200); // project overrides
    expect(looms?.scanPackages).toBe(true); // global-only nested key retained
  });

  it("DISC-7: array values are replaced wholesale (not concatenated or deduplicated)", () => {
    const global: JsonObject = { loomPaths: ["a.loom", "b.loom"] };
    const project: JsonObject = { loomPaths: ["c.loom"] };
    const merged = mergeSettings(global, project);
    expect(merged.loomPaths).toEqual(["c.loom"]);
  });

  it("DISC-7: scalar values are replaced — project overrides global", () => {
    const global: JsonObject = { looms: { binderModel: "global-model" } };
    const project: JsonObject = { looms: { binderModel: "project-model" } };
    const merged = mergeSettings(global, project);
    const looms = merged.looms as { binderModel?: string } | undefined;
    expect(looms?.binderModel).toBe("project-model");
  });

  it("DISC-7: a key present in only one file is kept as-is", () => {
    const global: JsonObject = { loomPaths: ["g.loom"] };
    const project: JsonObject = { looms: { scanPackages: false } };
    const merged = mergeSettings(global, project);
    const looms = merged.looms as { scanPackages?: boolean } | undefined;
    expect(merged.loomPaths).toEqual(["g.loom"]); // global-only top-level key kept
    expect(looms?.scanPackages).toBe(false); // project-only nested object kept
  });
});

// --------------------------------------------------------------------------
// loom/load/settings-invalid-json — present-but-unparseable file.
// --------------------------------------------------------------------------

describe("V10c-T — loom/load/settings-invalid-json", () => {
  it("loom/load/settings-invalid-json: a present-but-invalid-JSON file fires one load-phase diagnostic", async () => {
    const fs = build({ content: "{ not: valid json" }, EMPTY);
    const { diagnostics } = await loadSettings(fs);
    const hits = byCode(diagnostics, "loom/load/settings-invalid-json");
    expect(hits).toHaveLength(1);
    expect(hits[0]!.severity).toBe("warning"); // registry severity W
  });
});

// --------------------------------------------------------------------------
// loom/load/settings-unreadable — missing or unreadable file → treated as {},
// other file unaffected, single diagnostic per file.
// --------------------------------------------------------------------------

describe("V10c-T — loom/load/settings-unreadable", () => {
  it("loom/load/settings-unreadable: an unreadable file is treated as {}, the other file's value is unaffected, one diagnostic fires", async () => {
    const fs = build(
      { error: "EACCES" },
      { content: JSON.stringify({ loomPaths: ["g.loom"] }) },
    );
    const { settings, diagnostics } = await loadSettings(fs);
    const hits = byCode(diagnostics, "loom/load/settings-unreadable");
    expect(hits).toHaveLength(1);
    expect(hits[0]!.severity).toBe("warning"); // registry severity W
    expect(settings.loomPaths).toEqual(["g.loom"]); // readable file unaffected
  });

  it("loom/load/settings-unreadable: a missing settings file fires the diagnostic and is treated as {}", async () => {
    // Project present & valid; global absent (missing on disk).
    const fs = build({ content: JSON.stringify({ loomPaths: ["p.loom"] }) }, {});
    const { settings, diagnostics } = await loadSettings(fs);
    const hits = byCode(diagnostics, "loom/load/settings-unreadable");
    expect(hits).toHaveLength(1);
    expect(settings.loomPaths).toEqual(["p.loom"]); // present file's value unaffected
  });
});

// --------------------------------------------------------------------------
// loom/load/settings-value-out-of-range — top-level shape validation.
// --------------------------------------------------------------------------

describe("V10c-T — loom/load/settings-value-out-of-range (top-level shape)", () => {
  it("settings-value-out-of-range: non-array loomPaths and non-object looms are each absent, one diagnostic per malformed key (no nested cascade)", async () => {
    const fs = build(
      { content: JSON.stringify({ loomPaths: 42, looms: [1, 2] }) },
      EMPTY,
    );
    const { settings, diagnostics } = await loadSettings(fs);
    const hits = byCode(diagnostics, "loom/load/settings-value-out-of-range");
    // Exactly one per malformed top-level key — a malformed `looms` does NOT
    // additionally log one per nested looms.* key.
    expect(hits).toHaveLength(2);
    for (const h of hits) expect(h.severity).toBe("error"); // registry severity E
    expect(settings.loomPaths).toBeUndefined(); // treated as absent
    expect(settings.looms).toBeUndefined(); // treated as absent
    // Messages sourced from the registry Message column (parsed-scalar carve-out,
    // byte-exact): `<observed>` is the parsed value's kind/value.
    const messages = hits.map((h) => h.message);
    expect(messages).toContain("settings key loomPaths value is out of range; got 42");
    expect(messages).toContain("settings key looms value is out of range; got array");
  });

  it("settings-value-out-of-range: a non-object JSON root fires exactly one (root) diagnostic with no per-key cascade", async () => {
    const fs = build({ content: JSON.stringify(["top", "level", "array"]) }, EMPTY);
    const { settings, diagnostics } = await loadSettings(fs);
    const hits = byCode(diagnostics, "loom/load/settings-value-out-of-range");
    expect(hits).toHaveLength(1);
    // Registry Message column, byte-exact: `(root)` and the `array` kind token.
    expect(hits[0]!.message).toBe("settings key (root) value is out of range; got array");
    expect(settings.loomPaths).toBeUndefined();
    expect(settings.looms).toBeUndefined();
  });
});

// --------------------------------------------------------------------------
// loom/load/settings-value-out-of-range — scalar-key validation.
// --------------------------------------------------------------------------

describe("V10c-T — loom/load/settings-value-out-of-range (scalar keys)", () => {
  it("settings-value-out-of-range: each of the four looms.* keys failing its type/range is absent, one diagnostic per offending key", async () => {
    const fs = build(
      {
        content: JSON.stringify({
          loomPaths: ["keep.loom"], // valid sibling — must survive
          looms: {
            binderModel: "", // invalid: must be a non-empty string
            scanPackages: "yes", // invalid: must be JSON true/false
            scanPackagesMaxFiles: 0, // invalid: integer ≥ 1
            scanPackagesTimeoutMs: 2.5, // invalid: integer ≥ 1 (non-integer)
          },
        }),
      },
      EMPTY,
    );
    const { settings, diagnostics } = await loadSettings(fs);
    const hits = byCode(diagnostics, "loom/load/settings-value-out-of-range");
    expect(hits).toHaveLength(4); // one per offending key
    for (const h of hits) expect(h.severity).toBe("error");
    // Each offending key treated as absent.
    expect(settings.looms?.binderModel).toBeUndefined();
    expect(settings.looms?.scanPackages).toBeUndefined();
    expect(settings.looms?.scanPackagesMaxFiles).toBeUndefined();
    expect(settings.looms?.scanPackagesTimeoutMs).toBeUndefined();
    // The valid sibling key still resolves.
    expect(settings.loomPaths).toEqual(["keep.loom"]);
  });

  it("settings-value-out-of-range: null is out of range for a scalar key and is treated as absent", async () => {
    const fs = build(
      { content: JSON.stringify({ looms: { scanPackagesMaxFiles: null, scanPackages: true } }) },
      EMPTY,
    );
    const { settings, diagnostics } = await loadSettings(fs);
    const hits = byCode(diagnostics, "loom/load/settings-value-out-of-range");
    expect(hits).toHaveLength(1); // only the null key offends
    expect(settings.looms?.scanPackagesMaxFiles).toBeUndefined();
    expect(settings.looms?.scanPackages).toBe(true); // valid sibling survives
  });

  it("settings-value-out-of-range (per file): a malformed scalar in one file does not suppress a valid value of the same key in the other file", async () => {
    const fs = build(
      { content: JSON.stringify({ looms: { scanPackagesMaxFiles: 500 } }) }, // project valid
      { content: JSON.stringify({ looms: { scanPackagesMaxFiles: 0 } }) }, // global invalid
    );
    const { settings, diagnostics } = await loadSettings(fs);
    const hits = byCode(diagnostics, "loom/load/settings-value-out-of-range");
    expect(hits).toHaveLength(1); // only the global file's malformed value
    expect(settings.looms?.scanPackagesMaxFiles).toBe(500); // project value survives the merge
  });
});

// --------------------------------------------------------------------------
// loom/load/settings-invalid-entry — per-entry rejection inside loomPaths.
// --------------------------------------------------------------------------

describe("V10c-T — loom/load/settings-invalid-entry", () => {
  it("settings-invalid-entry: a non-string loomPaths entry is rejected per-entry while the other entries still process", async () => {
    const fs = build(
      { content: JSON.stringify({ loomPaths: ["good.loom", 42, "good2.loom"] }) },
      EMPTY,
    );
    const { settings, diagnostics } = await loadSettings(fs);
    const hits = byCode(diagnostics, "loom/load/settings-invalid-entry");
    expect(hits).toHaveLength(1);
    expect(hits[0]!.severity).toBe("error"); // registry severity E
    // Registry Message column, byte-exact: index and JSON kind of the offender.
    expect(hits[0]!.message).toBe("settings 'loomPaths[1]' must be a string path; got number");
    // The offending entry contributes nothing; the other string entries process.
    expect(settings.loomPaths).toEqual(["good.loom", "good2.loom"]);
  });
});
