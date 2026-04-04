import type {
  AlgorithmStep,
  CodeArtifact,
  InputValidationResult,
  Language,
  SolutionDefinition
} from '../../types';

function parseArrayInput(raw: string): InputValidationResult {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { valid: false, error: '输入必须是 JSON 数组' };
    }
    return { valid: true, parsed };
  } catch {
    return { valid: false, error: '输入格式错误，请使用合法 JSON' };
  }
}

function buildCodes(): Record<Language, CodeArtifact> {
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

function buildSteps(): AlgorithmStep[] {
  return [
    {
      id: 0,
      title: '初始化',
      description: '创建累计变量 ans',
      binding: {
        anchorIds: ['init'],
        variables: { ans: 0 }
      },
      frame: {
        nodes: [{ id: 'ans', label: 'ans=0', x: 280, y: 180, kind: 'highlight' }],
        edges: [],
        arrows: [],
        labels: [],
        notes: ['递归进入/退出、状态迁移等信息应在真实题目中细化']
      }
    },
    {
      id: 1,
      title: '遍历输入',
      description: '逐个元素累加到 ans',
      binding: {
        anchorIds: ['loop'],
        variables: { ans: 6, x: 3 }
      },
      frame: {
        nodes: [
          { id: 'a0', label: '1', x: 120, y: 180 },
          { id: 'a1', label: '2', x: 180, y: 180 },
          { id: 'a2', label: '3', x: 240, y: 180, kind: 'highlight' },
          { id: 'ans', label: 'ans=6', x: 360, y: 180, kind: 'highlight' }
        ],
        edges: [],
        arrows: [
          {
            id: 'flow-1',
            from: { x: 240, y: 180 },
            to: { x: 360, y: 180 },
            text: 'x -> ans'
          }
        ],
        labels: [],
        notes: ['数据流箭头应尽量覆盖关键变量传递']
      }
    },
    {
      id: 2,
      title: '返回结果',
      description: '返回最终 ans',
      binding: {
        anchorIds: ['return'],
        variables: { ans: 6 }
      },
      frame: {
        nodes: [{ id: 'ans', label: 'return 6', x: 320, y: 180, kind: 'highlight' }],
        edges: [],
        arrows: [],
        labels: [],
        notes: ['代码与分镜必须实时同步']
      }
    }
  ];
}

export function createSolutionRegistry(): SolutionDefinition[] {
  return [
    {
      id: 'solution-1',
      name: '解法 1（示例）',
      thought: '这里填写该解法的详细思路，包括复杂度与适用场景。',
      samples: [
        { id: 's1', label: '样例1', value: '[1,2,3]' },
        { id: 's2', label: '样例2', value: '[5,5,5]' }
      ],
      codes: buildCodes(),
      steps: buildSteps(),
      validateInput: parseArrayInput,
      generateRandom: () => JSON.stringify(Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)))
    }

    // 如果有多解法，在此继续追加 SolutionDefinition
  ];
}
