# language: no
@csharp
Egenskap: Deterministisk validering av C#-oppgaver
  Samme runtime-nøytrale protokoll som JS/TS: klienten sender en C#-løsning,
  serveren kjører den mot oppgavens xUnit-testfil via .NET, og streamer
  resultat + sluttrapport tilbake. Klienten er uendret.

  Scenario: Kjent C#-oppgave, alt korrekt
    Gitt en kjent C#-oppgave "csharpArrays"
    Og en korrekt C#-løsning for oppgaven
    Når deltakeren sender inn C#-løsningen
    Så blir innsendingen akseptert
    Og alle assertions rapporteres som bestått
    Og sluttrapporten er markert som korrekt

  Scenario: Kjent C#-oppgave, alt feiler
    Gitt en kjent C#-oppgave "csharpArrays"
    Og en feilaktig C#-løsning for oppgaven
    Når deltakeren sender inn C#-løsningen
    Så blir innsendingen akseptert
    Og minst én assertion rapporteres som feilet
    Og sluttrapporten er markert som ukorrekt
