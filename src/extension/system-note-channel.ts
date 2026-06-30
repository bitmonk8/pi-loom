// V7d / V7d-T — the `loom-system-note` delivery channel.
//
// This module owns the delivery-side `loom-system-note` `sendMessage`
// envelope, the multi-error batching (one `sendMessage` per `.loom` carrying
// the full `Diagnostic[]` assembled by V7a), the producer-facing
// diagnostic-emission seam, and the best-effort fallback chain
// (`sendSystemNote` → `ctx.ui.notify` → `loom/runtime/system-note-delivery-failed`
// → terminal `console.error`) per
// pi-integration-contract/runtime-event-channel.md §"System notes" and PIC-54.
//
// V7d-T (tests-task) declares the seam shape and stubs the two behaviour-
// bearing functions so the failing tests compile and red on their own primary
// assertions (delivery / fallback absent). The paired V7d implementation leaf
// fills these in.

import type { Diagnostic } from "../diagnostics/diagnostic";

/** The loom-internal system-note renderer channel `customType`. */
export const SYSTEM_NOTE_CHANNEL = "loom-system-note";

/**
 * The diagnostics-registry code the delivery-failure fallback emits, per the
 * `loom/runtime/system-note-delivery-failed` row in
 * diagnostics/code-registry-runtime.md.
 */
export const SYSTEM_NOTE_DELIVERY_FAILED_CODE =
  "loom/runtime/system-note-delivery-failed";

/**
 * The four normative `details` payload shapes the `loom-system-note` channel
 * carries, distinguished by which key is present (runtime-event-channel.md
 * §"system-note-details-shapes"). The shapes are disjoint by key.
 */
export type SystemNoteDetails =
  | { readonly diagnostics: readonly Diagnostic[] }
  | { readonly event: Record<string, unknown> }
  | {
      readonly structural: {
        readonly added: readonly string[];
        readonly removed: readonly string[];
      };
    }
  | { readonly recovery: { readonly looms: readonly string[] } };

/** A `loom-system-note` to deliver through the best-effort channel. */
export interface SystemNote {
  readonly content: string;
  readonly display: boolean;
  readonly details: SystemNoteDetails;
}

/**
 * The narrow `pi.sendMessage` subset the channel calls — `pi.sendMessage`
 * returns `void` (synchronous); the runtime MUST NOT `await` it. The V7d
 * implementation adapts the host `ExtensionAPI.sendMessage` to this seam.
 */
export interface SystemNoteSender {
  sendMessage(
    message: {
      readonly customType: string;
      readonly content: string;
      readonly display: boolean;
      readonly details: SystemNoteDetails;
    },
    options: { readonly triggerTurn: false },
  ): void;
}

/**
 * The transient toast surface (`ctx.ui`) the fallback chain calls — the only
 * member loom touches is `notify(message, "error")` (synchronous, may throw).
 */
export interface UiNotifier {
  notify(message: string, type: "error"): void;
}

/** Construction dependencies for the delivery channel. */
export interface SystemNoteChannelDeps {
  /** The `loom-system-note` send seam (adapts `pi.sendMessage`). */
  readonly pi: SystemNoteSender;
  /** The transient toast surface (`ctx.ui`). */
  readonly ui: UiNotifier;
  /** Submit a constructed `Diagnostic` through the standard diagnostics channel. */
  readonly emitDiagnostic: (diagnostic: Diagnostic) => void;
}

/**
 * Deliver a single `loom-system-note` best-effort, falling back through
 * `ctx.ui.notify` → `loom/runtime/system-note-delivery-failed` → terminal
 * `console.error` (PIC-54) when `pi.sendMessage` throws.
 */
export function sendSystemNote(
  note: SystemNote,
  deps: SystemNoteChannelDeps,
): void {
  // V7d-T stub: implementation owned by V7d. Intentionally a no-op so the
  // paired tests red on their own primary assertions (delivery absent).
  void note;
  void deps;
}

/**
 * The producer-facing diagnostic-emission seam: submit a scan-time batch of
 * `Diagnostic`s for delivery as exactly one `loom-system-note` `sendMessage`
 * (no per-error fan-out). Producers hand `Diagnostic`s here and never call
 * `pi.sendMessage` directly.
 */
export function emitDiagnosticBatch(
  diagnostics: readonly Diagnostic[],
  deps: SystemNoteChannelDeps,
): void {
  // V7d-T stub: implementation owned by V7d. No-op until V7d.
  void diagnostics;
  void deps;
}
