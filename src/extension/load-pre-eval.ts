// V4e / V4e-T — load-time pre-evaluation failure routing (ERR-1…ERR-6, ERR-16).
//
// Owns the load-time pre-evaluation failure routing surface: each of the seven
// load-time pre-eval failure causes is routed onto the `theta-system-note`
// channel with `triggerTurn:false`, never becoming an evaluation outcome and
// producing no final value. This is the surface the watcher-time reload cause
// (ERR-7, `V4g`) reuses.
//
// The seven load-time causes (errors-and-results/error-model.md pre-evaluation
// failure list, items 1–6 and 8):
//   - ERR-1  host-incompatibility detected by the capability probe (`V9a`)
//   - ERR-2  lex / parse / type batches (`V1a`…, diagnostics.md)
//   - ERR-3  frontmatter rejection (`V6a`)
//   - ERR-4  binder-model resolution failure (`V11a`)
//   - ERR-5  binder argument-binding failure — ceiling #3 (`V11f`)
//   - ERR-6  `tools:` resolution failure (`V10a`/`V6a`)
//   - ERR-16 slash-load `params` arm of ceiling #4, cross-routed through
//            ceiling #3's no-retry classification per CIO-1 (`V5e`/`V16a`)
//
// The producing subsystems assemble the failure's `theta-system-note`; V4e only
// *routes* it pre-eval, over the V7d `theta-system-note` delivery channel, so
// that `sendSystemNote`'s fixed `triggerTurn:false` option is applied and the
// failure never fires a turn.
//
// The ERR-16 cross-route additionally CONSULTS `V16a`'s cross-ceiling
// arbitration seam at slash-load per CIO-1 — a load-time cross-route that
// differs in kind from the four runtime first-enforcement sites — and its
// depth-6 breach is detected by `V5e`'s live theta-owned depth walk.
//
// V4e-T (tests-task) declares this seam and stubs the routing so the failing
// ERR-1…ERR-6/ERR-16 tests compile and red on their own primary assertions
// (the routed note never reaches the channel's `pi.sendMessage`). The paired
// V4e implementation leaf wires the routing.
//
// Spec: errors-and-results/error-model.md (ERR-1…ERR-6, ERR-16),
// hard-ceilings/ceilings-3-and-4.md (CIO-1 ceiling-#4 slash-load `params`
// cross-route through ceiling #3), pi-integration-contract/
// runtime-event-channel.md §"System notes".

import {
  sendSystemNote,
  type SystemNote,
  type SystemNoteChannelDeps,
} from "./system-note-channel";
import { arbitrate, type ArbitrationResult } from "../runtime/ceiling-arbitration";
import { depthWalk } from "../runtime/depth-walk";
import {
  renderBinderSystemNote,
  renderDepthWalkAjvSummary,
} from "../binder/retry-taxonomy";

/**
 * The seven load-time pre-evaluation failure causes (errors-and-results/
 * error-model.md pre-evaluation failure list, items 1–6 and 8). The
 * watcher-time reload-integration cause (ERR-7) is split out to `V4g` and is
 * not a member here.
 */
export type PreEvalFailureCause =
  | "capability-probe" // ERR-1
  | "lex-parse-type" // ERR-2
  | "frontmatter" // ERR-3
  | "binder-model" // ERR-4
  | "binder-arg-binding" // ERR-5 (ceiling #3)
  | "tools-resolution" // ERR-6
  | "slash-load-params"; // ERR-16 (ceiling #4 → ceiling #3 cross-route)

/** Construction dependencies for the load-time pre-eval failure router. */
export interface LoadPreEvalDeps {
  /**
   * The `theta-system-note` delivery channel (V7d) each pre-eval failure routes
   * onto — its `pi.sendMessage` seam carries the fixed `triggerTurn:false`
   * option, so a routed failure never fires a turn.
   */
  readonly channel: SystemNoteChannelDeps;
}

/** The ERR-16 slash-load `params` cross-route outcome (CIO-1). */
export interface SlashLoadParamsCrossRoute {
  /**
   * The arbitration decision `V16a`'s seam returns for the slash-load `params`
   * candidate: ceiling #3 surfaces (the cross-route destination), ceiling #4
   * (the JSON-depth breach) is masked (CIO-1).
   */
  readonly arbitration: ArbitrationResult;
  /** The ceiling-#3-templated `theta-system-note` the cross-route routes pre-eval. */
  readonly note: SystemNote;
}

/**
 * The load-time pre-evaluation failure router: route an assembled pre-eval
 * failure `theta-system-note` onto the `theta-system-note` channel with
 * `triggerTurn:false` (never an evaluation outcome), and the ERR-16 slash-load
 * `params` cross-route helper that consults `V16a`/`V5e`.
 */
export interface LoadFailurePreEvalRouter {
  /**
   * Route one assembled pre-eval failure `theta-system-note` (from any of the
   * seven load-time causes) onto the `theta-system-note` channel. Delivery
   * applies the fixed `triggerTurn:false` option, so the failure never fires a
   * turn and never becomes an evaluation outcome.
   */
  routePreEvalFailure(cause: PreEvalFailureCause, note: SystemNote): void;
  /**
   * The ERR-16 slash-load `params` cross-route: detect the depth-6 breach with
   * `V5e`'s live depth walk, consult `V16a`'s cross-ceiling arbitration seam at
   * slash-load per CIO-1 (surfacing ceiling #3, masking ceiling #4), build the
   * ceiling-#3 no-retry system-note (the AJV-on-`args` disposition HC3-c
   * defines), and route it pre-eval via `routePreEvalFailure`.
   */
  crossRouteSlashLoadParams(
    thetaName: string,
    paramsValue: unknown,
  ): SlashLoadParamsCrossRoute;
}

/**
 * Construct the load-time pre-eval failure router. Its `routePreEvalFailure`
 * delivers over the V7d `theta-system-note` channel so `sendSystemNote`'s fixed
 * `triggerTurn:false` option is applied to every routed failure.
 */
export function createLoadFailurePreEvalRouter(
  deps: LoadPreEvalDeps,
): LoadFailurePreEvalRouter {
  return {
    routePreEvalFailure(cause: PreEvalFailureCause, note: SystemNote): void {
      // Route the assembled pre-eval failure `theta-system-note` onto the V7d
      // `theta-system-note` delivery channel. `sendSystemNote` applies the fixed
      // `triggerTurn:false` option (SystemNoteSender), so the failure never
      // fires a turn and never becomes an evaluation outcome — this is the
      // single routing surface all seven load-time causes (ERR-1…ERR-6,
      // ERR-16) share, and the surface the watcher-time reload cause (ERR-7,
      // `V4g`) reuses. The `cause` discriminant is carried for callers /
      // reload-integration reuse; every cause routes through the one delivery
      // path, so no per-cause branching is required here.
      void cause;
      sendSystemNote(note, deps.channel);
    },
    crossRouteSlashLoadParams(
      thetaName: string,
      paramsValue: unknown,
    ): SlashLoadParamsCrossRoute {
      // Detect the depth-6 breach with V5e's live theta-owned depth walk (not a
      // synthetic load-time signal).
      const walk = depthWalk(paramsValue);
      const ajvSummary =
        walk.ok === false
          ? renderDepthWalkAjvSummary(walk.issue)
          : "";
      // Consult V16a's cross-ceiling arbitration seam at slash-load per CIO-1:
      // a candidate co-presenting ceiling #4 (the JSON-depth breach) at the
      // slash-load-binder site surfaces ceiling #3 and masks ceiling #4.
      const arbitration = arbitrate({
        site: "slash-load-binder",
        satisfied: ["ceiling#3", "ceiling#4"],
      });
      // The ceiling-#3 no-retry surface (the same disposition HC3-c defines for
      // AJV-on-`args` failures): render the binder `ajv_args` failure template
      // from the depth-walk AJV summary.
      const content = renderBinderSystemNote(thetaName, {
        kind: "ajv_args",
        ajvSummary,
      });
      const note: SystemNote = {
        content,
        display: true,
        // The ceiling-#3 cross-route surfaces through the runtime-event
        // `details: { event }` shape, carrying the arbitration decision.
        details: {
          event: {
            kind: "ceiling",
            surfaced: arbitration.surfaced,
            ...(arbitration.masked !== undefined
              ? { masked: arbitration.masked }
              : {}),
          },
        },
      };
      // Route the assembled cross-route note pre-eval (dropped by the V4e-T
      // stub above).
      this.routePreEvalFailure("slash-load-params", note);
      return { arbitration, note };
    },
  };
}
