export function grade(poeng: number): string {
  if (poeng >= 90) return "A";
  if (poeng >= 80) return "B";
  if (poeng >= 70) return "C";
  if (poeng >= 60) return "D";
  return "F";
}

export function largest(a: number, b: number, c: number): number {
  return Math.max(a, b, c);
}

export function sign(n: number): string {
  if (n > 0) return "positiv";
  if (n < 0) return "negativ";
  return "null";
}
