export function factorial(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

export function countVowels(tekst: string): number {
  const vokaler = "aeiouyæøå";
  let antall = 0;
  for (const tegn of tekst.toLowerCase()) {
    if (vokaler.includes(tegn)) antall++;
  }
  return antall;
}

export function fizzbuzz(n: number): string[] {
  const result: string[] = [];
  for (let i = 1; i <= n; i++) {
    if (i % 15 === 0) result.push("FizzBuzz");
    else if (i % 3 === 0) result.push("Fizz");
    else if (i % 5 === 0) result.push("Buzz");
    else result.push(String(i));
  }
  return result;
}
