import { describe, expect, it } from "vitest";
import {
  evaluateSource,
  type EvalHost,
} from "../src/runtime/expression-evaluator";
import type { ThetaValue } from "../src/runtime/value";

// e2e S1 — runtime value-behaviour coverage gap-fill (EXPR area, conformance).
//
// Drives the shipped expression interpreter (`evaluateSource`) to cover
// runtime behaviours the existing suite leaves UNCOVERED per the coverage map:
//   - REQ-EXPR-47 string operands order lexicographically by UTF-16 code unit (:206)
//   - REQ-EXPR-45 integer arithmetic exceeding 2^53-1 loses precision, no panic (:204)
// Spec: docs/spec_topics/expressions.md §Ordering / §Other arithmetic. M2.

/** A host that fails loudly on any identifier / call (pure-arithmetic tests). */
const pureHost: EvalHost = {
  resolveIdentifier(name: string): ThetaValue {
    throw new Error(`unexpected identifier read '${name}'`);
  },
  callFunction(name: string): ThetaValue {
    throw new Error(`unexpected call '${name}'`);
  },
};

const evalv = (src: string): ThetaValue => evaluateSource(src, pureHost);

describe("REQ-EXPR-47 — string ordering is lexicographic by UTF-16 code unit", () => {
  it('"a" < "b" is true', () => {
    expect(evalv('"a" < "b"')).toBe(true);
  });
  it('"b" < "a" is false', () => {
    expect(evalv('"b" < "a"')).toBe(false);
  });
  it('uppercase orders before lowercase ("Z" < "a") by code unit', () => {
    // 'Z' = U+005A, 'a' = U+0061 — code-unit order, not locale/case-fold.
    expect(evalv('"Z" < "a"')).toBe(true);
  });
  it('prefix orders before the longer string ("ab" < "abc")', () => {
    expect(evalv('"ab" < "abc"')).toBe(true);
  });
  it('">=" and "<=" agree with the code-unit ordering', () => {
    expect(evalv('"abc" >= "abc"')).toBe(true);
    expect(evalv('"a" <= "b"')).toBe(true);
  });
});

describe("REQ-EXPR-45 — integer arithmetic beyond 2^53-1 loses precision without panic", () => {
  it("2^53-1 + 2 folds in IEEE-754 double and does not panic", () => {
    // 9007199254740991 (=2^53-1) is an admissible integer literal; +2 overflows
    // the safe-integer range and rounds to the nearest double.
    const v = evalv("9007199254740991 + 2");
    expect(typeof v).toBe("number");
    // 9007199254740991 + 2 = 9007199254740993 rounds to 9007199254740992.
    expect(v).toBe(9007199254740992);
  });

  it("a large integer product folds without panic", () => {
    const v = evalv("9007199254740991 * 2");
    expect(typeof v).toBe("number");
    expect(v).toBe(18014398509481982);
  });
});

describe("REQ-EXPR-42 / REQ-EXPR-44 — unary minus and modulo value behaviour", () => {
  it("unary minus negates a numeric operand", () => {
    expect(evalv("-5")).toBe(-5);
    expect(evalv("-(2 + 3)")).toBe(-5);
  });
  it("modulo by zero yields NaN and does not panic", () => {
    const v = evalv("5 % 0");
    expect(typeof v).toBe("number");
    expect(Number.isNaN(v as number)).toBe(true);
  });
});
