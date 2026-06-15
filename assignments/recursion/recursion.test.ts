import { describe, it, expect } from "vitest";
// Deltakerens innsending skrives til submission.(ts|js) i sandbox-mappa.
import { sumTo, fib, reverseString, flatten } from "./submission";

describe("recursion", () => {
  it("sumTo summerer 1 til og med n", () => {
    expect(sumTo(1)).toBe(1);
    expect(sumTo(5)).toBe(15);
    expect(sumTo(0)).toBe(0);
  });

  it("fib gir riktig fibonacci-tall", () => {
    expect(fib(0)).toBe(0);
    expect(fib(1)).toBe(1);
    expect(fib(7)).toBe(13);
  });

  it("reverseString snur teksten", () => {
    expect(reverseString("hei")).toBe("ieh");
    expect(reverseString("")).toBe("");
  });

  it("flatten flater ut nøstede lister", () => {
    expect(flatten([1, [2, [3, [4]], 5]])).toEqual([1, 2, 3, 4, 5]);
    expect(flatten([])).toEqual([]);
  });
});
