import { describe, it, expect } from "vitest";
// Deltakerens innsending skrives til submission.(ts|js) i sandbox-mappa.
import { factorial, countVowels, fizzbuzz } from "./submission";

describe("loops", () => {
  it("factorial regner ut fakultet", () => {
    expect(factorial(0)).toBe(1);
    expect(factorial(1)).toBe(1);
    expect(factorial(5)).toBe(120);
  });

  it("countVowels teller vokaler", () => {
    expect(countVowels("hei")).toBe(2);
    expect(countVowels("rytme")).toBe(2);
    expect(countVowels("BANAN")).toBe(2);
    expect(countVowels("xyz")).toBe(1);
  });

  it("fizzbuzz bygger lista fra 1 til n", () => {
    expect(fizzbuzz(5)).toEqual(["1", "2", "Fizz", "4", "Buzz"]);
  });

  it("fizzbuzz bruker FizzBuzz på tall delelig med 15", () => {
    expect(fizzbuzz(15)[14]).toBe("FizzBuzz");
  });
});
