# Triaged Spec Review - spec

_Generated: 2026-06-09T12:30:00Z_
_Spec: docs/spec.md_
_Ordered by importance (least→most important, top→bottom); processed bottom-up. IDs preserved from the prior triage (so they are not monotonic top-to-bottom)._

_Triage tally: 1 high retained in-document (1 finding); all medium and lower findings removed in a post-recalibration prune._

---

# T14 - `[custom:<type>]` role tag interpolates `CustomMessage.customType` verbatim with no safe-character constraint

**Kind:** implementability
**Importance:** high
**Score:** 100
**Must-fix:** true
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

Rule 3 of *Compact-transcript format (normative)* (`docs/spec_topics/binder/binder-model-and-context.md`) pins the `[custom:<type>]` role tag's `<type>` slot as the `CustomMessage.customType` string verbatim, and rule 5 disclaims the system-note sanitisation discipline for transcript bytes. `CustomMessage.customType` is typed only as `string` (`docs/spec_topics/pi-integration-contract/host-interfaces-core.md`), and the corpus's only `customType` constraint — the `loom-<purpose>` `SHOULD` convention in `extension-bootstrap-and-per-loom.md` — is namespace coordination, not a character class, and does not bind third-party values. A `customType` containing `\n`, `]`, or the sequence `: ` shatters the line-oriented transcript, breaking BNDR-7's MUST-reproduce-exactly contract; via the `convertToLlm` transform (`docs/spec_topics/pi-integration-contract/runtime-event-channel.md#custom-message-context-entry-presupposition`) the malformed bytes then propagate into every subsequent provider call.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** `20569f8` (2026-05-07, Thomas Andersen) — "Compact-transcript format for the session-context block is unspecified" — introduced the verbatim `[custom:<type>]` rule (rule 3) and the rule-5 "No sanitisation" disclaimer; `1a41db2` (2026-06-06, Thomas Andersen) — "Compact-transcript BNDR-7 oracle coverage and assistant byte-determinism" — introduced the contradicting obligation by re-designating the BNDR-7 reference renderings as MUST-reproduce-exactly and adding BNDR-7h, the first reference rendering to place a `[custom:<type>]` line inside the byte-exact oracle; `78a2f94` (2026-06-04) / `257c545` (2026-06-05) added the `convertToLlm` propagation presupposition that extends the consequence to every subsequent provider call.
**History:** The defect is a contradiction between two clauses, and the contradiction did not exist at inception. The verbatim rule and the "No sanitisation" disclaimer entered in `20569f8` (2026-05-07) and were consistent with the spec as it then stood: the compact transcript was illustrative — the BNDR-7 renderings were "examples revisable for clarity" (the exact phrasing `1a41db2` later removed) — so an unconstrained `customType` had no byte-level invariant to violate, and nothing parses the transcript back into structure to expose a round-trip break. The contradicting obligation was introduced on 2026-06-06 by `1a41db2`, which re-designated the renderings as MUST-reproduce-exactly and added BNDR-7h (a `[custom:<type>]` line inside the byte-exact oracle) without narrowing the `customType` character class to match; `f5e89f4` (2026-06-04) only relocated the section into `binder-model-and-context.md`. The finding is the gap between the verbatim rule and that obligation — it opened on 2026-06-06, not at the section's inception. (The earlier triage's "present-since-inception" verdict tracked only the age of the verbatim rule text and overlooked that the obligation it now contradicts is three days older than the review that first scored this high.)

## Solution approach

Narrow the `<type>` slot at rule 3 of *Compact-transcript format (normative)* (`binder-model-and-context.md`) to a safe character class that excludes `\n`, `\r`, `]`, the two-byte sequence `: `, and the empty string, and pin that the binder MUST reject any `CustomMessage` whose `customType` falls outside the class before transcript rendering, surfacing the rejection through a `loom/runtime/*` diagnostic. Narrow the `loom-<purpose>` convention in `extension-bootstrap-and-per-loom.md`'s `customType` ownership and collision rule so the loom-internal naming class nests inside the broader safe class. Add a forward-cross-reference from `host-interfaces-core.md`'s `CustomMessage` paragraph noting the binder is stricter than Pi's `string` typing.

## Solution constraints

- The rejection diagnostic MUST be a row added to the closed `loom/runtime/*` registry (`docs/spec_topics/diagnostics/code-registry-runtime.md`) under DIAG-2, not a code coined at the binder rule site.

## Relationships

None

