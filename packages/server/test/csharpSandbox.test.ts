import { describe, it, expect, afterEach } from "vitest";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createCsharpSandbox,
  type CsharpSandbox,
} from "../src/runner/csharpSandbox.js";
import type { Assignment } from "../src/registry.js";

const assignmentsDir = path.resolve(
  fileURLToPath(new URL("../../../assignments", import.meta.url)),
);
const projectRoot = path.resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
);

const assignment: Assignment = {
  id: "csharpArrays",
  language: "cs",
  entry: "Submission",
  testFile: "Tests.cs",
  dir: path.join(assignmentsDir, "csharpArrays"),
  testFilePath: path.join(assignmentsDir, "csharpArrays", "Tests.cs"),
};

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

describe("createCsharpSandbox", () => {
  let sb: CsharpSandbox | undefined;

  afterEach(async () => {
    await sb?.cleanup();
    sb = undefined;
  });

  it("legger ut prosjekt, harness, submission og kopiert testfil", async () => {
    sb = await createCsharpSandbox(
      {
        assignment,
        language: "cs",
        content: "public static class Solution { }",
      },
      projectRoot,
    );

    expect(await exists(path.join(sb.dir, "project.csproj"))).toBe(true);
    expect(await exists(path.join(sb.dir, "Harness.cs"))).toBe(true);
    expect(await exists(path.join(sb.dir, "Tests.cs"))).toBe(true);

    const submission = await readFile(
      path.join(sb.dir, "Submission.cs"),
      "utf8",
    );
    expect(submission).toContain("class Solution");
  });

  it("cleanup fjerner sandbox-mappa", async () => {
    sb = await createCsharpSandbox(
      { assignment, language: "cs", content: "x" },
      projectRoot,
    );
    const dir = sb.dir;
    await sb.cleanup();
    sb = undefined;
    expect(await exists(dir)).toBe(false);
  });
});
