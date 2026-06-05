import { describe, it, expect } from "vitest";
// Deltakerens innsending skrives til submission.(ts|js) i sandbox-mappa.
import { doubleAll, sumArray, filterEven } from "./submission";

describe("arraysAndArrayMethods", () => {
  it("doubleAll dobler hvert tall", () => {
    expect(doubleAll([1, 2, 3])).toEqual([2, 4, 6]);
  });

  it("doubleAll håndterer tom liste", () => {
    expect(doubleAll([])).toEqual([]);
  });

  it("sumArray summerer alle tall", () => {
    expect(sumArray([1, 2, 3, 4])).toBe(10);
  });

  it("filterEven beholder kun partall", () => {
    expect(filterEven([1, 2, 3, 4, 5, 6])).toEqual([2, 4, 6]);
  });
});
