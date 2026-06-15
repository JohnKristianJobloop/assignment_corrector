using Xunit;

// Kjent testfil. Deltakeren skal implementere kontrakten:
//   public static class Solution
//   {
//       public static int    SumTo(int n);
//       public static int    Fib(int n);
//       public static string ReverseString(string text);
//       public static long   Power(int baseValue, int exp);
//   }
// Innsendingen skrives til Submission.cs og kompileres sammen med denne fila.
public class RecursionTests
{
    [Fact]
    public void SumTo_sums_one_through_n()
    {
        Assert.Equal(0, Solution.SumTo(0));
        Assert.Equal(15, Solution.SumTo(5));
    }

    [Fact]
    public void Fib_returns_fibonacci_numbers()
    {
        Assert.Equal(0, Solution.Fib(0));
        Assert.Equal(1, Solution.Fib(1));
        Assert.Equal(1, Solution.Fib(2));
        Assert.Equal(2, Solution.Fib(3));
        Assert.Equal(55, Solution.Fib(10));
    }

    [Fact]
    public void ReverseString_reverses()
    {
        Assert.Equal("ieh", Solution.ReverseString("hei"));
        Assert.Equal("", Solution.ReverseString(""));
    }

    [Fact]
    public void Power_raises_base_to_exp()
    {
        Assert.Equal(1L, Solution.Power(2, 0));
        Assert.Equal(1024L, Solution.Power(2, 10));
        Assert.Equal(125L, Solution.Power(5, 3));
    }
}
