---
description: Enrich every finding in the latest plan review under docs/reviews/plan-review/ via parallel batches of the enricher agent, then consolidate into docs/plan-review.md, dropping false positives
---

Process every finding in the latest consolidated plan review under `docs/reviews/plan-review/` through the `plan-review-finding-enricher` agent in parallel batches of 16, then consolidate the results into `docs/plan-review.md`, dropping false positives.

If the user passes an explicit review path as an argument, use that instead of auto-discovery.

## 0. Resolve the source review

If an explicit path was given, verify it exists under `docs/reviews/plan-review/` and use it. Otherwise auto-discover the latest:

```bash
ls -1 docs/reviews/plan-review/plan-*.md | sort | tail -n 1
```

Filenames follow `plan-YYYYMMDD-HHMMSS.md`, so lexical sort matches chronological order. Record:

- `<source-path>` — the resolved file path (e.g. `docs/reviews/plan-review/plan-20260505-083349.md`).
- `<source-stem>` — its basename without extension (e.g. `plan-20260505-083349`).

Use both throughout the rest of the prompt. Do not hardcode a timestamp anywhere.

If the directory is missing or empty, stop and tell the user to run `/plan-review` first.

## 1. Prepare

Clean stale output and recreate the staging directory:

```bash
rm -rf .pi/tmp/plan-review-improved/
mkdir -p .pi/tmp/plan-review-improved/
```

Enumerate findings:

```bash
grep -n '^### ' <source-path>
```

Each line is one finding. Strip the leading `<lineno>:### ` to get the heading text verbatim. Capture the order — it is the canonical order for the consolidated output.

Sanity-check the count against the source file's preamble line, which has the form `_Findings: <N> (deduplicated from ...)_` near the top of the file. If the actual `### ` heading count differs by more than ±2 from `<N>`, stop and surface the discrepancy before launching any agents.

## 2. Run the enricher in parallel batches of 16

For each batch of up to 16 headings, call `subagent` in parallel mode:

```
subagent({
  tasks: [
    { agent: "plan-review-finding-enricher", task: "<heading 1 verbatim>" },
    { agent: "plan-review-finding-enricher", task: "<heading 2 verbatim>" },
    ...up to 16...
  ],
  targetPaths: ["<source-path>"]
})
```

`targetPaths` is required so the project-local `plan-review-finding-enricher` agent definition resolves.

Wait for each batch to complete before starting the next. Do not interleave batches — back-to-back parallel-16 launches keep contention manageable.

The enricher auto-discovers the same `<source-path>` independently (it runs the same `ls | sort | tail -n 1` rule), so passing the heading text alone is sufficient. If you used an explicit override at step 0, prepend `Source: <source-path>\n\n` to each task string so the enricher uses the same file.

After all batches finish, list `.pi/tmp/plan-review-improved/`:

- If the file count is less than the heading count, re-run the enricher individually for the missing headings.
- If a heading still produces no file after a second attempt, record it as a persistent failure and continue. Do not block the consolidation on it.

## 3. Consolidate

Walk `<source-path>` top-to-bottom, tracking the current `## ` section header. For each `### ` heading encountered:

1. Compute the expected output path: `.pi/tmp/plan-review-improved/<source-stem>--<slug>.md` where `<slug>` is the heading text **lowercased**, with each non-alphanumeric run replaced by `-`, leading/trailing `-` trimmed, truncated to 80 characters. This must match the slug rule in `.pi/agents/plan-review-finding-enricher.md`.
2. Read the file:
   - Content is exactly `False positive` (allow trailing whitespace / newline) → record the heading + section as a dropped FP, skip.
   - File missing → record as persistent failure, skip.
   - Otherwise → buffer the file's content for emission under its parent `## ` section.

Write the consolidated result to `docs/plan-review.md` with this shape:

```markdown
# pi-loom — Consolidated Plan Review

_Generated: <ISO-8601 UTC timestamp>_
_Source: <source-path>_
_<P> findings retained, <X> false positives dropped, <Y> persistent failures_

---

## <plan leaf or section from source>

<finding 1 content verbatim from its enriched file>

---

<finding 2 content>

---

## <next leaf or section>

...
```

Rules:
- `---` between every pair of findings, and immediately above the first finding under each section.
- Drop a `## ` section header entirely if every finding under it was a FP or a persistent failure.
- Preserve each enriched file's content verbatim — H1, metadata block, all sections. Do not edit, re-format, or re-render.
- Findings appear in source-file order, not in any sorted-by-severity / sorted-by-leaf order.

## 4. Report

Print a concise summary to the conversation:

- Source: `<source-path>`
- Total findings: `N`
- Produced (consolidated): `P`
- False positives dropped: `X` — list the headings
- Persistent failures: `Y` — list the headings (or `none`)
- Severity tally: cosmetic / advisory / correctness / blocking — counts derived by grepping `**Severity:**` lines in the consolidated file
- Solution-shape tally: single / multiple / unresolved — counts from `**Shape:**` lines
- Output: `docs/plan-review.md` (size in KB)
