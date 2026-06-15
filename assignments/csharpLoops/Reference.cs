public static class Solution
{
    public static long Factorial(int n)
    {
        long result = 1;
        for (int i = 2; i <= n; i++) result *= i;
        return result;
    }

    public static int CountVowels(string text)
    {
        const string vowels = "aeiouyæøå";
        int count = 0;
        foreach (char c in text.ToLowerInvariant())
            if (vowels.Contains(c)) count++;
        return count;
    }

    public static string[] FizzBuzz(int n)
    {
        var result = new string[n];
        for (int i = 1; i <= n; i++)
        {
            string s = "";
            if (i % 3 == 0) s += "Fizz";
            if (i % 5 == 0) s += "Buzz";
            result[i - 1] = s.Length > 0 ? s : i.ToString();
        }
        return result;
    }
}
