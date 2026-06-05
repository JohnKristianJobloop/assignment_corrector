import WebSocket from "ws";
import type { Language, ServerMessage } from "@oppgaveretter/protocol";

export interface SubmitOptions {
  /** WebSocket-URL til serveren, f.eks. ws://127.0.0.1:8080 */
  server: string;
  assignment: string;
  filename: string;
  language: Language;
  content: string;
}

const TERMINAL = new Set(["report", "rejected", "error"]);

/**
 * Kobler til serveren, sender innsendingen, og yield-er hver ServerMessage
 * etter hvert som den kommer. Dette er sømmen både CLI og BDD-steg bruker.
 */
export async function* submitSolution(
  opts: SubmitOptions,
): AsyncGenerator<ServerMessage> {
  const ws = new WebSocket(opts.server);
  const queue: ServerMessage[] = [];
  let wake: (() => void) | null = null;
  let closed = false;
  let failure: Error | null = null;

  const signal = () => {
    if (wake) {
      const fn = wake;
      wake = null;
      fn();
    }
  };

  ws.on("open", () => {
    const submit = {
      type: "submit" as const,
      assignment: opts.assignment,
      filename: opts.filename,
      language: opts.language,
      content: opts.content,
    };
    ws.send(JSON.stringify(submit));
  });
  ws.on("message", (data) => {
    try {
      queue.push(JSON.parse(data.toString()) as ServerMessage);
    } catch {
      // ignorer ugyldige rammer
    }
    signal();
  });
  ws.on("error", (err) => {
    failure = err instanceof Error ? err : new Error(String(err));
    closed = true;
    signal();
  });
  ws.on("close", () => {
    closed = true;
    signal();
  });

  try {
    while (true) {
      while (queue.length > 0) {
        const msg = queue.shift()!;
        yield msg;
        if (TERMINAL.has(msg.type)) {
          return;
        }
      }
      if (closed) {
        if (failure) throw failure;
        return;
      }
      await new Promise<void>((resolve) => {
        wake = resolve;
      });
    }
  } finally {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  }
}
