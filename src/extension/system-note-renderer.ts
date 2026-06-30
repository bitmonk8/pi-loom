// H4a — the `loom-system-note` message renderer.
//
// A minimal `pi-tui` `Component`-returning renderer for the loom-internal
// `loom-system-note` channel, registered synchronously inside the extension
// factory body (per extension-bootstrap-and-per-loom.md §"Renderer
// registration"). The renderer constructs a `Component` (NOT a string and NOT
// a React node — a bare-string body silently leaves the channel unrendered)
// from `message.content`, sourcing no hard-coded styling, and returns
// `undefined` when `display === false` (Pi skips rendering that message).
//
// PIC-21's render-time exception-safety wrap (catch-internally / return a
// minimal raw-content `Component`) is owned by this V7d leaf. The factory
// wraps the `pi.registerMessageRenderer` call itself in a per-call
// `try`/`catch` so a registration-time throw never escapes the factory body.

import type { Component } from "@earendil-works/pi-tui";
import type { MessageRenderer } from "@earendil-works/pi-coding-agent";

/** A minimal text `Component`: renders the given lines verbatim. */
function textComponent(lines: readonly string[]): Component {
  return {
    render: (_width: number): string[] => [...lines],
    invalidate: (): void => {},
  };
}

/**
 * Construction dependencies for the `loom-system-note` renderer. `formatLines`
 * is the dim-styling step PIC-21 wraps: a throw from it is an internal
 * renderer failure the V7d hardening catches, falling back to the raw
 * `message.content` rendering. Absent, the renderer renders raw content lines.
 */
export interface SystemNoteRendererDeps {
  readonly formatLines?: (content: string) => readonly string[];
}

/**
 * Construct the `loom-system-note` renderer. Returns `undefined` for
 * `display === false` messages (Pi skips them); otherwise returns a text
 * `Component` rendering the message's string content.
 *
 * PIC-21: an internal renderer-body throw (e.g. from the injected
 * `formatLines` dim-styling step) MUST NOT escape the `MessageRenderer`
 * invocation. On such a throw the renderer falls back to a minimal `Component`
 * rendering the raw `message.content` for `display === true` and `undefined`
 * for `display === false`, and emits no `loom/runtime/*` diagnostic (the
 * factory takes no diagnostics sink, so that property holds by construction).
 */
export function createSystemNoteRenderer(
  deps?: SystemNoteRendererDeps,
): MessageRenderer {
  return (message, _options, _theme): Component | undefined => {
    const content =
      typeof message.content === "string" ? message.content : "";
    try {
      if (message.display === false) {
        return undefined;
      }
      const lines = deps?.formatLines
        ? deps.formatLines(content)
        : content.split("\n");
      return textComponent(lines);
    } catch (e: unknown) { // allow-broad-catch: PIC-21 — runtime-event-channel.md / extension-bootstrap-and-per-loom.md#pic-21
      // PIC-21: trap any internal renderer-body failure. `display === false`
      // still renders nothing; otherwise fall back to the raw content lines.
      void e;
      if (message.display === false) {
        return undefined;
      }
      return textComponent(content.split("\n"));
    }
  };
}
