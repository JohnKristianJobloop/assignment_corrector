import { After, Before, setWorldConstructor, World } from "@cucumber/cucumber";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Language, ServerMessage } from "@oppgaveretter/protocol";
import {
  createServer,
  type ServerHandle,
} from "../../packages/server/src/createServer.js";
import { publishAssignment } from "../../packages/cli/src/models/publish.js";
import { submitSolution } from "../../packages/cli/src/models/submit.js";

export const PUBLISH_TOKEN = "bdd-secret";

/** Cucumber World: booter en ekte server per scenario og samler streamede meldinger. */
export class OppgaveWorld extends World {
  server?: ServerHandle;
  assignmentId = "";
  language: Language = "ts";
  solution = "";
  messages: ServerMessage[] = [];
  /** Midlertidig assignments-mappe for publiseringsscenarioer (ryddes etterpå). */
  assignmentsDir?: string;
  /** Bunten som skal publiseres (bygd i et Gitt-steg). */
  pendingBundle?: Buffer;

  async boot(): Promise<void> {
    this.server = await createServer({ port: 0 });
  }

  /**
   * Reboot med publisering aktivert mot en TOM midlertidig assignments-mappe,
   * slik at publiseringstester ikke forurenser ekte oppgaver.
   */
  async bootForPublish(): Promise<void> {
    await this.server?.close();
    this.assignmentsDir = await mkdtemp(path.join(tmpdir(), "bdd-assignments-"));
    this.server = await createServer({
      port: 0,
      assignmentsDir: this.assignmentsDir,
      publishToken: PUBLISH_TOKEN,
    });
  }

  async submit(filename: string): Promise<void> {
    if (!this.server) throw new Error("Server ikke startet");
    for await (const msg of submitSolution({
      server: this.server.url,
      assignment: this.assignmentId,
      filename,
      language: this.language,
      content: this.solution,
    })) {
      this.messages.push(msg);
    }
  }

  async publish(bundle: Buffer, opts: { token: string; force?: boolean }): Promise<void> {
    if (!this.server) throw new Error("Server ikke startet");
    for await (const msg of publishAssignment({
      server: this.server.url,
      filename: "bdd.bundle",
      bundle: bundle.toString("base64"),
      token: opts.token,
      force: opts.force,
    })) {
      this.messages.push(msg);
    }
  }
}

setWorldConstructor(OppgaveWorld);

Before(async function (this: OppgaveWorld) {
  await this.boot();
});

After(async function (this: OppgaveWorld) {
  await this.server?.close();
  if (this.assignmentsDir) {
    await rm(this.assignmentsDir, { recursive: true, force: true });
  }
});
