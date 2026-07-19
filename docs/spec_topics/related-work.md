# Appendix: Related Work

pi-theta is not novel in ambition — *prompt-as-program* is a crowded space. This appendix locates theta against neighbouring work for readers who already know the landscape; nothing in the rest of the spec depends on it.

Two coordinates help place a tool:

- **Layer.** *Orchestration-layer* tools sit above a finished provider API, drive multi-turn conversations, validate responses, and run tool loops at the message level. *Inference-layer* tools hook into the model's token-generation loop via logit biasing, grammar masks, or controller VMs. The two compose. **pi-theta is orchestration-layer.**
- **Surface.** Declarative (YAML / DAG) vs. imperative (a real language). **pi-theta is imperative.**

## Direct influences

- **`mech`** — the declarative YAML workflow engine in the sibling [backlot](../backlot) project (`backlot/docs/MECH_SPEC.md`). Same worldview (typed prompt orchestration, JSON Schema as the type system, conversation-isolated function calls), opposite syntactic choices. Several theta decisions — typed function inputs/outputs as the composition unit, conversation isolation across subagent invocations, schema-first validation — were lifted from mech.
- **Pi prompt templates and subagents** — frontmatter conventions, slash-command discovery, the prompt/subagent execution-mode split, and tool resolution all mirror Pi.

## Other orchestration-layer tools

- **PDL** (IBM) — declarative YAML, same orchestration layer, same context-accumulation model, same JSON Schema typing. The closest functional comparable on a different surface.
- **DSPy** (Stanford) and **ax** — declarative module signatures plus a prompt optimiser. Theta does not optimise prompts; what the author writes is what the model sees.
- **BAML** (Boundary) — function-per-LLM-call DSL with schema-aligned parsing; single-call. Theta drives many queries per program.
- **TypeChat** (Microsoft) — TypeScript interfaces as schemas with an LLM-driven repair loop on validation failure. The repair pattern is mirrored in theta's typed-query respond-repair-via-follow-up behaviour.
- **Promptflow** (Microsoft), **ControlFlow** (Prefect), **LangChain LCEL** — declarative DAG / Python composition cousins of mech and PDL.
- **Instructor**, **PydanticAI**, **Mirascope** — Python decorators wrapping a single LLM call into a typed Pydantic-returning function.

## Inference-layer tools (different layer)

These hook into the model's token-generation path rather than driving a provider API from outside. Theta *consumes* the structured-output and strict-tool-input contracts they help establish; it does not compete with them.

**Guidance** (Microsoft), **LMQL** (ETH Zurich), **SGLang frontend** (Berkeley Sky), **Outlines** (.txt), **AICI** (Microsoft).
