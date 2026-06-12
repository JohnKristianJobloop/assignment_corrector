# GitHub Actions-workflow: `Release CLI`

Dette dokumentet forklarer workflow-fila i `.github/workflows/ci.yaml`. Den
bygger, tester, pakker og publiserer CLI-en (`oppgavehjelper`) automatisk når en
versjons-tag pushes.

## Når kjører den (`on`)

```yaml
on:
  push:
    tags:
      - "v*.*.*"
```

Workflowen trigges **kun** av en push av en tag på formen `vX.Y.Z` (f.eks.
`v0.1.0`). Vanlige commits og pull requests trigger den ikke — den er en
ren release-pipeline, ikke en pre-merge-CI.

Slik lager du en release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Tag-navnet er kilden til versjonen: jobben stripper `v`-prefikset og bruker
resten som `version` i den publiserte npm-pakka (se under).

## Rettigheter (`permissions`)

```yaml
permissions:
  contents: write   # nødvendig for å opprette GitHub Release + laste opp binærfiler
  packages: write   # nødvendig for å publisere npm-pakka til GitHub Packages
```

Disse gjelder den innebygde `GITHUB_TOKEN`-en jobben bruker, slik at den slipper
en egen personlig access token.

## Jobben `release`

Én jobb (`release`) som kjører på `ubuntu-latest`. Stegene i rekkefølge:

### 1. Checkout

`actions/checkout@v5` henter repoet.

### 2. Setup Node.js

`actions/setup-node@v6` med:

- `node-version: 22` — matcher `engines.node >= 22`.
- `cache: npm` — cacher npm-avhengigheter mellom kjøringer.
- `registry-url` + `scope: "@kodehode"` — konfigurerer npm til å publisere
  `@kodehode`-pakker mot GitHub Packages-registeret
  (`https://npm.pkg.github.com`). Dette skriver også en `.npmrc` som lar
  `npm publish` autentisere med `NODE_AUTH_TOKEN`.

### 3. Setup Bun

`oven-sh/setup-bun@v2` installerer Bun. Bun brukes til å kompilere CLI-en til
**frittstående binærfiler** (`bun build --compile`) for flere plattformer.

### 4. Install dependencies

`npm ci` — ren, reproduserbar installasjon fra `package-lock.json`.

### 5. Run unit tests

`npm run test` — Vitest-unit-testene for serverkomponentene. Feiler de, stopper
releasen.

### 6. Run BDD tests

`npm run bdd` — Cucumber-akseptansetestene mot en ekte server. Dette er
primærverifiseringen av systematferden. Også her: feiler de, stopper releasen.

### 7. Build CLI executables

`npm run build:cli` gjør to ting:

1. `npm run build -w @johnkristianjobloop/oppgavehjelper` bygger CLI-en til ett
   selvstendig ESM-bunt i `packages/cli/dist/index.js` med **tsup** (protokollen
   bunles inn, `ws` holdes ekstern).
2. Kjører `bun build ... --compile` fem ganger for å lage frittstående
   binærfiler i `dist/` for hver plattform:
   - `oppgavehjelper` (Linux x64)
   - `oppgavehjelper-winx64` / `oppgavehjelper-winarm64` (Windows)
   - `oppgavehjelper-macarm64` / `oppgavehjelper-macx64` (macOS)

   Disse binærfilene trenger verken Node eller Bun installert hos brukeren.

### 8. Make Unix binaries executable

`chmod +x` på Linux- og macOS-binærfilene, slik at de er kjørbare når de lastes
ned fra GitHub Release. (Windows-`.exe`-filene trenger ikke dette.)

### 9. Prepare npm package for GitHub Packages

Bygger en minimal npm-pakke i `package/` for publisering, atskilt fra
workspace-oppsettet:

- `VERSION="${GITHUB_REF_NAME#v}"` — utleder versjonen fra tag-navnet
  (`v0.1.0` → `0.1.0`).
- Kopierer tsup-buntet `packages/cli/dist/index.js` til
  `package/bin/oppgavehjelper.js`.
- Genererer en frisk `package/package.json` for den publiserte pakka
  `@kodehode/oppgavehjelper` med `bin.oppgavehjelper` og `publishConfig.registry`
  satt til GitHub Packages.
- Setter inn shebang-en `#!/usr/bin/env node` øverst i bin-fila og `chmod +x`,
  slik at pakka kan kjøres via `npx`.

> Merk: dette er en **Node-basert** npm-pakke (kjøres med `node`), mens
> binærfilene i steg 7 er Bun-kompilerte frittstående executables. Brukere kan
> velge: installer via npm, eller last ned en binærfil.

### 10. Publish package to GitHub Packages

`npm publish` fra `package/`-mappa, autentisert med `NODE_AUTH_TOKEN` =
`secrets.GITHUB_TOKEN`. Pakka havner under repoets GitHub Packages.

### 11. Publish GitHub release

`softprops/action-gh-release@v2` oppretter en GitHub Release for tag-en med:

- automatisk genererte release-notater (`generate_release_notes: true`),
- alle fem plattform-binærfilene fra `dist/` som nedlastbare assets.

## Oppsummert flyt

```
push tag vX.Y.Z
   └─► checkout → Node 22 + Bun → npm ci
        └─► npm test  →  npm run bdd          (gate: tester må passere)
             └─► build:cli (tsup-bunt + 5 bun-binærfiler)
                  ├─► npm publish  → @kodehode/oppgavehjelper (GitHub Packages)
                  └─► GitHub Release (binærfiler + release notes)
```

## Forutsetninger / ting å være obs på

- Releasen trigges av tag-en, ikke av `version`-feltet i noen `package.json` —
  pass på at tag-versjon og forventet pakkeversjon stemmer.
- `.NET 10+` installeres **ikke** i workflowen. BDD-scenarioene som krever C#
  (`@csharp`-merket) vil derfor ikke kjøre/passere her med mindre et
  `.NET`-setup-steg legges til. JS/TS-løpet er upåvirket.
- Den publiserte npm-pakka heter `@kodehode/oppgavehjelper`, mens
  workspace-pakka i repoet heter `@johnkristianjobloop/oppgavehjelper`.
  Workflowen genererer en egen `package.json` nettopp for å skille disse.
