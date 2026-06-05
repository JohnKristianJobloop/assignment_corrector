import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface Assignment {
  id: string;
  displayName?: string;
  language: string;
  /** Filnavn (uten extension) som testfilen importerer løsningen som. */
  entry: string;
  /** Filnavn på testfilen, relativt til oppgavemappa. */
  testFile: string;
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
  private constructor(private readonly map: Map<string, Assignment>) {}

  static async load(
    dir = path.resolve(process.cwd(), "assignments"),
  ): Promise<AssignmentRegistry> {
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

    return new AssignmentRegistry(map);
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
}
