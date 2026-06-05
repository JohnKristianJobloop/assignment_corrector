/**
 * Runtime-nøytrale resultattyper. Beskriver ÉN assertion (test-result) og den
 * aggregerte sluttrapporten. Gjenbrukes av server, CLI og BDD-steg.
 *
 * `TestResult` er en diskriminert union slik at typesystemet GARANTERER hvilke
 * felter som finnes — ingen optional null-håndtering hos konsumenten:
 *   - status === "pass"                      → ingen feilfelter
 *   - status === "fail" && kind === "assertion" → message + expected + actual
 *   - status === "fail" && kind === "error"     → message (kastet feil, ingen diff)
 */

interface ResultBase {
  /** Navn på enkelt-assertion (it-blokk). */
  name: string;
  durationMs?: number;
}

export interface PassResult extends ResultBase {
  status: "pass";
}

/** En `expect`-mismatch der vi har både forventet og faktisk verdi. */
export interface AssertionFailure extends ResultBase {
  status: "fail";
  kind: "assertion";
  message: string;
  expected: string;
  actual: string;
}

/** En kastet feil / runtime-exception uten meningsfull diff. */
export interface ErrorFailure extends ResultBase {
  status: "fail";
  kind: "error";
  message: string;
}

export type FailResult = AssertionFailure | ErrorFailure;
export type TestResult = PassResult | FailResult;

export type TestStatus = TestResult["status"];

export interface Report {
  /** Sann kun når ingen assertions feilet og minst én ble kjørt. */
  correct: boolean;
  passed: number;
  failed: number;
  total: number;
}
