import { DetailsArgs } from "./interfaces/clientInterfaces";
import { DEFAULT_SERVER, DETAILS_TERMINAL } from "./globals";
import { stream } from "./client";
import { renderResult } from "./render";
import {
  AssignmentDetailsMessage,
  ServerMessage,
} from "@oppgaveretter/protocol";

export function parseDetailsArgs(argv: string[]): DetailsArgs {
  let server = DEFAULT_SERVER;
  let name: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--server") server = argv[++i];
    else if (arg === "--name" || arg === "-n") name = argv[++i];
    else if (arg.startsWith("--name=")) name = arg.slice("--name=".length);
    else if (arg.startsWith("-n=")) name = arg.slice("-n=".length);
  }

  if (!name || !name.trim()) {
    console.error("Mangler oppgave-id: bruk `details --name <id>`.");
    process.exit(2);
  }

  return { server, name: name.trim() };
}

export async function runDetails(argv: string[]): Promise<number> {
  const args = parseDetailsArgs(argv);

  for await (const msg of requestDetails(args.server, args.name)) {
    if (msg.type === "assignment-details") {
      renderDetails(msg);
    } else {
      renderResult(msg);
    }
  }
  return 0;
}

export function requestDetails(
  server: string,
  name: string,
): AsyncGenerator<ServerMessage> {
  return stream(
    server,
    { type: "assignment-details-request", name },
    DETAILS_TERMINAL,
  );
}

/** Skriver detaljene til én oppgave til konsollet. */
function renderDetails(msg: AssignmentDetailsMessage): void {
  const title = msg.displayName ? `${msg.displayName} (${msg.id})` : msg.id;
  console.log(`${title}  [${msg.language}]\n`);
  console.log(msg.details?.trim() || "Ingen beskrivelse tilgjengelig.");
}
