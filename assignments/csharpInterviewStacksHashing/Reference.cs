using System.Collections.Generic;
using System.Linq;

public static class Solution
{
    public static bool IsBalanced(string s)
    {
        var closing = new Dictionary<char, char> { [')'] = '(', [']'] = '[', ['}'] = '{' };
        var stack = new Stack<char>();
        foreach (var ch in s)
        {
            if (ch is '(' or '[' or '{') stack.Push(ch);
            else if (closing.TryGetValue(ch, out var open))
            {
                if (stack.Count == 0 || stack.Pop() != open) return false;
            }
        }
        return stack.Count == 0;
    }

    public static int[] TwoSum(int[] nums, int target)
    {
        var seen = new Dictionary<int, int>();
        for (int i = 0; i < nums.Length; i++)
        {
            int need = target - nums[i];
            if (seen.TryGetValue(need, out var j)) return new[] { j, i };
            seen[nums[i]] = i;
        }
        return new[] { -1, -1 };
    }

    public static string[][] GroupAnagrams(string[] words)
    {
        var order = new List<string>();
        var groups = new Dictionary<string, List<string>>();
        foreach (var word in words)
        {
            var key = new string(word.OrderBy(c => c).ToArray());
            if (!groups.TryGetValue(key, out var group))
            {
                group = new List<string>();
                groups[key] = group;
                order.Add(key);
            }
            group.Add(word);
        }
        return order.Select(k => groups[k].ToArray()).ToArray();
    }
}
