using Xunit;

// Kjent testfil. Deltakeren skal implementere kontrakten:
//   public static class Solution
//   {
//       public static int BinarySearch(int[] nums, int target);
//       public static int SearchRotated(int[] nums, int target);
//       public static int LengthOfLongestSubstring(string s);
//   }
// Innsendingen skrives til Submission.cs og kompileres sammen med denne fila.
public class SearchWindowTests
{
    [Fact]
    public void BinarySearch_finds_index()
    {
        Assert.Equal(2, Solution.BinarySearch(new[] { 1, 3, 5, 7, 9 }, 5));
        Assert.Equal(0, Solution.BinarySearch(new[] { 1, 3, 5, 7, 9 }, 1));
        Assert.Equal(4, Solution.BinarySearch(new[] { 1, 3, 5, 7, 9 }, 9));
        Assert.Equal(-1, Solution.BinarySearch(new[] { 1, 3, 5, 7, 9 }, 4));
        Assert.Equal(-1, Solution.BinarySearch(new int[0], 1));
    }

    [Fact]
    public void SearchRotated_finds_index()
    {
        Assert.Equal(4, Solution.SearchRotated(new[] { 4, 5, 6, 7, 0, 1, 2 }, 0));
        Assert.Equal(0, Solution.SearchRotated(new[] { 4, 5, 6, 7, 0, 1, 2 }, 4));
        Assert.Equal(-1, Solution.SearchRotated(new[] { 4, 5, 6, 7, 0, 1, 2 }, 3));
        Assert.Equal(0, Solution.SearchRotated(new[] { 1 }, 1));
    }

    [Fact]
    public void LengthOfLongestSubstring_measures_window()
    {
        Assert.Equal(3, Solution.LengthOfLongestSubstring("abcabcbb"));
        Assert.Equal(1, Solution.LengthOfLongestSubstring("bbbbb"));
        Assert.Equal(3, Solution.LengthOfLongestSubstring("pwwkew"));
        Assert.Equal(0, Solution.LengthOfLongestSubstring(""));
    }
}
