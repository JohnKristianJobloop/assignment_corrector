import { describe, it, expect } from "vitest";
// Deltakerens innsending skrives til submission.(ts|js) i sandbox-mappa.
import { mergeIntervals, LRUCache } from "./submission";

describe("intervju: komposisjon og design", () => {
  it("mergeIntervals slår sammen overlappende intervaller", () => {
    expect(
      mergeIntervals([
        [1, 3],
        [2, 6],
        [8, 10],
        [15, 18],
      ]),
    ).toEqual([
      [1, 6],
      [8, 10],
      [15, 18],
    ]);
    expect(
      mergeIntervals([
        [1, 4],
        [4, 5],
      ]),
    ).toEqual([[1, 5]]);
    expect(
      mergeIntervals([
        [5, 6],
        [1, 2],
      ]),
    ).toEqual([
      [1, 2],
      [5, 6],
    ]);
    expect(mergeIntervals([])).toEqual([]);
  });

  it("LRUCache kaster ut minst nylig brukte element", () => {
    const cache = new LRUCache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    expect(cache.get(1)).toBe(1);
    cache.put(3, 3); // kaster ut nøkkel 2
    expect(cache.get(2)).toBe(-1);
    cache.put(4, 4); // kaster ut nøkkel 1
    expect(cache.get(1)).toBe(-1);
    expect(cache.get(3)).toBe(3);
    expect(cache.get(4)).toBe(4);
  });

  it("LRUCache oppdaterer verdi og teller bruk", () => {
    const cache = new LRUCache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    cache.put(1, 10); // oppdaterer verdi og gjør nøkkel 1 nyest
    cache.put(3, 3); // kaster ut nøkkel 2
    expect(cache.get(1)).toBe(10);
    expect(cache.get(2)).toBe(-1);
    expect(cache.get(3)).toBe(3);
  });
});
