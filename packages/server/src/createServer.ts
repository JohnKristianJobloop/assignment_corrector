import { WebSocketServer } from "ws";
import type { AddressInfo } from "node:net";
import { AssignmentRegistry } from "./registry.js";
import { handleConnection } from "./connection.js";
import { JsTsRunner } from "./runner/JsTsRunner.js";
import type { Runner } from "./runner/Runner.js";

export interface CreateServerOptions {
  /** 0 (default) gir en efemer port — praktisk for BDD/tester. */
  port?: number;
  assignmentsDir?: string;
  runner?: Runner;
  projectRoot?: string;
}

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
  const runner = opts.runner ?? new JsTsRunner(projectRoot);

  const wss = new WebSocketServer({ port: opts.port ?? 0 });
  wss.on("connection", (ws) => handleConnection(ws, { registry, runner }));

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
