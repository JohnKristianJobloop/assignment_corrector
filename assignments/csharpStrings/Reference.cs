public static class Solution
{
    public static string Reverse(string text) => new string(text.Reverse().ToArray());

    public static bool IsPalindrome(string text)
    {
        var lower = text.ToLowerInvariant();
        return lower == new string(lower.Reverse().ToArray());
    }

    public static int CountWords(string text) =>
        text.Split((char[]?)null, System.StringSplitOptions.RemoveEmptyEntries).Length;

    public static string Capitalize(string text) =>
        text.Length == 0 ? text : char.ToUpperInvariant(text[0]) + text.Substring(1);
}
