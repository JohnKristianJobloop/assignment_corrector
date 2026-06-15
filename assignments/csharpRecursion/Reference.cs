public static class Solution
{
    public static int SumTo(int n) => n <= 0 ? 0 : n + SumTo(n - 1);

    public static int Fib(int n) => n < 2 ? n : Fib(n - 1) + Fib(n - 2);

    public static string ReverseString(string text) =>
        text.Length <= 1 ? text : ReverseString(text.Substring(1)) + text[0];

    public static long Power(int baseValue, int exp) =>
        exp == 0 ? 1 : baseValue * Power(baseValue, exp - 1);
}
