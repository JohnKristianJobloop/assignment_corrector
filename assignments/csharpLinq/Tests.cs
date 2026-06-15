using Xunit;

// Kjent testfil. Deltakeren skal implementere kontrakten:
//   public static class Solution
//   {
//       public static int            ApplyTwice(Func<int, int> f, int x);
//       public static Func<int, int> MakeAdder(int n);
//       public static int            Total(int[] numbers);
//       public static string         LongestWord(string[] words);
//   }
// Innsendingen skrives til Submission.cs og kompileres sammen med denne fila.
public class LinqTests
{
    [Fact]
    public void ApplyTwice_applies_the_function_twice()
    {
        Assert.Equal(2, Solution.ApplyTwice(x => x + 1, 0));
        Assert.Equal(16, Solution.ApplyTwice(x => x * 2, 4));
    }

    [Fact]
    public void MakeAdder_returns_a_closure()
    {
        var add5 = Solution.MakeAdder(5);
        Assert.Equal(15, add5(10));
        Assert.Equal(5, add5(0));
    }

    [Fact]
    public void Total_sums_the_list()
    {
        Assert.Equal(10, Solution.Total(new[] { 1, 2, 3, 4 }));
        Assert.Equal(0, Solution.Total(System.Array.Empty<int>()));
    }

    [Fact]
    public void LongestWord_returns_the_longest()
    {
        Assert.Equal("banana", Solution.LongestWord(new[] { "a", "banana", "kiwi" }));
        Assert.Equal("", Solution.LongestWord(System.Array.Empty<string>()));
    }
}
