// Hardening lens: CROSS-MODE INVOKE value passing.
//
// Drives real `.theta` files through the shipped extension + live model. Every
// child theta makes ZERO model turns (literal tails / empty-template
// short-circuit); the only live turn per probe is the top prompt theta's final
// `@` query, observed deterministically via `userTexts` (computed before send).
//
// Findings encoded below (see session-findings/crossmode.md):
//   XMODE-1 (FIXED) — a callee that returns Err is now wrapped as
//     InvokeCalleeError{kind:"invoke_callee", callee_path, inner}. The parent's
//     Err arm sees kind "invoke_callee" and can read e.inner (the callee's
//     original QueryError). Fix: runInvokeEffect wraps a callee-returned Err via
//     surfaceThetaCallableCalleeFailure; only invoke_infra / cancelled pass
//     through unwrapped.
//   XMODE-2 (FIXED) — an interpolating backtick template `\`..${..}\`` used as a
//     value expression (match-arm body) or a `match` inside a `${...}`
//     interpolation is a non-`@` query template / template-level `match`, which
//     expressions.md §"Not supported" forbids; both now fail to load with
//     theta/parse/unsupported-feature (previously silently evaluated to null).
//
// Verified-conformant: object/array/enum final values survive the boundary;
// subagent->subagent and subagent->prompt value flow; typed-return-validation is
// catchable (INV-6 holds); untyped invoke returns null (INVCEIL-3 holds).
//
// Dedupe: INV-1..9, INVCEIL-1/2/3 are prior findings and are not re-reported.

import { describe, it, expect } from "vitest";
import { requireLiveProvider, runProbe } from "./probe-harness";
import type { ProbeResult } from "./probe-harness";

const provider = requireLiveProvider();

function transportish(s: string | undefined): boolean {
  if (s === undefined) return false;
  return /429|overloaded|transport|rate.?limit|ECONNRESET|timeout|503|529/i.test(s);
}

/** Drive one probe; retry once on a transport-ish failure. Returns joined userTexts of the last turn. */
async function drive(make: () => Promise<ProbeResult>): Promise<{ text: string; probe: ProbeResult }> {
  let probe = await make();
  let turn = probe.turns[probe.turns.length - 1];
  if (turn !== undefined && transportish(turn.error)) {
    await probe.dispose();
    probe = await make();
    turn = probe.turns[probe.turns.length - 1];
  }
  return { text: (turn?.userTexts ?? []).join("\n"), probe };
}

const P = (mode: string, body: string): string =>
  ["---", "description: x", `mode: ${mode}`, "---", body].join("\n");

// A subagent child that returns Err(ValidationError, empty_template) via `?`, zero tokens.
const ERRCHILD_SUB = P("subagent", ["let _ = @` `?", "1"].join("\n"));
const ERRCHILD_PROMPT = P("prompt", ["let _ = @` `?", "1"].join("\n"));

describe("cross-mode invoke value passing", () => {
  // XMODE-1 (FIXED): a callee Err now surfaces wrapped as InvokeCalleeError, so
  // the parent's Err arm sees kind "invoke_callee" (not the child's "validation").
  it("XMODE-1: callee Err is wrapped as invoke_callee", async () => {
    const files = [
      {
        source: "project" as const,
        path: "ek.theta",
        text: P(
          "prompt",
          [
            'let r = match invoke("./errchild.theta") {',
            '  Ok(_) => "NOERR",',
            "  Err(e) => match e.kind {",
            '    "invoke_callee" => "K-callee",',
            '    "validation" => "K-validation",',
            '    _ => "K-other"',
            "  }",
            "}",
            "@`K=${r}`",
          ].join("\n"),
        ),
      },
      { source: "project" as const, path: "errchild.theta", text: ERRCHILD_SUB },
    ];
    const { text, probe } = await drive(() => runProbe({ provider, files, drives: ["/ek"] }));
    try {
      // Post-fix: the Err arm runs and e.kind is "invoke_callee" (the wrapper),
      // not the child's raw "validation". Spec: InvokeCalleeError{kind:"invoke_callee"}.
      expect(text).toContain("K=K-callee");
      expect(text).not.toContain("K=K-validation");
    } finally {
      await probe.dispose();
    }
  });

  // XMODE-1 corollary (FIXED): the InvokeCalleeError wrapper carries e.inner (the
  // callee's original QueryError), so e.inner.kind reads "validation" and the
  // parent renders its query instead of aborting.
  it("XMODE-1: e.inner on a callee Err reads the child's QueryError", async () => {
    const files = [
      {
        source: "project" as const,
        path: "ei.theta",
        text: P(
          "prompt",
          [
            'let r = match invoke("./errchild.theta") {',
            '  Ok(_) => "NOERR",',
            '  Err(e) => match e.inner.kind { "validation" => "INNER", _ => "OTHER" }',
            "}",
            "@`I=${r}`",
          ].join("\n"),
        ),
      },
      { source: "project" as const, path: "errchild.theta", text: ERRCHILD_SUB },
    ];
    const { text, probe } = await drive(() => runProbe({ provider, files, drives: ["/ei"] }));
    try {
      // Post-fix: e.inner exists (the wrapped child error); e.inner.kind is
      // "validation", so the parent renders I=INNER rather than aborting.
      expect(text).toContain("I=INNER");
    } finally {
      await probe.dispose();
    }
  });

  // XMODE-1 (FIXED): the same wrapping holds for a prompt-mode callee.
  it("XMODE-1: prompt-mode callee Err is wrapped as invoke_callee", async () => {
    const files = [
      {
        source: "project" as const,
        path: "ekp.theta",
        text: P(
          "prompt",
          [
            'let r = match invoke("./errpr.theta") {',
            '  Ok(_) => "NOERR",',
            "  Err(e) => match e.kind {",
            '    "invoke_callee" => "K-callee",',
            '    "validation" => "K-validation",',
            '    _ => "K-other"',
            "  }",
            "}",
            "@`KP=${r}`",
          ].join("\n"),
        ),
      },
      { source: "project" as const, path: "errpr.theta", text: ERRCHILD_PROMPT },
    ];
    const { text, probe } = await drive(() => runProbe({ provider, files, drives: ["/ekp"] }));
    try {
      expect(text).toContain("KP=K-callee");
    } finally {
      await probe.dispose();
    }
  });

  // Conformant: object + array final value survives the subagent boundary intact.
  it("conformant: object/array final value survives + interpolates", async () => {
    const files = [
      {
        source: "project" as const,
        path: "pobj.theta",
        text: P(
          "prompt",
          [
            "schema Thing { name: string, count: number, tags: array<string> }",
            'let v: Thing = invoke<Thing>("./objchild.theta")?',
            "@`OBJ=${v.name}|${v.count}|${v.tags[0]}`",
          ].join("\n"),
        ),
      },
      {
        source: "project" as const,
        path: "objchild.theta",
        text: P(
          "subagent",
          [
            "schema Thing { name: string, count: number, tags: array<string> }",
            'Thing { name: "widget", count: 7, tags: ["alpha", "beta"] }',
          ].join("\n"),
        ),
      },
    ];
    const { text, probe } = await drive(() => runProbe({ provider, files, drives: ["/pobj"] }));
    try {
      expect(text).toContain("OBJ=widget|7|alpha");
    } finally {
      await probe.dispose();
    }
  });

  // Conformant: enum final value survives; interpolates as the bare wire value.
  it("conformant: enum final value survives boundary", async () => {
    const files = [
      {
        source: "project" as const,
        path: "penum.theta",
        text: P(
          "prompt",
          [
            "enum Status { Active, Done }",
            "schema Wrap { status: Status }",
            'let v: Wrap = invoke<Wrap>("./enumchild.theta")?',
            "@`ENUM=${v.status}`",
          ].join("\n"),
        ),
      },
      {
        source: "project" as const,
        path: "enumchild.theta",
        text: P(
          "subagent",
          [
            "enum Status { Active, Done }",
            "schema Wrap { status: Status }",
            "Wrap { status: Status.Done }",
          ].join("\n"),
        ),
      },
    ];
    const { text, probe } = await drive(() => runProbe({ provider, files, drives: ["/penum"] }));
    try {
      expect(text).toContain("ENUM=Done");
    } finally {
      await probe.dispose();
    }
  });

  // Conformant: subagent->subagent value flow. top(prompt)->mid(sub)->leaf(sub).
  it("conformant: subagent->subagent value flows to top", async () => {
    const files = [
      {
        source: "project" as const,
        path: "topss.theta",
        text: P("prompt", ['let v: number = invoke<number>("./midss.theta")?', "@`SS=${v}`"].join("\n")),
      },
      {
        source: "project" as const,
        path: "midss.theta",
        text: P("subagent", ['let w: number = invoke<number>("./leafsub.theta")?', "w + 100"].join("\n")),
      },
      { source: "project" as const, path: "leafsub.theta", text: P("subagent", "5") },
    ];
    const { text, probe } = await drive(() => runProbe({ provider, files, drives: ["/topss"] }));
    try {
      expect(text).toContain("SS=105");
    } finally {
      await probe.dispose();
    }
  });

  // Conformant: subagent->prompt value flow. top(prompt)->mid(sub)->leaf(prompt).
  it("conformant: subagent->prompt value flows to top", async () => {
    const files = [
      {
        source: "project" as const,
        path: "topsp.theta",
        text: P("prompt", ['let v: number = invoke<number>("./midsp.theta")?', "@`SP=${v}`"].join("\n")),
      },
      {
        source: "project" as const,
        path: "midsp.theta",
        text: P("subagent", ['let w: number = invoke<number>("./leafprompt.theta")?', "w + 100"].join("\n")),
      },
      { source: "project" as const, path: "leafprompt.theta", text: P("prompt", "7") },
    ];
    const { text, probe } = await drive(() => runProbe({ provider, files, drives: ["/topsp"] }));
    try {
      expect(text).toContain("SP=107");
    } finally {
      await probe.dispose();
    }
  });

  // Conformant (INV-6 holds): typed invoke<number> of a string child surfaces as a
  // catchable Err(InvokeInfraError{cause:"return_validation"}).
  it("conformant: typed-return violation is catchable return_validation", async () => {
    const files = [
      {
        source: "project" as const,
        path: "vtyped.theta",
        text: P(
          "prompt",
          [
            'let r = match invoke<number>("./strchild.theta") {',
            '  Ok(_) => "FLOWED",',
            '  Err(e) => match e.kind {',
            '    "invoke_infra" => match e.cause { "return_validation" => "RETVAL", _ => "INFRA-OTHER" },',
            '    _ => "OTHERKIND"',
            "  }",
            "}",
            "@`Y=${r}`",
          ].join("\n"),
        ),
      },
      { source: "project" as const, path: "strchild.theta", text: P("subagent", '"a-string"') },
    ];
    const { text, probe } = await drive(() => runProbe({ provider, files, drives: ["/vtyped"] }));
    try {
      expect(text).toContain("Y=RETVAL");
    } finally {
      await probe.dispose();
    }
  });

  // Conformant (INVCEIL-3 holds): untyped invoke returns null.
  it("conformant: untyped invoke returns null", async () => {
    const files = [
      {
        source: "project" as const,
        path: "vuntyped.theta",
        text: P("prompt", ['let r = invoke("./numchild.theta")?', "@`U=${r}`"].join("\n")),
      },
      { source: "project" as const, path: "numchild.theta", text: P("subagent", "42") },
    ];
    const { text, probe } = await drive(() => runProbe({ provider, files, drives: ["/vuntyped"] }));
    try {
      expect(text).toContain("U=null");
    } finally {
      await probe.dispose();
    }
  });

  // XMODE-2 (FIXED): an interpolating backtick template used as a match-arm
  // value is a non-`@` query template in value position, which expressions.md
  // §"Not supported" forbids (query templates are `@`-prefixed and admitted only
  // at statement / `let`-RHS level). The theta now fails to load with
  // theta/parse/unsupported-feature and un-registers. Registration-only probe
  // (no drives) — zero tokens, since a rejected theta never reaches a model turn.
  it("XMODE-2: interpolating-template match-arm un-registers with unsupported-feature", async () => {
    const files = [
      {
        source: "project" as const,
        path: "tmatch.theta",
        text: P(
          "prompt",
          [
            "let r = match Ok(9) {",
            "  Ok(n) => `V${n}`,",
            '  Err(_) => "E"',
            "}",
            'let s = r + "!"',
            "@`C=${s}`",
          ].join("\n"),
        ),
      },
    ];
    const probe = await runProbe({ provider, files, drives: [] });
    try {
      expect(probe.registeredNames).not.toContain("tmatch");
      expect(
        probe.systemNotes.some((n) => n.includes("unsupported syntactic feature")),
      ).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  // XMODE-2 (FIXED): `match` inside a `${...}` interpolation is forbidden by
  // expressions.md §"Not supported" (a `match` / `@`-query is admitted only at
  // statement / `let`-RHS level so template evaluation stays code-only). The
  // theta now fails to load with theta/parse/unsupported-feature and un-registers.
  it("XMODE-2: match inside interpolation un-registers with unsupported-feature", async () => {
    const files = [
      {
        source: "project" as const,
        path: "mdirect.theta",
        text: P("prompt", ["@`D=${match Ok(9) { Ok(n) => n, Err(_) => 0 }}`"].join("\n")),
      },
    ];
    const probe = await runProbe({ provider, files, drives: [] });
    try {
      expect(probe.registeredNames).not.toContain("mdirect");
      expect(
        probe.systemNotes.some((n) => n.includes("unsupported syntactic feature")),
      ).toBe(true);
    } finally {
      await probe.dispose();
    }
  });
});
