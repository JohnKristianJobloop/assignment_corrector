import type { WebSocket } from "ws";
import type { ServerMessage, SubmitMessage } from "@oppgaveretter/protocol";
import type { AssignmentRegistry } from "./registry.js";
import type { Runner } from "./runner/Runner.js";

export interface ConnectionDeps {
  registry: AssignmentRegistry;
  runner: Runner;
}

/** Kobler én WebSocket-klient til validerings-flyten. */
export function handleConnection(ws: WebSocket, deps: ConnectionDeps): void {
  ws.on("message", (data) => {
    let msg: unknown;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      send(ws, { type: "error", message: "Ugyldig JSON" });
      return;
    }
    if (isSubmit(msg)) {
      void handleSubmit(ws, deps, msg);
    }
  });
}

async function handleSubmit(
  ws: WebSocket,
  { registry, runner }: ConnectionDeps,
  msg: SubmitMessage,
): Promise<void> {
  const assignment = registry.resolve(msg.assignment || msg.filename);
  if (!assignment) {
    send(ws, { type: "rejected", reason: `Ukjent oppgave: ${msg.filename}` });
    return;
  }
  if (!runner.supports(msg.language)) {
    send(ws, { type: "rejected", reason: `Språk støttes ikke: ${msg.language}` });
    return;
  }

  send(ws, { type: "accepted", assignment: assignment.id, total: 0 });

  try {
    const report = await runner.run(
      { assignment, language: msg.language, content: msg.content },
      (result) => send(ws, { type: "test-result", ...result }),
    );
    send(ws, { type: "report", ...report });
  } catch (e) {
    send(ws, { type: "error", message: e instanceof Error ? e.message : String(e) });
  }
}

function isSubmit(msg: unknown): msg is SubmitMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as { type?: unknown }).type === "submit"
  );
}

function send(ws: WebSocket, message: ServerMessage): void {
  ws.send(JSON.stringify(message));
}

export const __test = { handleSubmit, isSubmit };
