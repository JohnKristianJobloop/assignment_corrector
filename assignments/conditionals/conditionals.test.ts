import { describe, it, expect } from "vitest";
// Deltakerens innsending skrives til submission.(ts|js) i sandbox-mappa.
import { grade, largest, sign } from "./submission";

describe("conditionals", () => {
  it("grade gir riktig bokstavkarakter", () => {
    expect(grade(95)).toBe("A");
    expect(grade(82)).toBe("B");
    expect(grade(71)).toBe("C");
    expect(grade(64)).toBe("D");
    expect(grade(40)).toBe("F");
  });

  it("grade håndterer grenseverdiene", () => {
    expect(grade(90)).toBe("A");
    expect(grade(60)).toBe("D");
    expect(grade(59)).toBe("F");
  });

  it("largest finner det største av tre tall", () => {
    expect(largest(3, 7, 5)).toBe(7);
    expect(largest(9, 1, 4)).toBe(9);
    expect(largest(2, 2, 8)).toBe(8);
  });

  it("sign beskriver fortegnet", () => {
    expect(sign(5)).toBe("positiv");
    expect(sign(-3)).toBe("negativ");
    expect(sign(0)).toBe("null");
  });
});
