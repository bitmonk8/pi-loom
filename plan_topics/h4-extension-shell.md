# H4 — Pi extension shell

**Adds.** `extensions/index.ts` exporting `default function (pi: ExtensionAPI)`; registers a single no-op `/loom-status` command that prints "pi-loom: no looms loaded yet"; `PiModelClient`, `PiToolHost`, `PiFileSystem`, `PiExtensionAPI` adapter shims (no logic) wrapping Pi's surfaces.

**Tests.**
- Factory invoked with `FakeExtensionAPI` registers exactly one command.
- Each shim has one delegation contract test against its fake.

**Deps.** H2.

**Ships when.** `pi -e C:\UnitySrc\pi-loom` loads the extension and `/loom-status` runs in a real Pi session (manual smoke recorded in `docs/manual-smoke.md`).
