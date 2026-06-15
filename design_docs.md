# Oppgaveretter for kodehode. Designdokument (MVP)

## Bakgrunn

Kodehode trenger et system som tar imot en innsendt oppgaveløsning, validerer den mot
en kjent testfil, og gir deltakeren tilbakemelding i sanntid. Prosjektet starter helt
fra bunnen av.

Leveransen dekker **deterministiske oppgaver for JS, TS og C#**: klienten
sender en løsningsfil over WebSocket, serveren slår opp riktig oppgave basert på filnavn,
kjører den kjente testfilen mot innsendt kode i en isolert child-prosess (Vitest for
JS/TS, `dotnet` + xUnit for C#), og streamer hvert assertion-resultat tilbake til klienten
etterfulgt av en sluttrapport markert korrekt/ukorrekt.

**Viktig designprinsipp:** Arkitekturen er *ikke* låst til ett språk. Kjøre-logikken
isoleres bak en `Runner`-abstraksjon og en runtime-nøytral WebSocket-protokoll. Et nytt
språk legges til som en ny `Runner` i serveren — klient og protokoll er uendret (slik C#
ble lagt til). Senere skal hvert språk kunne få sin egen dedikerte runtime-server, med en
nginx-router foran som dispatcher innkommende forespørsler til riktig server basert på
målruntime. AI-basert vurdering av ikke-deterministiske oppgaver er bevisst utsatt.

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
│   ├── server/                 # runtime-server (JS/TS + C#)
│   │   ├── src/createServer.ts # PROGRAMMATISK oppstart -> { url, close() } (efemer port for BDD)
│   │   ├── src/index.ts        # tynn bin-wrapper: createServer() på env PORT
│   │   ├── src/connection.ts   # håndterer én klientforbindelse: submit / publish / list / details-flyt; velger runner per språk
│   │   ├── src/registry.ts     # AssignmentRegistry: navn -> oppgave-metadata
│   │   ├── src/normalizeExports.ts     # AST: setter export foran top-level deklarasjoner (JS/TS)
│   │   ├── src/runner/Runner.ts        # språknøytralt interface
│   │   ├── src/runner/JsTsRunner.ts    # Vitest-basert implementasjon
│   │   ├── src/runner/vitestEntry.ts   # child-entry: kjører Vitest, NDJSON-stream
│   │   ├── src/sandbox.ts      # JS/TS temp-workspace (normaliserer + skriver innsending)
│   │   ├── src/runner/CSharpRunner.ts  # .NET-basert implementasjon (dotnet run)
│   │   ├── src/runner/csharpSandbox.ts # C# temp-prosjekt (mal + innsending + testfil)
│   │   ├── src/runner/csharp-template/ # project.csproj (net10, xUnit) + Harness.cs (NDJSON)
│   │   └── test/               # Vitest unit-tester (registry, sandbox, normalize, C#-parse)
│   └── cli/                    # CLI-klient
│       ├── src/models/client.ts   # BIBLIOTEK: stream(server, msg, terminal): AsyncIterable<ServerMessage>
│       ├── src/models/submit.ts   # submit-flyt: parseSubmitArgs + runSubmit + submitSolution()
│       ├── src/models/publish.ts  # publish-flyt: parsePublishArgs + runPublish + git-bundle
│       ├── src/models/list.ts     # list-flyt: parseListArgs + runList + språkfilter
│       ├── src/models/details.ts  # details-flyt: parseDetailsArgs + runDetails + eksakt-id-oppslag
│       └── src/index.ts        # tynn CLI-wrapper: ruter publish / list / details / submit
└── assignments/                # kjente oppgaver, én mappe per oppgave
    ├── arraysAndArrayMethods/
    │   ├── assignment.json     # { id, displayName, language, entry, testFile, details? }
    │   └── arraysAndArrayMethods.test.ts
    └── csharpArrays/           # C#-eksempel
        ├── assignment.json     # { id, language: "cs", entry: "Submission", testFile: "Tests.cs" }
        └── Tests.cs            # xUnit-tester mot kontrakten Solution.*
```

---

## Delt protokoll (`packages/protocol`)

Runtime-nøytrale meldingstyper, importeres av både server og CLI.

**Client -> Server**
- `{ type: "submit", assignment: string, filename: string, language: "js" | "ts" | "cs", content: string }`
  - `filename` er brukerens filnavn (jf. Gherkin "filnavn gitt fra bruker"); serveren utleder
    oppgave-id fra filnavnet og validerer mot registry.
  - `language` velger runner på serveren. Da C# ble lagt til vokste denne unionen med `"cs"`;
    alt annet i protokollen (og hele klientbiblioteket) var uendret.
- `{ type: "list-assignments" }`: be om hele oppgaveregisteret. Serveren svarer med én
  `assignments-list`. Filtrering på språk/filtype gjøres klient-side på det returnerte settet.
- `{ type: "assignment-details-request", name: string }`: be om detaljene til én oppgave,
  slått opp på **eksakt id** (`name`). Serveren svarer med én `assignment-details`, eller
  `rejected` ved ukjent id.

**Server -> Client** (streamet i rekkefølge)
- `{ type: "accepted", assignment, total }`:  oppgave gjenkjent, validering starter
- `{ type: "rejected", reason }`: ukjent oppgave / ugyldig innsending
- `{ type: "test-result", name, status: "pass" | "fail", durationMs?, error?, expected?, actual? }`
- `{ type: "report", correct: boolean, passed, failed, total }`: sluttrapport
- `{ type: "error", message }`
- `{ type: "assignments-list", assignments: AssignmentSummary[] }`: svar på `list-assignments`,
  der `AssignmentSummary = { id, displayName?, language, testFile }`
- `{ type: "assignment-details", id, displayName?, language, details? }`: svar på
  `assignment-details-request`

`TestResult` og `Report` defineres i `report.ts` og gjenbrukes på tvers.

---

## Server

### Oppstart + WebSocket (`createServer.ts`, `index.ts`, `connection.ts`)
- `createServer()` starter en `ws`-server programmatisk og returnerer `{ url, close() }`
  (efemer port når ingen er oppgitt. Gjør BDD-oppstart per scenario trivielt).
- `index.ts` er en tynn bin-wrapper som kaller `createServer()` på env `PORT` (default 8080).
- Per forbindelse: ta imot `submit`/`publish-assignment`/`list-assignments`/`assignment-details-request`,
  kjør riktig flyt, stream `ServerMessage`-er, lukk/hold åpen. `list-assignments` og
  `assignment-details-request` besvares synkront (`assignments-list` hhv. `assignment-details`,
  ingen runner involvert).

### Assignment registry (`registry.ts`)
- Leser `assignments/*/assignment.json` ved oppstart til et `Map<id, Assignment>`.
- `resolve(filename)`: strip extension fra brukerens filnavn -> oppgave-id -> oppslag.
  Ukjent id ⇒ `rejected`. (Jf. Gherkin: "Server skal validere filnavn mot kjente oppgaver".)
- `get(id)`: eksakt oppslag på oppgave-id (ingen extension-stripping). Brukes av
  `assignment-details-request`, der `--name` er en eksakt id.
- `list()`: returnerer sorterte `AssignmentSummary`-er (`{ id, displayName?, language, testFile }`)
  for `list-assignments`-flyten.
- `Assignment`: `{ id, displayName, language, entry, testFilePath, details?, total? }`.

### Runner-abstraksjon (`runner/Runner.ts`)
```ts
interface Runner {
  supports(language: string): boolean;
  run(input: RunInput, onResult: (r: TestResult) => void): Promise<Report>;
}
```
Dette interfacet er kjernen i språk-agnostisismen. `createServer` bygger en liste av
runnere (default `[JsTsRunner, CSharpRunner]`), og `connection.ts` velger den første som
`supports(language)` per innsending. Nye språk får egne `Runner`-er (og senere egne servere
bak nginx) uten å endre protokoll/registry/connection-laget — slik C#-runneren ble lagt til.

### JS/TS-runner (`runner/JsTsRunner.ts` + `sandbox.ts` + `runner/vitestEntry.ts`)
1. `sandbox.ts` lager en isolert temp-mappe (`fs.mkdtemp`), **normaliserer** innsendt
   `content` (se under), skriver det til et fast filnavn (f.eks. `submission.ts`/`.js`), og
   kopierer oppgavens testfil dit. Testfilen importerer løsningen via et fast, extension-løst
   spec (f.eks. `./submission`) slik at både JS og TS resolves av Vitest.
   - **Normalisering (`normalizeExports.ts`):** nybegynnere glemmer ofte `export`, og da
     resolver testfilens import til `undefined`. Via TypeScript-AST settes `export` automatisk
     inn foran alle top-level verdideklarasjoner (funksjoner, `const`/`let`/`var`, `class`,
     `enum`) som mangler det. C# har ingen tilsvarende normalisering ennå (se C#-runner).
2. Spawner `vitest run` som **child process** med `cwd` = temp-mappa, en custom reporter
   (`reporter.ts`) og en hard **timeout** (kill ved overskridelse). Begrenset env.
3. `reporter.ts` bruker Vitest reporter-hooks (`onTaskUpdate`/`onFinished`) til å skrive
   **NDJSON** (én linje per assertion-resultat) til stdout etter hvert som tester fullføres.
4. Parent leser child stdout linje-for-linje, parser hver NDJSON-linje til `TestResult`,
   og kaller `onResult` -> som streames videre til klienten i sanntid.
5. Sluttrapport aggregeres (`passed`/`failed`/`total`, `correct = failed === 0`), temp-mappa
   ryddes opp i `finally`.

Vitest kjører TS natively via esbuild, så ingen separat transpilering trengs for TS-innsendinger.

### C#-runner (`runner/CSharpRunner.ts` + `runner/csharpSandbox.ts` + `runner/csharp-template/`)

C# (.NET 10+) ble lagt til som en ny `Runner` i samme Node-server — ikke en egen .NET-server.
Klientbiblioteket og meldingsformene er uendret; protokollens `Language`-union vokste med `"cs"`.

1. `csharpSandbox.ts` lager en isolert temp-mappe under `.sandbox/`, kopierer prosjekt-malen
   (`csharp-template/project.csproj` + `Harness.cs`), skriver innsendingen til `<entry>.cs`, og
   kopierer inn oppgavens xUnit-testfil. Alt kompileres sammen til ett `dotnet`-prosjekt.
2. `CSharpRunner` spawner `dotnet run` som **child-prosess** (`detached` → egen prosessgruppe,
   slik at en timeout kan drepe HELE treet: dotnet + msbuild + testhost). Begrenset env.
3. `Harness.cs` (kjører som programmets entry-point) oppdager parameterløse `[Fact]`-metoder
   via refleksjon, kjører hver enkelt med xUnit sine egne assertions, og skriver **NDJSON**
   til stdout — én linje per test — i nøyaktig samme `{kind:"result"|"summary"|"fatal"}`-form
   som `vitestEntry.ts`. xUnit-assertion-feil parses til `expected`/`actual`; andre unntak blir
   `error`. Build-/kompilatorfeil (ingen sluttrapport) rapporteres som `error` med utdrag.
4. Parent leser stdout linje-for-linje, filtrerer bort ikke-NDJSON-støy (linjer som ikke
   starter med `{`), og mapper hver linje til `TestResult`/`Report` — gjenbruk av samme
   strøm-/parse-mønster som JS/TS-runneren. Temp-mappa ryddes i `finally`.

**Designvalg (avvik fra opprinnelig skisse):** i stedet for en custom VSTest-logger oppdaget via
`--test-adapter-path` (skjør, eget byggeartefakt) brukes et lite refleksjons-harness drevet av
`dotnet run`. Det beholder ekte xUnit-assertions (og dermed `expected`/`actual`-diff), er
offline-deterministisk, og lett å drepe. csproj refererer kun `xunit`, ikke `Microsoft.NET.Test.Sdk`.

**Kjente C#-begrensninger (planlagt):**
- **Ingen normalisering:** ingen motstykke til JS/TS sin `export`-innsetting. Innsendingen må
  selv definere den `public` kontrakten testfilen refererer (ingen auto-`public`/wrapping), og
  kan **ikke** bruke top-level statements — de kolliderer med harnessens egen entry-point.
- **Kun `[Fact]`:** parameterløse `[Fact]`-tester kjøres; `[Theory]`/`[InlineData]` oppdages ikke ennå.
- **Kun script-/enkeltfiler:** komplette flerfils-prosjekter krever en protokollutvidelse
  (dagens `content` er én streng).

### Sikkerhet (MVP-nivå)
Child-prosess + timeout + isolert cwd + begrenset env. Dokumenteres som "ikke en full sandbox";
sterkere isolasjon (Docker per innsending / ressursgrenser) er naturlig neste steg og passer
per-runtime-server-modellen.

---

## CLI-klient (`packages/cli`)

Delt i to lag slik at BDD-stegene kan kalle klientlogikken direkte uten å spawne en prosess:

- **`client.ts` (bibliotek):** `stream(server, message, terminal): AsyncIterable<ServerMessage>` kobler til
  WebSocket, sender én klientmelding, og yield-er hver `ServerMessage` til en terminal-melding.
  `submitSolution`, `publishAssignment`, `listAssignments` og `requestDetails` er tynne innpakninger
  rundt den. Dette er sømmen både CLI og Cucumber-steg bruker.
- **`index.ts` (tynn CLI-wrapper):** ruter på første argument — `publish` → `runPublish`,
  `list` → `runList`, `details` → `runDetails`, ellers `runSubmit`.
  - **submit** (default): `oppgaveretter <fil> [--assignment <id>] [--server ws://host:port]`.
    Leser fila, utleder `language` fra extension og default `assignment` fra filnavn, konsumerer
    `submitSolution(...)`, skriver ✓/✗-linjer + sluttrapport. Exit-kode 0 hvis `correct`, ellers 1.
  - **list** (`models/list.ts`): `oppgaveretter list [-l|--language <språk/filtype>] [--server ...]`.
    Sender `list-assignments`, skriver ut id/språk/visningsnavn. `-l` filtrerer klient-side og godtar
    språkkode (`ts`), filtype (`.ts`) eller filnavn (`foo.ts`), kommaseparert eller med gjentatt flagg;
    ukjent verdi gir exit-kode 2.
  - **details** (`models/details.ts`): `oppgaveretter details --name <id> [--server ...]`.
    Sender `assignment-details-request` med eksakt id (`--name`/`-n`, også `--name=<id>`), skriver ut
    visningsnavn/språk + `details`-teksten. Manglende `--name` gir exit-kode 2; ukjent id besvares med
    `rejected`.

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

`assignments/csharpArrays/` (C#-eksempel):
- `assignment.json`: `{ "id": "csharpArrays", "language": "cs", "entry": "Submission", "testFile": "Tests.cs" }`
- `Tests.cs`: xUnit `[Fact]`-tester som kaller kontrakten innsendingen skal implementere
  (`public static class Solution` med `DoubleAll`/`SumArray`/`FilterEven`). C# refererer typer
  ved navn, så oppgaven definerer kontrakten i stedet for et extension-løst import-spec.

---

## Tooling
- `npm` workspaces, ESM (`"type": "module"`), `tsconfig.base.json` med `composite`-prosjekter.
- Dev: `tsx` for å kjøre server/CLI/steg uten byggesteg.
- Avhengigheter: `ws`, `vitest`, `@cucumber/cucumber`, `tsx`, `typescript`, `@types/ws`, `@types/node`.
  `typescript` er nå en runtime-avhengighet av serveren (brukes av `normalizeExports.ts`), ikke kun dev.
- Ekstern: **.NET 10+ SDK** (`dotnet`) kreves kun for C#-oppgaver. Mangler den, hoppes C#-BDD over.
- Scripts: `npm run dev:server`, `npm run dev:cli`, `npm test` (Vitest unit), `npm run bdd` (Cucumber),
  `npm run verify` (bdd + test).

---

## Verifisering (ende-til-ende)

Primær verifisering er **akseptansesuiten**.

1. **Installer:** `npm install` i rot.
2. **Akseptanse (BDD):** `npm run bdd` -> JS/TS-scenarioene (rett / feil / ukjent) + de to
   C#-scenarioene (rett / feil, tagget `@csharp`, hoppes over uten `dotnet`) grønne.
3. **Unit:** `npm test` -> Vitest-tester for registry, sandbox, `normalizeExports`, og
   C#-sandbox/NDJSON-parsing grønne (krever ikke `dotnet`).
4. **Manuell røyktest:** `npm run dev:server`, så `npm run dev:cli -- ./arraysAndArrayMethods.ts` mot
   en korrekt løsning -> streamede ✓-linjer, `correct: true`, exit-kode 0. Send en feil løsning ->
   ✗ med expected/actual, `correct: false`, exit-kode 1.
5. **Streaming-sjekk:** kunstig treghet i én assertion -> bekreft at `test-result` kommer fortløpende.
6. **Sandbox-sjekk:** innsending med uendelig løkke -> timeout dreper child-prosessen, serveren
   svarer `error` uten å henge.

---

## Bevisst utenfor scope (fremtidige steg)
- **C#-normalisering** (auto-`public`/wrapping, motstykke til JS/TS sin `export`-innsetting) og
  **`[Theory]`/`[InlineData]`-støtte** — C#-runneren kjører i dag kun parameterløse `[Fact]`.
- **Komplette flerfils-prosjekter** (JS/TS og C#): krever protokollutvidelse utover én `content`-streng.
- AI-basert vurdering av ikke-deterministiske oppgaver (filstruktur + designdokument via Claude).
- nginx-router + dedikerte runtime-servere per språk: `Runner`/protokoll er forberedt, og
  C#-runneren er broen dit (validerer at samme protokoll holder på tvers av runtime).
- Sterkere sandboxing (Docker per innsending), autentisering, og persistert historikk/rapporter.
