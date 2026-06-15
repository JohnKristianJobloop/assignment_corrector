using Xunit;

// Kjent testfil. Deltakeren skal implementere kontrakten:
//   public static class Solution
//   {
//       public static int[][] MergeIntervals(int[][] intervals);
//   }
//   public class LruCache
//   {
//       public LruCache(int capacity);
//       public int  Get(int key);
//       public void Put(int key, int value);
//   }
// Innsendingen skrives til Submission.cs og kompileres sammen med denne fila.
public class DesignTests
{
    [Fact]
    public void MergeIntervals_merges_overlapping()
    {
        Assert.Equal(
            new[] { new[] { 1, 6 }, new[] { 8, 10 }, new[] { 15, 18 } },
            Solution.MergeIntervals(new[]
            {
                new[] { 1, 3 }, new[] { 2, 6 }, new[] { 8, 10 }, new[] { 15, 18 },
            }));
        Assert.Equal(
            new[] { new[] { 1, 5 } },
            Solution.MergeIntervals(new[] { new[] { 1, 4 }, new[] { 4, 5 } }));
        Assert.Equal(
            new[] { new[] { 1, 2 }, new[] { 5, 6 } },
            Solution.MergeIntervals(new[] { new[] { 5, 6 }, new[] { 1, 2 } }));
        Assert.Empty(Solution.MergeIntervals(new int[0][]));
    }

    [Fact]
    public void LruCache_evicts_least_recently_used()
    {
        var cache = new LruCache(2);
        cache.Put(1, 1);
        cache.Put(2, 2);
        Assert.Equal(1, cache.Get(1));
        cache.Put(3, 3); // kaster ut nøkkel 2
        Assert.Equal(-1, cache.Get(2));
        cache.Put(4, 4); // kaster ut nøkkel 1
        Assert.Equal(-1, cache.Get(1));
        Assert.Equal(3, cache.Get(3));
        Assert.Equal(4, cache.Get(4));
    }

    [Fact]
    public void LruCache_updates_value_and_counts_use()
    {
        var cache = new LruCache(2);
        cache.Put(1, 1);
        cache.Put(2, 2);
        cache.Put(1, 10); // oppdaterer verdi og gjør nøkkel 1 nyest
        cache.Put(3, 3); // kaster ut nøkkel 2
        Assert.Equal(10, cache.Get(1));
        Assert.Equal(-1, cache.Get(2));
        Assert.Equal(3, cache.Get(3));
    }
}
