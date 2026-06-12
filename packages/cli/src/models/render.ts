import { Language, ServerMessage } from "@oppgaveretter/protocol";

export function languageFromFile(file: string): Language {
  if (file.endsWith(".ts")) return "ts";
  if (file.endsWith(".cs") || file.endsWith(".csx")) return "cs";
  return "js";
}

/** Skriver et streamet test-resultat / sluttrapport til konsollet. */
export function renderResult(msg: ServerMessage): void {
  switch (msg.type) {
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
      console.log(
        `\n${msg.correct ? "KORREKT" : "UKORREKT"} — ${msg.passed}/${msg.total} bestått` +
          (msg.failed ? `, ${msg.failed} feilet` : ""),
      );
      break;
    case "rejected":
      console.error(`Avvist: ${msg.reason}`);
      break;
    case "error":
      console.error(`Feil: ${msg.message}`);
      break;
  }
}
