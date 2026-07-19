import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { estimateTokens } from "@earendil-works/pi-coding-agent";
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { PiFileWatcher } from "../src/seams/pi-file-watcher";
import { PiTokenEstimator } from "../src/seams/pi-token-estimator";
import type { FileWatchEvent, WatchTermination } from "../src/seams/file-watcher";
import { FakeFileWatcher } from "./helpers/fake-file-watcher";
import { FakeTokenEstimator } from "./helpers/fake-token-estimator";

// V8e-T — failing tests for the paired `V8e` `FileWatcher` (PIC-14) and
// `TokenEstimator` (PIC-16) seam implementations: the `PiFileWatcher` chokidar
// production adapter, the `FakeFileWatcher` conformance vehicle, the
// `PiTokenEstimator` production adapter, and the `FakeTokenEstimator` test fake.
//
// These tests red because the V8e adapters and fakes are stubs that throw — the
// implementation under test is absent. Each assertion names the specific PIC-14
// / PIC-16 behaviour it pins so the red is on the assertion subject (the SUT
// call), not a fixture or harness throw.

/** Construct a minimal Pi `UserMessage` (an `AgentMessage` arm) carrying `text`. */
function userMsg(text: string): AgentMessage {
  return { role: "user", content: text, timestamp: 0 } as AgentMessage;
}

// ---------------------------------------------------------------------------
// PIC-14 — `FakeFileWatcher` conformance vehicle (delivery + terminal channel).
// ---------------------------------------------------------------------------

describe("V8e-T — FakeFileWatcher (PIC-14 delivery + terminal-signal channel)", () => {
  it("PIC-14: watch() returns an Unsubscribe function that is idempotent (twice is a no-op)", () => {
    const fw = new FakeFileWatcher();
    const unsub = fw.watch(["/root"], () => {});
    expect(typeof unsub).toBe("function");
    expect(() => {
      unsub();
      unsub();
    }).not.toThrow();
  });

  it("PIC-14: the handler observes the three change kinds (add/change/unlink) — the delivery contract", () => {
    const fw = new FakeFileWatcher();
    const seen: FileWatchEvent[] = [];
    fw.watch(["/root"], (event) => seen.push(event));

    fw.emit({ kind: "add", path: "/root/a" });
    fw.emit({ kind: "change", path: "/root/a" });
    fw.emit({ kind: "unlink", path: "/root/a" });

    expect(seen.map((e) => e.kind)).toEqual(["add", "change", "unlink"]);
    expect(seen.map((e) => e.path)).toEqual(["/root/a", "/root/a", "/root/a"]);
  });

  it("PIC-14: the terminal-signal channel conveys a stopped-delivering observation distinct from the three change kinds", () => {
    const fw = new FakeFileWatcher();
    const changes: FileWatchEvent[] = [];
    const terminations: WatchTermination[] = [];
    fw.watch(
      ["/root"],
      (event) => changes.push(event),
      (termination) => terminations.push(termination),
    );

    fw.terminate({ roots: ["/root"] });

    // The terminal signal reaches the onTerminate channel...
    expect(terminations).toEqual([{ roots: ["/root"] }]);
    // ...and is NOT delivered as one of the three change kinds.
    expect(changes).toEqual([]);
  });

  it("PIC-14: a terminate() with no onTerminate channel attached is a no-op (does not reach the change handler)", () => {
    const fw = new FakeFileWatcher();
    const changes: FileWatchEvent[] = [];
    fw.watch(["/root"], (event) => changes.push(event));

    expect(() => fw.terminate({ roots: ["/root"] })).not.toThrow();
    expect(changes).toEqual([]);
  });

  it("PIC-14: FileWatcher is per-runtime — two FakeFileWatcher instances dispatch independently", () => {
    const a = new FakeFileWatcher();
    const b = new FakeFileWatcher();
    const seenA: FileWatchEvent[] = [];
    const seenB: FileWatchEvent[] = [];
    a.watch(["/root"], (event) => seenA.push(event));
    b.watch(["/root"], (event) => seenB.push(event));

    a.emit({ kind: "add", path: "/root/x" });

    expect(seenA.map((e) => e.kind)).toEqual(["add"]);
    expect(seenB).toEqual([]); // B's handler untouched by A's emit
  });
});

// ---------------------------------------------------------------------------
// PIC-14 — `PiFileWatcher` chokidar production adapter (structural contract).
// ---------------------------------------------------------------------------

describe("V8e-T — PiFileWatcher production adapter (PIC-14)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "theta-watch-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("PIC-14: watch() returns an Unsubscribe function whose teardown is idempotent", () => {
    const fw = new PiFileWatcher();
    const unsub = fw.watch([dir], () => {});
    try {
      expect(typeof unsub).toBe("function");
    } finally {
      // Idempotent teardown: calling twice must not throw.
      unsub();
      unsub();
    }
  });

  it("PIC-14: FileWatcher is per-runtime — two PiFileWatcher instances are independent", () => {
    const a = new PiFileWatcher();
    const b = new PiFileWatcher();
    expect(a).not.toBe(b);
    const unsubA = a.watch([dir], () => {});
    const unsubB = b.watch([dir], () => {});
    expect(typeof unsubA).toBe("function");
    expect(typeof unsubB).toBe("function");
    unsubA();
    unsubB();
  });
});

// ---------------------------------------------------------------------------
// PIC-16 — `PiTokenEstimator` production adapter (delegates estimateTokens).
// ---------------------------------------------------------------------------

describe("V8e-T — PiTokenEstimator production adapter (PIC-16)", () => {
  it("PIC-16: estimate(message) delegates to the estimateTokens named import, returning its result unchanged", () => {
    const estimator = new PiTokenEstimator();
    const message = userMsg("hello world from theta");
    // Delegation: the adapter returns exactly what estimateTokens returns for
    // the same message, redefining none of Pi's estimation algorithm.
    expect(estimator.estimate(message)).toBe(estimateTokens(message));
  });

  it("PIC-16: estimate is a deterministic pure function of its message argument at a fixed pin", () => {
    const estimator = new PiTokenEstimator();
    const message = userMsg("the quick brown fox");
    const first = estimator.estimate(message);
    const second = estimator.estimate(message);
    expect(second).toBe(first); // identical message → identical count
  });

  it("PIC-16: TokenEstimator is per-runtime — two PiTokenEstimator instances are independent, each functional", () => {
    const a = new PiTokenEstimator();
    const b = new PiTokenEstimator();
    expect(a).not.toBe(b);
    const message = userMsg("per-runtime check");
    expect(a.estimate(message)).toBe(estimateTokens(message));
    expect(b.estimate(message)).toBe(estimateTokens(message));
  });
});

// ---------------------------------------------------------------------------
// PIC-16 — `FakeTokenEstimator` test-fake semantics (the conformance vehicle).
// ---------------------------------------------------------------------------

describe("V8e-T — FakeTokenEstimator test-fake semantics (PIC-16)", () => {
  it("PIC-16: estimate(message) returns the configured per-message integer, not a content-derived count", () => {
    const m1 = userMsg("first");
    const m2 = userMsg("second");
    const estimator = new FakeTokenEstimator(
      new Map<AgentMessage, number>([
        [m1, 100],
        [m2, 250],
      ]),
    );
    expect(estimator.estimate(m1)).toBe(100);
    expect(estimator.estimate(m2)).toBe(250);
  });

  it("PIC-16: TokenEstimator is per-runtime — two FakeTokenEstimator instances report independent counts", () => {
    const message = userMsg("shared message object");
    const a = new FakeTokenEstimator(new Map<AgentMessage, number>([[message, 7]]));
    const b = new FakeTokenEstimator(new Map<AgentMessage, number>([[message, 42]]));
    expect(a.estimate(message)).toBe(7);
    expect(b.estimate(message)).toBe(42); // B's configured count untouched by A
  });
});
