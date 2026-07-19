# pi-theta documentation style guide

Binding on every writer (human or agent) of user-facing pi-theta documentation.
This file is the authority the doc-writing subagents read before producing prose.

## Audience

Senior+ software engineers, chiefly **theta authors**. Assume fluency with
programming languages, type systems, and CLIs. Do not explain general
programming concepts. Do explain theta-specific concepts.

## Voice

- Factual, terse, no hype. No marketing register, no sales language.
- Present tense, active voice.
- State the fact first, then the caveat.
- Do not oversell capabilities or minimise limitations.
- No praise of the reader, the tool, or the design.

## Banned words and phrases

`simply`, `just`, `easy`, `easily`, `obviously`, `of course`, `powerful`,
`seamless`, `blazing`, `simply put`, `note that` (state the note directly),
`please`. Remove them; do not substitute a synonym for the same effect.

## Claims

- Every claim is testable or is removed.
- Do not describe behaviour the spec does not define or the runtime does not
  exhibit. When spec and implementation disagree, stop and report to the editor;
  do not pick one silently.

## Terminology

The authority is `docs/spec_topics/glossary.md`. Terms including *callable set*,
*operator*, *query-terminating*, *final value*, *prompt mode*, *subagent mode*,
`.theta`, `.thetalib` must match the glossary exactly. Do not coin synonyms.

## Examples

- Every non-trivial example is a real, checked-in file under `docs/examples/`.
- Examples parse under CI automatically (the committed-fixture parse gate walks
  `docs/`). Runtime-executed examples must run via `pi --theta docs/examples -p
  "/<stem>"` before the doc citing them is considered done.
- Docs reference the checked-in file; they do not paste a divergent copy.
- `.thetalib` modules are not invocable; exercise them through a `.theta` that imports
  them.

## Structure and cross-linking

- Follow the Diátaxis boundaries recorded in `docs/documentation-plan.md` §3.
  Do not mix modes (explanation vs. tutorial vs. how-to vs. reference).
- Link into the Reference for definitions instead of re-deriving them.
- One document has one job. If a section is doing a different job, it belongs in
  a different document.

## Provenance (delivery requirement)

Every delivered document ends with a `## Provenance` section (kept in the doc
during drafting; the editor decides whether it ships): the spec pages / REQ-IDs /
source files the document draws on, and the origin of each non-trivial claim.
This is what makes editor review cheap.
