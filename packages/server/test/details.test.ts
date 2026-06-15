import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AssignmentRegistry } from "../src/registry.js";
import { __test } from "../src/connection.js";

const assignmentsDir = path.resolve(
  fileURLToPath(new URL("../../../assignments", import.meta.url)),
);

function fakeWs() {
  const sent: any[] = [];
  return { sent, send: (d: string) => sent.push(JSON.parse(d)) };
}

describe("connection: handleDetails", () => {
  let registry: AssignmentRegistry;
  beforeAll(async () => {
    registry = await AssignmentRegistry.load(assignmentsDir);
  });

  it("svarer med assignment-details for en kjent id", () => {
    const ws = fakeWs();
    __test.handleDetails(ws as any, { registry, runners: [] }, {
      type: "assignment-details-request",
      name: "arraysAndArrayMethods",
    });
    expect(ws.sent[0]).toMatchObject({
      type: "assignment-details",
      id: "arraysAndArrayMethods",
      language: "ts",
      details: expect.stringMatching(/submission/),
    });
  });

  it("avviser en ukjent id", () => {
    const ws = fakeWs();
    __test.handleDetails(ws as any, { registry, runners: [] }, {
      type: "assignment-details-request",
      name: "ukjentOppgave",
    });
    expect(ws.sent[0]).toMatchObject({
      type: "rejected",
      reason: expect.stringMatching(/ukjentOppgave/),
    });
  });

  it("slår opp på eksakt id, ikke filnavn-utledning", () => {
    const ws = fakeWs();
    __test.handleDetails(ws as any, { registry, runners: [] }, {
      type: "assignment-details-request",
      name: "arraysAndArrayMethods.ts",
    });
    expect(ws.sent[0]).toMatchObject({ type: "rejected" });
  });
});
