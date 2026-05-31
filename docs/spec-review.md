# Triaged Spec Review - spec

_Generated: 2026-05-30T19:55:00Z_
_Spec: docs/spec.md_
_Process: bottom-up - among retained findings the last is addressed first; the first (T14) is addressed last._

_Retained after manual filter: 1 high finding only (T14). All 17 medium findings dropped per request (none is an absolute prerequisite of a high finding)._

---

# T14 - `no-invocation-cap` MUST NOT is unobservable

**Kind:** testability
**Importance:** high
**Shape:** single
**State:** reduced

## Problem

The `#no-invocation-cap` paragraph in `implementation-notes.md` states the runtime "MUST NOT introduce an admission cap, a priority queue, or any scheduler interposed between sibling invocations and the event loop." This is framed as an internal-architecture constraint, not an observable property: a conformant no-cap implementation and one that caps in-flight invocations at a generous finite ceiling produce indistinguishable behaviour for every test that stays under that ceiling. Because SM-7d in `spec.md` and `future-considerations.md` both forward-link this anchor as the single normative landing site for the no-cap commitment, the obligation is unfalsifiable — no conformance test can detect a violation.

## Solution approach

Rewrite the `#no-invocation-cap` MUST NOT clause as an observable conformance obligation anchored to the parallel-tool-call surface at [Tool Calls — Concurrency](./tool-calls.md#concurrency): require that, for a small fixed N (≥ 3) of subagent-mode `.loom` callables emitted as parallel tool calls in one assistant turn, the runtime initiate `createAgentSession` for all N before any of the N invocations returns. State the witness in terms of a fake `AgentSession` whose `sendUserMessage` blocks until released, so the conformance test asserts all N sessions have been created and entered `sendUserMessage` before any block is released.

## Solution constraints

- The rewritten rule MUST remain a normative MUST-level obligation; do not demote it to SHOULD or to informative guidance.
- Out of scope: the surrounding resource-ownership-boundary text (the host/OS/provider resource classes and the major-version widening/narrowing note) — do not edit it.

## Relationships

- T16 "SM-7b and SM-7d normative obligations live on an implementer-hints page" - must-follow (that finding may move the SM-7d-anchored rule to a new `session-model.md` topic page; if it lands first, this edit applies to the new home rather than to `implementation-notes.md`)
