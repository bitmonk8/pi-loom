# How to configure tool_loop

The model may call tools during a query and loop until it produces a final
response. You want to bound that loop — cap the number of free-phase tool-call
rounds, or disable model-driven tool calls for a query. Configure the loom's
`tool_loop:` frontmatter block.

## Steps

1. Set `tool_loop.max_rounds` in frontmatter (default `25`; a non-negative
   integer, no upper bound). It applies to every query in the loom.
2. Use `max_rounds: 0` to disable model-driven tool calls entirely for the query
   — the model cannot touch any `tools:` entry, while your code's `<name>(...)`
   calls are unaffected.
3. On an untyped query that hits the cap without a terminating turn, handle the
   `tool_loop_exhausted` failure. (On a typed query the forced respond turn is
   exempt from the cap, so exhaustion does not fire there.)

The cap counts free-phase rounds only: one round is the model emitting one or
more `tool_use` blocks plus the runtime executing them and feeding results back.
A respond-repair follow-up gets a fresh budget.

## Working example

[`docs/examples/configure-tool-loop.loom`](../examples/configure-tool-loop.loom)
caps the loop at four rounds and handles exhaustion:

```loom
---
description: Locate config loading with a bounded tool-call budget
mode: subagent
tools: grep
tool_loop:
  max_rounds: 4
---
let answer = match @`Find where configuration is loaded. Use grep as needed.` {
  Ok(text) => text,
  Err(QueryError { kind: "tool_loop_exhausted" }) =>
    "search stopped after the round budget",
  Err(_) => "search failed",
}
@`Report: ${answer}`
```

Run it:

```
pi --loom docs/examples -p "/configure-tool-loop"
```

## Result

The model may run up to four grep rounds. If it produces a final text turn within
the budget, `Ok(text)` binds it. If it reaches the cap first, the query returns
`Err(QueryError { kind: "tool_loop_exhausted", rounds: 4, ... })` and the loom
falls back to a fixed string instead of aborting.

## Reference

- `tool_loop` / `max_rounds` field contract (FRNT-1) — [Frontmatter](../reference/frontmatter.md).
- `ToolLoopExhaustedError` fields (`rounds`, `last_tool_name`) — [Error & result model](../reference/errors-and-results.md).
- Ceiling #2 routing and the typed-query exemption — [Hard ceilings](../reference/hard-ceilings.md).
- How queries drive a tool-call loop — [Guide](../guide.md).

## Provenance

- Spec: `docs/spec_topics/query/query-tool-loop.md` (QRY-16, tool-call-loop bound,
  typed-query exemption), `docs/spec_topics/query/query-forms.md`,
  `docs/spec_topics/frontmatter/frontmatter-fields-b-and-templates.md` (FRNT-1),
  `docs/spec_topics/errors-and-results/queryerror-variants.md` (ERR-19),
  glossary entry *tool-call round slot accounting*.
- Example `configure-tool-loop.loom` requested from `loom-docs-example-runner`.
