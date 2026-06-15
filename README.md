# Oppgaveretter for kodehode

Et system som tar imot en innsendt oppgaveløsning, validerer den mot en kjent
testfil, og streamer tilbakemelding til deltakeren i sanntid over WebSocket.

Denne versjonen dekker **deterministiske JS/TS- og C#-oppgaver**: klienten sender
en løsningsfil, serveren slår opp riktig oppgave fra filnavnet, kjører oppgavens
testfil mot innsendt kode i en isolert child-prosess (Vitest for JS/TS, `dotnet`
+ xUnit for C#), og sender hvert assertion-resultat etterfulgt av en sluttrapport
markert korrekt/ukorrekt.

Arkitekturen er bevisst språknøytral: kjørelogikken ligger bak en `Runner`-
abstraksjon og en runtime-nøytral protokoll. Et nytt språk legges til som en ny
`Runner` i serveren — klienten og protokollen er uendret. På sikt kan hvert språk
få sin egen runtime-server bak en nginx-router uten å endre klient eller protokoll.

## Arkitektur

```
  CLI ──► CLI-klient ◄──── WebSocket (runtime-nøytral protokoll) ────► runtime-server
                                                                        ├─ AssignmentRegistry
                                                                        └─ Runner (velges per språk)
                                                                           ├─ JS/TS → child process → Vitest        → NDJSON-stream
                                                                           └─ C#    → child process → dotnet + xUnit → NDJSON-stream
```

Serveren velger runner ut fra `language` i innsendingen (`runners.find(r => r.supports(language))`).

## Krav

- Node.js 22+
- .NET 10+ SDK — kun nødvendig for C#-oppgaver

## Kom i gang

```bash
npm install
npm run dev:server          # starter serveren på ws://127.0.0.1:8080 (env PORT)
```

I et eget terminalvindu:

```bash
npm run dev:cli -- <fil> [--assignment <id>] [--server ws://host:port]
```

Filnavnet (uten extension) avgjør hvilken oppgave som valideres, og extension
avgjør språk (`.ts`/`.js` → JS/TS, `.cs`/`.csx` → C#). Eksempler:

```bash
npm run dev:cli -- ./arraysAndArrayMethods.ts   # JS/TS
npm run dev:cli -- ./csharpArrays.cs            # C#
```

CLI-en skriver ✓/✗ per assertion og en sluttrapport, og avslutter med
exit-kode 0 hvis løsningen er korrekt, ellers 1.

### Liste oppgaver

`list` spør serveren om alle oppgavene i registeret og skriver dem ut (id,
språk og visningsnavn):

```bash
npm run dev:cli -- list [--server ws://host:port] [-l|--language <språk/filtype>]
```

`-l`/`--language` filtrerer på språk. Verdien kan være en språkkode (`ts`, `js`,
`cs`), en filtype (`.ts`, `.cs`) eller et helt filnavn (`foo.ts`), og flere kan
oppgis kommaseparert eller med gjentatt flagg:

```bash
npm run dev:cli -- list                  # alle oppgaver
npm run dev:cli -- list -l ts            # bare JS/TS-oppgaver
npm run dev:cli -- list --language .cs   # bare C#-oppgaver (via filtype)
npm run dev:cli -- list -l ts,cs         # JS/TS og C#
```

### Oppgavedetaljer

`details` slår opp én oppgave på **eksakt id** og skriver ut beskrivelsen fra
oppgavens `assignment.json` (`details`-feltet), sammen med visningsnavn og språk:

```bash
npm run dev:cli -- details --name <id> [--server ws://host:port]
```

`--name` (kortform `-n`) er påkrevd og må være en eksakt oppgave-id; en filtype
som `arraysAndArrayMethods.ts` matcher altså ikke. Mangler `--name`, avslutter
CLI-en med exit-kode 2; er id-en ukjent, svarer serveren `rejected`.

```bash
npm run dev:cli -- details --name arraysAndArrayMethods
npm run dev:cli -- details -n csharpArrays --server ws://127.0.0.1:8080
```

### Hjelp

`--help` (kortform `-h`, eller `help`) skriver ut en standardisert oversikt over
alle kommandoene med argumentene deres, samt standardserveren CLI-en bruker:

```bash
npm run dev:cli -- --help
```

### Installert CLI

CLI-en heter `oppgavehjelper`. Den distribueres på to måter, begge bygget av
release-workflowen (se under):

- **npm-pakke** `@johnkjobloop/oppgavehjelper` (npm Packages), med protokollen
  bundlet inn, så den kjører frittstående uten repoet:

  ```bash
  npx @johnkjobloop/oppgavehjelper list [-l <språk>] [--server ws://host:port]
  npx @johnkjobloop/oppgavehjelper details --name <id> [--server ws://host:port]
  npx @johnkjobloop/oppgavehjelper --help
  npx @johnkjobloop/oppgavehjelper <fil> [--assignment <id>] [--server ws://host:port]
  ```

- **Frittstående binærfiler** for Linux, macOS (arm64/x64) og Windows
  (x64/arm64), kompilert med Bun. Trenger verken Node eller Bun installert.
  Lastes ned fra GitHub Release.

Bygge alt lokalt:

```bash
npm run build:cli            # tsup-bunt i packages/cli/dist/ + bun-binærfiler i dist/
```

For å bygge lokalt kan det være lurt å sette SERVER_HOST variabel til en instanse av serveren. Den defaulter til å lytte etter dev server på port 8080.

`build:cli` bygger først JS-buntet med tsup, og kompilerer det så til
plattform-binærfiler i `dist/` med `bun build --compile`.

### Automatisk release (GitHub Actions)

Workflowen `.github/workflows/ci.yaml` (`Release CLI`) trigges av en versjons-tag
`vX.Y.Z`. Den kjører unit- og BDD-testene, bygger CLI-en, publiserer npm-pakka
til GitHub Packages og oppretter en GitHub Release med binærfilene. Se
[`workflow_explanation.md`](workflow_explanation.md) for en steg-for-steg-forklaring.

```bash
git tag v0.1.0 && git push origin v0.1.0   # starter release-pipelinen
```

## Publisere en ny oppgave (git bundle)

Oppgaver kan publiseres til en kjørende server over WebSocket. Forfatteren
bunter oppgave-repoet sitt (`git bundle`), CLI-en sender det, og serveren
verifiserer bunten, **self-tester referanseløsningen** mot oppgavens egen testfil,
og legger oppgaven i `assignments/` først når referansen gir en KORREKT rapport.

```bash
oppgavehjelper publish <repo-mappe> --server ws://host:8080 --token <PUBLISH_TOKEN> [--force]
```

Oppgave-repoet må inneholde (i `HEAD`):

- `assignment.json` med de vanlige feltene **pluss `reference`** — filnavnet på en
  kjent-korrekt løsning (f.eks. `"reference": "reference.ts"`).
- testfilen og referanseløsningen som `assignment.json` peker på.

Serveren krever at `PUBLISH_TOKEN` er satt i miljøet; er den tom, er publisering
deaktivert. Etter vellykket publisering laster serveren registeret på nytt, så den
nye oppgaven er innsendbar uten omstart.

Sikkerhet: bunten verifiseres med `git bundle verify`, leses med `fsckObjects`,
pakkes ut via `git archive | tar` (ingen checkout/hooks), med hardenet git-env,
størrelsesgrense og timeout. Se `project_feedback_implementation_design_docs.md`
for begrunnelsen bak buntformatet.

## Kjøre med Docker

Et Node + .NET 10-image kjører både JS/TS- og C#-runneren:

```bash
cp .env.example .env         # sett PUBLISH_TOKEN for å aktivere publisering
docker compose up --build    # serveren lytter på ws://127.0.0.1:8080
```

Publiserte oppgaver skrives til den monterte `./assignments`-mappa og overlever
omstart. Innsendings-sandboxen (`/app/.sandbox`) er flyktig (tmpfs).

## Prosjektstruktur

```
packages/
  protocol/    delt, runtime-nøytral WebSocket-kontrakt (typer + meldinger)
  server/      runtime-server: registry, Runner-er (JS/TS + C#), sandbox, ws-håndtering
    src/runner/JsTsRunner.ts + vitestEntry.ts   JS/TS via Vitest
    src/runner/CSharpRunner.ts + csharpSandbox.ts + csharp-template/   C# via dotnet + xUnit
    src/publish/   git-bundle-sandbox + publiseringsvalidering (verify, self-test, reload)
  cli/         CLI for innsending + publisering + listing, bygget med tsup til ett ESM-bunt
    src/index.ts                CLI-entry: ruter "--help" → runHelp, "publish" → runPublish, "list" → runList, "details" → runDetails, ellers runSubmit
    src/models/help.ts          runHelp + standardisert kommandooversikt
    src/models/submit.ts        parseSubmitArgs + runSubmit + submitSolution()-bibliotek
    src/models/publish.ts       parsePublishArgs + runPublish + publishAssignment() + git-bundle
    src/models/list.ts          parseListArgs + runList + listAssignments() + språkfilter
    src/models/details.ts       parseDetailsArgs + runDetails + requestDetails() + eksakt-id-oppslag
    src/models/client.ts        delt WebSocket-strøm (send melding, yield serversvar)
    src/models/render.ts        språk-deteksjon fra filnavn + rendering av resultat/rapport
    src/models/globals.ts       defaults (server-URL) + terminal-meldingssett
    src/models/interfaces|types  argument-/options-typer mot protokollen
features/      Gherkin-akseptansetester (Cucumber): de kjørbare scenarioene (@csharp gates C#)
assignments/   kjente oppgaver, én mappe per oppgave (assignment.json + testfil)
```

## Legge til en ny oppgave

Lag en mappe under `assignments/<id>/` med:

- `assignment.json`: `{ id, displayName, language, entry, testFile }` (+ valgfri
  `reference` — en kjent-korrekt løsning brukt til self-test ved publisering, og
  valgfri `details` — en fritekst-beskrivelse som returneres av `details`-kommandoen)
- en testfil som validerer løsningen

`details`-feltet bør være instruktivt: oppgi forventet filnavn for innsendingen,
funksjonsnavnene/signaturene testfilen forventer, og hva de skal gjøre. Eksport
er valgfritt for JS/TS (settes inn automatisk), men kan med fordel anbefales.

**JS/TS:** `language: "ts"` (eller `"js"`). Testfilen importerer løsningen via
`entry` (f.eks. `./submission`). Deltakerens innsending skrives til
`<entry>.{ts|js}` i sandbox-mappa, så testfilen kan importere den extension-løst.
Innsendingen normaliseres først: `export` settes automatisk inn foran top-level
deklarasjoner som mangler det (se `normalizeExports.ts`), så nybegynnere slipper
å huske `export`.

**C#:** `language: "cs"`, `entry` blir filnavnet innsendingen skrives til (f.eks.
`Submission`), og `testFile` er en xUnit-testfil (f.eks. `Tests.cs`). Sandboxen
kompilerer innsendingen + testfilen + en NDJSON-harness til ett `dotnet`-prosjekt
og kjører `[Fact]`-testene. Testfilen refererer typer ved navn, så oppgaven må
definere kontrakten den forventer, f.eks.:

```csharp
// Submission.cs som deltakeren skal skrive
public static class Solution
{
    public static int[] DoubleAll(int[] xs) => xs.Select(x => x * 2).ToArray();
}
```

## Språkstøtte og begrensninger

| Språk | Runtime | Testrammeverk | Status |
| ----- | ------- | ------------- | ------ |
| JS/TS | Node + Vitest (child process) | Vitest | full støtte |
| C#    | .NET 10+ (`dotnet`, child process) | xUnit | kun script-filer |

Kjente C#-begrensninger (planlagt):

- **Ingen normalisering:** JS/TS får `export` automatisk; C# har ingen tilsvarende
  normalisering ennå. Innsendingen må selv definere den `public` kontrakten
  testfilen refererer (ingen auto-`public`/wrapping), og kan **ikke** bruke
  top-level statements (de kolliderer med harnessens egen entry-point).
- **Kun `[Fact]`:** parameterløse `[Fact]`-tester kjøres. `[Theory]`/`[InlineData]`
  oppdages ikke ennå.
- **Kun enkeltfiler:** komplette flerfils-prosjekter støttes ikke ennå (protokollen
  bærer én `content`-streng i dag).

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

- C#-normalisering (auto-`public`/wrapping) og `[Theory]`-støtte
- Komplette flerfils-prosjekter (krever protokollutvidelse utover én `content`-streng)
- AI-basert vurdering av ikke-deterministiske oppgaver (prosjektstruktur/designdokument)
- nginx-router + flere dedikerte runtime-servere (C#-runneren er broen dit)
- Sterkere sandboxing, autentisering og persistert historikk

Se `design_docs.md` for fullstendig design.
