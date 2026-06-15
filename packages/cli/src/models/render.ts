import { Language, ServerMessage } from "@oppgaveretter/protocol";

export function languageFromFile(file: string): Language {
  if (file.endsWith(".ts")) return "ts";
  if (file.endsWith(".cs") || file.endsWith(".csx")) return "cs";
  return "js";
}

/**
 * Normaliserer en `--language`-verdi til en Language. Godtar både rene
 * språkkoder ("ts"), filtyper (".ts") og hele filnavn ("foo.ts"). Returnerer
 * undefined for ukjente verdier slik at kalleren kan rapportere feil.
 */
export function languageFromFilter(value: string): Language | undefined {
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  // Plukk ut filtypen: ".ts" → "ts", "foo.ts" → "ts", "ts" → "ts".
  const ext = v.includes(".") ? v.slice(v.lastIndexOf(".") + 1) : v;
  switch (ext) {
    case "ts":
      return "ts";
    case "js":
      return "js";
    case "cs":
    case "csx":
      return "cs";
    default:
      return undefined;
  }
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
