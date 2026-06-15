import { WebSocketServer } from "ws";
import { createServer as createHttpServer } from "node:http";
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
  // `.trim()` så et limt inn token-miljø med usynlig etterstilt linjeskift/
  // mellomrom (vanlig i Render/Docker-dashboards) fortsatt matcher klientens
  // token. Tom etter trim ⇒ undefined ⇒ publisering av.
  const publishToken =
    (opts.publishToken ?? process.env.PUBLISH_TOKEN)?.trim() || undefined;

  // HTTP-server med helsesjekk-endepunkt. Render (web service) krever en åpen
  // HTTP-port som svarer 200 for å regne tjenesten som frisk; uten dette blir
  // en ren WebSocket-server SIGTERM-et i en omstartsløkke. WebSocket-serveren
  // henges på samme HTTP-server slik at oppgradering til ws fortsatt fungerer.
  const httpServer = createHttpServer((req, res) => {
    if (req.url === "/healthz" || req.url === "/") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({
    server: httpServer,
    maxPayload: MAX_PAYLOAD_BYTES,
  });
  wss.on("connection", (ws) =>
    handleConnection(ws, { registry, runners, publishToken, projectRoot }),
  );

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    // 0.0.0.0 slik at containeren er nåbar utenfra (Render/Docker), ikke kun
    // loopback.
    httpServer.listen(opts.port ?? 0, "0.0.0.0", () => resolve());
  });

  const port = (httpServer.address() as AddressInfo).port;

  return {
    url: `ws://127.0.0.1:${port}`,
    port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        // Lukk WebSocket-serveren først (avslutter aktive klienter), deretter
        // den underliggende HTTP-serveren.
        wss.close((wsErr) =>
          httpServer.close((httpErr) =>
            wsErr || httpErr ? reject(wsErr ?? httpErr) : resolve(),
          ),
        );
      }),
  };
}
