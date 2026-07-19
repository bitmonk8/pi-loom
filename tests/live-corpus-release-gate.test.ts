import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error — JS live-corpus module, no type declarations.
import { assembleLiveCorpus, warnOnlyFindings, CANARY_GAP_KINDS } from "../tools/closing-gate/live-corpus.js";
// @ts-expect-error — JS closing-gate module, no type declarations.
import { parsePrefixTable, parseRetiredReqIds, parseCoverageMatrix, extractReqIds, extractCitingReqIds, parseFacetRows, deriveFacetPartition, citesTokenInline } from "../tools/closing-gate/index.js";

// H6a — LIVE-CORPUS closing-gate activation (theta 1.0 release gate). These
// assertions flip H5a's closing gate from its seeded-fixture footing to its
// HARD-FAIL live-corpus footing: they run H5a's identical gate machinery over
// the LIVE spec corpus, the live test corpus, and the live coverage-matrix.md,
// and the empty-finding assertion IS the reddening assertion — from this leaf
// onward an unmapped executable REQ-ID, a coverage-matrix-mapped numbered
// REQ-ID with no citing test, an uncovered facet of a multi-leaf coverage-
// matrix row, or an un-enumerated un-anchored MUST reddens `npm test`.
//
// The distinction from the H5b warn-only canary (tests/warn-only-canary.test.ts)
// is disposition, not machinery: the canary runs the SAME `warnOnlyFindings`
// projection over the SAME live surfaces without reddening (it never asserts the
// collection empty), while this hard-fail footing asserts the assembled-live-
// corpus finding set is empty. Because both footings run the identical gate
// machinery over the identical live surfaces, the warn-only reconciliation set
// and this hard-fail set stay in lockstep by construction.

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

interface Finding {
  kind: string;
  subject: string;
  detail: string;
}

// The live-corpus finding set the hard-fail footing gates on: H5a's gate
// machinery over a corpus snapshot, filtered to exactly the four live-corpus
// surfaces H6a hard-fails on (CANARY_GAP_KINDS). Delegates to the shared
// `warnOnlyFindings` projection so the hard-fail surface set cannot drift from
// the warn-only canary's — only the disposition (asserting empty) differs.
function liveCorpusFindings(corpus: Record<string, unknown>): Finding[] {
  return warnOnlyFindings(corpus) as Finding[];
}

// ── Seed helpers (mirrored from the H5b warn-only canary) ────────────────────
// Each seed mutates a CLONE of the assembled live-corpus snapshot in memory —
// injecting one gap of one kind — so the live docs/spec_topics/**, docs/
// plan_topics/, and tests/** trees are NEVER touched and the seed is "restored"
// simply by discarding the clone. A synthetic `SEED` prefix and `__seed__.md`
// page keep every seed isolated from real live coverage.

const SEED_PAGE = path.join(REPO_ROOT, "docs", "spec_topics", "__seed__.md");

// Insert a synthetic non-narrative prefix-table row for `__seed__.md` (prefix
// `SEED`) so a `SEED-N` REQ-ID extracts as a live executable REQ-ID.
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
// (baseline-clean) whose citation the removed-citation seed removes.
function firstMappedCitedReqId(base: Record<string, unknown>): string {
  const prefixes = parsePrefixTable(base.prefixTableText as string);
  const retired = new Set(parseRetiredReqIds(base.prefixTableText as string));
  const executable = new Set(
    extractReqIds(base.specSources as unknown[], prefixes),
  );
  const mapped = parseCoverageMatrix(base.coverageMatrixText as string);
  const citing = new Set(extractCitingReqIds(base.testSources as unknown[]));
  const target = (mapped as string[]).find(
    (id) => executable.has(id) && !retired.has(id) && citing.has(id),
  );
  if (target == null) {
    throw new Error("no baseline-clean mapped+cited REQ-ID to seed the removed-citation gap");
  }
  return target;
}

// Discover a live multi-leaf coverage-matrix row whose facets are all currently
// satisfied (baseline-clean), whose subject citation the per-facet seed removes.
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
  throw new Error("no baseline-clean multi-leaf row to seed the per-facet gap");
}

describe("H6a — live-corpus closing-gate activation (hard-fail release-gate footing)", () => {
  const base = assembleLiveCorpus(REPO_ROOT) as Record<string, unknown>;

  it("(Convention: REQ-ID discipline — live-corpus footing) npm test runs the closing gate against the live spec corpus, live test corpus, and live coverage-matrix.md and PASSES green — every arm returns zero findings over the live corpus", () => {
    // THE reddening assertion: the assembled-live-corpus finding set is empty.
    // From this leaf onward an unmapped REQ-ID / uncited REQ-ID / uncovered
    // un-anchored MUST / missing per-facet citing test reddens `npm test`. The
    // gate assembles the live surfaces exclusive of the seeded test-fixtures
    // root, so no permanent-by-design seeded violation is scanned as live.
    const findings = liveCorpusFindings(base);
    for (const f of findings) {
      // Every surfaced finding is one of the four live-corpus arms H6a gates on.
      expect(CANARY_GAP_KINDS.has(f.kind)).toBe(true);
    }
    expect(findings).toEqual([]);
    // Guard against a mis-wired empty scan: the live corpus is non-trivial.
    const allPaths = [
      ...(base.specSources as { path: string }[]),
      ...(base.testSources as { path: string }[]),
    ].map((s) => s.path);
    expect(allPaths.length).toBeGreaterThan(0);
    expect(allPaths.some((p) => p.includes("test-fixtures"))).toBe(false);
  });

  it("(Convention: REQ-ID discipline — live-corpus footing) the gate reddens when a live executable spec REQ-ID has no coverage-matrix row", () => {
    // Seed one unmapped executable REQ-ID into a CLONE of the live corpus; the
    // live files are never touched. The gate reddens on the seeded gap …
    const seeded = withSeedPrefix(base);
    seeded.specSources = specWith(base, "**SEED-1.** synthetic unmapped obligation.");
    const findings = liveCorpusFindings(seeded);
    expect(
      findings.some(
        (f) => f.kind === "unmapped-executable-req-id" && f.subject === "SEED-1",
      ),
    ).toBe(true);
    // … and the unseeded live baseline is clean (the flip is live, not fixture-
    // only): no finding, and specifically never the seeded subject.
    const baseline = liveCorpusFindings(base);
    expect(baseline).toEqual([]);
    expect(baseline.some((f) => f.subject === "SEED-1")).toBe(false);
  });

  it("(Convention: REQ-ID discipline — live-corpus footing) the gate reddens when a live coverage-matrix-mapped numbered REQ-ID has no citing test", () => {
    // Seed by removing one real, currently-cited mapped REQ-ID's citation from
    // the clone's test corpus (the removed-citation pattern); the live tests/**
    // are never written.
    const target = firstMappedCitedReqId(base);
    const seeded = { ...base, testSources: stripTokenFromTests(base, target) };
    const findings = liveCorpusFindings(seeded);
    expect(
      findings.some(
        (f) => f.kind === "mapped-req-id-no-citing-test" && f.subject === target,
      ),
    ).toBe(true);
    // Restored: with the citation present the live baseline never flags the target.
    const baseline = liveCorpusFindings(base);
    expect(baseline).toEqual([]);
    expect(
      baseline.some(
        (f) => f.kind === "mapped-req-id-no-citing-test" && f.subject === target,
      ),
    ).toBe(false);
  });

  it("(Convention: REQ-ID discipline — live-corpus footing, per-facet) the gate reddens when a facet leaf of a live multi-leaf coverage-matrix row carries no facet-naming citing test", () => {
    // Seed by removing a currently-satisfied multi-leaf row's subject citation
    // from the clone's test corpus, leaving each facet's closing leaf with no
    // facet-naming citing test (a test must cite BOTH the subject and the
    // facet's leaf-ID inline); the live tests/** are never written.
    const row = firstSatisfiedMultiLeafRow(base);
    let testSources = base.testSources as { path: string; text: string }[];
    for (const subject of row.subjects) {
      testSources = stripTokenFromTests({ ...base, testSources }, subject);
    }
    const seeded = { ...base, testSources };
    const findings = liveCorpusFindings(seeded);
    const missing = findings.find(
      (f) =>
        f.kind === "per-facet-citing-test-missing" &&
        row.facets.includes(f.subject) &&
        row.subjects.some((subject) => f.detail.includes(subject)),
    );
    expect(missing).toBeDefined();
    // Restored: the satisfied row carries no per-facet finding in the live baseline.
    const baseline = liveCorpusFindings(base);
    expect(baseline).toEqual([]);
    expect(
      baseline.some(
        (f) =>
          f.kind === "per-facet-citing-test-missing" &&
          row.facets.includes(f.subject) &&
          row.subjects.some((subject) => f.detail.includes(subject)),
      ),
    ).toBe(false);
  });
});
