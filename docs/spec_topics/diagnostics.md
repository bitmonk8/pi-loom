# Diagnostics

Theta emits structured diagnostics through two delivery channels, both owned by the theta extension. Pi's own `LoadExtensionsResult.errors` field is **not** used: that field belongs to Pi's extension loader, and theta instead emits its own [`theta/load/extension-bootstrap-failed`](./diagnostics/code-registry-load.md) for the same class of factory-time bootstrap registration / subscription failures Pi would otherwise push into it. Such bootstrap failures surface on Pi startup; the diagnostics defined here all fire after the extension is already live (during scan, watcher reload, or slash-command execution).

## Contents

- [Diagnostic shape](./diagnostics/diagnostic-shape.md)
- [Placeholder rendering a](./diagnostics/placeholder-rendering-a.md)
- [Placeholder rendering b](./diagnostics/placeholder-rendering-b.md)
- [Code registry parse](./diagnostics/code-registry-parse.md)
- [Code registry load](./diagnostics/code-registry-load.md)
- [Code registry runtime](./diagnostics/code-registry-runtime.md)
- [Code registry host](./diagnostics/code-registry-host.md)

## Non-goals

The cluster's substantive scope edges are pinned on the sub-pages; this section surfaces them at the hub and points back to the owning prose.

- **`theta/typecheck/*` build-time brands** are not runtime diagnostics and are out of scope for the Code registry — see the [`theta/typecheck/*` out-of-scope note](./diagnostics/diagnostic-shape.md#theta-typecheck-namespace) in Diagnostic shape.
- **Duplicate suppression across re-scans** is not provided: a reload re-emits the same persistent diagnostic and neither the runtime nor the renderer removes or supersedes prior `theta-system-note` entries — see the [Re-scan deduplication rule](./diagnostics/diagnostic-shape.md#re-scan-deduplication) in Diagnostic shape.
- **LSP wire-protocol transport of diagnostics** is out of scope for theta 1.0. Theta delivers diagnostics only through the theta-extension-owned `theta-system-note` and transient-toast channels described in [Diagnostic shape](./diagnostics/diagnostic-shape.md); it does not define or emit an LSP-protocol transport for the structured `details.diagnostics` payload. LSP integrations are downstream consumers of that payload, not a theta-provided delivery surface.
