using Xunit;

// Kjent testfil. Deltakeren skal implementere kontrakten:
//   public static class Solution
//   {
//       public static int[] DoubleAll(int[] xs);
//       public static int   SumArray(int[] xs);
//       public static int[] FilterEven(int[] xs);
//   }
// Innsendingen skrives til Submission.cs og kompileres sammen med denne fila.
public class ArrayMethodTests
{
    [Fact]
    public void DoubleAll_doubles_each_number()
    {
        Assert.Equal(new[] { 2, 4, 6 }, Solution.DoubleAll(new[] { 1, 2, 3 }));
    }

    [Fact]
    public void DoubleAll_handles_empty()
    {
        Assert.Equal(System.Array.Empty<int>(), Solution.DoubleAll(System.Array.Empty<int>()));
    }

    [Fact]
    public void SumArray_sums_all_numbers()
    {
        Assert.Equal(10, Solution.SumArray(new[] { 1, 2, 3, 4 }));
    }

    [Fact]
    public void FilterEven_keeps_only_even()
    {
        Assert.Equal(new[] { 2, 4, 6 }, Solution.FilterEven(new[] { 1, 2, 3, 4, 5, 6 }));
    }
}
