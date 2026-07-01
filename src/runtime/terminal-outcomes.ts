// V4c / V4c-T — terminal outcomes and the partial-append / non-mutation seam.
//
// This module owns the runtime side of the partial-append contract
// (errors-and-results/error-model.md §"Partial-append contract" and the
// §"Mid-stream cancellation, conversation state" obligations ERR-8 … ERR-12,
// cross-linked from cancellation.md §"Surfacing"). Turns Pi has committed to
// the conversation the loom was driving remain final; the runtime performs no
// implicit rollback. When a query's stream is interrupted mid-flight by
// cancellation — or by `?`-propagation after a partial stream — the runtime
// MUST NOT mutate any Pi-committed surface (no truncate / rewrite / replace /
// remove of assistant tokens, tool-call cards, or system notes) and MUST NOT
// inject a compensating turn (ERR-8 / ERR-9). The two paths are bound
// symmetrically (ERR-10); the non-mutation window binds between the cancelled
// streaming turn and the next driver send (ERR-11); and the non-mutation
// obligation holds inside a subagent loom too (ERR-12).
//
// V4c-T (tests-task) declared the seam — the committed-surface model, the
// `CommittedConversationMutator` the runtime holds against Pi's conversation,
// the `handlePartialTerminalOutcome` entry the runtime routes a mid-stream
// terminal event through, and the `classifyNonMutationWindow` scope helper. V4c
// (this leaf) supplies the behaviour: `handlePartialTerminalOutcome` performs no
// mutation and no compensating injection (calls nothing on the mutator), and
// `classifyNonMutationWindow` scopes the window to the half-open interval
// `[cancelled-turn, next-driver-send)`.

/** The kinds of surface Pi can commit to the driven conversation. */
export type CommittedSurfaceKind = "assistant-tokens" | "tool-call-card" | "system-note";

/** One surface Pi has already committed before the terminal event fires. */
export interface CommittedSurface {
  readonly kind: CommittedSurfaceKind;
  readonly id: string;
  readonly content: string;
}

/**
 * The two mid-stream terminal paths ERR-10 binds symmetrically: an
 * `AbortSignal`-driven cancellation, and a `?`-propagation after a partial
 * stream.
 */
export type PartialTerminalPath = "cancelled" | "question-propagation";

/**
 * Which conversation the loom was driving: the caller's conversation in
 * `prompt` mode, or the disposable subagent conversation in `subagent` mode
 * (ERR-12 binds the same non-mutation obligation inside a subagent loom).
 */
export type DrivenConversationMode = "prompt" | "subagent";

/**
 * The mutating operations the runtime *could* perform against the conversation
 * Pi has committed. The partial-append / non-mutation contract (ERR-8 / ERR-9)
 * forbids the runtime from calling any of them on the cancellation and
 * `?`-propagation paths — the runtime performs no implicit rollback and injects
 * no compensating turn.
 */
export interface CommittedConversationMutator {
  /** Truncate a committed surface (forbidden on the partial path — ERR-8). */
  truncate(surfaceId: string): void;
  /** Re-write a committed surface's content (forbidden — ERR-8). */
  rewrite(surfaceId: string, content: string): void;
  /** Replace a committed surface wholesale (forbidden — ERR-8). */
  replace(surfaceId: string, surface: CommittedSurface): void;
  /** Remove a committed surface (forbidden — ERR-8). */
  remove(surfaceId: string): void;
  /** Inject a compensating turn (forbidden on the partial path — ERR-9). */
  injectCompensatingTurn(surface: CommittedSurface): void;
}

/** The mid-stream terminal event the runtime routes through the seam. */
export interface PartialTerminalOutcome {
  readonly path: PartialTerminalPath;
  readonly mode: DrivenConversationMode;
  /** The surfaces Pi has already committed before the terminal event. */
  readonly committed: readonly CommittedSurface[];
}

/**
 * Handle the terminal event that fires after a partial stream is interrupted by
 * cancellation or `?`-propagation. Per ERR-8 / ERR-9 / ERR-10 / ERR-12 the
 * runtime MUST NOT mutate any Pi-committed surface (no truncate / rewrite /
 * replace / remove) and MUST NOT inject a compensating turn — uniformly across
 * the cancellation and `?`-propagation paths and across prompt and subagent
 * modes. A compliant implementation therefore calls no method on `mutator`.
 */
export function handlePartialTerminalOutcome(
  outcome: PartialTerminalOutcome,
  mutator: CommittedConversationMutator,
): void {
  // V4c: the partial-append / non-mutation contract. Turns Pi has committed to
  // the driven conversation remain final — the runtime performs no implicit
  // rollback (§"No rollback", ERR-13) and, on a mid-stream terminal event
  // (cancellation OR `?`-propagation after a partial stream), MUST NOT mutate
  // any Pi-committed surface (no truncate / rewrite / replace / remove —
  // ERR-8) and MUST NOT inject a compensating turn (ERR-9). These obligations
  // bind symmetrically across the two paths (ERR-10) and across prompt and
  // subagent modes (ERR-12). A compliant runtime therefore calls no method on
  // `mutator` for any `outcome` — the committed surfaces are read-only here.
  //
  // The parameters carry the observable outcome (path / mode / committed
  // surfaces) that a caller may inspect; the contract's whole content is the
  // absence of any mutating call, so the body is intentionally empty.
  void outcome;
  void mutator;
}

/**
 * One event on the timeline the non-mutation window (ERR-11) is scoped against:
 * the cancelled streaming turn the window opens at, the next driver send it
 * closes at, and any respond-repair append the runtime records.
 */
export type WindowTimelineEvent =
  | { readonly kind: "cancelled-turn"; readonly turnId: string }
  | { readonly kind: "driver-send"; readonly sendId: string }
  | { readonly kind: "respond-repair-append"; readonly surface: CommittedSurface };

/**
 * The ERR-11 non-mutation window: for typed queries with respond-repair
 * follow-ups, the non-mutation obligation binds the runtime between the
 * cancelled streaming turn and the next driver send. Appends AFTER the next
 * driver send are the respond-repair loop's own — governed by Query
 * §"Schema-validation respond-repair", not ERR-11.
 */
export interface NonMutationWindow {
  /** The cancelled streaming turn id the window opens at. */
  readonly opensAt: string;
  /** The next driver-send id the window closes at (exclusive). */
  readonly closesAt: string;
  /**
   * Appends that fall inside the window `[cancelled-turn, next-driver-send)` —
   * these are the ERR-11 non-mutation-bound appends. Appends after the next
   * driver send are excluded (respond-repair's own, governed elsewhere).
   */
  readonly appendsInsideWindow: readonly CommittedSurface[];
}

/**
 * Classify the ERR-11 non-mutation window over a respond-repair timeline: the
 * window opens at the cancelled streaming turn and closes at the FIRST
 * subsequent driver send, and its `appendsInsideWindow` are exactly the
 * respond-repair appends that occur before that driver send.
 */
export function classifyNonMutationWindow(
  events: readonly WindowTimelineEvent[],
): NonMutationWindow {
  // V4c: the ERR-11 non-mutation window binds between the cancelled streaming
  // turn and the NEXT driver send — the half-open interval
  // `[cancelled-turn, next-driver-send)`. The window opens at the cancelled
  // turn, closes at the FIRST subsequent driver send, and its
  // `appendsInsideWindow` are exactly the respond-repair appends recorded
  // before that first send. Appends after the next driver send are the
  // respond-repair loop's own — governed by Query §"Schema-validation
  // respond-repair", not ERR-11 — so they are excluded.
  let opensAt = "";
  let closesAt = "";
  let windowClosed = false;
  const appendsInsideWindow: CommittedSurface[] = [];
  for (const event of events) {
    if (event.kind === "cancelled-turn") {
      opensAt = event.turnId;
    } else if (event.kind === "driver-send") {
      // Close the window at the FIRST driver send after the cancelled turn;
      // later sends do not re-open or move it.
      if (!windowClosed) {
        closesAt = event.sendId;
        windowClosed = true;
      }
    } else if (!windowClosed) {
      // A respond-repair append recorded before the next driver send falls
      // inside the window; appends after it are excluded.
      appendsInsideWindow.push(event.surface);
    }
  }
  return { opensAt, closesAt, appendsInsideWindow };
}
