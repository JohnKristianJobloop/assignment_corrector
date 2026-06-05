# Oppgaveretter for kodehode. Designdokument (MVP)

## Bakgrunn

Kodehode trenger et system som tar imot en innsendt oppgaveløsning, validerer den mot
en kjent testfil, og gir deltakeren tilbakemelding i sanntid. Prosjektet starter helt
fra bunnen av.

Denne første leveransen dekker **kun deterministiske oppgaver for JS og TS**: klienten
sender en løsningsfil over WebSocket, serveren slår opp riktig oppgave basert på filnavn,
kjører den kjente testfilen mot innsendt kode i en isolert child-prosess (Vitest), og
streamer hvert assertion-resultat tilbake til klienten etterfulgt av en sluttrapport
markert korrekt/ukorrekt.

**Viktig designprinsipp:** Selv om MVP kun håndterer JS/TS, skal arkitekturen *ikke*
låses til ett språk. Kjøre-logikken isoleres bak en `Runner`-abstraksjon og en
runtime-nøytral WebSocket-protokoll. Senere skal hvert språk få sin egen runtime-server,
med en nginx-router foran som dispatcher innkommende forespørsler til riktig server basert
på målruntime. AI-basert vurdering av ikke-deterministiske oppgaver er bevisst utsatt.

### Foreløbig design:
- **Stack:** TypeScript / Node.js (delt, typedefinert protokoll mellom server og CLI)
- **Testrunner (indre/validering):** Vitest (håndterer JS+TS uten egen transpilering, custom reporter for streaming)
- **BDD-runner (akseptanse):** @cucumber/cucumber. Gherkin-scenarioene fra skissen blir den kjørbare akseptansesuiten for selve applikasjonen. 
- **Arbeidsflyt:** Fullt outside-in (double-loop): feature rød -> unit-tester -> implementer til grønn
- **Sandboxing:** Child process med timeout og isolert temp-workspace
- **Omfang:** Deterministisk JS/TS. AI-vurdering designes som fremtidig utvidelse.

### To testlag (ikke bland dem)
1. **Akseptanse / BDD (Cucumber + Gherkin):** beskriver *vårt systems* atferd. Klient sender fil ->
   server validerer -> streamer rapport. `.feature`-filer drevet av step-definisjoner som booter en
   ekte server og kobler til en ekte klient. Dette er det vi designer outside-in.
2. **Indre validering (Vitest):** *mekanismen serveren bruker* til å kjøre deltakerens innsending mot
   en kjent testfil.

Vokabular holdes adskilt i koden/dokumentene: "scenario" (vårt system) vs. "assertion" (deltakerkode).

---

## Arkitektur

```
            ┌──────────────┐   WebSocket (runtime-nøytral protokoll)   ┌────────────────────────┐
  CLI ─────►│  CLI client  │◄──────────────────────────────────────────►│  JS/TS runtime server  │
            └──────────────┘                                            │  ┌──────────────────┐  │
                                                                        │  │ Assignment       │  │
   (fremtid: nginx router foran flere runtime-servere. En per språk)   │  │ registry         │  │
                                                                        │  ├──────────────────┤  │
                                                                        │  │ Runner (JS/TS)   │  │
                                                                        │  │  -> child process │  │
                                                                        │  │  -> Vitest +      │  │
                                                                        │  │    NDJSON reporter│ │
                                                                        │  └──────────────────┘  │
                                                                        └────────────────────────┘
```

Grensesnittet "én server = én runtime-familie" er det som senere splittes bak nginx.
Protokollen, oppgaveoppslaget og rapportformatet holdes derfor språknøytrale.

---

## Repo-struktur (npm workspaces monorepo)

```
assignment_corrector/
├── package.json                # workspaces: packages/*, type: module
├── tsconfig.base.json
├── features/                   # AKSEPTANSE: Gherkin .feature-filer + step-definisjoner
│   ├── deterministic.feature   # de tre scenarioene fra skissen (rett / feil / ukjent)
│   ├── steps/                  # step-definisjoner (Given/When/Then)
│   └── support/world.ts        # World: booter server på efemer port, holder klient + meldinger
├── cucumber.cjs                # Cucumber-konfig (glob til features + steps, tsx-loader)
├── packages/
│   ├── protocol/               # delt, runtime-nøytral kontrakt (typer + meldingsskjema)
│   │   ├── src/messages.ts     # ClientMessage / ServerMessage unions
│   │   └── src/report.ts       # TestResult, Report
│   ├── server/                 # JS/TS runtime-server
│   │   ├── src/createServer.ts # PROGRAMMATISK oppstart -> { url, close() } (efemer port for BDD)
│   │   ├── src/index.ts        # tynn bin-wrapper: createServer() på env PORT
│   │   ├── src/connection.ts   # håndterer én klientforbindelse / submit-flyt
│   │   ├── src/registry.ts     # AssignmentRegistry: navn -> oppgave-metadata
│   │   ├── src/runner/Runner.ts        # språknøytralt interface
│   │   ├── src/runner/JsTsRunner.ts    # Vitest-basert implementasjon
│   │   ├── src/runner/reporter.ts      # custom Vitest-reporter (NDJSON-stream)
│   │   ├── src/sandbox.ts      # temp-workspace + child process + timeout
│   │   └── test/               # Vitest unit-tester (registry, sandbox, reporter-parse)
│   └── cli/                    # CLI-klient
│       ├── src/client.ts       # BIBLIOTEK: submitSolution(opts): AsyncIterable<ServerMessage>
│       └── src/index.ts        # tynn CLI-wrapper rundt client.ts
└── assignments/                # kjente oppgaver, én mappe per oppgave
    └── arraysAndArrayMethods/
        ├── assignment.json     # { id, displayName, language, entry, testFile }
        └── arraysAndArrayMethods.test.ts
```

---

## Delt protokoll (`packages/protocol`)

Runtime-nøytrale meldingstyper, importeres av både server og CLI.

**Client -> Server**
- `{ type: "submit", assignment: string, filename: string, language: "js" | "ts", content: string }`
  - `filename` er brukerens filnavn (jf. Gherkin "filnavn gitt fra bruker"); serveren utleder
    oppgave-id fra filnavnet og validerer mot registry.

**Server -> Client** (streamet i rekkefølge)
- `{ type: "accepted", assignment, total }`:  oppgave gjenkjent, validering starter
- `{ type: "rejected", reason }`: ukjent oppgave / ugyldig innsending
- `{ type: "test-result", name, status: "pass" | "fail", durationMs?, error?, expected?, actual? }`
- `{ type: "report", correct: boolean, passed, failed, total }`: sluttrapport
- `{ type: "error", message }`

`TestResult` og `Report` defineres i `report.ts` og gjenbrukes på tvers.

---

## Server

### Oppstart + WebSocket (`createServer.ts`, `index.ts`, `connection.ts`)
- `createServer()` starter en `ws`-server programmatisk og returnerer `{ url, close() }`
  (efemer port når ingen er oppgitt. Gjør BDD-oppstart per scenario trivielt).
- `index.ts` er en tynn bin-wrapper som kaller `createServer()` på env `PORT` (default 8080).
- Per forbindelse: ta imot `submit`, kjør valideringsflyt, stream `ServerMessage`-er, lukk/hold åpen.

### Assignment registry (`registry.ts`)
- Leser `assignments/*/assignment.json` ved oppstart til et `Map<id, Assignment>`.
- `resolve(filename)`: strip extension fra brukerens filnavn -> oppgave-id -> oppslag.
  Ukjent id ⇒ `rejected`. (Jf. Gherkin: "Server skal validere filnavn mot kjente oppgaver".)
- `Assignment`: `{ id, displayName, language, entry, testFilePath, total? }`.

### Runner-abstraksjon (`runner/Runner.ts`)
```ts
interface Runner {
  supports(language: string): boolean;
  run(input: RunInput, onResult: (r: TestResult) => void): Promise<Report>;
}
```
Dette interfacet er kjernen i språk-agnostisismen. Fremtidige språk får egne `Runner`-er
(og senere egne servere bak nginx) uten å endre protokoll/registry/connection-laget.

### JS/TS-runner (`runner/JsTsRunner.ts` + `sandbox.ts` + `runner/reporter.ts`)
1. `sandbox.ts` lager en isolert temp-mappe (`fs.mkdtemp`), skriver innsendt `content` til
   et fast filnavn (f.eks. `submission.ts`/`.js`), og kopierer oppgavens testfil dit.
   Testfilen importerer løsningen via et fast, extension-løst spec (f.eks. `./submission`)
   slik at både JS og TS resolves av Vitest.
2. Spawner `vitest run` som **child process** med `cwd` = temp-mappa, en custom reporter
   (`reporter.ts`) og en hard **timeout** (kill ved overskridelse). Begrenset env.
3. `reporter.ts` bruker Vitest reporter-hooks (`onTaskUpdate`/`onFinished`) til å skrive
   **NDJSON** (én linje per assertion-resultat) til stdout etter hvert som tester fullføres.
4. Parent leser child stdout linje-for-linje, parser hver NDJSON-linje til `TestResult`,
   og kaller `onResult` -> som streames videre til klienten i sanntid.
5. Sluttrapport aggregeres (`passed`/`failed`/`total`, `correct = failed === 0`), temp-mappa
   ryddes opp i `finally`.

Vitest kjører TS natively via esbuild, så ingen separat transpilering trengs for TS-innsendinger.

### Sikkerhet (MVP-nivå)
Child-prosess + timeout + isolert cwd + begrenset env. Dokumenteres som "ikke en full sandbox";
sterkere isolasjon (Docker per innsending / ressursgrenser) er naturlig neste steg og passer
per-runtime-server-modellen.

---

## CLI-klient (`packages/cli`)

Delt i to lag slik at BDD-stegene kan kalle klientlogikken direkte uten å spawne en prosess:

- **`client.ts` (bibliotek):** `submitSolution(opts): AsyncIterable<ServerMessage>` kobler til
  WebSocket, sender `submit`, og yield-er hver `ServerMessage` etter hvert som den kommer. Dette er
  sømmen både CLI og Cucumber-steg bruker.
- **`index.ts` (tynn CLI-wrapper):** `oppgaveretter <fil> [--assignment <id>] [--server ws://localhost:8080]`.
  Leser fila, utleder `language` fra extension og default `assignment` fra filnavn, konsumerer
  `submitSolution(...)`, skriver ✓/✗-linjer fortløpende + sluttrapport. Exit-kode 0 hvis `correct`, ellers 1.

---

## Akseptansetester (BDD `features/`)

Den kjørbare manifestasjonen av Gherkin-skissen. Driver designet outside-in.

- **`deterministic.feature`** inneholder de tre scenarioene fra skissen: oppgave gjenkjent + alt rett,
  alt feil (`correct: false`), og ukjent oppgave (`rejected`).
- **`support/world.ts`** (Cucumber World): `Before`-hook booter `createServer()` på efemer port og
  lagrer URL; `After`-hook kaller `close()`. Holder samlede `ServerMessage`-er for assertions.
- **`steps/`**: Given (kjent oppgave finnes i registry), When (kjør `submitSolution` mot server med en
  gitt løsningsfil), Then (assert på de streamede meldingene. Rekkefølge, `pass`/`fail`, sluttrapportens
  `correct`-flagg). Step-definisjonene bruker **klientbiblioteket** og **`createServer`** direkte.

### Gherkin-scenarioer fra skissen
```gherkin
Scenario: en bruker poster en JS-oppgavefil som valideres mot en kjent struktur
    Gitt vi har en kjent oppgave som heter arraysAndArrayMethods
    Og vi har en kjent testfil for å validere oppgaven
    Når server mottar en fil som representerer implementert oppgave fra client
    Da skal serveren validere oppgaven mot testfilen
    Og sende tilbake en rapport basert på kvalitet av oppgaven

Scenario: alt feiler
    Gitt vi har en kjent oppgave som heter arraysAndArrayMethods
    Og vi har en kjent testfil for å validere oppgaven
    Når server mottar en fil som representerer en implementert oppgave
    Og serveren validerer oppgaven, men alle asserts failer
    Da skal resultat fra assertions sendes tilbake, markert som ukorrekt

Scenario: alt er rett
    Gitt vi har en kjent oppgave som heter arraysAndArrayMethods
    Og vi har en kjent testfil for å validere oppgaven
    Når server mottar en fil som representerer en implementert oppgave fra client
    Da skal server validere oppgaven mot testfilen og alt er korrekt
    Og resultat fra assertions skal sendes tilbake til client markert som korrekt
```

### Outside-in arbeidsflyt (double-loop)
1. Skriv/aktiver et scenario i `.feature` -> **rødt** (ytre loop).
2. Driv ned til **Vitest unit-tester** for komponenten som mangler (registry-oppslag, sandbox-timeout,
   NDJSON-reporter-parsing) -> implementer til **grønt** (indre loop).
3. Tilbake til scenarioet -> grønt. Gjenta per scenario.

---

## Eksempeloppgave (dekker Gherkin-scenarioene)

`assignments/arraysAndArrayMethods/`:
- `assignment.json`: `{ "id": "arraysAndArrayMethods", "language": "ts", "entry": "submission", "testFile": "arraysAndArrayMethods.test.ts" }`
- `arraysAndArrayMethods.test.ts`: Vitest-tester (`describe`/`it`/`expect`) som importerer
  forventede eksporter fra `./submission` og asserterer mot kjente input/output.

Dette gir grunnlag for alle tre scenarioene: gjenkjent oppgave, alt feiler (alle `fail` ->
`correct: false`), og alt korrekt (alle `pass` -> `correct: true`).

---

## Tooling
- `npm` workspaces, ESM (`"type": "module"`), `tsconfig.base.json` med `composite`-prosjekter.
- Dev: `tsx` for å kjøre server/CLI/steg uten byggesteg.
- Avhengigheter: `ws`, `vitest`, `@cucumber/cucumber`, `tsx`, `typescript`, `@types/ws`, `@types/node`.
- Scripts: `npm run dev:server`, `npm run dev:cli`, `npm test` (Vitest unit), `npm run bdd` (Cucumber),
  `npm run verify` (bdd + test).

---

## Verifisering (ende-til-ende)

Primær verifisering er **akseptansesuiten**.

1. **Installer:** `npm install` i rot.
2. **Akseptanse (BDD):** `npm run bdd` -> de tre scenarioene (rett / feil / ukjent) grønne.
3. **Unit:** `npm test` -> Vitest-tester for registry, sandbox-timeout og NDJSON-reporter-parsing grønne.
4. **Manuell røyktest:** `npm run dev:server`, så `npm run dev:cli -- ./arraysAndArrayMethods.ts` mot
   en korrekt løsning -> streamede ✓-linjer, `correct: true`, exit-kode 0. Send en feil løsning ->
   ✗ med expected/actual, `correct: false`, exit-kode 1.
5. **Streaming-sjekk:** kunstig treghet i én assertion -> bekreft at `test-result` kommer fortløpende.
6. **Sandbox-sjekk:** innsending med uendelig løkke -> timeout dreper child-prosessen, serveren
   svarer `error` uten å henge.

---

## Bevisst utenfor scope (fremtidige steg)
- AI-basert vurdering av ikke-deterministiske oppgaver (filstruktur + designdokument via Claude).
- nginx-router + flere runtime-servere (f.eks. C#): `Runner`/protokoll er allerede forberedt for dette.
- Sterkere sandboxing (Docker per innsending), autentisering, og persistert historikk/rapporter.
