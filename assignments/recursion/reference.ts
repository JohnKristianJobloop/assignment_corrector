export function sumTo(n: number): number {
  if (n <= 0) return 0;
  return n + sumTo(n - 1);
}

export function fib(n: number): number {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}

export function reverseString(tekst: string): string {
  if (tekst.length <= 1) return tekst;
  return reverseString(tekst.slice(1)) + tekst[0];
}

export type Nested = number | Nested[];

export function flatten(arr: Nested[]): number[] {
  const result: number[] = [];
  for (const item of arr) {
    if (Array.isArray(item)) result.push(...flatten(item));
    else result.push(item);
  }
  return result;
}
