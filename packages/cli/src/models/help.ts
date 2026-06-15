import { DEFAULT_SERVER } from "./globals";

const BIN = "oppgavehjelper";

interface Command {
  usage: string;
  summary: string;
  options: [flag: string, description: string][];
}

const COMMANDS: Command[] = [
  {
    usage: `${BIN} <fil> [--assignment <id>] [--server <url>]`,
    summary: "Send inn en løsningsfil til retting (standardkommandoen).",
    options: [
      ["--assignment <id>", "Oppgave-id å rette mot (utledes ellers fra filnavnet)."],
      ["--server <url>", "WebSocket-adresse til serveren."],
    ],
  },
  {
    usage: `${BIN} list [-l <språk>] [--server <url>]`,
    summary: "List ut tilgjengelige oppgaver.",
    options: [
      ["-l, --language <språk>", "Filtrer på språk: js, ts eller cs (komma-separert)."],
      ["--server <url>", "WebSocket-adresse til serveren."],
    ],
  },
  {
    usage: `${BIN} details --name <id> [--server <url>]`,
    summary: "Vis beskrivelsen til én oppgave.",
    options: [
      ["-n, --name <id>", "Oppgave-id å vise detaljer for (påkrevd)."],
      ["--server <url>", "WebSocket-adresse til serveren."],
    ],
  },
  {
    usage: `${BIN} publish <repo-mappe> [--token <token>] [--force] [--server <url>]`,
    summary: "Publiser en oppgave fra en git-repo-mappe.",
    options: [
      ["--token <token>", "Publiseringstoken (kan også settes via PUBLISH_TOKEN)."],
      ["--force", "Overskriv en eksisterende oppgave med samme id."],
      ["--server <url>", "WebSocket-adresse til serveren."],
    ],
  },
];

export function runHelp(): number {
  const lines: string[] = [];
  lines.push(`Bruk: ${BIN} <kommando> [argumenter]`);
  lines.push("");
  lines.push("Kommandoer:");
  for (const cmd of COMMANDS) {
    lines.push("");
    lines.push(`  ${cmd.usage}`);
    lines.push(`      ${cmd.summary}`);
    const width = Math.max(...cmd.options.map(([flag]) => flag.length));
    for (const [flag, description] of cmd.options) {
      lines.push(`        ${flag.padEnd(width)}  ${description}`);
    }
  }
  lines.push("");
  lines.push(`Standardserver: ${DEFAULT_SERVER}`);
  lines.push(`Vis denne hjelpen: ${BIN} --help`);
  console.log(lines.join("\n"));
  return 0;
}
