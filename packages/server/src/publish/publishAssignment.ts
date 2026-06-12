import { cp, readFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import type { Language, Report, TestResult } from "@oppgaveretter/protocol";
import type { Assignment, AssignmentRegistry } from "../registry.js";
import type { Runner } from "../runner/Runner.js";
import { RejectedError } from "./errors.js";

/** Lovlige oppgave-id-er — blir et mappenavn, så ingen path-traversal. */
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

interface AssignmentMeta {
  id: string;
  displayName?: string;
  language: string;
  entry: string;
  testFile: string;
  reference?: string;
}

export interface PublishDeps {
  registry: AssignmentRegistry;
  runners: Runner[];
}

export interface PublishResult {
  assignment: string;
  report: Report;
}

/**
 * Validerer en utpakket oppgave-bunt, self-tester referanseløsningen mot
 * oppgavens egen testfil, og legger oppgaven i registry-mappa hvis alt går
 * igjennom. Streamer self-test-resultatene via `onResult`.
 *
 * Kaster `RejectedError` for klient-feil (→ rejected); andre feil → error.
 */
export async function publishAssignment(
  workDir: string,
  deps: PublishDeps,
  opts: { force?: boolean },
  onResult: (r: TestResult) => void,
): Promise<PublishResult> {
  const root = await findAssignmentRoot(workDir);
  const meta = await readMeta(root);

  // --- Strukturell validering ------------------------------------------------
  if (!ID_PATTERN.test(meta.id)) {
    throw new RejectedError(
      `Ugyldig oppgave-id "${meta.id}" (kun bokstaver, tall, _ og -)`,
    );
  }
  for (const field of ["language", "entry", "testFile"] as const) {
    if (typeof meta[field] !== "string" || !meta[field]) {
      throw new RejectedError(`assignment.json mangler "${field}"`);
    }
  }
  if (!meta.reference) {
    throw new RejectedError(
      'assignment.json mangler "reference" (referanseløsning kreves for self-test)',
    );
  }
  const runner = deps.runners.find((r) => r.supports(meta.language));
  if (!runner) {
    throw new RejectedError(`Språk støttes ikke: ${meta.language}`);
  }
  await assertInside(root, meta.testFile);
  await assertInside(root, meta.reference);

  const existing = deps.registry.get(meta.id);
  if (existing && !opts.force) {
    throw new RejectedError(
      `Oppgave "${meta.id}" finnes allerede (bruk --force for å overskrive)`,
    );
  }

  // --- Self-test: referanseløsningen MÅ gi en korrekt rapport ----------------
  const assignment: Assignment = {
    id: meta.id,
    displayName: meta.displayName,
    language: meta.language,
    entry: meta.entry,
    testFile: meta.testFile,
    reference: meta.reference,
    dir: root,
    testFilePath: path.join(root, meta.testFile),
  };
  const content = await readFile(path.join(root, meta.reference), "utf8");
  const report = await runner.run(
    { assignment, language: meta.language as Language, content },
    onResult,
  );
  if (!report.correct) {
    throw new RejectedError(
      "Referanseløsningen besto ikke oppgavens egen testfil",
    );
  }

  // --- Legg oppgaven i registry-mappa ---------------------------------------
  const target = path.join(deps.registry.dir, meta.id);
  if (existing) await rm(target, { recursive: true, force: true });
  await cp(root, target, { recursive: true });
  await deps.registry.reload();

  return { assignment: meta.id, report };
}

/**
 * Finner mappa med `assignment.json`: enten rota, eller en enslig topp-nivå
 * undermappe (vanlig når repoet er bundlet med en wrapper-mappe).
 */
async function findAssignmentRoot(workDir: string): Promise<string> {
  if (await fileExists(path.join(workDir, "assignment.json"))) return workDir;

  const entries = await readdir(workDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());
  if (dirs.length === 1) {
    const sub = path.join(workDir, dirs[0].name);
    if (await fileExists(path.join(sub, "assignment.json"))) return sub;
  }
  throw new RejectedError("Bunten inneholder ingen assignment.json");
}

async function readMeta(root: string): Promise<AssignmentMeta> {
  try {
    return JSON.parse(
      await readFile(path.join(root, "assignment.json"), "utf8"),
    ) as AssignmentMeta;
  } catch {
    throw new RejectedError("Ugyldig assignment.json (kunne ikke parses)");
  }
}

/** Sikrer at en oppgitt sti finnes OG ligger innenfor oppgavemappa. */
async function assertInside(root: string, rel: string): Promise<void> {
  const resolved = path.resolve(root, rel);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new RejectedError(`Sti utenfor oppgavemappa: ${rel}`);
  }
  if (!(await fileExists(resolved))) {
    throw new RejectedError(`Filen finnes ikke i bunten: ${rel}`);
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}
