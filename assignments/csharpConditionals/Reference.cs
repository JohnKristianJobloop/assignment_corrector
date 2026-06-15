public static class Solution
{
    public static string Grade(int score)
    {
        if (score >= 90) return "A";
        if (score >= 80) return "B";
        if (score >= 70) return "C";
        if (score >= 60) return "D";
        return "F";
    }

    public static int Largest(int a, int b, int c) => System.Math.Max(a, System.Math.Max(b, c));
}
