import { describe, expect, it } from "vitest";
import { twoSum } from "./submission";

describe("twoSum", () => {
  it("returns indices for the classic example", () => {
    expect(twoSum([2, 7, 11, 15], 9)).toEqual([0, 1]);
  });

  it("handles values in the middle of the array", () => {
    expect(twoSum([3, 2, 4], 6)).toEqual([1, 2]);
  });

  it("handles duplicate numbers", () => {
    expect(twoSum([3, 3], 6)).toEqual([0, 1]);
  });

  it("handles negative numbers", () => {
    expect(twoSum([-1, -2, -3, -4, -5], -8)).toEqual([2, 4]);
  });
});
