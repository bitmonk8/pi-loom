# `V12b` — Top-level `Err` formatting and chain attribution

**Spec.** [`../spec_topics/slash-invocation.md`](../spec_topics/slash-invocation.md), [`../spec_topics/errors-and-results/queryerror-variants.md`](../spec_topics/errors-and-results/queryerror-variants.md).

**Adds.** The slash-dispatch-boundary top-level `Err` formatting (the per-kind one-line note templates, the sole subagent-mode surface) and the recursive invoke-chain attribution suffix.

**Tests.**
- `SLSH-3`: a top-level `Err` at the slash-dispatch boundary renders one line; it is the sole subagent-mode surface.
- `SLSH-4`: the per-kind note templates (SNK-a..k) render verbatim with a catch-all total over `QueryError`.
- `SLSH-5`: chain attribution appends ` from <callee> invoked at <parent>:<line>` per `invoke_callee` hop, leaf-first; the leaf kind drives the text. The per-hop `<parent_path>:<line>` provenance is consumed from [`V15g`](./V15g-invoke-provenance.md)'s per-frame invocation record (`V15g` is in `Deps.` below) — this leaf renders from that record and does not derive source positions itself.

**Deps.** `V12b-T`, `V12a`, `V4d`, `V15g`

**Ships when.** `npm test` renders the per-kind notes and the leaf-first chain-attribution suffix.
