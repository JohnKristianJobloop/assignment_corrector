import { describe, it, expect } from "vitest";
// Deltakerens innsending skrives til submission.(ts|js) i sandbox-mappa.
import { makePerson, isAdult, birthday } from "./submission";

describe("objectsAndRecords", () => {
  it("makePerson lager et objekt med navn og alder", () => {
    expect(makePerson("Ada", 28)).toEqual({ navn: "Ada", alder: 28 });
  });

  it("isAdult er true for 18 og oppover", () => {
    expect(isAdult({ navn: "Ada", alder: 28 })).toBe(true);
    expect(isAdult({ navn: "Liv", alder: 18 })).toBe(true);
    expect(isAdult({ navn: "Noa", alder: 17 })).toBe(false);
  });

  it("birthday øker alderen med 1", () => {
    expect(birthday({ navn: "Ada", alder: 28 })).toEqual({ navn: "Ada", alder: 29 });
  });

  it("birthday endrer ikke det opprinnelige objektet", () => {
    const person = { navn: "Ada", alder: 28 };
    birthday(person);
    expect(person.alder).toBe(28);
  });
});
