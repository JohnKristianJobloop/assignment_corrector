import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { OppgaveWorld, PUBLISH_TOKEN } from "../support/world.js";

const PUBLISHED_ID = "bddPublished";

const TEST_FILE = `
import { describe, it, expect } from "vitest";
import { greet } from "./submission";
describe("bddPublished", () => {
  it("hilser", () => { expect(greet()).toBe("hi"); });
});
`;

/** Bygger en git bundle (HEAD) av et oppgave-repo med de gitte filene. */
async function buildBundle(files: Record<string, string>): Promise<Buffer> {
  const repo = await mkdtemp(path.join(tmpdir(), "bdd-pub-repo-"));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const dest = path.join(repo, rel);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, content, "utf8");
    }
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: repo, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
    git("init", "-q");
    git("-c", "user.email=t@t.t", "-c", "user.name=t", "add", "-A");
    git("-c", "user.email=t@t.t", "-c", "user.name=t", "commit", "-qm", "x");
    const bundlePath = path.join(repo, "out.bundle");
    git("bundle", "create", bundlePath, "HEAD");
    return await readFile(bundlePath);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
}

function assignmentFiles(reference: string): Record<string, string> {
  return {
    "assignment.json": JSON.stringify({
      id: PUBLISHED_ID,
      language: "ts",
      entry: "submission",
      testFile: "t.test.ts",
      reference: "ref.ts",
    }),
    "t.test.ts": TEST_FILE,
    "ref.ts": reference,
  };
}

Given("publisering er aktivert på serveren", async function (this: OppgaveWorld) {
  await this.bootForPublish();
});

Given(
  "et oppgave-bundle der referanseløsningen består testene",
  async function (this: OppgaveWorld) {
    this.pendingBundle = await buildBundle(
      assignmentFiles('export const greet = (): string => "hi";'),
    );
  },
);

Given(
  "et oppgave-bundle der referanseløsningen feiler testene",
  async function (this: OppgaveWorld) {
    this.pendingBundle = await buildBundle(
      assignmentFiles('export const greet = (): string => "bye";'),
    );
  },
);

Given("en bunt som ikke er et gyldig git bundle", function (this: OppgaveWorld) {
  this.pendingBundle = Buffer.from("dette er ikke en git bundle");
});

When(
  "forfatteren publiserer bunten med riktig token",
  async function (this: OppgaveWorld) {
    await this.publish(this.pendingBundle!, { token: PUBLISH_TOKEN });
  },
);

When(
  "forfatteren publiserer bunten med feil token",
  async function (this: OppgaveWorld) {
    await this.publish(this.pendingBundle!, { token: "feil-token" });
  },
);

Then("blir oppgaven publisert", function (this: OppgaveWorld) {
  assert.ok(
    this.messages.some((m) => m.type === "published"),
    "forventet en published-melding",
  );
});

Then("blir bunten avvist", function (this: OppgaveWorld) {
  assert.ok(
    this.messages.some((m) => m.type === "rejected"),
    "forventet en rejected-melding",
  );
});

Then(
  "en deltaker kan straks sende inn en løsning til den nye oppgaven",
  async function (this: OppgaveWorld) {
    this.assignmentId = PUBLISHED_ID;
    this.language = "ts";
    this.solution = 'export const greet = (): string => "hi";';
    this.messages = [];
    await this.submit(`${PUBLISHED_ID}.ts`);
    const report = this.messages.find((m) => m.type === "report");
    assert.ok(
      report && report.type === "report" && report.correct === true,
      "forventet en korrekt rapport for den nye oppgaven",
    );
  },
);
