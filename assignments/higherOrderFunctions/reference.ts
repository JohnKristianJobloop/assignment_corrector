export function applyTwice<T>(fn: (x: T) => T, x: T): T {
  return fn(fn(x));
}

export function makeAdder(n: number): (x: number) => number {
  return (x: number) => x + n;
}

export function total(tall: number[]): number {
  return tall.reduce((sum, n) => sum + n, 0);
}

export function longestWord(ord: string[]): string {
  return ord.reduce((lengst, n) => (n.length > lengst.length ? n : lengst), "");
}
