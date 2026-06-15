import { describe, it, expect } from "vitest";
// Deltakerens innsending skrives til submission.(ts|js) i sandbox-mappa.
import { add, isEven, rectangleArea, average } from "./submission";

describe("numbersAndMath", () => {
  it("add legger sammen to tall", () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-4, 4)).toBe(0);
  });

  it("isEven kjenner igjen partall", () => {
    expect(isEven(4)).toBe(true);
    expect(isEven(7)).toBe(false);
    expect(isEven(0)).toBe(true);
  });

  it("rectangleArea regner ut arealet", () => {
    expect(rectangleArea(3, 4)).toBe(12);
  });

  it("average regner gjennomsnittet av tre tall", () => {
    expect(average(2, 4, 6)).toBe(4);
  });
});
