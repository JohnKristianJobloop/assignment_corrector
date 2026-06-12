import { WebSocketServer } from "ws";
import type { AddressInfo } from "node:net";
import { AssignmentRegistry } from "./registry.js";
import { handleConnection } from "./connection.js";
import { JsTsRunner } from "./runner/JsTsRunner.js";
import { CSharpRunner } from "./runner/CSharpRunner.js";
import type { Runner } from "./runner/Runner.js";

export interface CreateServerOptions {
  /** 0 (default) gir en efemer port — praktisk for BDD/tester. */
  port?: number;
  assignmentsDir?: string;
  /** Overstyr settet av runtime-runnere (default: JS/TS + C#). */
  runners?: Runner[];
  /** Bakoverkompatibel snarvei for å injisere én enkelt runner (tester). */
  runner?: Runner;
  projectRoot?: string;
  /** Admin-token for publisering (default: env PUBLISH_TOKEN). Tomt ⇒ av. */
  publishToken?: string;
}

/** Tak på WebSocket-rammer: dekker base64-bunten + litt overhead. */
const MAX_PAYLOAD_BYTES = 40 * 1024 * 1024;

export interface ServerHandle {
  url: string;
  port: number;
  close(): Promise<void>;
}

/**
 * Programmatisk oppstart av JS/TS-runtime-serveren. Returnerer URL + port +
 * close() slik at akseptansetester kan boote en server per scenario.
 */
export async function createServer(
  opts: CreateServerOptions = {},
): Promise<ServerHandle> {
  const projectRoot = opts.projectRoot ?? process.cwd();
  const registry = await AssignmentRegistry.load(opts.assignmentsDir);
  const runners =
    opts.runners ??
    (opts.runner
      ? [opts.runner]
      : [new JsTsRunner(projectRoot), new CSharpRunner(projectRoot)]);
  const publishToken = opts.publishToken ?? process.env.PUBLISH_TOKEN;

  const wss = new WebSocketServer({
    port: opts.port ?? 0,
    maxPayload: MAX_PAYLOAD_BYTES,
  });
  wss.on("connection", (ws) =>
    handleConnection(ws, { registry, runners, publishToken, projectRoot }),
  );

  await new Promise<void>((resolve, reject) => {
    wss.once("listening", resolve);
    wss.once("error", reject);
  });

  const port = (wss.address() as AddressInfo).port;

  return {
    url: `ws://127.0.0.1:${port}`,
    port,
    close: () =>
      new Promise<void>((resolve, reject) =>
        wss.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}
