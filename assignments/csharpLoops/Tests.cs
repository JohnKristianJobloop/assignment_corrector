using Xunit;

// Kjent testfil. Deltakeren skal implementere kontrakten:
//   public static class Solution
//   {
//       public static long     Factorial(int n);
//       public static int      CountVowels(string text);
//       public static string[] FizzBuzz(int n);
//   }
// Innsendingen skrives til Submission.cs og kompileres sammen med denne fila.
public class LoopTests
{
    [Fact]
    public void Factorial_multiplies_one_through_n()
    {
        Assert.Equal(120L, Solution.Factorial(5));
    }

    [Fact]
    public void Factorial_of_zero_and_one_is_one()
    {
        Assert.Equal(1L, Solution.Factorial(0));
        Assert.Equal(1L, Solution.Factorial(1));
    }

    [Fact]
    public void CountVowels_counts_vowels()
    {
        Assert.Equal(2, Solution.CountVowels("hei"));
        Assert.Equal(0, Solution.CountVowels("bcdfg"));
    }

    [Fact]
    public void CountVowels_is_case_insensitive_and_handles_norwegian()
    {
        Assert.Equal(2, Solution.CountVowels("AE"));
        Assert.Equal(3, Solution.CountVowels("ÆØÅ"));
    }

    [Fact]
    public void FizzBuzz_replaces_multiples()
    {
        Assert.Equal(
            new[]
            {
                "1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz",
                "Buzz", "11", "Fizz", "13", "14", "FizzBuzz",
            },
            Solution.FizzBuzz(15));
    }
}
