import { describe, it, expect } from "vitest";
import { requireLiveProvider, runProbe, type PlantedFile, type ProbeResult } from "./probe-harness";

// Live bug-hunt probes for FRONTMATTER, TOOLS/CALLABLE SET and PARSE/LOAD
// DIAGNOSTICS. Every probe here drives NO model turns (drives: []), so they are
// zero-token: they observe `probe.registeredNames` (did the loom register?) and
// `probe.systemNotes` (the load-phase `loom-system-note` channel entries the
// shipped V4e load path routes error-severity load/parse diagnostics onto —
// `probe.diagnostics` (ctx.ui.notify) is empty at load time; see the probe-
// harness header). Each note is rendered `<[file:line:col:] >code: message`, so
// the expected registry message is a substring of the note. Findings are
// documented in findings/frontmatter-diagnostics.md.

const fm = (...frontmatterAndBody: string[]): string => frontmatterAndBody.join("\n");

function hasDiag(probe: ProbeResult, substr: string): boolean {
  return probe.systemNotes.some((n) => n.includes(substr));
}

describe("frontmatter / tools / diagnostics — live hardening", () => {
  const provider = requireLiveProvider();

  // === FM-1: `tools:` comma short-form loads ==============================
  // Spec (frontmatter.md §`tools:`, frontmatter-fields-b §YAML-shape): "tools:
  // accepts a comma-separated short form and a YAML list form, both parsed by
  // the same per-entry grammar." Example in frontmatter.md: `tools: read, grep`.
  it("FM-1: a legal `tools: read, grep` comma short-form registers", async () => {
    const files: PlantedFile[] = [
      { source: "project", path: "comma-tools.loom", text: fm("---", "mode: prompt", "tools: read, grep", "---", "@`hi`") },
      { source: "project", path: "list-tools.loom", text: fm("---", "mode: prompt", "tools:", "  - read", "  - grep", "---", "@`hi`") },
      { source: "project", path: "single-tool.loom", text: fm("---", "mode: prompt", "tools: read", "---", "@`hi`") },
    ];
    const probe = await runProbe({ provider, files, drives: [] });
    try {
      // The YAML list form and a single bare tool both register.
      expect(probe.registeredNames).toContain("list-tools");
      expect(probe.registeredNames).toContain("single-tool");
      // FIXED: the comma short form is interchangeable with the list form and
      // registers with a two-entry callable set {read, grep}.
      expect(probe.registeredNames).toContain("comma-tools");
      // FIXED: no mis-parse into a bogus `.loom` path `read,`.
      expect(hasDiag(probe, "cannot resolve .loom path 'read,'")).toBe(false);
    } finally {
      await probe.dispose();
    }
  });

  // === FM-2: correct diagnostic for an unknown Pi tool in comma form =======
  // Spec: an unknown Pi tool name is `loom/load/unknown-tool` ("unknown Pi tool
  // '<name>'"). With the comma form parsed correctly, a `tools: read,
  // bogus_tool` loom reaches the unknown-tool check on the `bogus_tool` entry.
  it("FM-2: `tools: read, bogus_tool` yields unknown-tool, not unresolvable-loom-path", async () => {
    const files: PlantedFile[] = [
      { source: "project", path: "unknown-tool.loom", text: fm("---", "mode: prompt", "tools: read, bogus_tool", "---", "@`hi`") },
    ];
    const probe = await runProbe({ provider, files, drives: [] });
    try {
      expect(probe.registeredNames).not.toContain("unknown-tool");
      // FIXED: the correct unknown-tool diagnostic surfaces for `bogus_tool`.
      expect(hasDiag(probe, "unknown Pi tool 'bogus_tool'")).toBe(true);
      // FIXED: no mis-parse into a bogus `.loom` path `read,`.
      expect(hasDiag(probe, "cannot resolve .loom path 'read,'")).toBe(false);
    } finally {
      await probe.dispose();
    }
  });

  // === FM-3: frontmatter / body errors un-register the loom SILENTLY =======
  // Composition root (production-composition.ts) states its intent: "Diagnostics
  // surfaced during discovery / parse route through a transient toast
  // (ctx.ui.notify) for errors". DIAG-1: every author-visible diagnostic carries
  // a code. But parse/frontmatter diagnostics are computed inside
  // parseDiscoveredLoom and DISCARDED — never emitted. The loom vanishes with no
  // explanation. (Contrast: tools-resolution errors DO surface — see FM-1/FM-6.)
  // FIXED: parseDiscoveredLoom now returns the load/parse diagnostics on drop and
  // the composition-root loop routes them through emitDiagnostic (DIAG-1).
  it("FM-3: mode/system/range/params/body errors un-register AND emit a diagnostic", async () => {
    const files: PlantedFile[] = [
      { source: "project", path: "missing-mode.loom", text: fm("---", "description: no mode", "---", "@`hi`") },
      { source: "project", path: "bad-mode.loom", text: fm("---", "mode: agent", "---", "@`hi`") },
      { source: "project", path: "system-prompt.loom", text: fm("---", "mode: prompt", "system: You are a bot.", "---", "@`hi`") },
      { source: "project", path: "neg-maxrounds.loom", text: fm("---", "mode: prompt", "tool_loop:", "  max_rounds: -1", "---", "@`hi`") },
      { source: "project", path: "params-null.loom", text: fm("---", "mode: prompt", "params: null", "---", "@`hi`") },
      // The broken string sits at EOF so the lexer reports an unterminated
      // string (a mid-body break instead reports literal-newline-in-string).
      { source: "project", path: "unterminated-str.loom", text: fm("---", "mode: prompt", "---", "@`hi`", 'let x = "abc') },
    ];
    const probe = await runProbe({ provider, files, drives: [] });
    try {
      // All correctly un-register (registration is gated on load/parse errors).
      for (const n of ["missing-mode", "bad-mode", "system-prompt", "neg-maxrounds", "params-null", "unterminated-str"]) {
        expect(probe.registeredNames).not.toContain(n);
      }
      // FIXED: each un-registered loom now carries its normative diagnostic.
      expect(hasDiag(probe, "frontmatter is missing required field 'mode:'")).toBe(true);
      expect(hasDiag(probe, "unknown 'mode:' value 'agent'")).toBe(true);
      expect(hasDiag(probe, "'system:' is not permitted on a mode: prompt loom")).toBe(true);
      expect(hasDiag(probe, "must be a non-negative integer")).toBe(true);
      expect(hasDiag(probe, "'params: null' is not permitted")).toBe(true);
      expect(hasDiag(probe, "unterminated string literal")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  // === FM-4: missing closing frontmatter delimiter → malformed fence =======
  // A `.loom` with an opening `---` but no closing `---` previously had its body
  // silently discarded and still registered as an empty loom. FIXED:
  // splitFrontmatter treats the unterminated fence as "no recognised frontmatter
  // mapping", so the loom un-registers with `loom/load/missing-mode`. (The closed
  // diagnostics registry has no dedicated unterminated-fence code — see the WHY
  // comment in splitFrontmatter.)
  it("FM-4: missing closing `---` un-registers with a diagnostic (no empty-body loom)", async () => {
    const files: PlantedFile[] = [
      { source: "project", path: "no-close.loom", text: fm("---", "mode: prompt", "@`hello world`") },
    ];
    const probe = await runProbe({ provider, files, drives: [] });
    try {
      // FIXED: does not register a do-nothing empty-body loom.
      expect(probe.registeredNames).not.toContain("no-close");
      // FIXED: the unterminated fence surfaces an author-visible diagnostic.
      expect(hasDiag(probe, "frontmatter is missing required field 'mode:'")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  // === FM-5: malformed YAML frontmatter ====================================
  // The YAML parser reports doc.errors for `x: : :`, but parseFrontmatter
  // previously never inspected doc.errors, so a loom built from a
  // partially-recovered parse registered anyway. FIXED: a non-empty doc.errors
  // discards the recovered contents, so the frontmatter is treated as no
  // recognised mapping and the loom un-registers with `loom/load/missing-mode`.
  // (Registry gap: no dedicated malformed-YAML code — see the WHY comment in
  // parseFrontmatter.)
  it("FM-5: malformed YAML frontmatter (`x: : :`) un-registers with a diagnostic", async () => {
    const files: PlantedFile[] = [
      { source: "project", path: "bad-yaml.loom", text: fm("---", "mode: prompt", "params:", "  x: : :", "---", "@`hi`") },
    ];
    const probe = await runProbe({ provider, files, drives: [] });
    try {
      // FIXED: malformed YAML is no longer silently recovered into a loom.
      expect(probe.registeredNames).not.toContain("bad-yaml");
      // FIXED: the rejected parse surfaces an author-visible diagnostic.
      expect(hasDiag(probe, "frontmatter is missing required field 'mode:'")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  // === FM-6: callable-set control — these behave CORRECTLY =================
  // Positive/negative controls proving the `.loom`-callable diagnostics work
  // (surface AND un-register). Bundles the passing cases so the bugs above are
  // scoped precisely to the comma-form (FM-1/2) and the silent frontmatter path
  // (FM-3), not the whole tools surface.
  it("FM-6: .loom callable-set rejections surface correctly (control)", async () => {
    const files: PlantedFile[] = [
      { source: "project", path: "child-sub.loom", text: fm("---", "mode: subagent", "---", "@`child`") },
      { source: "project", path: "child-prompt.loom", text: fm("---", "mode: prompt", "---", "@`child`") },
      { source: "project", path: "child-broken.loom", text: fm("---", "mode: subagent", "---", 'let x = "abc', "@`child`") },
      { source: "project", path: "read.loom", text: fm("---", "mode: subagent", "---", "@`child`") },
      { source: "project", path: "uses-sub.loom", text: fm("---", "mode: prompt", "tools:", "  - ./child-sub.loom", "---", "@`hi`") },
      { source: "project", path: "uses-rename.loom", text: fm("---", "mode: prompt", "tools:", "  - ./child-sub.loom as triage", "---", "@`hi`") },
      { source: "project", path: "uses-prompt.loom", text: fm("---", "mode: prompt", "tools:", "  - ./child-prompt.loom", "---", "@`hi`") },
      { source: "project", path: "uses-broken.loom", text: fm("---", "mode: prompt", "tools:", "  - ./child-broken.loom", "---", "@`hi`") },
      { source: "project", path: "bad-rename.loom", text: fm("---", "mode: prompt", "tools:", "  - ./child-sub.loom as Triage", "---", "@`hi`") },
      { source: "project", path: "collision.loom", text: fm("---", "mode: prompt", "tools:", "  - read", "  - ./read.loom", "---", "@`hi`") },
      { source: "project", path: "missing-callee.loom", text: fm("---", "mode: prompt", "tools:", "  - ./nope.loom", "---", "@`hi`") },
    ];
    const probe = await runProbe({ provider, files, drives: [] });
    try {
      for (const n of ["uses-sub", "uses-rename", "child-sub", "read"]) {
        expect(probe.registeredNames, `${n} should register`).toContain(n);
      }
      for (const n of ["uses-prompt", "uses-broken", "bad-rename", "collision", "missing-callee"]) {
        expect(probe.registeredNames, `${n} should NOT register`).not.toContain(n);
      }
      expect(hasDiag(probe, "points at a prompt-mode loom")).toBe(true);
      expect(hasDiag(probe, "callee './child-broken.loom' has errors")).toBe(true);
      expect(hasDiag(probe, "'as Triage' rename target must be lowercase-first")).toBe(true);
      expect(hasDiag(probe, "tool name 'read' collides")).toBe(true);
      expect(hasDiag(probe, "cannot resolve .loom path './nope.loom'")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });
});
