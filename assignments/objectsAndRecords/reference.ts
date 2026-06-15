export interface Person {
  navn: string;
  alder: number;
}

export function makePerson(navn: string, alder: number): Person {
  return { navn, alder };
}

export function isAdult(person: Person): boolean {
  return person.alder >= 18;
}

export function birthday(person: Person): Person {
  return { ...person, alder: person.alder + 1 };
}
