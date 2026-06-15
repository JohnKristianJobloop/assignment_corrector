import { describe, it, expect } from "vitest";
// Deltakerens innsending skrives til submission.(ts|js) i sandbox-mappa.
import { applyTwice, makeAdder, total, longestWord } from "./submission";

describe("higherOrderFunctions", () => {
  it("applyTwice bruker funksjonen to ganger", () => {
    expect(applyTwice((x: number) => x + 1, 0)).toBe(2);
    expect(applyTwice((x: number) => x * 2, 3)).toBe(12);
  });

  it("makeAdder lager en funksjon som legger til n", () => {
    const add5 = makeAdder(5);
    expect(add5(10)).toBe(15);
    expect(makeAdder(-2)(2)).toBe(0);
  });

  it("total summerer en liste med reduce", () => {
    expect(total([1, 2, 3, 4])).toBe(10);
    expect(total([])).toBe(0);
  });

  it("longestWord finner det lengste ordet", () => {
    expect(longestWord(["en", "tre", "fire"])).toBe("fire");
    expect(longestWord(["kort", "aller", "lengst"])).toBe("lengst");
  });

  it("longestWord velger det første ved lik lengde", () => {
    expect(longestWord(["abc", "xyz"])).toBe("abc");
  });
});
