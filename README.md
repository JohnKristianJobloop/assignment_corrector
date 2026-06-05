# Oppgaveretter for kodehode

Et system som tar imot en innsendt oppgaveløsning, validerer den mot en kjent
testfil, og streamer tilbakemelding til deltakeren i sanntid over WebSocket.

Denne versjonen dekker **deterministiske JS/TS-oppgaver**: klienten sender en
løsningsfil, serveren slår opp riktig oppgave fra filnavnet, kjører oppgavens
testfil mot innsendt kode i en isolert child-prosess (Vitest), og sender hvert
assertion-resultat etterfulgt av en sluttrapport markert korrekt/ukorrekt.

Arkitekturen er bevisst språknøytral: kjørelogikken ligger bak en `Runner`-
abstraksjon og en runtime-nøytral protokoll, slik at flere språk senere kan få
egne runtime-servere bak en nginx-router uten å endre klient eller protokoll.

## Arkitektur

```
  CLI ──► CLI-klient ◄──── WebSocket (runtime-nøytral protokoll) ────► JS/TS-server
                                                                        ├─ AssignmentRegistry
                                                                        └─ Runner (JS/TS)
                                                                           └─ child process → Vitest → NDJSON-stream
```

## Krav

- Node.js 22+

## Kom i gang

```bash
npm install
npm run dev:server          # starter serveren på ws://127.0.0.1:8080 (env PORT)
```

I et eget terminalvindu:

```bash
npm run dev:cli -- <fil> [--assignment <id>] [--server ws://host:port]
```

Filnavnet (uten extension) avgjør hvilken oppgave som valideres. Eksempel:

```bash
npm run dev:cli -- ./arraysAndArrayMethods.ts
```

CLI-en skriver ✓/✗ per assertion og en sluttrapport, og avslutter med
exit-kode 0 hvis løsningen er korrekt, ellers 1.

## Prosjektstruktur

```
packages/
  protocol/    delt, runtime-nøytral WebSocket-kontrakt (typer + meldinger)
  server/      JS/TS-runtime-server: registry, Runner, sandbox, ws-håndtering
  cli/         submitSolution()-bibliotek + tynn CLI-wrapper
features/      Gherkin-akseptansetester (Cucumber): de kjørbare scenarioene
assignments/   kjente oppgaver, én mappe per oppgave (assignment.json + testfil)
```

## Legge til en ny oppgave

Lag en mappe under `assignments/<id>/` med:

- `assignment.json`: `{ id, displayName, language, entry, testFile }`
- en testfil som importerer løsningen via `entry` (f.eks. `./submission`)

Deltakerens innsending skrives til `<entry>.{ts|js}` i sandbox-mappa før testene
kjøres, så testfilen kan importere den extension-løst.

## Testing

To adskilte lag:

- **Akseptanse (BDD):** `npm run bdd` Cucumber kjører Gherkin-scenarioene mot en
  ekte server. Dette er primær verifisering av systemets atferd.
- **Indre unit-tester:** `npm test` Vitest tester serverkomponentene.
- `npm run verify` kjører begge.

> Merk: "scenario" = systemets egen atferd (BDD). "assertion" = deltakerens kode
> validert av oppgavens testfil. Vitest brukes i begge lag, men i ulik rolle.

## Sikkerhet

Innsendt kode kjøres i en isolert child-prosess med tidsavbrudd og begrenset
miljø. Dette er ikke en full sandbox. Sterkere isolasjon (f.eks. Docker per
innsending) er et naturlig neste steg.

## Utenfor scope (planlagt senere)

- AI-basert vurdering av ikke-deterministiske oppgaver (prosjektstruktur/designdokument)
- nginx-router + flere runtime-servere (f.eks. C#)
- Sterkere sandboxing, autentisering og persistert historikk

Se `design_docs.md` for fullstendig design.
