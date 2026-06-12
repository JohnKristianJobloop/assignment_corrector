import { spawn, type ChildProcess } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 30_000;
const OUTPUT_LIMIT = 1_000_000; // 1 MB tak på fanget stdout/stderr

export interface CommandResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Kjører en kommando i en egen prosessgruppe med minimal env og timeout.
 * Ved timeout drepes HELE prosessgruppa (jf. C#-runneren), og promiset
 * avvises. Output kappes ved OUTPUT_LIMIT som vern mot output-bomber.
 */
export function runCommand(
  command: string,
  args: string[],
  opts: { cwd: string; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {
    cwd: process.cwd(),
  },
): Promise<CommandResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: opts.cwd,
      detached: true,
      env: opts.env ?? { PATH: process.env.PATH, HOME: process.env.HOME },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const cap = (buf: string, chunk: string) =>
      buf.length >= OUTPUT_LIMIT ? buf : buf + chunk;

    child.stdout?.on("data", (d) => (stdout = cap(stdout, d.toString())));
    child.stderr?.on("data", (d) => (stderr = cap(stderr, d.toString())));

    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`Kommando tidsavbrutt etter ${timeoutMs} ms: ${command}`));
        return;
      }
      resolve({ code, stdout, stderr });
    });
  });
}

function killTree(child: ChildProcess): void {
  try {
    if (typeof child.pid === "number") {
      process.kill(-child.pid, "SIGKILL");
      return;
    }
  } catch {
    // prosessgruppa finnes ikke lenger
  }
  child.kill("SIGKILL");
}
