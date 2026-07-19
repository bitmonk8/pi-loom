import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error — JS live-corpus canary module, no type declarations.
import { assembleLiveCorpus, warnOnlyFindings, runWarnOnlyCanary, CANARY_GAP_KINDS } from "../tools/closing-gate/live-corpus.js";
// @ts-expect-error — JS closing-gate module, no type declarations.
import { parsePrefixTable, parseRetiredReqIds, parseCoverageMatrix, extractReqIds, extractCitingReqIds, parseFacetRows, deriveFacetPartition, citesTokenInline } from "../tools/closing-gate/index.js";

// H5b — warn-only live-corpus canary (pre-activation pre-flight). These
// assertions ARE the canary "wired into npm test": they run H5a's closing-gate
// machinery over the LIVE corpus, in its warn-only mode, and confirm it returns
// a structured findings collection — one entry per gap, tagged with its gap
// kind — WITHOUT reddening `npm test`. Because the canary runs the identical
// gate machinery over the identical live surfaces H6a hard-fails on, its warn-
// only reconciliation set stays in lockstep with H6a's hard-fail set by
// construction. Each block cites the conventions.md convention it operationalises.

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

interface Finding {
  kind: string;
  subject: string;
  detail: string;
}

// ── Seed helpers ──────────────────────────────────────────────────────────────
// Each seed mutates a CLONE of the assembled live corpus snapshot in memory —
// injecting one gap of one kind — so the live docs/spec_topics/**, docs/
// plan_topics/, and tests/** trees are never touched and the seed is "restored"
// simply by discarding the clone. A synthetic `SEED` prefix and `__seed__.md`
// page keep every seed isolated from real live coverage.

const SEED_PAGE = path.join(REPO_ROOT, "docs", "spec_topics", "__seed__.md");

// Insert a synthetic non-narrative prefix-table row for `__seed__.md` (prefix
// `SEED`) so a `SEED-N` REQ-ID extracts as a live executable REQ-ID and the seed
// page counts as a rowed, non-narrative spec page.
function withSeedPrefix(base: Record<string, unknown>): Record<string, unknown> {
  const prefixTableText = (base.prefixTableText as string).replace(
    "| Page | Prefix |\n|---|---|",
    "| Page | Prefix |\n|---|---|\n| `__seed__.md` | `SEED` |",
  );
  return { ...base, prefixTableText };
}

function specWith(
  base: Record<string, unknown>,
  text: string,
): { path: string; text: string }[] {
  return [
    ...(base.specSources as { path: string; text: string }[]),
    { path: SEED_PAGE, text },
  ];
}

// Strip a token (word-boundary matched) from every test source's text — the
// in-memory analogue of "removing one citation within the test and restoring
// it": the seed removes the token from the corpus CLONE only; the live tests/**
// files are never written, so the seed is restored by discarding the clone.
function stripTokenFromTests(
  base: Record<string, unknown>,
  token: string,
): { path: string; text: string }[] {
  const esc = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${esc}\\b`, "g");
  return (base.testSources as { path: string; text: string }[]).map((s) => ({
    path: s.path,
    text: s.text.replace(re, "REMOVED"),
  }));
}

// Discover a live coverage-matrix-mapped, executable, currently-cited REQ-ID
// (baseline-clean) whose citation the gap-2 seed removes.
function firstMappedCitedReqId(base: Record<string, unknown>): string {
  const prefixes = parsePrefixTable(base.prefixTableText as string);
  const retired = new Set(parseRetiredReqIds(base.prefixTableText as string));
  const executable = new Set(
    extractReqIds(base.specSources as unknown[], prefixes),
  );
  const mapped = parseCoverageMatrix(base.coverageMatrixText as string);
  const citing = new Set(
    extractCitingReqIds(base.testSources as unknown[]),
  );
  const target = (mapped as string[]).find(
    (id) => executable.has(id) && !retired.has(id) && citing.has(id),
  );
  if (target == null) {
    throw new Error("no baseline-clean mapped+cited REQ-ID to seed gap 2");
  }
  return target;
}

// Discover a live multi-leaf coverage-matrix row whose facets are all currently
// satisfied (baseline-clean), whose subject citation the gap-3 seed removes.
function firstSatisfiedMultiLeafRow(
  base: Record<string, unknown>,
): { subjects: string[]; facets: string[] } {
  const testSources = base.testSources as { text: string }[];
  for (const row of parseFacetRows(base.coverageMatrixText as string) as {
    subjects: string[];
    closing: string;
  }[]) {
    const { facets } = deriveFacetPartition(row.closing) as { facets: string[] };
    if (facets.length < 2) continue;
    const allSatisfied = facets.every((facet) =>
      testSources.some(
        (s) =>
          citesTokenInline(s.text, facet) &&
          row.subjects.some((subject) => citesTokenInline(s.text, subject)),
      ),
    );
    if (allSatisfied) return { subjects: row.subjects, facets };
  }
  throw new Error("no baseline-clean multi-leaf row to seed gap 3");
}

describe("H5b — warn-only canary over the live corpus (warn-only footing)", () => {
  it("(Convention: REQ-ID discipline — warn-only canary) reconciles the live spec REQ-ID set, the live spec_topics/** normative-MUST set, and the live test corpus against the live coverage-matrix.md, returning a structured findings collection without throwing or reddening npm test", () => {
    let findings: Finding[] = [];
    // Warn-only: the canary NEVER throws / sets a non-zero exit for a coverage
    // gap. The suite stays green regardless of how many gaps are surfaced.
    expect(() => {
      findings = runWarnOnlyCanary(REPO_ROOT) as Finding[];
    }).not.toThrow();
    expect(Array.isArray(findings)).toBe(true);
    // Every returned entry is a structured finding tagged with one of the
    // canary's live-corpus surface kinds (exactly the arms H6a hard-fails on).
    for (const f of findings) {
      expect(typeof f.kind).toBe("string");
      expect(CANARY_GAP_KINDS.has(f.kind)).toBe(true);
      expect(typeof f.subject).toBe("string");
      expect(typeof f.detail).toBe("string");
    }
  });

  it("assembles the live corpus exclusive of the seeded test-fixtures root (reads docs/spec_topics/**, docs/plan_topics/, tests/**, never test-fixtures/**)", () => {
    const corpus = assembleLiveCorpus(REPO_ROOT) as {
      specSources: { path: string }[];
      testSources: { path: string }[];
      perFacetCitingTests: boolean;
      planLeavesText: string;
    };
    expect(corpus.specSources.length).toBeGreaterThan(0);
    expect(corpus.testSources.length).toBeGreaterThan(0);
    expect(corpus.perFacetCitingTests).toBe(true);
    expect(corpus.planLeavesText.length).toBeGreaterThan(0);
    const allPaths = [...corpus.specSources, ...corpus.testSources].map(
      (s) => s.path,
    );
    expect(allPaths.some((p) => p.includes("test-fixtures"))).toBe(false);
  });
});

// The binding obligation: the canary emits a finding for EACH gap kind while
// npm test stays green — asserted by seeding one gap of each kind into a clone
// of the live corpus, asserting the returned warn-only collection contains a
// structured entry tagged with that gap kind, confirming the run stays green
// (never throws), then restoring the seed (the clone is discarded and the
// baseline live corpus is confirmed free of the seeded subject).
describe("H5b — one seeded gap of each kind surfaces as a tagged warn-only finding, green", () => {
  const base = assembleLiveCorpus(REPO_ROOT) as Record<string, unknown>;
  const baseline = warnOnlyFindings(base) as Finding[];

  const runSeed = (corpus: Record<string, unknown>): Finding[] => {
    let findings: Finding[] = [];
    // Confirm the run's exit status stays green: seeding a gap must NOT throw or
    // redden — the warn-only footing returns the finding instead of failing.
    expect(() => {
      findings = warnOnlyFindings(corpus) as Finding[];
    }).not.toThrow();
    return findings;
  };

  it("(Convention: REQ-ID discipline — warn-only canary) an unmapped executable REQ-ID surfaces as `unmapped-executable-req-id`", () => {
    const seeded = withSeedPrefix(base);
    seeded.specSources = specWith(base, "**SEED-1.** synthetic unmapped obligation.");
    const findings = runSeed(seeded);
    expect(
      findings.some(
        (f) => f.kind === "unmapped-executable-req-id" && f.subject === "SEED-1",
      ),
    ).toBe(true);
    // Restored: the unmutated baseline never carried the seeded subject.
    expect(baseline.some((f) => f.subject === "SEED-1")).toBe(false);
  });

  it("(Convention: REQ-ID discipline — warn-only canary) a coverage-matrix-mapped numbered REQ-ID with no citing test surfaces as `mapped-req-id-no-citing-test`", () => {
    // Seed by removing a real, currently-cited mapped REQ-ID's citation from the
    // clone's test corpus (H6a's removed-citation pattern), then restore.
    const target = firstMappedCitedReqId(base);
    const seeded = { ...base, testSources: stripTokenFromTests(base, target) };
    const findings = runSeed(seeded);
    expect(
      findings.some(
        (f) => f.kind === "mapped-req-id-no-citing-test" && f.subject === target,
      ),
    ).toBe(true);
    // Restored: with the citation present, the baseline never flagged the target.
    expect(
      baseline.some(
        (f) => f.kind === "mapped-req-id-no-citing-test" && f.subject === target,
      ),
    ).toBe(false);
  });

  it("(Convention: REQ-ID discipline — warn-only canary) a multi-leaf coverage-matrix-row facet whose closing leaf carries no facet-naming citing test surfaces as `per-facet-citing-test-missing`", () => {
    // Seed by removing a currently-satisfied multi-leaf row's subject citation
    // from the clone's test corpus, leaving each facet's closing leaf with no
    // facet-naming citing test (a test must cite both the subject and the
    // facet's leaf-ID inline), then restore.
    const row = firstSatisfiedMultiLeafRow(base);
    let testSources = base.testSources as { path: string; text: string }[];
    for (const subject of row.subjects) {
      testSources = stripTokenFromTests({ ...base, testSources }, subject);
    }
    const seeded = { ...base, testSources };
    const findings = runSeed(seeded);
    // At least one of the row's facets surfaces as a per-facet gap tagged to the
    // row's subject.
    const missing = findings.find(
      (f) =>
        f.kind === "per-facet-citing-test-missing" &&
        row.facets.includes(f.subject) &&
        row.subjects.some((subject) => f.detail.includes(subject)),
    );
    expect(missing).toBeDefined();
    // Restored: the satisfied row carried no per-facet finding in the baseline.
    expect(
      baseline.some(
        (f) =>
          f.kind === "per-facet-citing-test-missing" &&
          row.facets.includes(f.subject) &&
          row.subjects.some((subject) => f.detail.includes(subject)),
      ),
    ).toBe(false);
  });

  it("(Convention: REQ-ID discipline — warn-only canary) an un-enumerated un-anchored MUST surfaces as `un-anchored-must-unenumerated`", () => {
    const seeded = withSeedPrefix(base);
    // A non-narrative rowed page carrying a MUST with no PREFIX-N anchor and no
    // theta/... registry code, absent from the Code-keyed obligation-areas table.
    seeded.specSources = specWith(base, "The seed loader MUST reject the malformed input.");
    const findings = runSeed(seeded);
    expect(
      findings.some(
        (f) => f.kind === "un-anchored-must-unenumerated" && f.subject === "__seed__.md",
      ),
    ).toBe(true);
    expect(baseline.some((f) => f.subject === "__seed__.md")).toBe(false);
  });
});
