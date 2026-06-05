import { Before, Given, When } from "@cucumber/cucumber";
import { execSync } from "node:child_process";
import { OppgaveWorld } from "../support/world.js";

const CORRECT = `
public static class Solution
{
    public static int[] DoubleAll(int[] xs) => xs.Select(x => x * 2).ToArray();
    public static int SumArray(int[] xs) => xs.Sum();
    public static int[] FilterEven(int[] xs) => xs.Where(x => x % 2 == 0).ToArray();
}
`;

const INCORRECT = `
public static class Solution
{
    public static int[] DoubleAll(int[] xs) => xs;
    public static int SumArray(int[] xs) => 0;
    public static int[] FilterEven(int[] xs) => System.Array.Empty<int>();
}
`;

let dotnetChecked = false;
let dotnetOk = false;
function dotnetAvailable(): boolean {
  if (!dotnetChecked) {
    dotnetChecked = true;
    try {
      execSync("dotnet --version", { stdio: "ignore" });
      dotnetOk = true;
    } catch {
      dotnetOk = false;
    }
  }
  return dotnetOk;
}

// Hopp over C#-scenarioene når .NET-SDK ikke er installert (f.eks. enkelte CI).
Before({ tags: "@csharp" }, function () {
  if (!dotnetAvailable()) return "skipped";
});

Given("en kjent C#-oppgave {string}", function (this: OppgaveWorld, id: string) {
  this.assignmentId = id;
  this.language = "cs";
});

Given("en korrekt C#-løsning for oppgaven", function (this: OppgaveWorld) {
  this.solution = CORRECT;
});

Given("en feilaktig C#-løsning for oppgaven", function (this: OppgaveWorld) {
  this.solution = INCORRECT;
});

// .NET-bygg + kjøring er tregere enn JS — gi steget rikelig timeout.
When(
  "deltakeren sender inn C#-løsningen",
  { timeout: 120_000 },
  async function (this: OppgaveWorld) {
    await this.submit(`${this.assignmentId}.cs`);
  },
);
