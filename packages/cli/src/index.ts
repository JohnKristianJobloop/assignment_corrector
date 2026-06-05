#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Language } from "@oppgaveretter/protocol";
import { submitSolution } from "./client.js";

interface Args {
  file: string;
  assignment?: string;
  server: string;
}

function parseArgs(argv: string[]): Args {
  let file: string | undefined;
  let assignment: string | undefined;
  let server = "ws://127.0.0.1:8080";

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

function languageFromFile(file: string): Language {
  if (file.endsWith(".ts")) return "ts";
  if (file.endsWith(".cs") || file.endsWith(".csx")) return "cs";
  return "js";
}

const args = parseArgs(process.argv.slice(2));
const content = await readFile(args.file, "utf8");
const base = path.basename(args.file).replace(/\.[^.]+$/, "");
const assignment = args.assignment ?? base;

let correct = false;

for await (const msg of submitSolution({
  server: args.server,
  assignment,
  filename: path.basename(args.file),
  language: languageFromFile(args.file),
  content,
})) {
  switch (msg.type) {
    case "accepted":
      console.log(`\nOppgave akseptert: ${msg.assignment}\n`);
      break;
    case "rejected":
      console.error(`Avvist: ${msg.reason}`);
      break;
    case "test-result":
      if (msg.status === "pass") {
        console.log(`  ✓ ${msg.name}`);
      } else if (msg.kind === "assertion") {
        console.log(`  ✗ ${msg.name}`);
        console.log(`      forventet: ${msg.expected}`);
        console.log(`      faktisk:   ${msg.actual}`);
      } else {
        console.log(`  ✗ ${msg.name}`);
        console.log(`      feil: ${msg.message}`);
      }
      break;
    case "report":
      correct = msg.correct;
      console.log(
        `\n${correct ? "KORREKT" : "UKORREKT"} — ${msg.passed}/${msg.total} bestått` +
          (msg.failed ? `, ${msg.failed} feilet` : ""),
      );
      break;
    case "error":
      console.error(`Feil: ${msg.message}`);
      break;
  }
}

process.exit(correct ? 0 : 1);
