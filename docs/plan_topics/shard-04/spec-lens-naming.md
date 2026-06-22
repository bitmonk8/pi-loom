# Spec Lens — Naming · Shard-04 (V10–V18 leaf pairs)

**Lens:** naming and terminology only  
**Scope:** `docs/plan_topics/V10*`, `V11*`, `V12*`, `V13*`, `V14*`, `V15*`, `V16*`, `V17*`, `V18*` (implementation and `-T` test leaves)  
**Index consulted:** `.../index/terms.md` — **not found** (does not yet exist); `.../index/occurrences.md` — **not found** (does not yet exist). Findings are based on direct reading of all 72 shard-04 leaf files.  
**Date:** 2026-06-22

---

## N-01 · V15h leaf ID slug "invoke-ceiling-swallowing" — "ceiling" misattributes the leaf to ceiling enforcement

**Section / Heading:** `V15h` — Invoke-child execution-Promise swallowing-handler per-site routing  
**Name:** `invoke-ceiling-swallowing` (leaf ID suffix / filename slug)  
**Issue:** The word "ceiling" in this slug creates a false category association with the ceiling-enforcement leaves in the same shard: `V15j-invoke-ceiling-depth` (ceiling #4 for invoke), `V16a-ceiling-order-masked` (cross-ceiling arbitration), and `V14e`/`V11f`/`V13c`/`V15b` (ceiling breach sites). V15h is a cancellation-subsystem leaf — it witnesses swallowing-handler attachment for the `invoke`-child execution Promise. The word "ceiling" appears nowhere in V15h's heading or body. Within the shard, sibling leaf V15a references this leaf in prose as "invoke-child swallowing-handler suppression" (its Adds section), directly contradicting the "ceiling" slug. V17a's characterisation of the four swallowing-handler leaves ("V14f, V13f, V15h, V9o") never uses "ceiling". The naming pattern "invoke-ceiling-X" parallels "invoke-ceiling-depth" (V15j), implying these leaves belong to the same ceiling-enforcement family when they do not.  
**Suggested name:** `V15h-invoke-child-swallowing-handler` (matching V15a's prose description and the heading concept; parallels V14f's `tool-calls-swallowing-handler`)  
**Importance:** medium  
**Blast radius:** narrow  
**Centrality:** supporting  
**Core-premise blocker:** no

---

## N-02 · V13f leaf ID slug "query-cancellation-routing" — inconsistent with sibling swallowing-handler naming

**Section / Heading:** `V13f` — `@`-query provider swallowing-handler per-site routing  
**Name:** `query-cancellation-routing` (leaf ID suffix / filename slug)  
**Issue:** The three in-shard swallowing-handler leaves (V13f, V14f, V15h) have inconsistent slug naming. V14f uses "tool-calls-swallowing-handler" (matches its heading); V13f uses "query-cancellation-routing" (different style, omits "swallowing-handler"). The term "cancellation-routing" lexically overlaps with the broader cancellation leaves: V17a `cancellation-core`, V11j `binder-call-cancellation`, V17b `forwarding-listener-throw-trap`, V17c `checkpoint-granularity`. A reader searching by slug for the `@`-query swallowing-handler site would find V14f (contains "swallowing-handler") but not V13f, because V13f's slug describes the broader cancellation routing topic rather than the specific per-site swallowing-handler mechanism that is the leaf's actual content.  
**Suggested name:** `V13f-query-swallowing-handler`  
**Importance:** low  
**Blast radius:** narrow  
**Centrality:** supporting  
**Core-premise blocker:** no

---

## N-03 · V14b "model-driven" (heading / Tests) vs "model-issued" (Adds body / Ships when)

**Section / Heading:** `V14b` — Model-driven parallel tool-call batch (settle-all and independent lowering)  
**Name:** "model-driven" vs "model-issued"  
**Issue:** V14b's heading, filename slug, and Tests bullets use "model-driven parallel tool-call batch". The Adds body contains "model-issued batch" ("every sibling call in a model-issued batch") and the Ships when gate says "drives a model-issued parallel tool-call batch". The two terms are used interchangeably without an explicit equivalence statement. The spec page `tool-calls.md` uses "model-driven" throughout ("the model-driven and code-driven…", "the model-driven `@`-query tool-call loop"), so "model-issued" is a deviation from the spec-canonical form.  
**Suggested name:** Standardise on "model-driven" throughout V14b (heading, Adds, Tests, Ships when), matching `tool-calls.md` usage.  
**Importance:** NIT  
**Blast radius:** narrow  
**Centrality:** supporting  
**Core-premise blocker:** no

---

## N-04 · V16a "ceiling-candidate" (formal Adds term) vs "synthesised candidate" (Tests bullets) — dropped qualifier

**Section / Heading:** `V16a` — Hard-ceiling interaction order and `masked` co-fire  
**Name:** "ceiling-candidate" (Adds, italic-emphasised formal term) vs "synthesised candidate" / "synthesised candidate set" (Tests bullets)  
**Issue:** The Adds section formally introduces *ceiling-candidate* (with italic emphasis and a definition block) as the named input to the arbitration seam. The six Tests bullets consistently write "synthesised candidate" and "synthesised candidate set", dropping the "ceiling" qualifier throughout. "Synthesised" is a test-strategy adjective meaning the input is constructed artificially rather than produced by a real breach event; it is not part of the concept name. Readers of the Tests-only view encounter "synthesised candidate" without an evident mapping to the formally defined "ceiling-candidate" input type.  
**Suggested name:** "synthesised ceiling-candidate" in Tests bullets, preserving both the formal concept name and the test-strategy qualifier.  
**Importance:** low  
**Blast radius:** narrow  
**Centrality:** supporting  
**Core-premise blocker:** no

---

## N-05 · "swallowing-handler" — coined term used across four leaves without a glossary entry  *(Cross-shard: candidate)*

**Section / Heading:** V17a Adds; V14f heading; V13f heading; V15h heading  
**Name:** "swallowing-handler"  
**Issue:** "Swallowing-handler" is a coined term describing the Promise rejection handler that suppresses a late settlement along three side channels (no `unhandledRejection`, no second `RuntimeEvent`, no diagnostic) when the associated Checkpoint has already surfaced `cause: "cancelled"`. Within shard-04 the term appears as a load-bearing heading word in V14f, V13f, V15h, and V17a. The out-of-shard leaf V9o (subagent swallowing-handler) also uses it, making this a cross-shard term. The spec glossary defines other multi-leaf coined terms (callable set, binder, schema slug, respond-repair, occurrence vs. origin, etc.) but has no entry for "swallowing-handler". The term is non-obvious to first readers: "swallowing" implies suppression, but suppression of what entity, at what boundary, and via what mechanism requires inference from V17a's inline explanation. Readers accessing V14f, V13f, or V15h directly encounter the term in headings without a definition path.  
**Suggested glossary entry:** **swallowing-handler** — A Promise rejection handler attached to every abandonable Promise at its construction site (before the first microtask boundary), which suppresses a late settlement along all three side channels — no Node `unhandledRejection`, no second `RuntimeEvent`, and no diagnostic of any severity — when the associated Checkpoint seam has already surfaced `cause: "cancelled"`. Prevents post-cancellation state corruption from late-resolving provider calls. Four abandonable-Promise sites each own a per-site witness: `V14f` (code-side `execute()`), `V13f` (`@`-query provider), `V15h` (`invoke` child), `V9o` (subagent `AgentSession.abort()`). See: [Cancellation](../spec_topics/cancellation.md).  
**Importance:** medium *(Cross-shard: candidate — same term used in out-of-shard V9o and in `spec_topics/cancellation.md`)*  
**Blast radius:** moderate  
**Centrality:** supporting  
**Core-premise blocker:** no

---

## N-06 · V11g filename "defaulting-revalidation" vs heading "Fill-if-absent defaulting and post-merge AJV validation"

**Section / Heading:** `V11g` — Fill-if-absent defaulting and post-merge AJV validation  
**Name:** "revalidation" (filename slug: `defaulting-revalidation`) vs "post-merge AJV validation" (heading and Ships when)  
**Issue:** The filename shortens the concept to "revalidation" while the heading, Adds, and Ships when use the spec-precise term "post-merge AJV validation". "Revalidation" can be read as simply running AJV a second time on unchanged data; the spec-precise term makes the ordering dependency explicit (fill-if-absent defaults first, then run AJV on the merged result). The Tests section uses "Fill-then-revalidate" as an informal shorthand. Within the shard, no other leaf uses "revalidation" as a term for this operation; V11f references V11g's subject without using the word "revalidation". The Ships when gate uses "post-merge AJV path" (not "revalidation"), reinforcing that the heading form is the intended reference term.  
**Suggested name:** No heading change needed; consider aligning the filename slug to `V11g-defaulting-post-merge-ajv` to match, or add a one-sentence prose note in Adds clarifying `revalidation = post-merge AJV validation` to make the shorthand explicit.  
**Importance:** NIT  
**Blast radius:** narrow  
**Centrality:** supporting  
**Core-premise blocker:** no
