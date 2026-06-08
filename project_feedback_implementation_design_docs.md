# Tilbakemelding på prosjektstruktur. Designdokument

## Bakgrunn

Dagens system (se `design_docs.md`) validerer **én innsendt løsningsfil** mot en
kjent testfil i en sandbox og streamer assertion-resultater tilbake. Det dekker
deterministiske JS/TS- og C#-oppgaver der "riktig" er definert av en testfil.

Neste steg er en annen klasse tilbakemelding: **er prosjektet *strukturert* riktig?**
Ikke "passerer testene", men "ligger filene der de skal, har deltakeren delt opp
prosjektet slik oppgaven ber om". Dette er relevant for større innleveringer
(fullstack-prosjekter, mappestruktur, separasjon av lag) der strukturen i seg selv
er en del av læringsmålet.

### Skissen vi designer mot
Deltakeren vil ha tilbakemelding på prosjektstrukturen sin for et større prosjekt:

1. Deltakeren lager en **`git bundle`** av repoet sitt og sender den inn.
2. Serveren leser ut **mappe-/filstrukturen fra `HEAD`** fra bunten i sandboxen.
3. Serveren gir tilbakemelding basert på en kjent oppgave som matcher deltakerens oppgave.

> **Hvorfor `git bundle` og ikke en zippet `.git`-mappe?** En zippet `.git`-mappe er et helt
> katalogtre med vilkårlige filer — og å pakke ut og kjøre git mot den er farlig: den kan bære
> **git hooks** (`.git/hooks/*`), **ondsinnet `.git/config`** (`core.hooksPath`, `core.fsmonitor`,
> `alias = "!sh ..."`), **symlinks** og **zip-slip-stier**, som alle kan føre til
> kommando-eksekvering eller skriving utenfor sandboxen. En **`git bundle` er derimot én enkelt
> integritetssjekket pakkfil** (packfile + en refs-header). Den kan *ikke* bære hooks, config eller
> vilkårlige filstier — den inneholder kun git-objekter. Det fjerner nesten hele angrepsflaten ved
> ett designvalg, og gir oss en enkelt fil som er triviell å sende over WebSocket.

Vi planlegger **to versjoner** av selve vurderingen:
- **Deterministisk:** forventet struktur er gitt eksplisitt i `assignment.json`.
- **Agent:** strukturen sendes til en LLM-agent (Claude) som vurderer mot en rubrikk.

Dette dokumentet beskriver designet for begge. **Ingen implementasjon** her — kun arkitektur,
protokoll, datamodell, sikkerhet og verifisering, slik at det kan drives outside-in etterpå.

---

## Designprinsipper (arvet fra MVP-en)

Vi gjenbruker bevisst arkitektursømmene fra dagens system i stedet for å bygge et parallelt spor:

- **`Runner`-abstraksjonen** er fortsatt kjernen. Strukturvurdering er en ny `Runner`
  (eller to), ikke en ny server. `connection.ts` velger runner per innsending.
- **Runtime-nøytral protokoll.** Vi utvider protokollen minimalt og additivt (slik
  `"cs"` ble lagt til `Language`-unionen), uten å bryte eksisterende klienter.
- **Sandbox = isolert temp-katalog + child-prosess + timeout + begrenset env.** Strukturvurdering
  arver dette og legger på git-spesifikk hardening.
- **Outside-in (Cucumber → Vitest).** Nye scenarioer i `features/`, drevet ned til unit-tester.
- **AssignmentRegistry** fra `assignments/*/assignment.json` er fortsatt kilden til "kjente oppgaver".

### Hvorfor lese fra `HEAD`?
- **`HEAD`-treet er den *committede* strukturen.** Det reflekterer hva deltakeren faktisk
  har versjonert — ikke tilfeldig støy i arbeidskatalogen (`node_modules/`, build-artefakter,
  `.env`, editor-filer). `.gitignore` har allerede filtrert bort det vi ikke vil vurdere.
- **Sjekker implisitt at deltakeren *bruker git*** og har committet arbeidet sitt — ofte et
  læringsmål i seg selv. En tom/ufullstendig bunt avsløres umiddelbart.

> **Teknisk presisering om uthenting:** `git ls-files` (fra skissens forløper) leser *indeksen* og
> forutsetter et utsjekket arbeidstre. Det robuste valget er `git ls-tree -r --name-only HEAD`, som
> leser fillista **direkte fra commit-treet** uten å sjekke ut filer. I deterministisk versjon
> trenger vi aldri filinnholdet — kun *navnene*. Vi materialiserer derfor aldri deltakerens filer
> på disk; vi leser kun tre-objektene.

---

## Arkitektur

```
            ┌──────────────┐   WebSocket (runtime-nøytral protokoll)   ┌─────────────────────────────┐
  CLI ─────►│  CLI client  │◄──────────────────────────────────────────►│  runtime-server             │
            └──────────────┘   submit-structure { bundle (base64) }     │  ┌───────────────────────┐  │
                                                                        │  │ AssignmentRegistry     │  │
                                                                        │  │  (kind: tests|structure)│ │
                                                                        │  ├───────────────────────┤  │
                                                                        │  │ Runner-valg per kind   │  │
                                                                        │  │  ├─ JsTsRunner (tests) │  │
                                                                        │  │  ├─ CSharpRunner (tests)│ │
                                                                        │  │  ├─ StructureRunner ───┼──┼─► deterministisk
                                                                        │  │  └─ AgentRunner ───────┼──┼─► Claude (LLM)
                                                                        │  └───────────────────────┘  │
                                                                        │     bundleSandbox:           │
                                                                        │     verify → bare clone →    │
                                                                        │     `git ls-tree HEAD`       │
                                                                        └─────────────────────────────┘
```

Felles forsteg (verifiser bunt + hent fillista fra `HEAD`) er delt mellom de to versjonene.
Det som skiller dem er **vurderingssteget**: regelmotor vs. LLM.

---

## Klientside: lage bunten

CLI-en utvides med en kommando som lager bunten for deltakeren, slik at de slipper å huske syntaksen:

```bash
# konseptuelt — CLI-en gjør dette for deltakeren i deres egen repo-rot
git bundle create <tmp>.bundle HEAD
```

`git bundle create <fil> HEAD` skriver en selvstendig bunt med hele historikken som er nåbar fra
`HEAD` (ingen prerequisitter). CLI-en leser bunten, base64-enkoder den og sender `submit-structure`.
Vi kan senere optimalisere til `--branches`/`--all` om oppgaver trenger flere refs, men `HEAD` er
nok for å vurdere strukturen i siste commit.

---

## Felles flyt (begge versjoner)

1. **Klient** lager en `git bundle` av repoet og sender `submit-structure` (bunt som base64 + oppgave-id).
2. **Server** verifiserer at oppgaven finnes i registry og har `kind: "structure"`; ellers `rejected`.
3. **bundleSandbox** (nytt) skriver bunten til en isolert temp-katalog og kjører
   **`git bundle verify`** (hardenet). Ugyldig/ufullstendig bunt ⇒ `rejected` med begrunnelse.
4. Server kloner bunten til et **bare repo** (`git clone --bare`, ingen utsjekk) og kjører
   `git ls-tree -r --name-only HEAD` i child-prosess med timeout → en liste committede filstier (`string[]`).
5. **Vurderingssteg** (deterministisk *eller* agent) tar fillista + oppgavens forventning og
   produserer tilbakemelding.
6. Server streamer tilbakemeldingen til klienten og rydder temp-katalogen i `finally`.

`StructureRunner` og `AgentRunner` implementerer begge `Runner`-interfacet, men returnerer en
**rikere rapporttype** enn assertion-baserte runnere (se Protokoll). `supports()` må kunne
diskriminere på oppgavens `kind`, ikke bare `language`.

---

## Protokollutvidelser (`packages/protocol`)

Dagens `SubmitMessage` bærer kildekode som én `content`-streng. Det holder ikke for en binær bunt,
og strukturtilbakemelding passer ikke rent inn i `pass`/`fail`-assertion-unionen. To additive utvidelser:

### 1. Ny client→server-melding: `submit-structure`
```ts
export interface SubmitStructureMessage {
  type: "submit-structure";
  assignment: string;          // oppgave-id (som i dag)
  filename: string;            // f.eks. "min-app.bundle" — for visning/utledning
  /** base64-enkodet git bundle av deltakerens repo. */
  bundle: string;
  encoding: "base64";
}
export type ClientMessage = SubmitMessage | SubmitStructureMessage;
```
Begrunnelse for egen melding (ikke utvide `SubmitMessage`): payloaden er binær, flyten er en annen
(ingen testfil kjøres), og diskriminering på `type` holder klientbiblioteket enkelt.

> **Størrelse:** en bunt av et normalt skoleprosjekt er liten, men kan vokse med historikk og
> binærblobs. WebSocket-serveren konfigureres med en `maxPayload`-grense; innsendinger over grensa
> avvises med `rejected` framfor å svelges. Grensa dokumenteres for klienten.

### 2. Ny server→client-meldingstype: strukturtilbakemelding
Deterministisk versjon kunne gjenbrukt `test-result`/`report` (hver regel = én "assertion"), men
agentversjonen produserer fritekst med alvorsgrad og forslag, som ikke er pass/fail. For å ha **ett
felles utfall** for begge versjoner introduserer vi:

```ts
export interface StructureFinding {
  rule: string;                          // stabil id, f.eks. "has-src-dir"
  status: "ok" | "warning" | "violation";
  message: string;                       // regeltekst eller LLM-ens forklaring
  path?: string;                         // valgfri relevant sti/glob
  suggestion?: string;                   // valgfritt konkret forslag til retting
}

export interface StructureReport {
  acceptable: boolean;                   // sann når ingen `violation`-funn finnes
  findings: StructureFinding[];
  evaluator: "deterministic" | "agent";  // hvilken motor produserte rapporten
  summary?: string;                      // fritekst-oppsummering (særlig for agenten)
}

export type StructureFindingMessage = { type: "structure-finding" } & StructureFinding;
export type StructureReportMessage  = { type: "structure-report" } & StructureReport;
```
`accepted`/`rejected`/`error` gjenbrukes uendret. Funn kan streames fortløpende
(`structure-finding`) etterfulgt av en `structure-report` — samme strømmemønster som assertions.

### `Assignment` får et `kind`-felt
```ts
type AssignmentKind = "tests" | "structure";   // default "tests" (bakoverkompatibelt)
```
Registry leser `kind` fra `assignment.json` (mangler det ⇒ `"tests"`, så eksisterende oppgaver er uendret).

### `Runner.supports()` diskriminerer på oppgaven, ikke bare språk
I dag: `supports(language)`. For å velge `StructureRunner`/`AgentRunner` trenger vi oppgavens `kind`
(og for agent vs. deterministisk: hvilken motor oppgaven ber om):
```ts
interface Runner {
  supports(assignment: Assignment): boolean;        // var: supports(language)
  run(input: RunInput, onResult): Promise<Report | StructureReport>;
}
```
Eksisterende runnere oppdaterer `supports` til å sjekke `assignment.kind === "tests" && language match`.
Dette er den eneste ikke-additive endringen, og den er liten og lokal til `connection.ts` + runnerne.

---

## Versjon A — Deterministisk struktur (`assignment.json`)

Forventet struktur uttrykkes deklarativt i oppgavens `assignment.json`. En regelmotor sammenligner
den uthentede fillista mot reglene og produserer `StructureFinding`-er.

### Skjemaforslag for `assignment.json` (kind: "structure")
```jsonc
{
  "id": "fullstack-prosjekt",
  "displayName": "Fullstack-prosjekt: struktur",
  "kind": "structure",
  "evaluator": "deterministic",
  "structure": {
    "required": [
      { "glob": "src/**",            "rule": "has-src",        "message": "Kildekode skal ligge under src/" },
      { "glob": "src/server/**",     "rule": "has-server",     "message": "Backend skal ligge i src/server/" },
      { "glob": "src/client/**",     "rule": "has-client",     "message": "Frontend skal ligge i src/client/" },
      { "exact": "README.md",        "rule": "has-readme",     "message": "Prosjektet skal ha en README.md i rota" },
      { "exact": "package.json",     "rule": "has-pkg",        "message": "Prosjektet skal ha package.json" }
    ],
    "forbidden": [
      { "glob": "node_modules/**",   "rule": "no-node-modules","message": "node_modules skal ikke committes (legg i .gitignore)" },
      { "glob": "**/*.env",          "rule": "no-env",         "message": "Hemmeligheter (.env) skal ikke committes" },
      { "glob": "**/.DS_Store",      "rule": "no-ds-store",    "message": "OS-støyfiler skal ikke committes" }
    ],
    "optional": [
      { "glob": "tests/**",          "rule": "has-tests",      "message": "Tester anbefales under tests/", "severity": "warning" }
    ]
  }
}
```

### Regelsemantikk
- **`required`**: minst én committet sti må matche `glob`/`exact`. Manglende match ⇒ `violation`.
- **`forbidden`**: ingen committet sti skal matche. Match ⇒ `violation` (med stien som `path`).
- **`optional`**: manglende match ⇒ `warning` (ikke `violation`); påvirker ikke `acceptable`.
- `acceptable = findings.every(f => f.status !== "violation")`.
- Glob-matching gjøres mot fillista (rene strenger) — ingen filsystem-tilgang trengs. Et lite,
  veletablert glob-bibliotek (f.eks. `picomatch`/`minimatch`) brukes; alternativt en egen liten matcher.

### Hvorfor dette er det enkle, robuste valget
- **Helt deterministisk og offline** — ingen nettverk, ingen kostnad, reproduserbart i CI/BDD.
- **Trenger aldri filinnholdet** — kun fillista fra `HEAD`. Minimal angrepsflate; vi sjekker aldri ut filer.
- Mapper rett inn i `StructureReport` (hver regel → ett `StructureFinding`).

### Begrensninger (bevisst)
- Vurderer *eksistens og plassering* av filer, ikke *innhold* eller *kvalitet*. "Er koden delt riktig
  i lag?" på et semantisk nivå krever agentversjonen.
- Glob-regler kan bli rigide for åpne oppgaver. Det er nettopp her agentversjonen tar over.

---

## Versjon B — LLM-agent (Claude)

For åpne oppgaver der "god struktur" er vanskelig å uttrykke som globs, sender vi fillista (og
eventuelt utvalgte filinnhold) til en LLM som vurderer mot en **rubrikk** i naturlig språk.

### Stack
- **Modell:** Claude **Opus 4.8** (`claude-opus-4-8`) via det offisielle `@anthropic-ai/sdk`
  (prosjektet er allerede TS/Node — samme SDK-familie).
- **Tenkemodus:** adaptiv (`thinking: { type: "adaptive" }`) — vurderingen er en resonneringsoppgave.
- **API-nøkkel:** `ANTHROPIC_API_KEY` fra env (aldri i koden/repoet).

### Hva sendes til modellen
1. **Rubrikken** fra `assignment.json` (forventninger til strukturen, i naturlig språk).
2. **Fillista** fra `HEAD`, rendret som et innrykket tre.
3. Valgfritt: **innholdet i et lite, kuratert utvalg filer** (f.eks. `package.json`, `README.md`,
   topp-nivå inngangsfiler) når rubrikken trenger mer enn filnavn. Opt-in per oppgave, for å holde
   token-bruk og angrepsflate nede. Innhold hentes med `git show HEAD:<path>` fra det bare repoet.

### Output-form: strukturert, ikke fritekst-gjetting
Vi ber modellen returnere **strukturert output** (`output_config.format` med et JSON-schema) som
mapper rett til `StructureFinding[]` + `summary`. Da får CLI-en samme rapportform som deterministisk
versjon, og vi unngår å parse løs prosa. Hvert funn bærer `rule`, `status`, `message` og et konkret
`suggestion`.

### Hvilket nivå av "agent"?
Strukturvurdering er i grunnform en **enkelt-kalls-vurdering** (judge), ikke en åpen agent — vi har
allerede all konteksten (fillista) og trenger ett strukturert svar. **Anbefalt start: ett
`messages.create`-kall med strukturert output.** Billigst, raskest, enklest å teste.

Vi designer likevel for en **opptrapping** når oppgaven krever at modellen *utforsker* repoet:
- **Verktøy-loop (tool use):** ett klientside-verktøy `read_file(path)` som returnerer innholdet i en
  committet fil (`git show HEAD:<path>` fra sandboxen). Modellen ber om filene den trenger; serveren
  utfører lesningen. Holder filinnhold bak en kontrollert søm i stedet for å dumpe alt i prompten.
- **Managed Agents** (Anthropic-hostet agent-loop + container) er overkill her og introduserer en
  ekstern container-avhengighet vi ikke trenger — `Runner`-modellen vår kjører allerede i egen sandbox.
  Utenfor scope; nevnes kun som vei videre dersom vurderingen skal bli en full, utforskende agent.

### `assignment.json` for agentversjonen
```jsonc
{
  "id": "apen-arkitektur-oppgave",
  "displayName": "Arkitektur-review",
  "kind": "structure",
  "evaluator": "agent",
  "rubric": "Prosjektet skal ha tydelig separasjon mellom presentasjon, domenelogikk og dataaksess. Forklar avvik og foreslå forbedringer. Kommenter også navngivning og om mappestrukturen skalerer.",
  "inspectFiles": ["package.json", "README.md"]   // valgfritt: filer hvis innhold sendes med
}
```

### Sikkerhets-/robusthetshensyn spesifikt for agenten
- **Prompt-injection:** deltakerens filnavn og filinnhold er **upålitelig input**. Rubrikken (vår
  instruksjon) plasseres i system-kanalen; deltakerdata leveres tydelig merket som data, ikke som
  instruksjoner. Vi forventer ikke at modellen følger instruksjoner som ligger i deltakerens filer.
- **Determinisme/kostnad:** agentversjonen er ikke-deterministisk og koster penger/tid. BDD-scenarioer
  for agenten gates (slik `@csharp` gater C#) og hoppes over når `ANTHROPIC_API_KEY` mangler.
- **Token-tak:** sett `max_tokens` fornuftig og send aldri hele repoet ukritisk; bruk fillista +
  kuratert/`read_file`-utvalg.

---

## Sikkerhet — bunten er upålitelig input, men en mye snillere en

En `git bundle` fjerner de farligste vektorene fra "zippet `.git`": den kan **ikke** bære hooks,
config, symlinks eller vilkårlige filstier — kun git-objekter i én pakkfil. Det gjenstår likevel hensyn:

### Trusler (etter overgang til bundle)
1. **Korrupt/ondsinnet pakkfil:** misformede objekter som prøver å utløse feil i git.
2. **Dekomprimerings-/objektbombe:** liten bunt som ekspanderer til enormt volum (disk/minne-DoS),
   eller et tre med ekstremt mange/dype oppføringer.
3. **Tom/villedende bunt:** ingen `HEAD`, eller refs som ikke peker på et tre — må gi ryddig `rejected`.

(Ingen zip-slip, ingen hooks, ingen `.git/config`-eksekvering — disse forsvinner med buntformatet.)

### Tiltak (design)
- **Verifiser før bruk:** `git bundle verify <fil>` avviser ugyldige/ufullstendige bunter (og avslører
  manglende prerequisitter). Feiler den ⇒ `rejected`.
- **Valider objekter ved innlesing:** klon med `-c fetch.fsckObjects=true -c transfer.fsckObjects=true`
  slik at misformede objekter avvises i stedet for å lagres.
- **Bare-klon uten utsjekk:** `git clone --bare` materialiserer aldri et arbeidstre — ingen
  checkout-tid-bivirkninger. Vi leser kun tre-objekter (`ls-tree`) og evt. enkeltblobs (`show`).
- **Hardenet git-invokasjon (forsvar i dybden):** `GIT_CONFIG_GLOBAL=/dev/null`,
  `GIT_CONFIG_SYSTEM=/dev/null`, `-c core.hooksPath=/dev/null -c core.fsmonitor=false`,
  `GIT_TERMINAL_PROMPT=0`, minimal env. Selv om bunten ikke kan injisere config, hindrer dette at
  ekstern/lokal config på serveren påvirker kjøringen.
- **Ressursgrenser:** hard øvre grense på **bunt-filstørrelse** (før innlesing), **timeout** på alle
  git-kall (drep hele prosessgruppa, som C#-runneren), og disk-/minnegrenser på sandboxen mot
  objektbomber. Vurder å avvise bunter hvis tre-størrelse/antall stier overstiger en grense.
- **Eksisterende sandbox-lag beholdes:** isolert temp-katalog (`mkdtemp` under `.sandbox/`),
  begrenset env, opprydding i `finally`.
- **Dokumenter eksplisitt** at dette er "hardenet, men ikke en full sandbox". Sterkere isolasjon
  (Docker/gVisor per innsending, ressursgrenser i kernel) er det naturlige neste steget og passer
  per-runtime-server-modellen — samme konklusjon som MVP-en.

---

## Akseptansetester (BDD `features/`)

Strukturfunksjonen drives outside-in som resten av systemet. Nye `.feature`-scenarioer:

```gherkin
Scenario: deltaker sender en bunt med korrekt struktur (deterministisk)
    Gitt vi har en kjent strukturoppgave "fullstack-prosjekt"
    Og oppgaven har en forventet struktur i assignment.json
    Når server mottar en git bundle der HEAD-treet matcher forventet struktur
    Da skal serveren svare med en strukturrapport markert akseptabel
    Og alle påkrevde regler skal være ok

Scenario: deltaker mangler en påkrevd mappe (deterministisk)
    Gitt vi har en kjent strukturoppgave "fullstack-prosjekt"
    Når server mottar en git bundle uten src/server/
    Da skal rapporten inneholde et violation-funn for regelen "has-server"
    Og rapporten skal være markert ikke-akseptabel

Scenario: deltaker har committet node_modules (deterministisk)
    Gitt vi har en kjent strukturoppgave "fullstack-prosjekt"
    Når server mottar en git bundle som inneholder node_modules/
    Da skal rapporten inneholde et violation-funn for regelen "no-node-modules"

Scenario: ugyldig eller tom bunt
    Når server mottar en git bundle som ikke verifiserer
    Da skal serveren svare rejected med en begrunnelse

Scenario: ukjent oppgave
    Når server mottar en strukturinnsending for en oppgave som ikke finnes
    Da skal serveren svare rejected

@agent
Scenario: åpen arkitekturvurdering (agent)
    Gitt vi har en kjent strukturoppgave "apen-arkitektur-oppgave" med evaluator agent
    Når server mottar en git bundle med en gyldig struktur
    Da skal serveren returnere en strukturrapport fra agenten med minst ett funn og en oppsummering
```

- `@agent` gater LLM-scenarioene (hoppes over uten `ANTHROPIC_API_KEY`), analogt med `@csharp`.
- Indre Vitest-tester driver: `git bundle verify`-håndtering, bare-klon + `ls-tree`-parsing,
  glob-regelmotoren, og mapping regel → `StructureFinding`. Agent-mappingen (JSON-schema →
  `StructureReport`) testes med en stubbet/mocket LLM-klient slik at unit-laget ikke trenger nett.
- **Testfikstur:** scenarioene trenger ferdige `.bundle`-filer. Generer dem i en `Before`-hook fra
  små temp-repo (`git init` + `git commit` + `git bundle create`), slik at fikstursene er
  reproduserbare og ikke sjekkes inn som binærfiler.

---

## Repo-struktur (nye filer, antatt)

```
packages/
  protocol/src/
    messages.ts        # + SubmitStructureMessage, structure-finding/report
    structure.ts       # + StructureFinding, StructureReport, AssignmentKind
  server/src/
    registry.ts        # leser `kind`/`evaluator`/`structure`/`rubric`
    runner/Runner.ts    # supports(assignment) i stedet for supports(language)
    runner/StructureRunner.ts   # deterministisk regelmotor
    runner/AgentRunner.ts       # Claude-basert vurdering (@anthropic-ai/sdk)
    structure/bundleSandbox.ts  # verify + hardenet bare-klon + `git ls-tree`/`git show`
    structure/ruleEngine.ts     # glob-matching mot fillista → findings
    structure/render.ts         # fillista → innrykket tre (for agent-prompt)
  cli/src/
    index.ts           # + kommando som lager git bundle og sender submit-structure
assignments/
  fullstack-prosjekt/assignment.json        # kind: structure, evaluator: deterministic
  apen-arkitektur-oppgave/assignment.json    # kind: structure, evaluator: agent
features/
  structure.feature                          # scenarioene over
```

---

## Åpne spørsmål / beslutninger som gjenstår

1. **Bunt-omfang:** `HEAD` alene, eller `--branches`/`--all`? `HEAD` er nok for strukturen i siste
   commit; mer historikk gir større payload uten ekstra verdi for dette formålet.
2. **Glob-bibliotek vs. egen matcher** for `StructureRunner` — `picomatch` er lite og raskt; egen
   matcher unngår en avhengighet, men koster vedlikehold.
3. **Skal agenten få lese filinnhold?** Start med fillista + `inspectFiles`-utvalg; legg til
   `read_file`-verktøy bare hvis rubrikker viser at filnavn ikke er nok.
4. **CLI-utgang:** hvordan rendre `StructureReport` (ok/warning/violation) — fargede linjer + exit-kode
   (0 når `acceptable`, ellers 1), analogt med dagens assertion-utgang.
5. **`maxPayload`-grense** og bunt-størrelsesgrense — verdier og hvordan de kommuniseres til klienten.

---

## Bevisst utenfor scope (fremtidige steg)

- **Innholds-/kvalitetsvurdering** utover struktur (linting, kompleksitet) — egen oppgavetype senere.
- **Full container-isolasjon** (Docker/gVisor per innsending) for kjøring av git mot upålitelige bunter.
- **Persistert historikk** av strukturrapporter per deltaker.
- **Vurdere git-historikken**, ikke bare `HEAD` (commit-hygiene, meldingskvalitet) — bunten bærer
  allerede historikken, så dataene er tilgjengelige om vi vil utvide.
- **Managed Agents** dersom strukturvurdering skal utvikles til en full, utforskende agent med eget verktøysett.
```