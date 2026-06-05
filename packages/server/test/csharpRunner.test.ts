import { describe, it, expect } from "vitest";
import { __test } from "../src/runner/CSharpRunner.js";

const { toTestResult } = __test;

describe("CSharpRunner.toTestResult", () => {
  it("mapper pass-resultat", () => {
    expect(
      toTestResult({ kind: "result", name: "A", status: "pass", durationMs: 1.5 }),
    ).toEqual({ name: "A", status: "pass", durationMs: 1.5 });
  });

  it("mapper assertion-feil med expected/actual", () => {
    expect(
      toTestResult({
        kind: "result",
        name: "B",
        status: "fail",
        failKind: "assertion",
        message: "Assert.Equal() Failure",
        expected: "6",
        actual: "5",
        durationMs: 2,
      }),
    ).toEqual({
      name: "B",
      status: "fail",
      kind: "assertion",
      message: "Assert.Equal() Failure",
      expected: "6",
      actual: "5",
      durationMs: 2,
    });
  });

  it("mapper kastet feil (error) uten diff", () => {
    expect(
      toTestResult({
        kind: "result",
        name: "C",
        status: "fail",
        failKind: "error",
        message: "NullReferenceException: boom",
        durationMs: 3,
      }),
    ).toEqual({
      name: "C",
      status: "fail",
      kind: "error",
      message: "NullReferenceException: boom",
      durationMs: 3,
    });
  });
});
