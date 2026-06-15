import { describe, it, expect } from "vitest";
// Deltakerens innsending skrives til submission.(ts|js) i sandbox-mappa.
import { greet, fullName, shout } from "./submission";

describe("helloVariables", () => {
  it("greet hilser på navnet", () => {
    expect(greet("Ada")).toBe("Hei, Ada!");
  });

  it("greet bruker navnet som sendes inn", () => {
    expect(greet("Linus")).toBe("Hei, Linus!");
  });

  it("fullName setter sammen fornavn og etternavn", () => {
    expect(fullName("Ada", "Lovelace")).toBe("Ada Lovelace");
  });

  it("shout roper teksten i store bokstaver", () => {
    expect(shout("hei")).toBe("HEI!");
  });
});
