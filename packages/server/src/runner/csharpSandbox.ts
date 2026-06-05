import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RunInput } from "./Runner.js";

const TEMPLATE_DIR = fileURLToPath(new URL("./csharp-template", import.meta.url));

export interface CsharpSandbox {
  /** Absolutt sti til den isolerte prosjektmappa. */
  dir: string;
  cleanup(): Promise<void>;
}

/**
 * Lager en isolert .NET-prosjektmappe under `.sandbox/`: kopierer prosjekt-malen
 * (`project.csproj` + `Harness.cs`), skriver deltakerens kode til `<entry>.cs`,
 * og kopierer inn oppgavens kjente testfil. `dotnet run` mot mappa kompilerer
 * alt sammen og kjører harnesset.
 */
export async function createCsharpSandbox(
  input: RunInput,
  projectRoot = process.cwd(),
): Promise<CsharpSandbox> {
  const baseDir = path.join(projectRoot, ".sandbox");
  await mkdir(baseDir, { recursive: true });
  const dir = await mkdtemp(path.join(baseDir, "cs-run-"));

  await copyFile(
    path.join(TEMPLATE_DIR, "project.csproj"),
    path.join(dir, "project.csproj"),
  );
  await copyFile(
    path.join(TEMPLATE_DIR, "Harness.cs"),
    path.join(dir, "Harness.cs"),
  );

  await writeFile(
    path.join(dir, `${input.assignment.entry}.cs`),
    input.content,
    "utf8",
  );

  await copyFile(
    input.assignment.testFilePath,
    path.join(dir, input.assignment.testFile),
  );

  return {
    dir,
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}
