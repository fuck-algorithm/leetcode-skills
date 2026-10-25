import type { InputValidationResult, SolutionDefinition } from '../../types';
import { buildSampleCodes } from './sampleCodes';
import { buildSampleSteps } from './sampleSteps';

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

/**
 * 解法注册表：每个解法把代码锚点与步骤序列绑定在一起。
 * 新增解法时复制一个 SolutionDefinition，并复用 sampleSteps 的结构化步骤。
 */
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
      codes: buildSampleCodes(),
      steps: buildSampleSteps(),
      validateInput: parseArrayInput,
      generateRandom: () => JSON.stringify(Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)))
    }

    // 如果有多解法，在此继续追加 SolutionDefinition
  ];
}
