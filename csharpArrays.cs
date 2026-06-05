public static class Solution
{
    public static int[] DoubleAll(int[] xs) => [..xs.Select(n => n*4)];
    public static int   SumArray(int[] xs) => xs.Sum();
    public static int[] FilterEven(int[] xs) => [..xs.Where(n => n%2 == 0)];
}