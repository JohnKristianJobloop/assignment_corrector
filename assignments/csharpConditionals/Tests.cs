using Xunit;

// Kjent testfil. Deltakeren skal implementere kontrakten:
//   public static class Solution
//   {
//       public static string Grade(int score);
//       public static int    Largest(int a, int b, int c);
//   }
// Innsendingen skrives til Submission.cs og kompileres sammen med denne fila.
public class ConditionalTests
{
    [Fact]
    public void Grade_maps_score_to_letter()
    {
        Assert.Equal("A", Solution.Grade(95));
        Assert.Equal("B", Solution.Grade(82));
        Assert.Equal("C", Solution.Grade(71));
        Assert.Equal("D", Solution.Grade(64));
        Assert.Equal("F", Solution.Grade(40));
    }

    [Fact]
    public void Grade_handles_the_boundaries()
    {
        Assert.Equal("A", Solution.Grade(90));
        Assert.Equal("D", Solution.Grade(60));
        Assert.Equal("F", Solution.Grade(59));
    }

    [Fact]
    public void Largest_returns_the_biggest()
    {
        Assert.Equal(7, Solution.Largest(3, 7, 5));
        Assert.Equal(9, Solution.Largest(9, 1, 4));
        Assert.Equal(8, Solution.Largest(2, 2, 8));
    }
}
