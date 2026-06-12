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

/**
 * Client → Server: publiser en ny oppgave. Bærer et git-bundle (base64) av
 * forfatterens oppgave-repo. Serveren verifiserer, self-tester referanse-
 * løsningen, og legger oppgaven i assignments-mappa hvis alt går igjennom.
 */
export interface PublishAssignmentMessage {
  type: "publish-assignment";
  /** Visningsnavn på bunten, f.eks. "min-oppgave.bundle". */
  filename: string;
  /** base64-enkodet git bundle av oppgave-repoet (HEAD). */
  bundle: string;
  encoding: "base64";
  /** Admin-token; sammenlignes med serverens PUBLISH_TOKEN. */
  token: string;
  /** Tillat overskriving av en oppgave med samme id (default false). */
  force?: boolean;
}

export type ClientMessage = SubmitMessage | PublishAssignmentMessage;

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

/** Oppgave publisert og lagt i registry (etter vellykket self-test). */
export interface PublishedMessage {
  type: "published";
  assignment: string;
}

export type ServerMessage =
  | AcceptedMessage
  | RejectedMessage
  | TestResultMessage
  | ReportMessage
  | ErrorMessage
  | PublishedMessage;
