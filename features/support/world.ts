import { After, Before, setWorldConstructor, World } from "@cucumber/cucumber";
import type { Language, ServerMessage } from "@oppgaveretter/protocol";
import {
  createServer,
  type ServerHandle,
} from "../../packages/server/src/createServer.js";
import { submitSolution } from "../../packages/cli/src/client.js";

/** Cucumber World: booter en ekte server per scenario og samler streamede meldinger. */
export class OppgaveWorld extends World {
  server?: ServerHandle;
  assignmentId = "";
  language: Language = "ts";
  solution = "";
  messages: ServerMessage[] = [];

  async boot(): Promise<void> {
    this.server = await createServer({ port: 0 });
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
}

setWorldConstructor(OppgaveWorld);

Before(async function (this: OppgaveWorld) {
  await this.boot();
});

After(async function (this: OppgaveWorld) {
  await this.server?.close();
});
