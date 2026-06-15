import { Language } from "@oppgaveretter/protocol";

export interface PublishArgs {
  repo: string;
  server: string;
  token?: string;
  force: boolean;
}

export interface SubmitOptions {
  /** WebSocket-URL til serveren, f.eks. ws://127.0.0.1:8080 */
  server: string;
  assignment: string;
  filename: string;
  language: Language;
  content: string;
}

export interface PublishOptions {
  /** WebSocket-URL til serveren, f.eks. ws://127.0.0.1:8080 */
  server: string;
  filename: string;
  /** base64-enkodet git bundle av oppgave-repoet. */
  bundle: string;
  token: string;
  force?: boolean;
}

export interface SubmitArgs {
  file: string;
  assignment?: string;
  server: string;
}

export interface ListArgs {
  server: string;
  /** Språk å filtrere på (tomt sett ⇒ vis alle). */
  languages: Set<Language>;
}

export interface DetailsArgs {
  server: string;
  /** Eksakt oppgave-id å hente detaljer for. */
  name: string;
}
