import WebSocket from "ws";
import type {
  ClientMessage,
  ServerMessage,
} from "@oppgaveretter/protocol";

/** Felles WebSocket-strøm: send én klientmelding, yield serversvar til terminal. */
export async function* stream(
  server: string,
  message: ClientMessage,
  terminal: Set<string>,
): AsyncGenerator<ServerMessage> {
  const ws = new WebSocket(server);
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

  ws.on("open", () => ws.send(JSON.stringify(message)));
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
        if (terminal.has(msg.type)) {
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
