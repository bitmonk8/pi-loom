import { describe, expect, it } from "vitest";
import { requireLiveProvider, runProbe } from "./probe-harness";

// Area: QUERIES / RESULT-ERROR MODEL — empty-template short-circuit (QRY-6).
//
// Harness note: only the FIRST provider turn a theta issues is observable via
// `userTexts` (verified against controls). Probes are therefore shaped so the
// assertion target is the first turn issued.
//
// Findings demonstrated here: QRY-1 (findings/queries-schemas.md).

describe("query — empty-template short-circuit", () => {
  const provider = requireLiveProvider();

  it("QRY-1 control: a bound Err is catchable via match and execution continues", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "errctl.theta",
          text: [
            "---",
            "description: errctl",
            "mode: prompt",
            "---",
            'let r = Err("boom")',
            'let tag = match r { Ok(_) => "ok", Err(_) => "err" }',
            "@`FIRST tag=${tag}`",
          ].join("\n"),
        },
      ],
      drives: ["/errctl"],
    });
    try {
      // Binding an Err, matching Err(_), and issuing the downstream query all
      // work: the downstream `@`...`` is the first (and only) provider turn.
      expect(probe.turns[0]?.userTexts).toEqual(["FIRST tag=err"]);
    } finally {
      await probe.dispose();
    }
  });

  it("QRY-1 FIXED: empty-template short-circuit yields a catchable Err and the theta continues", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "emptytmpl.theta",
          text: [
            "---",
            "description: emptytmpl",
            "mode: prompt",
            "---",
            // Rendered body is a single newline -> "" (QRY-7 vector 6): the
            // runtime MUST short-circuit to Err(cause:"empty_template") WITHOUT
            // a provider round-trip (QRY-6). It is a Result value, not a throw
            // (QRY-8).
            "let r = @`",
            "`",
            // Structurally identical to the errctl control above.
            'let tag = match r { Ok(_) => "ok", Err(_) => "err" }',
            "@`FIRST tag=${tag}`",
          ].join("\n"),
        },
      ],
      drives: ["/emptytmpl"],
    });
    try {
      // FIXED per QRY-6/QRY-8: the empty-template short-circuit is the query's
      // RESULT VALUE `Err(empty_template)`, so `r` binds to that Err, `match`
      // sees `Err(_)` → tag = "err", and the downstream query issues
      // "FIRST tag=err" (== the errctl control). The theta never aborts and the
      // query never throws.
      expect(probe.turns[0]?.userTexts).toEqual(["FIRST tag=err"]);
      expect(probe.turns[0]?.error).toBeUndefined();
    } finally {
      await probe.dispose();
    }
  });

  it("QRY-6 conformance: a U+00A0-only render does NOT short-circuit (issues a turn)", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "nbsp.theta",
          text: [
            "---",
            "description: nbsp",
            "mode: prompt",
            "---",
            // Non-ASCII whitespace (U+00A0) is ordinary content: must issue a
            // provider turn rather than short-circuit (QRY-6 explicit rule).
            "@`\u00A0`",
          ].join("\n"),
        },
      ],
      drives: ["/nbsp"],
    });
    try {
      // Conformant: a provider turn IS issued (its body is the nbsp char).
      expect(probe.turns[0]?.userTexts.length).toBe(1);
    } finally {
      await probe.dispose();
    }
  });
});
