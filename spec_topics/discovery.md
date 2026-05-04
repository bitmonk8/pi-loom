# Directory Convention

Loom files are discovered from the same locations as Pi prompt templates, just with a different leaf directory:

- Global: `~/.pi/agent/looms/*.loom`
- Project: `.pi/looms/*.loom`
- Packages: `looms/` directories or `pi.looms` entries in `package.json`
- Settings: `looms` array (in `~/.pi/agent/settings.json` or `.pi/settings.json`) with files or directories
- CLI: `--loom <path>` (repeatable, optional)

Discovery is **non-recursive** and matches only `*.loom`, mirroring Pi prompt-template behaviour. `.warp` library files are never discovered as slash commands regardless of where they live; they are reached only via `import` (with paths resolved relative to the importing file).

**Source priority (high to low).** When the same slash name resolves from multiple sources, the higher-priority source wins and a load-time *warning* is emitted naming both paths.

1. CLI flag (`--loom <path>`) — explicit, single-invocation override.
2. Settings (`looms` array, project `settings.json` overriding global).
3. Project (`.pi/looms/`).
4. Packages (`looms/` directories or `pi.looms` entries).
5. Global (`~/.pi/agent/looms/`).

**Slash-name collisions across formats.** A loom and a Pi prompt template (`.md`) or subagent that resolve to the same slash command (e.g., `code-review.loom` and `code-review.md`) are a load-time *error* reported through Pi's diagnostics; neither is registered. Authors must rename one. Cross-format shadowing is not supported in V1; the rule is symmetric across `.loom`, `.md` prompts, and `.md` subagents.

```
project/
├── looms/
│   ├── code-review.loom         # discovered → /code-review
│   ├── architecture-brief.loom  # discovered → /architecture-brief
│   ├── personas.warp            # library — importable, never a slash command
│   └── shared/
│       └── schemas.warp         # library in a subdirectory; importable via path
```
