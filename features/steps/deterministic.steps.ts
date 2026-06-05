import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { OppgaveWorld } from "../support/world.js";

const CORRECT = `
export const doubleAll = (xs: number[]): number[] => xs.map((x) => x * 2);
export const sumArray = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
export const filterEven = (xs: number[]): number[] => xs.filter((x) => x % 2 === 0);
`;

const INCORRECT = `
export const doubleAll = (xs: number[]): number[] => xs;
export const sumArray = (_xs: number[]): number => 0;
export const filterEven = (_xs: number[]): number[] => [];
`;

Given("en kjent oppgave {string}", function (this: OppgaveWorld, id: string) {
  this.assignmentId = id;
  this.language = "ts";
});

Given("en ukjent oppgave {string}", function (this: OppgaveWorld, id: string) {
  this.assignmentId = id;
  this.language = "ts";
});

Given("en korrekt løsning for oppgaven", function (this: OppgaveWorld) {
  this.solution = CORRECT;
});

Given("en feilaktig løsning for oppgaven", function (this: OppgaveWorld) {
  this.solution = INCORRECT;
});

Given("en vilkårlig løsning", function (this: OppgaveWorld) {
  this.solution = "export const x = 1;";
});

When("deltakeren sender inn løsningen", async function (this: OppgaveWorld) {
  await this.submit(`${this.assignmentId}.ts`);
});

Then("blir innsendingen akseptert", function (this: OppgaveWorld) {
  assert.ok(
    this.messages.some((m) => m.type === "accepted"),
    "forventet en accepted-melding",
  );
});

Then("blir innsendingen avvist", function (this: OppgaveWorld) {
  assert.ok(
    this.messages.some((m) => m.type === "rejected"),
    "forventet en rejected-melding",
  );
});

Then("alle assertions rapporteres som bestått", function (this: OppgaveWorld) {
  const results = this.messages.filter((m) => m.type === "test-result");
  assert.ok(results.length > 0, "forventet minst ett test-result");
  assert.ok(
    results.every((r) => r.status === "pass"),
    "forventet at alle assertions bestod",
  );
});

Then("minst én assertion rapporteres som feilet", function (this: OppgaveWorld) {
  const results = this.messages.filter((m) => m.type === "test-result");
  assert.ok(
    results.some((r) => r.status === "fail"),
    "forventet minst én feilet assertion",
  );
});

Then("sluttrapporten er markert som korrekt", function (this: OppgaveWorld) {
  const report = this.messages.find((m) => m.type === "report");
  assert.ok(report && report.type === "report" && report.correct === true);
});

Then("sluttrapporten er markert som ukorrekt", function (this: OppgaveWorld) {
  const report = this.messages.find((m) => m.type === "report");
  assert.ok(report && report.type === "report" && report.correct === false);
});
