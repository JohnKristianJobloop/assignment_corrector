export function greet(navn: string): string {
  return `Hei, ${navn}!`;
}

export function fullName(fornavn: string, etternavn: string): string {
  return `${fornavn} ${etternavn}`;
}

export function shout(tekst: string): string {
  return `${tekst.toUpperCase()}!`;
}
