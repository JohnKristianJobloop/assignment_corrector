/**
 * Runtime-nøytral WebSocket-protokoll mellom CLI-klient og runtime-server.
 * Holdes språkuavhengig slik at en fremtidig nginx-router og per-runtime
 * servere kan dele samme kontrakt.
 */
import type { Report, TestResult } from "./report.js";

export type Language = "js" | "ts" | "cs";

/** Client → Server: én innsending av en løsningsfil. */
export interface SubmitMessage {
  type: "submit";
  /** Oppgave-id valgt av klient (faller tilbake på filnavn-utledning på server). */
  assignment: string;
  /** Brukerens filnavn (jf. Gherkin "filnavn gitt fra bruker"). */
  filename: string;
  language: Language;
  content: string;
}

export type ClientMessage = SubmitMessage;

/** Oppgave gjenkjent — validering starter. */
export interface AcceptedMessage {
  type: "accepted";
  assignment: string;
  total: number;
}

/** Ukjent oppgave / ugyldig innsending. */
export interface RejectedMessage {
  type: "rejected";
  reason: string;
}

/** Ett streamet assertion-resultat (bærer hele den diskriminerte unionen). */
export type TestResultMessage = { type: "test-result" } & TestResult;

/** Aggregert sluttrapport. */
export type ReportMessage = { type: "report" } & Report;

/** Uventet serverfeil under kjøring. */
export interface ErrorMessage {
  type: "error";
  message: string;
}

export type ServerMessage =
  | AcceptedMessage
  | RejectedMessage
  | TestResultMessage
  | ReportMessage
  | ErrorMessage;
