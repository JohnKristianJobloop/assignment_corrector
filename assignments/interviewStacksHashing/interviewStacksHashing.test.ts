import { describe, it, expect } from "vitest";
// Deltakerens innsending skrives til submission.(ts|js) i sandbox-mappa.
import { isBalanced, twoSum, groupAnagrams } from "./submission";

describe("intervju: stack og hashing", () => {
  it("isBalanced kjenner igjen balanserte parenteser", () => {
    expect(isBalanced("(a[b]{c})")).toBe(true);
    expect(isBalanced("")).toBe(true);
    expect(isBalanced("{[]}")).toBe(true);
    expect(isBalanced("([)]")).toBe(false);
    expect(isBalanced("(]")).toBe(false);
    expect(isBalanced("(((")).toBe(false);
  });

  it("twoSum finner indeksene som summerer til target", () => {
    expect(twoSum([2, 7, 11, 15], 9)).toEqual([0, 1]);
    expect(twoSum([3, 2, 4], 6)).toEqual([1, 2]);
    expect(twoSum([1, 2, 3], 7)).toEqual([-1, -1]);
  });

  it("groupAnagrams grupperer anagram i rekkefølge", () => {
    expect(groupAnagrams(["eat", "tea", "tan", "ate"])).toEqual([
      ["eat", "tea", "ate"],
      ["tan"],
    ]);
    expect(groupAnagrams([])).toEqual([]);
    expect(groupAnagrams(["abc"])).toEqual([["abc"]]);
  });
});
