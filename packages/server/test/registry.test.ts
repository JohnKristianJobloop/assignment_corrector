import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AssignmentRegistry } from "../src/registry.js";

const assignmentsDir = path.resolve(
  fileURLToPath(new URL("../../../assignments", import.meta.url)),
);

describe("AssignmentRegistry", () => {
  it("laster kjente oppgaver fra assignments-mappa", async () => {
    const registry = await AssignmentRegistry.load(assignmentsDir);
    expect(registry.ids()).toContain("arraysAndArrayMethods");
  });

  it("resolve() utleder oppgave-id fra filnavn med extension", async () => {
    const registry = await AssignmentRegistry.load(assignmentsDir);
    const found = registry.resolve("arraysAndArrayMethods.ts");
    expect(found?.id).toBe("arraysAndArrayMethods");
  });

  it("resolve() returnerer undefined for ukjent oppgave", async () => {
    const registry = await AssignmentRegistry.load(assignmentsDir);
    expect(registry.resolve("ukjentOppgave.ts")).toBeUndefined();
  });
});
