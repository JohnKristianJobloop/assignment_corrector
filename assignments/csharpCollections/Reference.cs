using System.Collections.Generic;
using System.Linq;

public static class Solution
{
    public static Dictionary<string, int> WordCount(string[] words)
    {
        var counts = new Dictionary<string, int>();
        foreach (var w in words)
            counts[w] = counts.GetValueOrDefault(w) + 1;
        return counts;
    }

    public static string MostCommon(string[] words)
    {
        var counts = new Dictionary<string, int>();
        var best = "";
        int bestCount = 0;
        foreach (var w in words)
        {
            int n = counts.GetValueOrDefault(w) + 1;
            counts[w] = n;
            if (n > bestCount)
            {
                bestCount = n;
                best = w;
            }
        }
        return best;
    }

    public static int[] Unique(int[] numbers) => numbers.Distinct().ToArray();
}
