/**
 * Setter inn `export` foran top-level funksjonsdeklarasjoner som mangler det,
 * slik at oppgavens testfil kan importere dem som navngitte eksporter.
 *
 * Nye deltakere glemmer ofte `export`. Uten denne normaliseringen resolver
 * importen i testfilen til `undefined`, og alle assertions feiler med en
 * forvirrende feil i stedet for et reelt rettesignal.
 *
 * MVP: enkel linjeforankret regex. Kun top-level deklarasjoner (kolonne 0)
 * påvirkes — nøstede (innrykkede) funksjoner og allerede eksporterte
 * deklarasjoner (`export function`, `export default function`,
 * `export async function`) røres ikke, siden de starter med `export`.
 *
 * Kjente begrensninger (planlagt AST-oppgradering, se nedenfor):
 *  - `const foo = () => {}` (arrow) dekkes ikke — kun `function`-token.
 *  - `function` i kolonne 0 inne i en template-literal eller blokk-kommentar
 *    gir et falskt treff (sjeldent i nybegynnerinnsendinger).
 *
 * FUTURE (TypeScript AST): bytt ut regexen med en robust parse uten å endre
 * denne signaturen. Se `ensureExportedFunctions`-notatet i prosjektminnet for
 * full skisse — kort fortalt:
 *   import ts from "typescript";
 *   const sf = ts.createSourceFile("submission.ts", content, ts.ScriptTarget.Latest, true);
 *   // Gå kun sf.statements (top-level). For hver ts.FunctionDeclaration uten
 *   // ts.ModifierFlags.Export: noter node.getStart(sf) som innsettingspunkt.
 *   // Splice "export " inn ved hvert punkt (bakfra → fram for stabile offsets).
 * Dette håndterer korrekt nøsting, kommentarer og strenger.
 */
export function ensureExportedFunctions(content: string): string {
  return content.replace(
    /^(async\s+)?function\b/gm,
    (match) => `export ${match}`,
  );
}
