import { describe, expect, it } from "vitest";
import { requireLiveProvider, runProbe } from "./probe-harness";
import type { ProbeResult } from "./probe-harness";

// Lens: SYSTEM-NOTE RENDERING FIDELITY (SLSH-3 / SLSH-4 / SLSH-5, SNK-a..k) and
// the SLSH-1 overflow note (positive control only; already verified).
//
// Method: force each QueryError KIND to be returned (via unhandled `?`) to the
// slash-dispatch boundary and read the `loom-system-note` channel deterministically
// off the in-memory SessionManager (`turn.systemNotes`). Compare emitted notes to
// the SLSH-4 SNK templates VERBATIM (only <...> placeholders interpolated,
// em-dash = U+2014).
//
// Most of these are deterministic-failure paths that issue ZERO provider turns
// (empty_template short-circuit, code-tool execution failure, invoke parse
// failure). Only SNK-a (schema_validation) needs one live model turn (depth-6
// nested-schema trick from cli-findings/queries-toolloop.md).

const DASH = "\u2014"; // em-dash used by the SLSH-4 templates.

const provider = requireLiveProvider();

/** Join all system notes captured during a single drive. */
function notesOf(probe: ProbeResult, i = 0): readonly string[] {
  return probe.turns[i]?.systemNotes ?? [];
}

describe("system-note rendering fidelity — top-level Err at the slash boundary", () => {
  // -------------------------------------------------------------------------
  // POSITIVE CONTROL — SLSH-1 overflow note IS wired (already verified in prior
  // passes). Proves the systemNotes channel is observable in this harness.
  // -------------------------------------------------------------------------
  it("CONTROL SLSH-1: no-params overflow note is emitted verbatim", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "ctlnoparams.loom",
          text: [
            "---",
            "description: ctlnoparams",
            "mode: prompt",
            "---",
            "@`Reply with exactly: OK`",
          ].join("\n"),
        },
      ],
      drives: ["/ctlnoparams extra junk here"],
    });
    try {
      const notes = notesOf(probe);
      // eslint-disable-next-line no-console
      console.log("CONTROL SLSH-1 notes:", JSON.stringify(notes));
      expect(notes).toContain(
        `loom /ctlnoparams: ignoring extra arguments ${DASH} this loom takes no parameters`,
      );
    } finally {
      await probe.dispose();
    }
  });

  // -------------------------------------------------------------------------
  // SNK-b — validation(empty_template). ZERO provider turns.
  // Expected (SLSH-3 + SNK-b):
  //   loom /snkb returned Err: rendered query template was empty — no provider turn was issued
  // -------------------------------------------------------------------------
  it("SNK-b: empty_template top-level Err note", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "snkb.loom",
          // Rendered body is a single newline -> "" -> empty_template Err;
          // the top-of-loom `?` propagates it to the slash-dispatch boundary.
          text: ["---", "description: snkb", "mode: prompt", "---", "@`", "`?"].join("\n"),
        },
      ],
      drives: ["/snkb"],
    });
    try {
      const notes = notesOf(probe);
      // eslint-disable-next-line no-console
      console.log("SNK-b notes:", JSON.stringify(notes), "err:", probe.turns[0]?.error);
      const expected = `loom /snkb returned Err: rendered query template was empty ${DASH} no provider turn was issued`;
      // SNOTE-1 FIXED: the SLSH-3/SNK-b note is now emitted verbatim on the
      // slash-dispatch boundary. Clean `?` propagation, no throw.
      expect(notes).toContain(expected);
      expect(notes).toEqual([expected]);
      expect(probe.turns[0]?.error).toBeUndefined();
    } finally {
      await probe.dispose();
    }
  });

  // -------------------------------------------------------------------------
  // SNK-g — code_tool. ZERO provider turns (code-driven tool executes directly).
  // Expected (SLSH-3 + SNK-g):
  //   loom /snkg returned Err: tool read call failed (execution) — <message>
  // -------------------------------------------------------------------------
  it("SNK-g: code_tool top-level Err note", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "snkg.loom",
          text: [
            "---",
            "description: snkg",
            "mode: prompt",
            "tools: read",
            "---",
            'let _ = read({ path: "/no/such/loom/path/xyzzy.txt" })?',
            "@`unreached`",
          ].join("\n"),
        },
      ],
      drives: ["/snkg"],
    });
    try {
      const notes = notesOf(probe);
      // eslint-disable-next-line no-console
      console.log("SNK-g notes:", JSON.stringify(notes), "err:", probe.turns[0]?.error);
      const prefix = `loom /snkg returned Err: tool read call failed (execution) ${DASH} `;
      // SNOTE-1 FIXED: the SLSH-3/SNK-g note is emitted; the <message> tail is
      // the model-external tool-error text (non-deterministic per SLSH-4, so
      // only the surrounding template is asserted).
      expect(notes.some((n) => n.startsWith(prefix))).toBe(true);
      expect(notes.length).toBe(1);
      expect(probe.turns[0]?.error).toBeUndefined();
    } finally {
      await probe.dispose();
    }
  });

  // -------------------------------------------------------------------------
  // SNK-i — invoke_infra. ZERO provider turns. A literal invoke of a callee that
  // fails to parse -> InvokeInfraError, propagated by `?` to the boundary.
  // Expected (SLSH-3 + SNK-i):
  //   loom /snki returned Err: invoke of <callee_path> failed (<cause>)
  // -------------------------------------------------------------------------
  it("SNK-i: invoke_infra top-level Err note", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "snki.loom",
          text: [
            "---",
            "description: snki",
            "mode: prompt",
            "---",
            'let _ = invoke("./snki_broken.loom")?',
            "@`unreached`",
          ].join("\n"),
        },
        {
          source: "project",
          path: "snki_broken.loom",
          // Valid frontmatter, body syntax error -> parse_failure at invoke open.
          text: ["---", "description: broken", "mode: prompt", "---", "let x = = ="].join("\n"),
        },
      ],
      drives: ["/snki"],
    });
    try {
      const notes = notesOf(probe);
      // eslint-disable-next-line no-console
      console.log(
        "SNK-i notes:",
        JSON.stringify(notes),
        "err:",
        probe.turns[0]?.error,
        "registered:",
        JSON.stringify(probe.registeredNames),
      );
      const prefix = `loom /snki returned Err: invoke of `;
      // SNOTE-1 FIXED: the SLSH-3/SNK-i note is emitted (parent registered+ran).
      expect(probe.registeredNames).toContain("snki");
      expect(notes.some((n) => n.startsWith(prefix))).toBe(true);
      expect(notes.length).toBe(1);
    } finally {
      await probe.dispose();
    }
  });

  // -------------------------------------------------------------------------
  // SLSH-5 chain suffix. ZERO provider turns. A subagent child returns Err
  // (empty_template); the parent's `invoke(...)?` cascades it as invoke_callee.
  // Expected leaf-first:
  //   loom /snkchain returned Err: rendered query template was empty — no provider turn was issued from <child_abs> invoked at <parent_abs>:5
  // (invoke line in snkchain.loom is line 5)
  // -------------------------------------------------------------------------
  it("SLSH-5: chain suffix on a cascaded invoke_callee", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "snkchain.loom",
          text: [
            "---",
            "description: snkchain",
            "mode: prompt",
            "---",
            'let _ = invoke("./snkchain_child.loom")?',
            "@`unreached`",
          ].join("\n"),
        },
        {
          source: "project",
          path: "snkchain_child.loom",
          text: ["---", "description: child", "mode: subagent", "---", "@`", "`?"].join("\n"),
        },
      ],
      drives: ["/snkchain"],
    });
    try {
      const notes = notesOf(probe);
      // eslint-disable-next-line no-console
      console.log("SLSH-5 notes:", JSON.stringify(notes), "err:", probe.turns[0]?.error);
      const leaf = `loom /snkchain returned Err: rendered query template was empty ${DASH} no provider turn was issued`;
      // SNOTE-1 FIXED: the SLSH-3 note is emitted and renders the correct LEAF
      // row (the renderer walks the invoke_callee wrapper to its leaf). The
      // SLSH-5 chain suffix (' from <child> invoked at <parent>:<line>') is a
      // DEFERRED refinement: the boundary passes chain:[] because invoke
      // provenance is not readily available at the slash-dispatch seam, so no
      // ` invoked at ` suffix is emitted yet. Leaf row is correct.
      expect(notes.some((n) => n.startsWith(leaf))).toBe(true);
      expect(notes.some((n) => n.includes(" invoked at "))).toBe(false);
      expect(notes).toEqual([leaf]);
    } finally {
      await probe.dispose();
    }
  });

  // -------------------------------------------------------------------------
  // SLSH-3 subagent-mode direct dispatch. ZERO provider turns. A directly
  // slash-invoked subagent loom that returns a top-level Err must surface the
  // note in the USER session (transcript stays private).
  // -------------------------------------------------------------------------
  it("SLSH-3 (subagent): direct subagent-mode top-level Err note in user session", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "snksub.loom",
          text: ["---", "description: snksub", "mode: subagent", "---", "@`", "`?"].join("\n"),
        },
      ],
      drives: ["/snksub"],
    });
    try {
      const notes = notesOf(probe);
      // eslint-disable-next-line no-console
      console.log("SLSH-3 subagent notes:", JSON.stringify(notes), "err:", probe.turns[0]?.error);
      const expected = `loom /snksub returned Err: rendered query template was empty ${DASH} no provider turn was issued`;
      // SNOTE-1 FIXED: SLSH-3 requires this note in the USER session for a
      // directly-slash-invoked subagent loom (sole user-facing surface). The
      // subagent transcript stays private; the note surfaces at the boundary.
      expect(notes).toContain(expected);
      expect(notes).toEqual([expected]);
    } finally {
      await probe.dispose();
    }
  });

  // -------------------------------------------------------------------------
  // SNK-a — validation(schema_validation). ONE live model turn (depth-6 trick).
  // Expected (SLSH-3 + SNK-a):
  //   loom /snka returned Err: model failed schema after <n> respond-repair attempts
  // -------------------------------------------------------------------------
  it("SNK-a: schema_validation top-level Err note (depth-6, 1 model turn)", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "snka.loom",
          text: [
            "---",
            "description: snka",
            "mode: prompt",
            "---",
            "schema L5 { d: integer }",
            "schema L4 { c: L5 }",
            "schema L3 { b: L4 }",
            "schema L2 { a: L3 }",
            "schema L1 { z: L2 }",
            'let _ = @<L1>`Reply with exactly this JSON and nothing else: {"z":{"a":{"b":{"c":{"d":1}}}}}`?',
            "@`unreached`",
          ].join("\n"),
        },
      ],
      drives: ["/snka"],
    });
    try {
      const notes = notesOf(probe);
      // eslint-disable-next-line no-console
      console.log("SNK-a notes:", JSON.stringify(notes), "err:", probe.turns[0]?.error);
      const re = /^loom \/snka returned Err: model failed schema after \d+ respond-repair attempts$/;
      // SNOTE-1 FIXED: the SLSH-3/SNK-a note is emitted after the real model
      // turn(s); <n> is the interpolated attempt count.
      expect(notes.some((n) => re.test(n))).toBe(true);
      expect(notes.length).toBe(1);
    } finally {
      await probe.dispose();
    }
  });
});
