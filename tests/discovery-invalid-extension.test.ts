import { describe, expect, it } from "vitest";
import { discoverLooms, type DiscoveryInput } from "../src/discovery/discovery-walk";
import type { LoomSettings } from "../src/discovery/settings";
import type { Diagnostic } from "../src/diagnostics/diagnostic";
import { FakeFileSystem } from "./helpers/fake-file-system";

// V20f-T — failing tests for the paired `V20f` production-wiring fix (Bucket C:
// implemented wrongly). A `--loom <file>` / settings `loomPaths` entry naming a
// non-`.loom` file MUST emit `loom/load/invalid-extension` per Lexical
// §"Extension matching" ("the settings/CLI extension check") and the
// `loomPaths` entry schema in discovery/package-and-settings.md, with the
// message sourced from the diagnostics/code-registry-load.md *Message* column.
//
// These tests red today because the CLI `--loom` path reclassifies a non-`.loom`
// regular file to `loom/load/wrong-type-source` (the currently-dead
// `invalid-extension` path is never reached on the CLI source), so the
// assertions red on the wrong emitted code — the discovery walk runs and
// classifies, it is the emitted diagnostic that is wrong, not a compile error,
// fixture, or harness throw.

const HOME = "/home/loom";
const CWD = "/project";
const GLOBAL_ROOT = "/home/loom/.pi/agent/looms";
const PROJECT_ROOT = "/project/.pi/looms";

/** Proper-ancestor directories of `leaf`, each an enterable empty directory, so
 *  an ENOENT candidate lstats every ancestor cleanly (clean-leaf ENOENT walk). */
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

function mergeDirs(...maps: Record<string, readonly string[]>[]): Record<string, readonly string[]> {
  const out: Record<string, string[]> = {};
  for (const m of maps) {
    for (const [k, v] of Object.entries(m)) {
      out[k] = [...(out[k] ?? []), ...v];
    }
  }
  return out;
}

/** The two conventional roots' ancestor chains — registered so an absent
 *  conventional root classifies as a silent missing, not an unreadable one. */
const BASE = mergeDirs(ancestors(GLOBAL_ROOT), ancestors(PROJECT_ROOT));

interface FakeSpec {
  readonly dirs?: Record<string, readonly string[]>;
  readonly files?: Record<string, string>;
}

function build(spec: FakeSpec): FakeFileSystem {
  return new FakeFileSystem({
    homedir: HOME,
    cwd: CWD,
    dirs: mergeDirs(BASE, spec.dirs ?? {}),
    files: spec.files ?? {},
    errors: {},
    symlinks: {},
  });
}

const NO_SETTINGS: LoomSettings = {};

function input(fs: FakeFileSystem, extra: Partial<DiscoveryInput> = {}): DiscoveryInput {
  return { fs, settings: NO_SETTINGS, ...extra };
}

function byCode(diagnostics: readonly Diagnostic[], code: string): readonly Diagnostic[] {
  return diagnostics.filter((d) => d.code === code);
}

// --------------------------------------------------------------------------
// loom/load/invalid-extension — a CLI/settings non-`.loom` file entry (Lexical
// §"Extension matching"; discovery/package-and-settings.md `loomPaths` schema).
// --------------------------------------------------------------------------

describe("V20f-T — non-`.loom` file entry → loom/load/invalid-extension", () => {
  it("loom/load/invalid-extension: a `--loom <file>` entry naming a non-`.loom` file emits invalid-extension, not wrong-type-source", async () => {
    // A regular file with a `.md` extension named on the CLI. Lexical
    // §"Extension matching" routes the settings/CLI extension check to
    // `loom/load/invalid-extension`; today the CLI source reclassifies it to
    // `loom/load/wrong-type-source`, so this reds.
    const fs = build({
      dirs: { ...ancestors("/x/foo.md"), "/x": ["foo.md"] },
      files: { "/x/foo.md": "not a loom" },
    });
    const { diagnostics } = await discoverLooms(input(fs, { cliPaths: ["/x/foo.md"] }));

    expect(byCode(diagnostics, "loom/load/invalid-extension")).toHaveLength(1);
    expect(byCode(diagnostics, "loom/load/wrong-type-source")).toHaveLength(0);
  });

  it("loom/load/invalid-extension: both a `--loom <file>` and a settings `loomPaths` non-`.loom` file entry emit invalid-extension, never wrong-type-source", async () => {
    // One CLI entry (`/x/foo.md`) and one settings entry (`/y/bar.md`), both
    // non-`.loom` regular files. Per Lexical §"Extension matching" both sides
    // of the "settings/CLI extension check" emit `loom/load/invalid-extension`.
    const fs = build({
      dirs: {
        ...ancestors("/x/foo.md"),
        "/x": ["foo.md"],
        ...ancestors("/y/bar.md"),
        "/y": ["bar.md"],
      },
      files: { "/x/foo.md": "not a loom", "/y/bar.md": "not a loom" },
    });
    const { diagnostics } = await discoverLooms(
      input(fs, { cliPaths: ["/x/foo.md"], settings: { loomPaths: ["/y/bar.md"] } }),
    );

    // Both entries must surface invalid-extension; none may surface
    // wrong-type-source. Today the CLI entry emits wrong-type-source, so the
    // count is 1/1 rather than the required 2/0.
    expect(byCode(diagnostics, "loom/load/invalid-extension")).toHaveLength(2);
    expect(byCode(diagnostics, "loom/load/wrong-type-source")).toHaveLength(0);

    // Message anchor: the diagnostics carry the registry *Message* tail for
    // `loom/load/invalid-extension` (code-registry-load.md:
    // `'loomPaths[<index>]' resolves to '<path>' which does not end in .loom`).
    for (const d of byCode(diagnostics, "loom/load/invalid-extension")) {
      expect(d.severity).toBe("error");
      expect(d.message).toContain("does not end in .loom");
    }
  });
});
