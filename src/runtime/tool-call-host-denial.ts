// V14d / V14d-T — the code-tool host-denial surface.
//
// PIC-52 (pi-integration-contract/trust-boundary.md §"No additional access
// channels"): the runtime interposes no privilege layer between loom code and
// the Pi extension host, so host-side denials of filesystem / network / Pi-API
// access reach loom code *through the tool that issued the request*. A host-side
// denial — a value **thrown** from the tool's `execute()`, or a tool **return**
// that signals failure via an `isError: true` flag — MUST reach loom code as
// `Err(QueryError { kind: "code_tool", cause: "execution", ... })`; silent
// success on denial is forbidden.
//
// Building on the V14a `CodeToolError` carrier and the V14g `execute()`-throw
// lowering (`lowerToolExecuteThrow`, `filterJoinToolText`), this module owns the
// host-denial classification that keeps a denial off the silent-`Ok`
// accepted path: it maps BOTH denial forms to
// `Err(CodeToolError { cause: "execution" })`, and lowers only a non-denial
// return to `Ok(<joined text>)`. Per host-interfaces-core.md §"Tool execution
// from loom code" (spec fix F-1578) the code-side `AgentToolResult` *type*
// carries no `isError` field, so a well-behaved tool at the loom 1.0 Pi-SDK pin
// signals denial by throwing; this surface additionally guards the `isError:
// true` return form PIC-52 enumerates, so a denial-signalling return can never
// be silently lowered to `Ok` by the content-only accepted-path lowering. The
// content-only lowering (`filterJoinToolText`) reads only `content`, so without
// this guard an `{ content, isError: true }` denial would lower to a silent
// `Ok(<content text>)` — exactly the "silent success on denial" PIC-52 forbids.
//
// V14d-T (tests-task) declares the seam and stubs the behaviour-bearing
// functions inertly:
//   - `isHostDenial` returns `false` (so the denial-recognition assertions red),
//   - `classifyHostDenial` returns the *forbidden* silent-`Ok` accepted outcome
//     for every input (so the denial → `Err(CodeToolError { cause: "execution" })`
//     and never-silent-`Ok` assertions red on their own primary assertion).
// Each paired V14d-T test reds on its own primary assertion, not on a compile
// error, a missing fixture, or a harness throw. The paired V14d implementation
// leaf fills these in.
//
// Spec: pi-integration-contract/trust-boundary.md §"No additional access
// channels" (PIC-52); pi-integration-contract/host-interfaces-core.md §"Tool
// execution from loom code"; tool-calls.md §"Failures";
// errors-and-results/queryerror-variants.md (§"Code-side tool-call variant").

import type { ToolContentBlock } from "./tool-call-execute";
import type { CodeToolError } from "./query-error";
import { makeOk, type ResultValue } from "./value";

// --------------------------------------------------------------------------
// Host-side tool outcome (throw or return) as seen at the denial boundary
// --------------------------------------------------------------------------

/**
 * A resolved host-side tool return at the denial boundary. `content` is the
 * lowerable text surface; `isError` is the dispatcher-side failure flag PIC-52
 * enumerates as a denial signal. Per F-1578 the code-side `AgentToolResult`
 * *type* declares no `isError`, so this optional field models the denial form
 * PIC-52 still requires the runtime to refuse to silently succeed on.
 */
export interface HostDeniableEnvelope {
  readonly content?: readonly ToolContentBlock[];
  readonly isError?: boolean;
}

/**
 * A host-side tool outcome observed by loom code through the tool that issued
 * the request (PIC-52):
 *   - `throw`  — the tool's `execute()` threw `thrown` (the host-side denial
 *     form a well-behaved Pi tool uses at the loom 1.0 pin);
 *   - `return` — `execute()` resolved with `envelope` (a denial when
 *     `envelope.isError === true`, otherwise the accepted path).
 */
export type HostToolOutcome =
  | { readonly kind: "throw"; readonly thrown: unknown }
  | { readonly kind: "return"; readonly envelope: HostDeniableEnvelope };

/**
 * The disposition of classifying a host-side tool outcome at the PIC-52 denial
 * boundary:
 *   - `denied`   — a host-side denial (a throw, or an `isError: true` return);
 *     `result` is `Err(CodeToolError { cause: "execution", ... })` and `error`
 *     is that carrier. Never a silent `Ok`.
 *   - `accepted` — a non-denial return; `result` is `Ok(<joined text>)`.
 */
export type HostDenialLowering =
  | { readonly kind: "denied"; readonly result: ResultValue; readonly error: CodeToolError }
  | { readonly kind: "accepted"; readonly result: ResultValue };

// --------------------------------------------------------------------------
// Host-denial recognition + lowering (PIC-52)
// --------------------------------------------------------------------------

/**
 * Whether `outcome` is a host-side denial per PIC-52: a thrown value, or a
 * return whose `isError` flag is `true`. A non-denial return (`isError` absent
 * or falsy) is not a denial.
 *
 * V14d-T stubs this to `false` so the denial-recognition assertions red.
 */
export function isHostDenial(outcome: HostToolOutcome): boolean {
  void outcome;
  // V14d-T inert stub — the paired V14d leaf fills in the throw / `isError:
  // true` recognition. Returning `false` reds the denial-recognition tests on
  // their own primary assertion.
  return false;
}

/**
 * Classify a host-side tool outcome at the PIC-52 denial boundary. A denial —
 * a throw, or an `isError: true` return — lowers to
 * `Err(CodeToolError { kind: "code_tool", cause: "execution", tool_name, ... })`
 * (the throw form reuses the V14g `lowerToolExecuteThrow` coercion / truncation;
 * the `isError: true` form carries the joined denial text as its message).
 * A non-denial return lowers to `Ok(<joined text>)`. Silent success on denial is
 * forbidden: the `denied` arm never yields an `Ok`.
 *
 * V14d-T stubs this to the *forbidden* silent-`Ok` accepted outcome for every
 * input, so the denial → `Err(CodeToolError { cause: "execution" })` and
 * never-silent-`Ok` assertions red on their own primary assertions.
 */
export function classifyHostDenial(
  outcome: HostToolOutcome,
  toolName: string,
): HostDenialLowering {
  void outcome;
  void toolName;
  // V14d-T inert stub — the forbidden behaviour: it silently succeeds on every
  // outcome (including a denial), so the denial assertions red. The paired V14d
  // implementation leaf routes a throw / `isError: true` return to
  // `Err(CodeToolError { cause: "execution" })` and only a non-denial return to
  // `Ok(<joined text>)`.
  return { kind: "accepted", result: makeOk("") };
}
