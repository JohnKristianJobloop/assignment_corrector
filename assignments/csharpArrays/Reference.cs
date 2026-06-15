using System.Linq;

public static class Solution
{
    public static int[] DoubleAll(int[] xs) => xs.Select(x => x * 2).ToArray();

    public static int SumArray(int[] xs) => xs.Sum();

    public static int[] FilterEven(int[] xs) => xs.Where(x => x % 2 == 0).ToArray();
}
