import { ListArgs } from "./interfaces/clientInterfaces";
import { DEFAULT_SERVER, LIST_TERMINAL } from "./globals";
import { stream } from "./client";
import { languageFromFilter, renderResult } from "./render";
import {
  AssignmentSummary,
  Language,
  ServerMessage,
} from "@oppgaveretter/protocol";

export function parseListArgs(argv: string[]): ListArgs {
  let server = DEFAULT_SERVER;
  const languages = new Set<Language>();

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--server") server = argv[++i];
    else if (arg === "-l" || arg === "--language") {
      addLanguages(languages, argv[++i]);
    }
    // Tillat også `-l=ts` / `--language=ts`.
    else if (arg.startsWith("-l=") || arg.startsWith("--language=")) {
      addLanguages(languages, arg.slice(arg.indexOf("=") + 1));
    }
  }

  return { server, languages };
}

/** Splitter på komma slik at `-l ts,cs` virker, og normaliserer hver verdi. */
function addLanguages(set: Set<Language>, value: string | undefined): void {
  if (!value) return;
  for (const part of value.split(",")) {
    const lang = languageFromFilter(part);
    if (lang) set.add(lang);
    else if (part.trim()) {
      console.error(`Ukjent språk/filtype: ${part.trim()} (forventet js, ts eller cs)`);
      process.exit(2);
    }
  }
}

export async function runList(argv: string[]): Promise<number> {
  const args = parseListArgs(argv);

  for await (const msg of listAssignments(args.server)) {
    if (msg.type === "assignments-list") {
      renderList(msg.assignments, args.languages);
    } else {
      renderResult(msg);
    }
  }
  return 0;
}

export function listAssignments(server: string): AsyncGenerator<ServerMessage> {
  return stream(server, { type: "list-assignments" }, LIST_TERMINAL);
}

/** Skriver oppgavelista til konsollet, eventuelt filtrert på språk. */
function renderList(
  assignments: AssignmentSummary[],
  languages: Set<Language>,
): void {
  const filtered =
    languages.size > 0
      ? assignments.filter((a) => languages.has(a.language))
      : assignments;

  if (filtered.length === 0) {
    const suffix = languages.size > 0 ? ` for språk: ${[...languages].join(", ")}` : "";
    console.log(`Ingen oppgaver funnet${suffix}.`);
    return;
  }

  const width = Math.max(...filtered.map((a) => a.id.length));
  console.log(`Tilgjengelige oppgaver (${filtered.length}):\n`);
  for (const a of filtered) {
    const name = a.displayName ? ` — ${a.displayName}` : "";
    console.log(`  ${a.id.padEnd(width)}  [${a.language}]${name}`);
  }
}
