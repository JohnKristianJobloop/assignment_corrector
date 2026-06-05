import type { Language, Report, TestResult } from "@oppgaveretter/protocol";
import type { Assignment } from "../registry.js";

export interface RunInput {
  assignment: Assignment;
  language: Language;
  /** Deltakerens innsendte kildekode. */
  content: string;
}

/**
 * Språknøytralt kjøre-grensesnitt. Kjernen i språk-agnostisismen: fremtidige
 * språk får egne Runner-implementasjoner (og senere egne servere bak nginx)
 * uten å endre protokoll/registry/connection-laget.
 */
export interface Runner {
  supports(language: string): boolean;
  /**
   * Validerer innsendingen mot oppgavens testfil. Kaller `onResult` per
   * assertion etter hvert som de fullføres, og returnerer aggregert rapport.
   */
  run(input: RunInput, onResult: (result: TestResult) => void): Promise<Report>;
}
