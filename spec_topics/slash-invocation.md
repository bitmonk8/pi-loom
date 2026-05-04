# Invocation from Pi

A loom is invoked as a slash command using its filename, exactly like a Pi prompt template:

```
/code-review TypeScript focusing on error handling and async, by Ada Lovelace, senior engineer 12y
```

The runtime extracts typed `params:` values from the user's free-form slash arguments via an LLM-driven binder. The full mechanism is described in [Slash-Command Argument Binding](./binder.md); the short version is that a cheap tier-2 model is given the loom's `params:` schema and the raw slash text and asked to return a structured envelope (`ok`, `needs_info`, or `ambiguous`). Successful binding feeds AJV-validated params into the loom; unsuccessful binding surfaces a one-line system note in the user's session and the loom does not run.

The `argument-hint` frontmatter field drives the slash-command autocomplete dropdown shown to the user, and is also passed to the binder as additional grounding for argument extraction. Key=value or named-argument syntax (e.g. `/code-review language=TypeScript`) is *not* part of the V1 surface; users type free-form text and the binder does the work.

Once a loom is invoked:

- In **prompt mode**, the loom drives the *current* conversation — every query is a turn the user sees in their session. The loom's final `Ok` return value is **not** surfaced to the user; the conversation is the user-facing surface, and any value the author wants the user to see should be issued as a final query whose text contains it. The return value exists only for programmatic consumers (an `invoke` caller, a future loom harness).
- In **subagent mode**, a fresh isolated conversation is spawned for the loom — with the system prompt set from frontmatter `system:` if present. Every query is a turn in that private conversation. When the loom finishes, only its return value reaches the caller; the intermediate transcript stays inside the subagent.

**Top-level `Err` in prompt mode.** When a prompt-mode loom returns `Err(QueryError)` to its caller (the user's session), Pi appends a one-line system note to the session formatted from the error. The note never dumps the full `QueryError` JSON — it summarises the failure category and the most-relevant detail. Per-`kind` formatting:

| `QueryError.kind` | System note shape |
|---|---|
| `validation` | "loom `/<name>` returned `Err`: model failed schema after `<n>` coercion attempts" |
| `transport` | "loom `/<name>` returned `Err`: transport — `<message>`" |
| `tool_failure` | "loom `/<name>` returned `Err`: tool `<tool_name>` failed — `<message>`" |
| `context_overflow` | "loom `/<name>` returned `Err`: context window exceeded" |
| `cancelled` | "loom `/<name>` cancelled" |
| `tool_call_error` | "loom `/<name>` returned `Err`: tool `<tool_name>` call failed (`<cause>`) — `<message>`" |
| `invoke_failure` | "loom `/<name>` returned `Err`: invoke of `<callee_path>` failed (`<reason>`)" |
| `invoke_callee_error` | "loom `/<name>` returned `Err`: invoked `<callee_path>` returned `Err` — `<inner.kind>`" |

Every `QueryError.kind` has a defined system-note shape; the formatter must enumerate all eight rows above. For `invoke_callee_error` the chain-attribution suffix described in the next paragraph handles the deeper `inner` recursion — the row above only formats the immediate failure, and the chain text is appended once per cascade level.

The session is not aborted; the user can type a follow-up turn. When the leaf failure originated inside an `invoke`d child loom that cascaded out via `?`, the note identifies the leaf and prints the call chain (`"... from child.loom invoked at parent.loom:42"`).

The note is emitted as a custom-typed Pi message (`pi.sendMessage({ customType: "loom-system-note", content, display: true, ... }, { triggerTurn: false })`) so it persists in the session transcript and survives `/tree` navigation; a registered message renderer formats it as a one-line dim entry. See [Pi Integration Contract](./pi-integration-contract.md) for the full mechanism.
