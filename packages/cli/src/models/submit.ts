import { readFile } from "fs/promises";
import { SubmitArgs, SubmitOptions } from "./interfaces/clientInterfaces";
import { DEFAULT_SERVER, SUBMIT_TERMINAL } from "./globals";
import path from "path";
import { stream, } from "./client";
import { languageFromFile, renderResult } from "./render";
import { ServerMessage } from "@oppgaveretter/protocol";

export function parseSubmitArgs(argv: string[]): SubmitArgs {
  let file: string | undefined;
  let assignment: string | undefined;
  let server = DEFAULT_SERVER;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--assignment") assignment = argv[++i];
    else if (arg === "--server") server = argv[++i];
    else if (!arg.startsWith("--")) file = arg;
  }

  if (!file) {
    console.error(
      "Bruk: oppgaveretter <fil> [--assignment <id>] [--server ws://host:port]",
    );
    process.exit(2);
  }
  return { file, assignment, server };
}

export async function runSubmit(argv: string[]): Promise<number> {
  const args = parseSubmitArgs(argv);
  const content = await readFile(args.file, "utf8");
  const base = path.basename(args.file).replace(/\.[^.]+$/, "");

  let correct = false;
  for await (const msg of submitSolution({
    server: args.server,
    assignment: args.assignment ?? base,
    filename: path.basename(args.file),
    language: languageFromFile(args.file),
    content,
  })) {
    if (msg.type === "accepted") console.log(`\nOppgave akseptert: ${msg.assignment}\n`);
    else renderResult(msg);
    if (msg.type === "report") correct = msg.correct;
  }
  return correct ? 0 : 1;
}


export function submitSolution(opts: SubmitOptions): AsyncGenerator<ServerMessage> {
  return stream(
    opts.server,
    {
      type: "submit",
      assignment: opts.assignment,
      filename: opts.filename,
      language: opts.language,
      content: opts.content,
    },
    SUBMIT_TERMINAL,
  );
}