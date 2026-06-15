import type { WebSocket } from "ws";
import type {
  PublishAssignmentMessage,
  ServerMessage,
  SubmitMessage,
} from "@oppgaveretter/protocol";
import type { AssignmentRegistry } from "./registry.js";
import type { Runner } from "./runner/Runner.js";
import { extractBundle } from "./publish/bundleSandbox.js";
import { publishAssignment } from "./publish/publishAssignment.js";
import { RejectedError } from "./publish/errors.js";

export interface ConnectionDeps {
  registry: AssignmentRegistry;
  /** Runtime-runnere; den første som `supports(language)` velges per innsending. */
  runners: Runner[];
  /** Admin-token for publisering. Udefinert ⇒ publisering deaktivert. */
  publishToken?: string;
  /** Prosjektrot for sandbox (`.sandbox/`). */
  projectRoot?: string;
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
    } else if (isPublish(msg)) {
      void handlePublish(ws, deps, msg);
    }
  });
}

async function handleSubmit(
  ws: WebSocket,
  { registry, runners }: ConnectionDeps,
  msg: SubmitMessage,
): Promise<void> {
  const assignment = registry.resolve(msg.assignment || msg.filename);
  if (!assignment) {
    send(ws, { type: "rejected", reason: `Ukjent oppgave: ${msg.filename}` });
    return;
  }
  const runner = runners.find((r) => r.supports(msg.language));
  if (!runner) {
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

async function handlePublish(
  ws: WebSocket,
  deps: ConnectionDeps,
  msg: PublishAssignmentMessage,
): Promise<void> {
  if (!deps.publishToken) {
    send(ws, { type: "rejected", reason: "Publisering er deaktivert på serveren" });
    return;
  }
  console.log(msg.token);
  if (msg.token.trim() !== deps.publishToken.trim()) {
    send(ws, { type: "rejected", reason: "Ugyldig publiseringstoken" });
    return;
  }

  let bundle: Buffer;
  try {
    bundle = Buffer.from(msg.bundle, "base64");
  } catch {
    send(ws, { type: "rejected", reason: "Ugyldig base64-bunt" });
    return;
  }

  let extracted: Awaited<ReturnType<typeof extractBundle>> | undefined;
  try {
    extracted = await extractBundle(bundle, deps.projectRoot ?? process.cwd());
    const { assignment, report } = await publishAssignment(
      extracted.workDir,
      deps,
      { force: msg.force },
      (result) => send(ws, { type: "test-result", ...result }),
    );
    send(ws, { type: "report", ...report });
    send(ws, { type: "published", assignment });
  } catch (e) {
    if (e instanceof RejectedError) {
      send(ws, { type: "rejected", reason: e.message });
    } else {
      send(ws, { type: "error", message: e instanceof Error ? e.message : String(e) });
    }
  } finally {
    await extracted?.cleanup();
  }
}

function isSubmit(msg: unknown): msg is SubmitMessage {
  return hasType(msg, "submit");
}

function isPublish(msg: unknown): msg is PublishAssignmentMessage {
  return hasType(msg, "publish-assignment");
}

function hasType(msg: unknown, type: string): boolean {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as { type?: unknown }).type === type
  );
}

function send(ws: WebSocket, message: ServerMessage): void {
  ws.send(JSON.stringify(message));
}

export const __test = { handleSubmit, handlePublish, isSubmit, isPublish };
