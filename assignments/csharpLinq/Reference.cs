using System;
using System.Linq;

public static class Solution
{
    public static int ApplyTwice(Func<int, int> f, int x) => f(f(x));

    public static Func<int, int> MakeAdder(int n) => x => x + n;

    public static int Total(int[] numbers) => numbers.Sum();

    public static string LongestWord(string[] words) =>
        words.Aggregate("", (best, w) => w.Length > best.Length ? w : best);
}
