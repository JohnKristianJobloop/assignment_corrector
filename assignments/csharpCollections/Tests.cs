using Xunit;

// Kjent testfil. Deltakeren skal implementere kontrakten:
//   public static class Solution
//   {
//       public static Dictionary<string, int> WordCount(string[] words);
//       public static string                  MostCommon(string[] words);
//       public static int[]                   Unique(int[] numbers);
//   }
// Innsendingen skrives til Submission.cs og kompileres sammen med denne fila.
public class CollectionTests
{
    [Fact]
    public void WordCount_counts_occurrences()
    {
        var counts = Solution.WordCount(new[] { "a", "b", "a" });
        Assert.Equal(2, counts["a"]);
        Assert.Equal(1, counts["b"]);
    }

    [Fact]
    public void WordCount_of_empty_is_empty()
    {
        Assert.Empty(Solution.WordCount(System.Array.Empty<string>()));
    }

    [Fact]
    public void MostCommon_returns_the_most_frequent()
    {
        Assert.Equal("a", Solution.MostCommon(new[] { "a", "b", "a" }));
        Assert.Equal("", Solution.MostCommon(System.Array.Empty<string>()));
    }

    [Fact]
    public void MostCommon_breaks_ties_by_first_to_reach_the_max()
    {
        Assert.Equal("a", Solution.MostCommon(new[] { "a", "b", "a", "b" }));
    }

    [Fact]
    public void Unique_drops_duplicates_keeping_order()
    {
        Assert.Equal(new[] { 3, 1, 2 }, Solution.Unique(new[] { 3, 1, 2, 3, 1 }));
    }
}
