using Xunit;

// Kjent testfil. Deltakeren skal implementere kontrakten:
//   public static class Solution
//   {
//       public static string Reverse(string text);
//       public static bool   IsPalindrome(string text);
//       public static int    CountWords(string text);
//       public static string Capitalize(string text);
//   }
// Innsendingen skrives til Submission.cs og kompileres sammen med denne fila.
public class StringTests
{
    [Fact]
    public void Reverse_reverses_the_text()
    {
        Assert.Equal("ieh", Solution.Reverse("hei"));
        Assert.Equal("", Solution.Reverse(""));
    }

    [Fact]
    public void IsPalindrome_is_true_for_palindromes()
    {
        Assert.True(Solution.IsPalindrome("Anna"));
        Assert.True(Solution.IsPalindrome("Otto"));
    }

    [Fact]
    public void IsPalindrome_is_false_otherwise()
    {
        Assert.False(Solution.IsPalindrome("Norge"));
    }

    [Fact]
    public void CountWords_counts_words()
    {
        Assert.Equal(3, Solution.CountWords("en to tre"));
        Assert.Equal(1, Solution.CountWords("hei"));
        Assert.Equal(0, Solution.CountWords("   "));
    }

    [Fact]
    public void Capitalize_uppercases_first_letter()
    {
        Assert.Equal("Hei", Solution.Capitalize("hei"));
        Assert.Equal("Abc", Solution.Capitalize("Abc"));
        Assert.Equal("", Solution.Capitalize(""));
    }
}
