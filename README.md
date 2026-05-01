# pi-loom

> ⚠️ **Experimental.** Design phase — see [`spec.md`](./spec.md). No working extension yet.

A [Pi Coding Agent](https://pi.dev) extension introducing **`.loom`** — a small scripting language for authoring parameterized, programmatic templates that target the PI/ESI boundary.

Where Pi's built-in `prompt` and `subagent` give you parameterized Markdown (static text + YAML frontmatter), `pi-loom` gives you a real language whose *side effects are conversational injections* into the current or a new agent context.

## Status

| Stage | State |
|---|---|
| Specification | 🟡 In progress — [`spec.md`](./spec.md) |
| Grammar (Chevrotain) | ⚪ Not started |
| Runtime | ⚪ Not started |
| Pi extension wiring | ⚪ Not started |

## Install (development)

While iterating locally:

```bash
pi install C:\UnitySrc\pi-loom
```

Once published / pushed:

```bash
pi install git:git@github.com:bitmonk8/pi-loom
```

To try without modifying settings:

```bash
pi -e C:\UnitySrc\pi-loom
```

## Repository layout

```
pi-loom/
├── package.json       # pi manifest
├── spec.md            # design specification (read this first)
├── README.md
└── extensions/        # extension entry points (.ts / .js) — empty until impl starts
```

## License

Private / unlicensed. Personal project of Thomas Andersen.
