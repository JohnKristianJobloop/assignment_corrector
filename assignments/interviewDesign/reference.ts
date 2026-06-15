export function mergeIntervals(
  intervals: [number, number][],
): [number, number][] {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

export class LRUCache {
  private map = new Map<number, number>();

  constructor(private capacity: number) {}

  get(key: number): number {
    if (!this.map.has(key)) return -1;
    const value = this.map.get(key)!;
    // Flytt nøkkelen bakerst (nyest brukt).
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  put(key: number, value: number): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      // Første nøkkel i innsettingsrekkefølgen er minst nylig brukt.
      const oldest = this.map.keys().next().value as number;
      this.map.delete(oldest);
    }
  }
}
