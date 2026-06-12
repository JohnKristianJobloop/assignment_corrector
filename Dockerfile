# Node + .NET 10 image: kjører JS/TS-runneren (Node) og C#-runneren (dotnet) i
# samme container. Basen er .NET SDK; Node 22 installeres oppå.
FROM mcr.microsoft.com/dotnet/sdk:10.0

# Node 22 fra NodeSource.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installer avhengigheter først (utnytter layer-cache). Alle workspace-
# package.json-er må være på plass for at npm skal sette opp symlinkene.
COPY package.json package-lock.json ./
COPY packages/protocol/package.json packages/protocol/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/cli/package.json packages/cli/package.json
RUN npm ci

# Kildekode + oppgaver.
COPY . .

# Forvarm C#-malen: regenererer obj/ (utelatt via .dockerignore) og fyller
# NuGet-cachen slik at første C#-innsending ikke betaler restore-kostnaden.
RUN dotnet restore packages/server/src/runner/csharp-template/project.csproj \
 && rm -rf packages/server/src/runner/csharp-template/obj/Debug

ENV PORT=8080 \
    DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1
EXPOSE 8080

# Serveren kjøres via tsx fra kilde, slik at asset-stier (csharp-template) som
# resolves relativt til modulen forblir intakte uten et eget kopisteg.
CMD ["npx", "tsx", "packages/server/src/index.ts"]
