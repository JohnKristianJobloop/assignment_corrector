export function isBalanced(s: string): boolean {
  const closing: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const opening = new Set(["(", "[", "{"]);
  const stack: string[] = [];
  for (const ch of s) {
    if (opening.has(ch)) stack.push(ch);
    else if (ch in closing) {
      if (stack.pop() !== closing[ch]) return false;
    }
  }
  return stack.length === 0;
}

export function twoSum(nums: number[], target: number): [number, number] {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    const j = seen.get(need);
    if (j !== undefined) return [j, i];
    seen.set(nums[i], i);
  }
  return [-1, -1];
}

export function groupAnagrams(words: string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const word of words) {
    const key = [...word].sort().join("");
    const group = groups.get(key);
    if (group) group.push(word);
    else groups.set(key, [word]);
  }
  return [...groups.values()];
}
