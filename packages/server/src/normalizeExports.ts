import ts from "typescript";

/**
 * Setter inn `export` foran top-level deklarasjoner som mangler det, slik at
 * oppgavens testfil kan importere dem som navngitte eksporter. Dekker alle
 * verdideklarasjoner på toppnivå:
 *   - `function foo(){}` / `async function foo(){}` / `function* gen(){}`
 *   - `const`/`let`/`var` (verdier, arrow/function-uttrykk, destrukturering)
 *   - `class Foo {}`
 *   - `enum Color {}`
 * Type-nivå (`type`, `interface`) røres ikke — de er ikke verdier.
 *
 * Nye deltakere glemmer ofte `export`. Uten denne normaliseringen resolver
 * importen i testfilen til `undefined`, og alle assertions feiler med en
 * forvirrende feil i stedet for et reelt rettesignal.
 *
 * Implementasjon: TypeScript-compileren parser kilden og vi går KUN
 * `sourceFile.statements` (toppnivå). Det gir oss tre ting gratis:
 *   - nøstede/innrykkede deklarasjoner røres aldri (de er ikke toppnivå-statements),
 *   - nøkkelord inne i strenger/kommentarer er ikke statements → ingen falske treff,
 *   - ikke-eksporterbare linjer (`import`, `console.log(...)`, `if/for`,
 *     reassignment `x = 5`) matcher ingen av node-typene under.
 * `export`/`export default` og allerede eksporterte deklarasjoner hoppes over
 * via modifier-sjekken.
 */
export function ensureExportedFunctions(content: string): string {
  const sf = ts.createSourceFile(
    "submission.ts",
    content,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
  );

  const insertAt: number[] = [];
  for (const stmt of sf.statements) {
    if (isExportableValue(stmt) && !hasExportModifier(stmt)) {
      // getStart() hopper over ledende trivia (kommentarer/whitespace) slik at
      // `export ` havner rett foran selve nøkkelordet.
      insertAt.push(stmt.getStart(sf));
    }
  }

  // Splice bakfra → fram slik at tidligere offsets forblir gyldige.
  let out = content;
  for (const pos of insertAt.sort((a, b) => b - a)) {
    out = `${out.slice(0, pos)}export ${out.slice(pos)}`;
  }
  return out;
}

/** Toppnivå-deklarasjoner som finnes som verdi i runtime og kan eksporteres. */
function isExportableValue(stmt: ts.Statement): boolean {
  return (
    ts.isFunctionDeclaration(stmt) ||
    ts.isClassDeclaration(stmt) ||
    ts.isVariableStatement(stmt) ||
    ts.isEnumDeclaration(stmt)
  );
}

function hasExportModifier(stmt: ts.Statement): boolean {
  if (!ts.canHaveModifiers(stmt)) return false;
  const modifiers = ts.getModifiers(stmt);
  return (
    modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false
  );
}
