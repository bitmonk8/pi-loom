# pi-loom — Extension Specification

## Overview

`pi-loom` is a [Pi Coding Agent](https://pi.dev) extension that introduces a purpose-built scripting language for authoring parameterized, programmatic templates that target the PI/ESI boundary. Where Pi's built-in `prompt` and `subagent` features provide parameterized Markdown — static text with YAML frontmatter — `pi-loom` provides a full scripting language whose *side effects are conversational injections* into the current or a new agent context.

A `.loom` file is neither a TypeScript module nor a Markdown prompt. It is a **woven artifact**: PI-side control flow (variables, loops, conditionals, function definitions) interleaved with ESI-side text emissions. The output of evaluating a loom is not a return value or a file write — it is a structured sequence of text fragments injected into a conversation context.

---

## Conceptual Model

### The Three-Layer Model

`pi-loom` is designed around an explicit three-layer model of intelligence and tooling:

- **PI (Procedural Infrastructure)** — deterministic, human-instructed computation: TypeScript, OS calls, file I/O, APIs
- **ESI (Emergent Statistical Intelligence)** — the LLM; capabilities arise from training, not explicit programming
- **EBI (Embodied Biological Intelligence)** — the human developer orchestrating the above

`.ts` extension files operate entirely in PI. `.md` prompts and subagents emit instructions to ESI but have no PI-side logic. `.loom` files occupy the boundary: PI logic controls *what* gets emitted, ESI receives the *result* of that logic as natural language.

### Injection vs. Return

In a conventional language, a function's primary observable effect is its return value or OS-level side effects (files, network, stdout). In Loom, the primary observable effect is **injection**: text emitted into a conversation context. The runtime maintains an *emission buffer* that accumulates injected text fragments during execution. On completion, this buffer is flushed to the target context (current conversation or a new subagent context).

### Scope of a Loom File

Each `.loom` file defines a **loom** — a named, invocable unit. A loom can be invoked:

- As a **prompt-mode loom**: emissions are injected into the *current* conversation context (analogous to Pi's `prompt`)
- As a **subagent-mode loom**: emissions are injected into a *new, isolated* conversation context (analogous to Pi's `subagent`)

This distinction mirrors Pi's existing prompt/subagent split, but with full programmatic control over what gets injected.

---

## Language Design

### Design Basis

The Loom grammar is based on **TinyC**, adapted for the JSON type system and the conversational emission model. The parser is implemented using **Chevrotain**, for which TinyC examples already exist and serve as a starting point.

### Type System

The type system is JSON-native:

- Primitive types: `string`, `number`, `boolean`, `null`
- Composite types: `array`, `object` (anonymous inline)
- Named composite types: **schemas** — JSON Schema definitions declared with the `schema` keyword (analogous to `struct` in C-family languages, but using JSON Schema semantics)

```loom
schema Author {
  name: string,
  role: string,
  experience_years: number
}
```

Schemas can be used as parameter types, variable types, and return types of functions.

### Parameters and Frontmatter

Like Pi prompts and subagents, loom files accept parameters declared in YAML frontmatter:

```yaml
---
name: code-review
mode: prompt
params:
  language: string
  focus_areas: array
  author: Author
---
```

Parameters are available as typed variables in the loom body.

### Emission

Text injection uses the `emit` statement. Emitted strings support template interpolation:

```loom
emit "You are reviewing ${language} code. Focus on: ${focus_areas.join(', ')}."
```

Multi-line emit blocks use a heredoc-style syntax:

```loom
emit """
  The author is ${author.name}, a ${author.role} with ${author.experience_years} years of experience.
  Please tailor feedback accordingly.
"""
```

### Control Flow

Standard TinyC-derived control flow applies:

```loom
for area in focus_areas {
  emit "## Review: ${area}"
  emit "Evaluate the code specifically for ${area} concerns."
}

if author.experience_years < 2 {
  emit "Use simple explanations. Avoid assuming familiarity with advanced patterns."
}
```

### Function Definitions

Functions encapsulate reusable emission logic:

```loom
fn persona_block(p: Author): void {
  emit "Reviewer context: ${p.name} (${p.role}, ${p.experience_years}y experience)."
}

persona_block(author)
```

Functions may return values for use in PI-side logic, or may be `void` if their purpose is purely to emit.

### Imports

Looms can import schemas and functions from other `.loom` files:

```loom
import { Author, persona_block } from "./shared/personas.loom"
```

---

## Extension Architecture

### Pi Extension Integration

`pi-loom` registers with Pi Agent as an extension in the standard way, providing:

- A **command handler** for invoking named looms from within a Pi session
- A **file watcher** (optional) for `.loom` files in a configurable directory (default: `looms/`)
- Schema validation at parse time, surfacing errors as Pi-compatible diagnostics

### Directory Convention

```
project/
├── looms/
│   ├── code-review.loom
│   ├── architecture-brief.loom
│   └── shared/
│       └── personas.loom
```

Mirrors Pi's existing `agents/` and `prompts/` conventions.

### Invocation from Pi

```
/loom code-review language=TypeScript focus_areas=["error handling","types"] author.name="Ada"
```

In prompt mode, the emission buffer is injected into the current conversation.  
In subagent mode, a new isolated context is created and the buffer is injected as its system/initial prompt.

---

## Comparison with Existing Pi Features

| Feature | Pi `prompt` | Pi `subagent` | `pi-loom` |
|---|---|---|---|
| Instructions for | ESI | ESI (isolated) | PI + ESI (boundary) |
| Logic/control flow | None | None | Full (loops, conditionals, functions) |
| Parameterization | YAML frontmatter | YAML frontmatter | Typed params + schemas |
| Type system | Untyped strings | Untyped strings | JSON / JSON Schema |
| Conversation context | Current | New (isolated) | Either (mode-controlled) |
| Output | Injected text | Injected text | Emitted text (buffer → context) |
| File format | Markdown `.md` | Markdown `.md` | Loom `.loom` |

---

## Implementation Notes

### Parser

- Toolkit: **Chevrotain** (TypeScript-native, no separate lexer generator required)
- Grammar basis: **TinyC** Chevrotain example, extended with `emit`, `schema`, and template string support
- Parse errors surface as structured diagnostics compatible with Pi's error reporting

### Runtime

- Implemented in TypeScript as a Pi extension module
- Maintains an **emission buffer** (ordered array of string fragments) during execution
- On completion, flushes buffer to the target context via Pi's context injection API
- JSON Schema validation for typed parameters uses **AJV** or equivalent

### Future Considerations

- LSP support for `.loom` files (syntax highlighting, type checking, autocomplete)
- A `loom test` command for dry-run execution that prints the emission buffer to stdout without injecting into a live context
- Composition: looms invoking other looms, with buffer merging semantics
