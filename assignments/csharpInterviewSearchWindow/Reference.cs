using System;
using System.Collections.Generic;

public static class Solution
{
    public static int BinarySearch(int[] nums, int target)
    {
        int lo = 0, hi = nums.Length - 1;
        while (lo <= hi)
        {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }

    public static int SearchRotated(int[] nums, int target)
    {
        int lo = 0, hi = nums.Length - 1;
        while (lo <= hi)
        {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) return mid;
            if (nums[lo] <= nums[mid])
            {
                // venstre halvdel er sortert
                if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
                else lo = mid + 1;
            }
            else
            {
                // høyre halvdel er sortert
                if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
                else hi = mid - 1;
            }
        }
        return -1;
    }

    public static int LengthOfLongestSubstring(string s)
    {
        var lastSeen = new Dictionary<char, int>();
        int start = 0, best = 0;
        for (int i = 0; i < s.Length; i++)
        {
            char ch = s[i];
            if (lastSeen.TryGetValue(ch, out var seen) && seen >= start) start = seen + 1;
            lastSeen[ch] = i;
            best = Math.Max(best, i - start + 1);
        }
        return best;
    }
}
