import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import type { Report, TestResult } from "@oppgaveretter/protocol";
import { createSandbox } from "../sandbox.js";
import type { RunInput, Runner } from "./Runner.js";

const ENTRY = fileURLToPath(new URL("./vitestEntry.ts", import.meta.url));
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Kjører JS/TS-innsendinger via Vitest i en isolert child-prosess.
 * Real-time: parser NDJSON fra child-stdout linje for linje og kaller onResult.
 */
export class JsTsRunner implements Runner {
  constructor(
    private readonly projectRoot = process.cwd(),
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {}

  supports(language: string): boolean {
    return language === "js" || language === "ts";
  }

  async run(input: RunInput, onResult: (r: TestResult) => void): Promise<Report> {
    const sandbox = await createSandbox(input, this.projectRoot);
    try {
      return await this.spawnVitest(sandbox.dir, onResult);
    } finally {
      await sandbox.cleanup();
    }
  }

  private spawnVitest(
    sandboxDir: string,
    onResult: (r: TestResult) => void,
  ): Promise<Report> {
    return new Promise<Report>((resolve, reject) => {
      const child = spawn(process.execPath, ["--import", "tsx", ENTRY], {
        cwd: this.projectRoot,
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          SANDBOX_ROOT: sandboxDir,
        },
        stdio: ["ignore", "pipe", "pipe"],
      });

      let summary: Report | undefined;
      let fatal: string | undefined;
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, this.timeoutMs);

      const rl = createInterface({ input: child.stdout });
      rl.on("line", (line) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith("{")) return; // hopp over ikke-NDJSON støy
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
          reject(new Error("Ingen sluttrapport fra testkjøringen"));
          return;
        }
        resolve(summary);
      });
    });
  }
}

function toTestResult(msg: any): TestResult {
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
