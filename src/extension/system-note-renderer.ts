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
// minimal raw-content `Component`) is owned by `V7d`, not this leaf; H4a
// establishes only the construct-a-`Component` shape. The factory wraps the
// `pi.registerMessageRenderer` call itself in a per-call `try`/`catch` so a
// registration-time throw never escapes the factory body.

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
 * PIC-21's render-time exception-safety wrap (catch an internal `formatLines`
 * throw within the renderer body and fall back to a minimal raw-content
 * `Component`) is owned by V7d; this leaf establishes the injectable
 * `formatLines` seam so the V7d-T PIC-21 test can drive an internal throw.
 */
export function createSystemNoteRenderer(
  deps?: SystemNoteRendererDeps,
): MessageRenderer {
  return (message, _options, _theme): Component | undefined => {
    if (message.display === false) {
      return undefined;
    }
    const content =
      typeof message.content === "string" ? message.content : "";
    const lines = deps?.formatLines
      ? deps.formatLines(content)
      : content.split("\n");
    return textComponent(lines);
  };
}
