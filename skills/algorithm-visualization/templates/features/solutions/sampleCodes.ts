import type { CodeArtifact, Language } from '../../types';

export function buildSampleCodes(): Record<Language, CodeArtifact> {
  return {
    java: {
      language: 'java',
      code: `class Solution {
    public int solve(int[] nums) {
        // anchor:init
        int ans = 0;
        // anchor:loop
        for (int x : nums) ans += x;
        // anchor:return
        return ans;
    }
}`,
      anchorLineMap: {
        init: [3, 4],
        loop: [5],
        return: [6]
      }
    },
    python: {
      language: 'python',
      code: `class Solution:
    def solve(self, nums):
        # anchor:init
        ans = 0
        # anchor:loop
        for x in nums:
            ans += x
        # anchor:return
        return ans`,
      anchorLineMap: {
        init: [3, 4],
        loop: [5, 6],
        return: [8]
      }
    },
    go: {
      language: 'go',
      code: `func solve(nums []int) int {
    // anchor:init
    ans := 0
    // anchor:loop
    for _, x := range nums {
        ans += x
    }
    // anchor:return
    return ans
}`,
      anchorLineMap: {
        init: [2, 3],
        loop: [4, 5, 6],
        return: [8]
      }
    },
    javascript: {
      language: 'javascript',
      code: `function solve(nums) {
  // anchor:init
  let ans = 0;
  // anchor:loop
  for (const x of nums) {
    ans += x;
  }
  // anchor:return
  return ans;
}`,
      anchorLineMap: {
        init: [2, 3],
        loop: [4, 5, 6],
        return: [8]
      }
    }
  };
}
