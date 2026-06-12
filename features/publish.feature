# language: no
Egenskap: Publisering av nye oppgaver via git bundle
  En oppgaveforfatter sender et git bundle av oppgave-repoet sitt. Serveren
  verifiserer bunten, self-tester referanseløsningen mot oppgavens testfil, og
  legger oppgaven i registeret hvis alt går igjennom.

  Scenario: Gyldig oppgave publiseres og blir umiddelbart innsendbar
    Gitt publisering er aktivert på serveren
    Og et oppgave-bundle der referanseløsningen består testene
    Når forfatteren publiserer bunten med riktig token
    Så blir oppgaven publisert
    Og en deltaker kan straks sende inn en løsning til den nye oppgaven

  Scenario: Referanseløsning som feiler avvises
    Gitt publisering er aktivert på serveren
    Og et oppgave-bundle der referanseløsningen feiler testene
    Når forfatteren publiserer bunten med riktig token
    Så blir bunten avvist

  Scenario: Feil token avvises
    Gitt publisering er aktivert på serveren
    Og et oppgave-bundle der referanseløsningen består testene
    Når forfatteren publiserer bunten med feil token
    Så blir bunten avvist

  Scenario: Ugyldig bunt avvises
    Gitt publisering er aktivert på serveren
    Og en bunt som ikke er et gyldig git bundle
    Når forfatteren publiserer bunten med riktig token
    Så blir bunten avvist
