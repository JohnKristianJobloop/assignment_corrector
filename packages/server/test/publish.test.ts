import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Report, TestResult } from "@oppgaveretter/protocol";
import { AssignmentRegistry } from "../src/registry.js";
import type { Runner, RunInput } from "../src/runner/Runner.js";
import { extractBundle, BundleError } from "../src/publish/bundleSandbox.js";
import { publishAssignment } from "../src/publish/publishAssignment.js";
import { RejectedError } from "../src/publish/errors.js";
import { __test } from "../src/connection.js";

const PROJECT_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../..",
);

/** Stub-runner: hopper over ekte test-kjøring, returnerer en fast rapport. */
class StubRunner implements Runner {
  lastInput?: RunInput;
  constructor(private readonly report: Report) {}
  supports(language: string): boolean {
    return language === "ts";
  }
  async run(input: RunInput, onResult: (r: TestResult) => void): Promise<Report> {
    this.lastInput = input;
    onResult({ name: "stub", status: "pass", durationMs: 1 });
    return this.report;
  }
}

const OK: Report = { correct: true, passed: 1, failed: 0, total: 1 };
const FAIL: Report = { correct: false, passed: 0, failed: 1, total: 1 };

/** Bygger en git bundle (HEAD) av et midlertidig repo med de gitte filene. */
async function buildBundle(files: Record<string, string>): Promise<Buffer> {
  const repo = await mkdtemp(path.join(tmpdir(), "pub-repo-"));
  for (const [rel, content] of Object.entries(files)) {
    const dest = path.join(repo, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, content, "utf8");
  }
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: repo,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
  git("init", "-q");
  git("-c", "user.email=t@t.t", "-c", "user.name=t", "add", "-A");
  git("-c", "user.email=t@t.t", "-c", "user.name=t", "commit", "-qm", "x");
  const bundlePath = path.join(repo, "out.bundle");
  git("bundle", "create", bundlePath, "HEAD");
  const buf = await readFile(bundlePath);
  await rm(repo, { recursive: true, force: true });
  return buf;
}

const VALID_FILES = {
  "assignment.json": JSON.stringify({
    id: "demoPub",
    language: "ts",
    entry: "submission",
    testFile: "demo.test.ts",
    reference: "reference.ts",
  }),
  "demo.test.ts": "// test",
  "reference.ts": "export const x = 1;",
};

describe("extractBundle", () => {
  it("avviser en tom bunt", async () => {
    await expect(extractBundle(Buffer.alloc(0), PROJECT_ROOT)).rejects.toBeInstanceOf(
      BundleError,
    );
  });

  it("avviser søppel som ikke er en gyldig bunt", async () => {
    await expect(
      extractBundle(Buffer.from("not a real git bundle"), PROJECT_ROOT),
    ).rejects.toBeInstanceOf(BundleError);
  });

  it("pakker ut HEAD-treet fra en gyldig bunt", async () => {
    const bundle = await buildBundle(VALID_FILES);
    const { workDir, cleanup } = await extractBundle(bundle, PROJECT_ROOT);
    try {
      const meta = await readFile(path.join(workDir, "assignment.json"), "utf8");
      expect(JSON.parse(meta).id).toBe("demoPub");
    } finally {
      await cleanup();
    }
  });
});

describe("publishAssignment", () => {
  async function freshRegistry(): Promise<AssignmentRegistry> {
    const dir = await mkdtemp(path.join(tmpdir(), "pub-assignments-"));
    return AssignmentRegistry.load(dir);
  }

  async function withWorkDir<T>(
    files: Record<string, string>,
    fn: (workDir: string) => Promise<T>,
  ): Promise<T> {
    const bundle = await buildBundle(files);
    const { workDir, cleanup } = await extractBundle(bundle, PROJECT_ROOT);
    try {
      return await fn(workDir);
    } finally {
      await cleanup();
    }
  }

  it("publiserer en gyldig oppgave og gjør den synlig etter reload", async () => {
    const registry = await freshRegistry();
    const runner = new StubRunner(OK);
    const result = await withWorkDir(VALID_FILES, (workDir) =>
      publishAssignment(workDir, { registry, runners: [runner] }, {}, () => {}),
    );
    expect(result.assignment).toBe("demoPub");
    expect(registry.get("demoPub")?.id).toBe("demoPub");
    expect(runner.lastInput?.content).toContain("export const x");
    await rm(registry.dir, { recursive: true, force: true });
  });

  it("avviser når referanseløsningen feiler self-testen", async () => {
    const registry = await freshRegistry();
    await expect(
      withWorkDir(VALID_FILES, (workDir) =>
        publishAssignment(workDir, { registry, runners: [new StubRunner(FAIL)] }, {}, () => {}),
      ),
    ).rejects.toBeInstanceOf(RejectedError);
    expect(registry.get("demoPub")).toBeUndefined();
    await rm(registry.dir, { recursive: true, force: true });
  });

  it("avviser manglende reference-felt", async () => {
    const registry = await freshRegistry();
    const files = {
      ...VALID_FILES,
      "assignment.json": JSON.stringify({
        id: "noRef",
        language: "ts",
        entry: "submission",
        testFile: "demo.test.ts",
      }),
    };
    await expect(
      withWorkDir(files, (workDir) =>
        publishAssignment(workDir, { registry, runners: [new StubRunner(OK)] }, {}, () => {}),
      ),
    ).rejects.toThrow(/reference/);
    await rm(registry.dir, { recursive: true, force: true });
  });

  it("avviser ugyldig oppgave-id (path-traversal)", async () => {
    const registry = await freshRegistry();
    const files = {
      ...VALID_FILES,
      "assignment.json": JSON.stringify({
        id: "../escape",
        language: "ts",
        entry: "submission",
        testFile: "demo.test.ts",
        reference: "reference.ts",
      }),
    };
    await expect(
      withWorkDir(files, (workDir) =>
        publishAssignment(workDir, { registry, runners: [new StubRunner(OK)] }, {}, () => {}),
      ),
    ).rejects.toBeInstanceOf(RejectedError);
    await rm(registry.dir, { recursive: true, force: true });
  });

  it("avviser duplikat uten force, godtar med force", async () => {
    const registry = await freshRegistry();
    const deps = { registry, runners: [new StubRunner(OK)] };
    await withWorkDir(VALID_FILES, (w) => publishAssignment(w, deps, {}, () => {}));
    await expect(
      withWorkDir(VALID_FILES, (w) => publishAssignment(w, deps, {}, () => {})),
    ).rejects.toBeInstanceOf(RejectedError);
    await expect(
      withWorkDir(VALID_FILES, (w) => publishAssignment(w, deps, { force: true }, () => {})),
    ).resolves.toMatchObject({ assignment: "demoPub" });
    await rm(registry.dir, { recursive: true, force: true });
  });
});

describe("connection: handlePublish token-gating", () => {
  let registry: AssignmentRegistry;
  beforeAll(async () => {
    registry = await AssignmentRegistry.load(
      await mkdtemp(path.join(tmpdir(), "pub-conn-")),
    );
  });

  function fakeWs() {
    const sent: any[] = [];
    return { sent, send: (d: string) => sent.push(JSON.parse(d)) };
  }

  const msg = {
    type: "publish-assignment" as const,
    filename: "x.bundle",
    bundle: "",
    encoding: "base64" as const,
    token: "t",
  };

  it("avviser når publisering er deaktivert (ingen token konfigurert)", async () => {
    const ws = fakeWs();
    await __test.handlePublish(ws as any, { registry, runners: [] }, msg);
    expect(ws.sent[0]).toMatchObject({ type: "rejected" });
  });

  it("avviser feil token", async () => {
    const ws = fakeWs();
    await __test.handlePublish(
      ws as any,
      { registry, runners: [], publishToken: "secret" },
      { ...msg, token: "wrong" },
    );
    expect(ws.sent[0]).toMatchObject({ type: "rejected", reason: expect.stringMatching(/token/i) });
  });
});
