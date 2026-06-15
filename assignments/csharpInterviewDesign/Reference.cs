using System;
using System.Collections.Generic;
using System.Linq;

public static class Solution
{
    public static int[][] MergeIntervals(int[][] intervals)
    {
        var sorted = intervals.OrderBy(iv => iv[0]).ToArray();
        var merged = new List<int[]>();
        foreach (var iv in sorted)
        {
            if (merged.Count > 0 && iv[0] <= merged[^1][1])
                merged[^1][1] = Math.Max(merged[^1][1], iv[1]);
            else
                merged.Add(new[] { iv[0], iv[1] });
        }
        return merged.ToArray();
    }
}

public class LruCache
{
    private readonly int capacity;
    private readonly LinkedList<KeyValuePair<int, int>> order = new();
    private readonly Dictionary<int, LinkedListNode<KeyValuePair<int, int>>> map = new();

    public LruCache(int capacity) => this.capacity = capacity;

    public int Get(int key)
    {
        if (!map.TryGetValue(key, out var node)) return -1;
        // Flytt noden bakerst (nyest brukt).
        order.Remove(node);
        order.AddLast(node);
        return node.Value.Value;
    }

    public void Put(int key, int value)
    {
        if (map.TryGetValue(key, out var existing)) order.Remove(existing);
        var node = new LinkedListNode<KeyValuePair<int, int>>(new(key, value));
        order.AddLast(node);
        map[key] = node;
        if (map.Count > capacity)
        {
            // Første node er minst nylig brukt.
            var oldest = order.First!;
            order.RemoveFirst();
            map.Remove(oldest.Value.Key);
        }
    }
}
