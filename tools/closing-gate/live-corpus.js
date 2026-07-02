// H5b — warn-only live-corpus canary (pre-activation pre-flight).
//
// This module wires H5a's closing-gate machinery over the LIVE corpus, in its
// warn-only live-corpus mode, immediately before H6a's hard-fail flip. It
// authors NO second copy of the surface definitions: it assembles the live
// corpus snapshot and runs the identical `runClosingGate` machinery H5a owns,
// then RETURNS the gap findings to its caller — one structured entry per gap,
// each tagged with its gap kind — WITHOUT throwing or setting a non-zero exit
// status. Because the canary and H6a's hard-fail footing run the same gate
// machinery over the same live surfaces, the warn-only reconciliation set stays
// in lockstep with H6a's hard-fail set by construction.
//
// The four live-corpus surfaces the canary reconciles — the surfaces H6a
// hard-fails on — are:
//   1. the live spec REQ-ID set               → unmapped-executable-req-id
//   2. the live numbered-REQ-ID citing tests   → mapped-req-id-no-citing-test
//   3. the live multi-leaf-row per-facet tests  → per-facet-citing-test-missing
//   4. the live spec_topics/** normative MUSTs  → un-anchored-must-* / un-rowed
//
// The canary surfaces ONLY those four arms' gap kinds (below); the machinery's
// other arms (diagnostic-code parity, retired/live clash, per-prefix numbering
// hole, broad-catch allow-list, transitive-completeness) are not part of the
// live-corpus footing H6a flips and are filtered out of the canary's returned
// collection, keeping the canary's surfaces identical to H6a's hard-fail set.
//
// Like H6a's hard-fail footing this reconciles the live spec/test corpus
// EXCLUSIVE of the dedicated test-fixtures root H5a places the seeded gate
// fixtures under: it reads only `docs/spec_topics/**`, `docs/plan_topics/`, and
// the live `tests/**` corpus, never `test-fixtures/**`, so no seeded permanent-
// by-design violation is ever scanned as live coverage.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { runClosingGate } from "./index.js";

// Normalise CRLF to LF. The live docs corpus is authored with CRLF line endings;
// the gate machinery's line-scoped heading regexes are `$`-anchored and `.`
// (which excludes `\r`) cannot span a trailing `\r`, so a CRLF `## …` heading is
// invisible to the section scanners (parseFacetRows / parseCkaAreaRows). The
// seeded fixtures the gate was authored against are LF, so this normalisation at
// the live-corpus assembly boundary is what keeps the live footing running the
// identical machinery correctly — no gate-side regex change is required.
const lf = (s) => s.replace(/\r\n/g, "\n");
const readLf = (f) => lf(readFileSync(f, "utf8"));

// The gap kinds the warn-only canary surfaces — exactly the arms H6a's live-
// corpus footing hard-fails on. The un-anchored-MUST arm is one surface spanning
// its four sub-recogniser kinds (un-enumerated, `<new>` placeholder, unresolved
// closing leaf, and un-rowed page); all belong to the "live spec_topics/**
// normative-MUST set" surface H6a hard-fails on.
export const CANARY_GAP_KINDS = new Set([
  "unmapped-executable-req-id",
  "mapped-req-id-no-citing-test",
  "per-facet-citing-test-missing",
  "un-anchored-must-unenumerated",
  "un-anchored-must-new-placeholder",
  "un-anchored-must-unresolved-leaf",
  "un-rowed-page-residue",
]);

// Recursively read every file under `dir` whose basename passes `accept` into
// { path, text } records; returns [] when the directory is absent.
function readTree(dir, accept) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...readTree(full, accept));
    } else if (accept(entry)) {
      out.push({ path: full, text: readLf(full) });
    }
  }
  return out;
}

// Concatenate the text of every file under `dir` passing `accept` (document
// order per readTree), plus any explicit extra files, into one blob.
function concatTree(dir, accept, extraFiles = []) {
  const parts = readTree(dir, accept).map((s) => s.text);
  for (const f of extraFiles) {
    if (existsSync(f)) parts.push(readLf(f));
  }
  return parts.join("\n");
}

// Build the live plan leaf-ID universe (the `planLeavesText` the un-anchored-
// MUST arm's closing-leaf resolver consults) from the `docs/plan_topics/` leaf
// filenames: each leaf file is named `<leaf-id>-<slug>.md`, so the leaf ID is
// the filename stem up to the first `-`. Emitted as backtick-delimited spans
// because `parsePlanLeaves` / `expandLeafTokens` read only backtick spans.
function planLeavesText(planDir) {
  const NON_LEAF = new Set([
    "conventions",
    "coverage-matrix",
    "leaf-template",
    "real-host-smoke-gate",
  ]);
  const ids = new Set();
  for (const entry of existsSync(planDir) ? readdirSync(planDir) : []) {
    if (!entry.endsWith(".md")) continue;
    const stem = entry.replace(/\.md$/, "");
    if (NON_LEAF.has(stem)) continue;
    const id = stem.split("-")[0];
    if (/^[A-Z]+[0-9]*[a-z]?$/.test(id)) ids.add(id);
  }
  return [...ids].map((id) => `\`${id}\``).join("\n");
}

/**
 * Assemble the live-corpus snapshot the closing-gate machinery consumes,
 * exclusive of the seeded test-fixtures root. Enables exactly the four live-
 * corpus arms the canary surfaces: the always-on unmapped-REQ-ID and mapped-
 * citing-test arms, the per-facet arm (`perFacetCitingTests`), and the un-
 * anchored-MUST arm (`planLeavesText`). It deliberately leaves `h5bDepsText`
 * and `srcSources` unset so the transitive-completeness and broad-catch arms —
 * which are not part of H6a's live-corpus footing — stay dormant.
 *
 * @param {string} repoRoot repository root
 * @returns {object} corpus snapshot for `runClosingGate`
 */
export function assembleLiveCorpus(repoRoot) {
  const specDir = path.join(repoRoot, "docs", "spec_topics");
  const planDir = path.join(repoRoot, "docs", "plan_topics");
  const govDir = path.join(specDir, "governance");
  const md = (f) => f.endsWith(".md");

  // The prefix table + retirement sections span several governance files: the
  // `## REQ-ID prefix table` heading and its first rows live in
  // req-id-prefix-table-active-a.md, the rows continue in -active-b.md (no `##`
  // heading, so the table scope stays open), and the `## Retired REQ-IDs`
  // section lives in anchor-scheme-and-retired.md. Ordered so the table scope
  // spans active-a → active-b and is closed by the retirement section.
  const prefixTableText = [
    path.join(govDir, "req-id-prefix-table-active-a.md"),
    path.join(govDir, "req-id-prefix-table-active-b.md"),
    path.join(govDir, "req-id-prefix-table-retired.md"),
    path.join(govDir, "anchor-scheme-and-retired.md"),
  ]
    .filter((f) => existsSync(f))
    .map((f) => readLf(f))
    .join("\n");

  return {
    prefixTableText,
    specSources: readTree(specDir, md),
    coverageMatrixText: readLf(path.join(planDir, "coverage-matrix.md")),
    registryText: concatTree(path.join(specDir, "diagnostics"), md, [
      path.join(specDir, "diagnostics.md"),
    ]),
    testSources: readTree(path.join(repoRoot, "tests"), (f) =>
      f.endsWith(".ts"),
    ),
    planLeavesText: planLeavesText(planDir),
    perFacetCitingTests: true,
  };
}

/**
 * Run the warn-only live-corpus canary: assemble the live corpus, run H5a's
 * gate machinery over it, and RETURN the gap findings filtered to the canary's
 * live-corpus surfaces (CANARY_GAP_KINDS). Never throws for a coverage gap and
 * never sets a non-zero exit status — the caller (the H5b test wired into
 * `npm test`) stays green regardless of how many gaps are surfaced. This is the
 * warn-only pre-flight of the surfaces H6a subsequently hard-fails on.
 *
 * @param {string} repoRoot repository root
 * @returns {{kind: string, subject: string, detail: string}[]} warn-only findings
 */
export function runWarnOnlyCanary(repoRoot) {
  return warnOnlyFindings(assembleLiveCorpus(repoRoot));
}

/**
 * The warn-only projection of the gate machinery over a corpus snapshot: run
 * `runClosingGate` and keep only the canary's live-corpus surface kinds. Exposed
 * separately so a test can seed a gap into a corpus snapshot and observe the
 * canary's returned collection over the seeded snapshot without re-reading disk.
 *
 * @param {object} corpus corpus snapshot for `runClosingGate`
 * @returns {{kind: string, subject: string, detail: string}[]} warn-only findings
 */
export function warnOnlyFindings(corpus) {
  return runClosingGate(corpus).filter((f) => CANARY_GAP_KINDS.has(f.kind));
}
