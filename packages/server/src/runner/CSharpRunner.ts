import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import type { Report, TestResult } from "@oppgaveretter/protocol";
import { createCsharpSandbox } from "./csharpSandbox.js";
import type { RunInput, Runner } from "./Runner.js";

const DEFAULT_TIMEOUT_MS = 60_000;
const NOISE_LIMIT = 60;

/**
 * Kjører C#-innsendinger (.NET 10+) via `dotnet run` mot et generert
 * xUnit-prosjekt i en isolert child-prosess. Real-time: parser NDJSON fra
 * Harness.cs sin stdout linje for linje og kaller onResult.
 *
 * Samme protokoll/rapportform som JsTsRunner — klienten ser ingen forskjell.
 */
export class CSharpRunner implements Runner {
  constructor(
    private readonly projectRoot = process.cwd(),
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {}

  supports(language: string): boolean {
    return language === "cs";
  }

  async run(input: RunInput, onResult: (r: TestResult) => void): Promise<Report> {
    const sandbox = await createCsharpSandbox(input, this.projectRoot);
    try {
      return await this.spawnDotnet(sandbox.dir, onResult);
    } finally {
      await sandbox.cleanup();
    }
  }

  private spawnDotnet(
    dir: string,
    onResult: (r: TestResult) => void,
  ): Promise<Report> {
    return new Promise<Report>((resolve, reject) => {
      const child = spawn(
        "dotnet",
        ["run", "--project", dir, "-c", "Debug", "-v", "q", "--nologo"],
        {
          cwd: dir,
          // Egen prosessgruppe → vi kan drepe HELE treet (dotnet + msbuild +
          // testhost) ved timeout, ikke bare toppnivå-prosessen.
          detached: true,
          env: {
            PATH: process.env.PATH,
            HOME: process.env.HOME,
            DOTNET_CLI_TELEMETRY_OPTOUT: "1",
            DOTNET_NOLOGO: "1",
            DOTNET_SKIP_FIRST_TIME_EXPERIENCE: "1",
            MSBUILDDISABLENODEREUSE: "1",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

      let summary: Report | undefined;
      let fatal: string | undefined;
      let timedOut = false;
      const noise: string[] = []; // ikke-NDJSON-output (typisk kompilatorfeil)

      const pushNoise = (line: string) => {
        const t = line.trim();
        if (!t) return;
        noise.push(t);
        if (noise.length > NOISE_LIMIT) noise.shift();
      };

      const timer = setTimeout(() => {
        timedOut = true;
        killTree(child);
      }, this.timeoutMs);

      const rl = createInterface({ input: child.stdout! });
      rl.on("line", (line) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith("{")) {
          pushNoise(line); // bygg-/kompilatorstøy → behold for diagnostikk
          return;
        }
        let msg: any;
        try {
          msg = JSON.parse(trimmed);
        } catch {
          return;
        }
        if (msg.kind === "result") {
          onResult(toTestResult(msg));
        } else if (msg.kind === "summary") {
          summary = {
            correct: msg.correct,
            passed: msg.passed,
            failed: msg.failed,
            total: msg.total,
          };
        } else if (msg.kind === "fatal") {
          fatal = msg.message;
        }
      });

      child.stderr?.on("data", (d) => {
        for (const line of d.toString().split("\n")) pushNoise(line);
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });

      child.on("close", () => {
        clearTimeout(timer);
        if (timedOut) {
          reject(new Error(`Kjøring tidsavbrutt etter ${this.timeoutMs} ms`));
          return;
        }
        if (fatal) {
          reject(new Error(fatal));
          return;
        }
        if (!summary) {
          const tail = noise.join("\n").slice(-2000);
          reject(
            new Error(
              tail
                ? `Kompilering/kjøring feilet:\n${tail}`
                : "Ingen sluttrapport fra C#-kjøringen",
            ),
          );
          return;
        }
        resolve(summary);
      });
    });
  }
}

/** Dreper hele prosessgruppa (negativ pid) — faller tilbake til vanlig kill. */
function killTree(child: ChildProcess): void {
  try {
    if (typeof child.pid === "number") {
      process.kill(-child.pid, "SIGKILL");
      return;
    }
  } catch {
    // prosessgruppa finnes ikke lenger — fall gjennom
  }
  child.kill("SIGKILL");
}

export function toTestResult(msg: any): TestResult {
  if (msg.status === "pass") {
    return { name: msg.name, status: "pass", durationMs: msg.durationMs };
  }
  if (msg.failKind === "assertion") {
    return {
      name: msg.name,
      status: "fail",
      kind: "assertion",
      message: msg.message,
      expected: msg.expected,
      actual: msg.actual,
      durationMs: msg.durationMs,
    };
  }
  return {
    name: msg.name,
    status: "fail",
    kind: "error",
    message: msg.message,
    durationMs: msg.durationMs,
  };
}

export const __test = { toTestResult };
