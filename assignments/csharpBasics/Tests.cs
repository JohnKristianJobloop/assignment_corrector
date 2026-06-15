using Xunit;

// Kjent testfil. Deltakeren skal implementere kontrakten:
//   public static class Solution
//   {
//       public static string Greet(string name);
//       public static int    Add(int a, int b);
//       public static bool   IsEven(int n);
//   }
// Innsendingen skrives til Submission.cs og kompileres sammen med denne fila.
public class BasicsTests
{
    [Fact]
    public void Greet_greets_the_name()
    {
        Assert.Equal("Hei, Ada!", Solution.Greet("Ada"));
    }

    [Fact]
    public void Add_adds_two_numbers()
    {
        Assert.Equal(5, Solution.Add(2, 3));
    }

    [Fact]
    public void IsEven_is_true_for_even()
    {
        Assert.True(Solution.IsEven(4));
    }

    [Fact]
    public void IsEven_is_false_for_odd()
    {
        Assert.False(Solution.IsEven(7));
    }
}
