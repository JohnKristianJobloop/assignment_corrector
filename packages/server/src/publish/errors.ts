/**
 * Felles basis for feil som skyldes klientens innsending (ugyldig bunt,
 * ugyldig oppgave, self-test som feiler). Disse mappes til `rejected` med
 * begrunnelse; alle andre feil mappes til `error`.
 */
export class RejectedError extends Error {}
