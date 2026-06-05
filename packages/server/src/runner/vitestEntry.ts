/**
 * Kjøres som EGEN child-prosess (node --import tsx) av JsTsRunner.
 * Starter Vitest programmatisk mot sandbox-mappa og streamer ÉN NDJSON-linje
 * per assertion til stdout etter hvert som tester fullføres. Parent-prosessen
 * parser linjene og mapper dem til protokollens TestResult/Report.
 *
 * Isolasjon: hele denne prosessen kan drepes av parent ved timeout.
 * Bruker Vitest 4 sitt offentlige reporter-API (onTestCaseResult).
 */
import { startVitest } from "vitest/node";

const root = process.env.SANDBOX_ROOT;
if (!root) {
  process.stderr.write("SANDBOX_ROOT mangler\n");
  process.exit(2);
}

function emit(line: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(line) + "\n");
}

let passed = 0;
let failed = 0;

const reporter = {
  onTestCaseResult(testCase: any) {
    const result = testCase.result();
    const durationMs = testCase.diagnostic?.()?.duration;
    const name: string = testCase.name;

    if (result.state === "passed") {
      passed++;
      emit({ kind: "result", name, status: "pass", durationMs });
      return;
    }
    if (result.state !== "failed") {
      return; // skipped / pending teller ikke
    }

    failed++;
    const err = result.errors?.[0];
    if (err && (err.expected !== undefined || err.actual !== undefined)) {
      emit({
        kind: "result",
        name,
        status: "fail",
        failKind: "assertion",
        message: err.message ?? "Assertion feilet",
        expected: String(err.expected),
        actual: String(err.actual),
        durationMs,
      });
    } else {
      emit({
        kind: "result",
        name,
        status: "fail",
        failKind: "error",
        message: err?.message ?? "Testen kastet en feil",
        durationMs,
      });
    }
  },
};

try {
  const instance = await startVitest(
    "test",
    [],
    {
      root,
      watch: false,
      include: ["**/*.test.{ts,js,mjs,cjs}"],
      reporters: [reporter],
      passWithNoTests: false,
    },
    // configFile: false hindrer at rotens vitest.config.ts lastes inn i sandboxen.
    { configFile: false } as Parameters<typeof startVitest>[3],
  );
  await instance?.close();
} catch (e) {
  emit({ kind: "fatal", message: e instanceof Error ? e.message : String(e) });
  process.exit(1);
}

const total = passed + failed;
emit({ kind: "summary", passed, failed, total, correct: failed === 0 && total > 0 });
process.exit(0);
