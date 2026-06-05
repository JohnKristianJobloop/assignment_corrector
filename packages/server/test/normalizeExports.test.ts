import { describe, it, expect } from "vitest";
import { ensureExportedFunctions } from "../src/normalizeExports.js";

describe("ensureExportedFunctions", () => {
  it("setter export foran en naken funksjonsdeklarasjon", () => {
    expect(ensureExportedFunctions("function foo(){ return 1; }")).toBe(
      "export function foo(){ return 1; }",
    );
  });

  it("setter export foran async function", () => {
    expect(ensureExportedFunctions("async function foo(){}")).toBe(
      "export async function foo(){}",
    );
  });

  it("lar allerede eksporterte deklarasjoner være urørt", () => {
    const src = [
      "export function a(){}",
      "export async function b(){}",
      "export default function c(){}",
    ].join("\n");
    expect(ensureExportedFunctions(src)).toBe(src);
  });

  it("rører ikke nøstede (innrykkede) funksjoner", () => {
    const src = "export function outer(){\n  function inner(){}\n}";
    expect(ensureExportedFunctions(src)).toBe(src);
  });

  it("ignorerer function-token midt i en identifikator", () => {
    const src = "const functionLike = 1;";
    expect(ensureExportedFunctions(src)).toBe(src);
  });

  it("normaliserer flere top-level deklarasjoner i samme fil", () => {
    const src = [
      "function doubleAll(numArr){ return numArr.map(n => n * 2); }",
      "function sumArray(numArr){ return numArr.reduce((a, c) => a + c, 0); }",
    ].join("\n");
    expect(ensureExportedFunctions(src)).toBe(
      [
        "export function doubleAll(numArr){ return numArr.map(n => n * 2); }",
        "export function sumArray(numArr){ return numArr.reduce((a, c) => a + c, 0); }",
      ].join("\n"),
    );
  });
});
