# language: no
Egenskap: Deterministisk validering av JS/TS-oppgaver
  Klienten sender en løsningsfil over WebSocket, serveren validerer den mot
  oppgavens kjente testfil, og streamer resultat + sluttrapport tilbake.

  Scenario: Kjent oppgave, alt korrekt
    Gitt en kjent oppgave "arraysAndArrayMethods"
    Og en korrekt løsning for oppgaven
    Når deltakeren sender inn løsningen
    Så blir innsendingen akseptert
    Og alle assertions rapporteres som bestått
    Og sluttrapporten er markert som korrekt

  Scenario: Kjent oppgave, alt feiler
    Gitt en kjent oppgave "arraysAndArrayMethods"
    Og en feilaktig løsning for oppgaven
    Når deltakeren sender inn løsningen
    Så blir innsendingen akseptert
    Og minst én assertion rapporteres som feilet
    Og sluttrapporten er markert som ukorrekt

  Scenario: Ukjent oppgave avvises
    Gitt en ukjent oppgave "ukjentOppgave"
    Og en vilkårlig løsning
    Når deltakeren sender inn løsningen
    Så blir innsendingen avvist
