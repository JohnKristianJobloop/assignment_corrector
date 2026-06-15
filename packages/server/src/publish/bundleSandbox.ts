import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { runCommand } from "./runCommand.js";
import { RejectedError } from "./errors.js";

/** Øvre grense på bunt-størrelse (før innlesing) — vern mot disk/minne-DoS. */
export const MAX_BUNDLE_BYTES = 25 * 1024 * 1024; // 25 MB

const GIT_TIMEOUT_MS = 30_000;

/**
 * Feil som skyldes en ugyldig/ondsinnet/uakseptabel bunt (klientens skyld).
 * Mappes til `rejected` av kalleren; alle andre feil mappes til `error`.
 */
export class BundleError extends RejectedError {}

export interface ExtractedBundle {
  /** Mappe der HEAD-treet fra bunten er pakket ut. */
  workDir: string;
  cleanup(): Promise<void>;
}

/** Hardenet git-env: ignorer all ekstern/lokal config, ingen prompts/hooks. */
function gitEnv(): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
    GIT_ALLOW_PROTOCOL: "file",
  };
}

/** Felles hardening-flagg på hver git-invokasjon (forsvar i dybden). */
const HARDEN = [
  "-c",
  "core.hooksPath=/dev/null",
  "-c",
  "core.fsmonitor=false",
  "-c",
  "protocol.allow=never",
  "-c",
  "protocol.file.allow=always",
];

async function git(
  cwd: string,
  args: string[],
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return runCommand("git", [...HARDEN, ...args], {
    cwd,
    env: gitEnv(),
    timeoutMs: GIT_TIMEOUT_MS,
  });
}

/**
 * Verifiserer en git bundle og pakker ut HEAD-treet til en isolert temp-mappe.
 *
 * Hardening (jf. project_feedback_implementation_design_docs.md §Sikkerhet):
 *  - størrelsesgrense før innlesing
 *  - `git bundle verify` før bruk
 *  - bare-klon med fsckObjects (avvis misformede objekter)
 *  - `git archive | tar` (ingen checkout-bivirkninger, ingen hooks)
 *  - minimal env, hooks/config nøytralisert, timeout + prosessgruppe-kill
 *
 * Kaster `BundleError` for klient-feil (→ rejected), andre feil for serverfeil.
 */
export async function extractBundle(
  bundle: Buffer,
  projectRoot = process.cwd(),
): Promise<ExtractedBundle> {
  if (bundle.length === 0) throw new BundleError("Tom bunt");
  if (bundle.length > MAX_BUNDLE_BYTES) {
    throw new BundleError(
      `Bunten er for stor (${bundle.length} bytes, maks ${MAX_BUNDLE_BYTES})`,
    );
  }

  const baseDir = path.join(projectRoot, ".sandbox");
  await mkdir(baseDir, { recursive: true });
  const dir = await mkdtemp(path.join(baseDir, "publish-"));
  const cleanup = () => rm(dir, { recursive: true, force: true });

  try {
    const bundlePath = path.join(dir, "repo.bundle");
    const verifyDir = path.join(dir, "verify.git");
    const bareDir = path.join(dir, "bare.git");
    const workDir = path.join(dir, "work");
    const tarPath = path.join(dir, "head.tar");
    await writeFile(bundlePath, bundle);
    await mkdir(workDir, { recursive: true });

    // `git bundle verify` MÅ kjøres mot et repository (det sjekker bunten sine
    // prerequisites mot repoet). Uten et eksplisitt repo leter git oppover etter
    // en `.git`: lokalt finner den serverens eget kild-repo, men i container-
    // imaget (ingen `.git`) feiler den med «need a repository to verify a
    // bundle». Vi forankrer derfor verify mot et tomt engangs-bare-repo.
    const initVerifyRepo = await git(dir, ["init", "--bare", "-q", verifyDir]);
    if (initVerifyRepo.code !== 0) {
      throw new Error(
        `Kunne ikke initialisere verify-repo: ${initVerifyRepo.stderr.trim()}`,
      );
    }

    const verify = await git(dir, [
      `--git-dir=${verifyDir}`,
      "bundle",
      "verify",
      bundlePath,
    ]);
    if (verify.code !== 0) {
      throw new BundleError(
        `Ugyldig git bundle: ${verify.stderr.trim() || "verify feilet"}`,
      );
    }

    const clone = await git(dir, [
      "-c",
      "fetch.fsckObjects=true",
      "-c",
      "transfer.fsckObjects=true",
      "clone",
      "--bare",
      bundlePath,
      bareDir,
    ]);
    if (clone.code !== 0) {
      throw new BundleError(
        `Kunne ikke lese bunten: ${clone.stderr.trim() || "clone feilet"}`,
      );
    }

    const archive = await git(dir, [
      `--git-dir=${bareDir}`,
      "archive",
      "--format=tar",
      "-o",
      tarPath,
      "HEAD",
    ]);
    if (archive.code !== 0) {
      throw new BundleError(
        `Fant ikke HEAD i bunten: ${archive.stderr.trim() || "archive feilet"}`,
      );
    }

    const untar = await runCommand("tar", ["-xf", tarPath, "-C", workDir], {
      cwd: dir,
      timeoutMs: GIT_TIMEOUT_MS,
    });
    if (untar.code !== 0) {
      throw new BundleError(
        `Kunne ikke pakke ut treet: ${untar.stderr.trim() || "tar feilet"}`,
      );
    }

    return { workDir, cleanup };
  } catch (err) {
    await cleanup();
    throw err;
  }
}
