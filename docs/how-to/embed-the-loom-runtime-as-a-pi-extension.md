# How to embed and configure the loom runtime as a Pi extension

This is the one host-integrator recipe. You want `.loom` files to become slash
commands in a Pi session: register the loom runtime as a Pi extension, point it
at the directories your looms live in, and confirm one runs. Loom authors do not
need this — it is the wiring a host does once.

## Prerequisites

- A Pi host at the pinned SDK minor (`@earendil-works/pi-coding-agent ~0.75.5`;
  the four `@earendil-works/*` packages move together). See the host prerequisites
  in spec `docs/spec_topics/pi-integration-contract/host-prerequisites.md`.
- Non-bypass looms need a binder model resolvable via the `looms.binderModel`
  setting (or per-loom `bind_model:`).

## Steps

1. Ship the extension as ES modules: set `"type": "module"` in `package.json` and
   declare the entry with `"pi": { "extensions": ["./extensions"] }`. Pi
   auto-discovers `extensions/index.ts`, whose default export is
   `default function (pi: ExtensionAPI)`.
2. Inside the factory, the runtime registers its surfaces synchronously: the
   `--loom` CLI flag (`pi.registerFlag`), the `loom-system-note` renderer
   (`pi.registerMessageRenderer`), and the `resources_discover` / `session_start`
   / `session_shutdown` subscriptions. `pi.registerCommand` for each discovered
   loom runs on `session_start`, after the cross-format collision check.
3. Tell the runtime where looms live — any of the five discovery sources:
   - global `~/.pi/agent/looms/*.loom`
   - project `.pi/looms/*.loom`
   - a package's `pi.looms` manifest entry (or conventional `looms/`)
   - the `loomPaths` array in `settings.json`
   - the `--loom <paths>` CLI flag
4. Invoke a discovered loom as `/<filename-without-extension>`. `.warp` files are
   deliberately excluded from discovery.

## Working example

[`docs/examples/hello.loom`](../examples/hello.loom) is a minimal discovered loom:

```loom
---
description: "Minimal discovered loom for the host-integration recipe"
mode: prompt
---
@`Say hello and confirm the loom extension is wired up.`
```

Point the runtime at the directory with the CLI flag and invoke it:

```
pi --loom docs/examples -p "/hello"
```

## Result

The extension's discovery walk finds `hello.loom`, registers `/hello` as a slash
command (its `description` populates autocomplete), and dispatching it drives the
query into the session. Placing the same file under `~/.pi/agent/looms/` or a
`loomPaths` entry registers it without the `--loom` flag. Editing an existing
`.loom` hot-reloads; adding or removing a file prompts a `/reload` system note.

## Reference

- Five discovery sources, priority, collisions, `loomPaths`, `--loom` —
  [Discovery & invocation](../reference/discovery-cli.md).
- `loom/load/*` and `loom/host/*` bootstrap and registration codes —
  [Diagnostics](../reference/diagnostics.md).
- Extension bootstrap, registration steps, renderer registration, hot-reload —
  spec `docs/spec_topics/pi-integration-contract/extension-bootstrap-and-per-loom.md`
  and `.../registration-steps.md`.
- Where a loom sits relative to Pi's `.ts` extensions and `.md` prompts — [Guide](../guide.md).

## Provenance

- Spec: `docs/spec_topics/pi-integration.md`,
  `docs/spec_topics/pi-integration-contract/extension-bootstrap-and-per-loom.md`
  (ES-module rule, entry point, factory-time registration),
  `docs/spec_topics/pi-integration-contract/registration-steps.md` (steps 1–5),
  `docs/spec_topics/pi-integration-contract/host-prerequisites.md` (SDK pin,
  binder model), `docs/spec_topics/discovery.md`, glossary entry
  *pi-loom (extension)*, *operator*.
- Example `hello.loom` requested from `loom-docs-example-runner`.
