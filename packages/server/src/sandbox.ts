import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Assignment } from "./registry.js";
import { ensureExportedFunctions } from "./normalizeExports.js";
import type { Language } from "@oppgaveretter/protocol";

export interface Sandbox {
  /** Absolutt sti til den isolerte arbeidsmappa. */
  dir: string;
  cleanup(): Promise<void>;
}

/**
 * Lager en isolert temp-mappe UNDER prosjektroten (slik at `import "vitest"` og
 * andre node_modules resolver oppover til prosjektets avhengigheter), skriver
 * deltakerens kode til oppgavens entry-fil, og kopierer inn testfilen.
 */
export async function createSandbox(
  input: { assignment: Assignment; language: Language; content: string },
  projectRoot = process.cwd(),
): Promise<Sandbox> {
  const baseDir = path.join(projectRoot, ".sandbox");
  await mkdir(baseDir, { recursive: true });
  const dir = await mkdtemp(path.join(baseDir, "run-"));

  const ext = input.language === "ts" ? "ts" : "js";
  const submissionPath = path.join(dir, `${input.assignment.entry}.${ext}`);
  await writeFile(
    submissionPath,
    ensureExportedFunctions(input.content),
    "utf8",
  );

  const testDest = path.join(dir, input.assignment.testFile);
  await copyFile(input.assignment.testFilePath, testDest);

  return {
    dir,
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}
