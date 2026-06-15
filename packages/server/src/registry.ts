import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { AssignmentSummary, Language } from "@oppgaveretter/protocol";

export interface Assignment {
  id: string;
  displayName?: string;
  language: string;
  /** Filnavn (uten extension) som testfilen importerer løsningen som. */
  entry: string;
  /** Filnavn på testfilen, relativt til oppgavemappa. */
  testFile: string;
  /**
   * Filnavn på en kjent-korrekt referanseløsning, relativt til oppgavemappa.
   * Brukes ved publisering til å self-teste oppgaven (referansen må gi en
   * KORREKT rapport). Valgfri for kjørende oppgaver.
   */
  reference?: string;
  /** Fritekst-beskrivelse av oppgaven, returnert av `details`-forespørselen. */
  details?: string;
  /** Absolutt sti til oppgavemappa. */
  dir: string;
  /** Absolutt sti til testfilen. */
  testFilePath: string;
}

/**
 * Slår opp kjente oppgaver fra `assignments/<id>/assignment.json`.
 * `resolve()` utleder oppgave-id fra et brukeroppgitt filnavn/strenge.
 */
export class AssignmentRegistry {
  private constructor(
    private map: Map<string, Assignment>,
    /** Mappa registeret ble lastet fra — brukes av reload(). */
    public readonly dir: string,
  ) {}

  static async load(
    dir = path.resolve(process.cwd(), "assignments"),
  ): Promise<AssignmentRegistry> {
    return new AssignmentRegistry(await AssignmentRegistry.read(dir), dir);
  }

  /** Leser alle gyldige `assignment.json` under `dir` til et nytt map. */
  private static async read(dir: string): Promise<Map<string, Assignment>> {
    const map = new Map<string, Assignment>();
    let entries: import("node:fs").Dirent[] = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      // Ingen assignments-mappe → tomt register.
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const assignmentDir = path.join(dir, entry.name);
      try {
        const raw = await readFile(
          path.join(assignmentDir, "assignment.json"),
          "utf8",
        );
        const meta = JSON.parse(raw) as Omit<Assignment, "dir" | "testFilePath">;
        map.set(meta.id, {
          ...meta,
          dir: assignmentDir,
          testFilePath: path.join(assignmentDir, meta.testFile),
        });
      } catch {
        // Hopp over mapper uten gyldig assignment.json.
      }
    }

    return map;
  }

  /**
   * Leser assignments-mappa på nytt og bytter ut det interne registeret.
   * Brukes etter at en ny oppgave er publisert, slik at den blir synlig for
   * påfølgende tilkoblinger uten omstart av serveren.
   */
  async reload(): Promise<void> {
    this.map = await AssignmentRegistry.read(this.dir);
  }

  /** Utleder oppgave-id fra et filnavn/strenge (strip mappe + extension). */
  resolve(input: string): Assignment | undefined {
    const base = path.basename(input).replace(/\.[^.]+$/, "");
    return this.map.get(base);
  }

  get(id: string): Assignment | undefined {
    return this.map.get(id);
  }

  ids(): string[] {
    return [...this.map.keys()];
  }

  /** Kortfattede beskrivelser av alle oppgaver, sortert på id. */
  list(): AssignmentSummary[] {
    return [...this.map.values()]
      .map((a) => ({
        id: a.id,
        displayName: a.displayName,
        language: a.language as Language,
        testFile: a.testFile,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }
}
