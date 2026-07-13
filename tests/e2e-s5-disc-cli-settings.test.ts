import { delimiter as PATH_DELIMITER } from "node:path";
import { describe, expect, it } from "vitest";
import {
  discoverLooms,
  type DiscoveredLoom,
  type DiscoveryInput,
} from "../src/discovery/discovery-walk";
import { loadSettings, type LoomSettings } from "../src/discovery/settings";
import type { Diagnostic } from "../src/diagnostics/diagnostic";
import { FakeFileSystem } from "./helpers/fake-file-system";

// e2e-s5 — offline-unit (METHOD M1) coverage for three uncovered DISC
// requirements, driven through the production discovery entry `discoverLooms`
// (src/discovery/discovery-walk.ts) and the settings parse/merge entry
// `loadSettings` (src/discovery/settings.ts), backed by the FakeFileSystem
// seam. Fixture idioms mirror tests/discovery-walk.test.ts and
// tests/settings-merge.test.ts exactly.
//
//   REQ-DISC-5  (spec-requirements.md:892) — the `--loom` flag joins multiple
//               paths with `path.delimiter`; each component is a file or a
//               directory resolved by the `loomPaths` rules.
//   REQ-DISC-33 (spec-requirements.md:920) — loom 1.0 reads five settings keys;
//               unknown `looms.*` keys are ignored WITHOUT a diagnostic.
//   REQ-DISC-14 (spec-requirements.md:901) — a directory entry is a valid path
//               regardless of contents (empty / only-non-.loom → zero looms, no
//               diagnostic); the wrong-type rule fires only for a
//               non-.loom-file, non-directory target.

const HOME = "/home/loom";
const CWD = "/project";
const GLOBAL_ROOT = "/home/loom/.pi/agent/looms";
const PROJECT_ROOT = "/project/.pi/looms";
const PROJECT_SETTINGS = "/project/.pi/settings.json";
const GLOBAL_SETTINGS = "/home/loom/.pi/agent/settings.json";

/** Proper-ancestor directories of `leaf` (so a clean-leaf ENOENT lstats every
 *  ancestor as an enterable directory). The leaf itself is NOT registered. */
function ancestors(leaf: string): Record<string, string[]> {
  const segs = leaf.split("/").filter((s) => s.length > 0);
  const out: Record<string, string[]> = { "/": [] };
  let parent = "/";
  for (let i = 0; i < segs.length - 1; i++) {
    const path = parent === "/" ? `/${segs[i]}` : `${parent}/${segs[i]}`;
    out[path] = [];
    parent = path;
  }
  return out;
}

/** Merge several dirs maps, concatenating entry lists for shared keys. */
function mergeDirs(
  ...maps: Record<string, readonly string[]>[]
): Record<string, readonly string[]> {
  const out: Record<string, string[]> = {};
  for (const m of maps) {
    for (const [k, v] of Object.entries(m)) {
      out[k] = [...(out[k] ?? []), ...v];
    }
  }
  return out;
}

/** Both conventional roots' ancestor chains — registered in every fixture so an
 *  absent conventional root classifies as a clean (silent) missing. */
const BASE = mergeDirs(ancestors(GLOBAL_ROOT), ancestors(PROJECT_ROOT));

interface FakeSpec {
  readonly dirs?: Record<string, readonly string[]>;
  readonly files?: Record<string, string>;
  readonly errors?: Record<string, string>;
  readonly symlinks?: Record<string, string>;
}

function build(spec: FakeSpec): FakeFileSystem {
  return new FakeFileSystem({
    homedir: HOME,
    cwd: CWD,
    dirs: mergeDirs(BASE, spec.dirs ?? {}),
    files: spec.files ?? {},
    errors: spec.errors ?? {},
    symlinks: spec.symlinks ?? {},
  });
}

const NO_SETTINGS: LoomSettings = {};

function input(fs: FakeFileSystem, extra: Partial<DiscoveryInput> = {}): DiscoveryInput {
  return { fs, settings: NO_SETTINGS, ...extra };
}

function byCode(diagnostics: readonly Diagnostic[], code: string): readonly Diagnostic[] {
  return diagnostics.filter((d) => d.code === code);
}

function named(looms: readonly DiscoveredLoom[], name: string): DiscoveredLoom | undefined {
  return looms.find((l) => l.name === name);
}

const LOOM = "mode: prompt\n---\n";

// ==========================================================================
// REQ-DISC-5 — `--loom` joins paths with `path.delimiter`; each component is a
// file or directory resolved by the `loomPaths` rules.
//
// The delimiter split itself is performed by the extension factory
// (`readLoomFlagPaths`, private, requires the Pi `ExtensionAPI` seam) BEFORE
// calling `discoverLooms`, whose `cliPaths` is the already-split vector. The
// offline entry therefore reaches the "each component is a file or directory
// resolved by the loomPaths rules" half directly; the test mirrors the factory
// contract by joining on `path.delimiter` and splitting the same way.
// ==========================================================================

describe("REQ-DISC-5 — --loom multi-path components", () => {
  it("REQ-DISC-5: each path.delimiter-joined --loom component resolves — a file contributes itself, a directory enumerates its .loom children", async () => {
    const fs = build({
      dirs: {
        ...ancestors("/cli/dir"),
        "/cli/dir": ["alpha.loom"],
      },
      files: {
        "/cli/dir/alpha.loom": LOOM,
        "/cli/beta.loom": LOOM,
      },
    });

    // Mirror the factory's `--loom A;B` → path.delimiter split.
    const rawFlag = ["/cli/beta.loom", "/cli/dir"].join(PATH_DELIMITER);
    const cliPaths = rawFlag.split(PATH_DELIMITER);
    expect(cliPaths).toEqual(["/cli/beta.loom", "/cli/dir"]); // delimiter round-trip

    const { looms, diagnostics } = await discoverLooms(input(fs, { cliPaths }));

    // File component contributes itself directly.
    const beta = named(looms, "beta");
    expect(beta).toBeDefined();
    expect(beta?.source).toBe("cli");
    expect(beta?.path).toBe("/cli/beta.loom");

    // Directory component enumerates its non-recursive `*.loom` children.
    const alpha = named(looms, "alpha");
    expect(alpha).toBeDefined();
    expect(alpha?.source).toBe("cli");
    expect(alpha?.path).toBe("/cli/dir/alpha.loom");

    // Both components resolved cleanly — no failure diagnostics.
    expect(diagnostics).toHaveLength(0);
  });
});

// ==========================================================================
// REQ-DISC-33 — five recognised settings keys; unknown `looms.*` ignored
// without diagnostic.
// ==========================================================================

describe("REQ-DISC-33 — recognised settings keys and unknown-key silence", () => {
  it("REQ-DISC-33: the five recognised keys are read and unknown `looms.*` keys are ignored WITHOUT any diagnostic", async () => {
    const projectSettings = JSON.stringify({
      loomPaths: ["a.loom"],
      looms: {
        binderModel: "some-model",
        scanPackages: false,
        scanPackagesMaxFiles: 500,
        scanPackagesTimeoutMs: 750,
        // Unknown forward-compat keys — must be dropped silently.
        futureKnob: "ignored",
        anotherUnknown: 123,
      },
    });
    const fs = new FakeFileSystem({
      homedir: HOME,
      cwd: CWD,
      files: {
        [PROJECT_SETTINGS]: projectSettings,
        [GLOBAL_SETTINGS]: "{}",
      },
    });

    const { settings, diagnostics } = await loadSettings(fs);

    // Key 1: top-level `loomPaths`.
    expect(settings.loomPaths).toEqual(["a.loom"]);
    // Keys 2-5: the four `looms.*` scalars.
    expect(settings.looms?.binderModel).toBe("some-model");
    expect(settings.looms?.scanPackages).toBe(false);
    expect(settings.looms?.scanPackagesMaxFiles).toBe(500);
    expect(settings.looms?.scanPackagesTimeoutMs).toBe(750);

    // Unknown `looms.*` keys are ignored — absent from the cleaned view.
    const looms = settings.looms as Record<string, unknown> | undefined;
    expect(looms?.["futureKnob"]).toBeUndefined();
    expect(looms?.["anotherUnknown"]).toBeUndefined();

    // ...and produce NO diagnostic of any kind.
    expect(byCode(diagnostics, "loom/load/settings-value-out-of-range")).toHaveLength(0);
    expect(byCode(diagnostics, "loom/load/settings-invalid-entry")).toHaveLength(0);
    expect(diagnostics).toHaveLength(0);
  });
});

// ==========================================================================
// REQ-DISC-14 — a directory entry is a valid path regardless of contents; the
// wrong-type rule fires only for a non-.loom-file, non-directory target.
// ==========================================================================

describe("REQ-DISC-14 — directory validity regardless of contents", () => {
  it("REQ-DISC-14: an empty --loom directory enumerates zero looms and emits NO diagnostic", async () => {
    const fs = build({
      dirs: {
        ...ancestors("/cli/empty"),
        "/cli/empty": [],
      },
    });
    const { looms, diagnostics } = await discoverLooms(input(fs, { cliPaths: ["/cli/empty"] }));
    expect(looms).toHaveLength(0);
    expect(diagnostics).toHaveLength(0);
    expect(byCode(diagnostics, "loom/load/wrong-type-source")).toHaveLength(0);
  });

  it("REQ-DISC-14: a --loom directory holding only non-.loom files enumerates zero looms and emits NO diagnostic", async () => {
    const fs = build({
      dirs: {
        ...ancestors("/cli/plain"),
        "/cli/plain": ["notes.txt", "readme.md"],
      },
      files: {
        "/cli/plain/notes.txt": "not a loom",
        "/cli/plain/readme.md": "# readme",
      },
    });
    const { looms, diagnostics } = await discoverLooms(input(fs, { cliPaths: ["/cli/plain"] }));
    expect(looms).toHaveLength(0);
    expect(diagnostics).toHaveLength(0);
    expect(byCode(diagnostics, "loom/load/wrong-type-source")).toHaveLength(0);
  });

  it("REQ-DISC-14: a settings directory entry holding only non-.loom files enumerates zero looms and emits NO diagnostic", async () => {
    const fs = build({
      dirs: {
        ...ancestors("/settings/dir"),
        "/settings/dir": ["data.json"],
      },
      files: {
        "/settings/dir/data.json": "{}",
      },
    });
    const { looms, diagnostics } = await discoverLooms(
      input(fs, { settings: { loomPaths: ["/settings/dir"] } }),
    );
    expect(looms).toHaveLength(0);
    expect(diagnostics).toHaveLength(0);
  });

  it("REQ-DISC-14: the wrong-type rule fires only for a non-.loom-file, non-directory target (a symlink --loom target)", async () => {
    const fs = build({
      dirs: { ...ancestors("/cli/link") },
      symlinks: { "/cli/link": "/somewhere/else" },
    });
    const { looms, diagnostics } = await discoverLooms(input(fs, { cliPaths: ["/cli/link"] }));
    const wrongType = byCode(diagnostics, "loom/load/wrong-type-source");
    expect(wrongType).toHaveLength(1);
    expect(wrongType[0]!.severity).toBe("error"); // CLI source: wrong-type is fatal
    expect(looms).toHaveLength(0);
  });
});
