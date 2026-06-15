import { describe, it, expect } from "vitest";
// Deltakerens innsending skrives til submission.(ts|js) i sandbox-mappa.
import {
  binarySearch,
  searchRotated,
  lengthOfLongestSubstring,
} from "./submission";

describe("intervju: søk og glidende vindu", () => {
  it("binarySearch finner indeksen i sortert liste", () => {
    expect(binarySearch([1, 3, 5, 7, 9], 5)).toBe(2);
    expect(binarySearch([1, 3, 5, 7, 9], 1)).toBe(0);
    expect(binarySearch([1, 3, 5, 7, 9], 9)).toBe(4);
    expect(binarySearch([1, 3, 5, 7, 9], 4)).toBe(-1);
    expect(binarySearch([], 1)).toBe(-1);
  });

  it("searchRotated finner indeksen i rotert liste", () => {
    expect(searchRotated([4, 5, 6, 7, 0, 1, 2], 0)).toBe(4);
    expect(searchRotated([4, 5, 6, 7, 0, 1, 2], 4)).toBe(0);
    expect(searchRotated([4, 5, 6, 7, 0, 1, 2], 3)).toBe(-1);
    expect(searchRotated([1], 1)).toBe(0);
  });

  it("lengthOfLongestSubstring måler lengste unike vindu", () => {
    expect(lengthOfLongestSubstring("abcabcbb")).toBe(3);
    expect(lengthOfLongestSubstring("bbbbb")).toBe(1);
    expect(lengthOfLongestSubstring("pwwkew")).toBe(3);
    expect(lengthOfLongestSubstring("")).toBe(0);
  });
});
