using Xunit;

// Kjent testfil. Deltakeren skal implementere kontrakten:
//   public static class Solution
//   {
//       public static bool       IsBalanced(string s);
//       public static int[]      TwoSum(int[] nums, int target);
//       public static string[][] GroupAnagrams(string[] words);
//   }
// Innsendingen skrives til Submission.cs og kompileres sammen med denne fila.
public class StacksHashingTests
{
    [Fact]
    public void IsBalanced_detects_balanced_brackets()
    {
        Assert.True(Solution.IsBalanced("(a[b]{c})"));
        Assert.True(Solution.IsBalanced(""));
        Assert.True(Solution.IsBalanced("{[]}"));
        Assert.False(Solution.IsBalanced("([)]"));
        Assert.False(Solution.IsBalanced("(]"));
        Assert.False(Solution.IsBalanced("((("));
    }

    [Fact]
    public void TwoSum_returns_index_pair()
    {
        Assert.Equal(new[] { 0, 1 }, Solution.TwoSum(new[] { 2, 7, 11, 15 }, 9));
        Assert.Equal(new[] { 1, 2 }, Solution.TwoSum(new[] { 3, 2, 4 }, 6));
        Assert.Equal(new[] { -1, -1 }, Solution.TwoSum(new[] { 1, 2, 3 }, 7));
    }

    [Fact]
    public void GroupAnagrams_groups_in_order()
    {
        Assert.Equal(
            new[]
            {
                new[] { "eat", "tea", "ate" },
                new[] { "tan" },
            },
            Solution.GroupAnagrams(new[] { "eat", "tea", "tan", "ate" }));
        Assert.Empty(Solution.GroupAnagrams(new string[0]));
    }
}
