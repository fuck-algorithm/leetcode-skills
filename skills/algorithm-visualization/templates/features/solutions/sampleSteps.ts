import type { AlgorithmStep } from '../../types';

const ARRAY_Y = 380;
const ARRAY_X = [220, 320, 420];
const ANS_POS = { x: 640, y: 180 };

function arrayNodes(currentIndex: number | null, visitedBefore: number): AlgorithmStep['frame']['nodes'] {
  return [0, 1, 2].map((index) => ({
    id: `a${index}`,
    label: String(index + 1),
    x: ARRAY_X[index],
    y: ARRAY_Y,
    badge: String(index),
    sublabel: `nums[${index}]`,
    status:
      index === currentIndex
        ? 'current'
        : index < visitedBefore
          ? 'done'
          : 'idle'
  }));
}

function sumFrame(options: {
  currentIndex: number | null;
  visitedBefore: number;
  sum: number;
  arrowText?: string;
  ansStatus?: 'current' | 'visited' | 'done';
  ansLabel?: string;
  notes: string[];
  metrics: { label: string; value: string | number }[];
}): AlgorithmStep['frame'] {
  const nodes: AlgorithmStep['frame']['nodes'] = arrayNodes(options.currentIndex, options.visitedBefore);
  const ansNode: AlgorithmStep['frame']['nodes'][number] = {
    id: 'ans',
    label: options.ansLabel ?? `ans=${options.sum}`,
    x: ANS_POS.x,
    y: ANS_POS.y,
    badge: 'sum',
    sublabel: '当前累计和',
    radius: 28,
    status: options.ansStatus ?? 'visited'
  };
  const current =
    options.currentIndex === null ? undefined : nodes.find((node) => node.id === `a${options.currentIndex}`);

  return {
    nodes: [...nodes, ansNode],
    edges: [],
    arrows:
      options.arrowText && current
        ? [
            {
              id: `flow-a${options.currentIndex}`,
              from: { x: current.x + 22, y: current.y - 24 },
              to: { x: ANS_POS.x - 24, y: ANS_POS.y + 26 },
              text: options.arrowText,
              kind: 'transfer',
              curve: 24,
              labelOffset: { x: 0, y: -12 }
            }
          ]
        : [],
    labels: [
      {
        id: 'ans-caption',
        targetId: 'ans',
        text: '累加器',
        detail: '保存当前累计和',
        position: 'top',
        variant: 'callout',
        tone: 'accent'
      }
    ],
    notes: options.notes,
    metrics: options.metrics
  };
}

export function buildSampleSteps(): AlgorithmStep[] {
  return [
    {
      id: 0,
      title: '初始化',
      description: '创建累计变量 ans，指针准备从数组第一个元素开始。',
      narration: '先把累加器置为 0，再从下标 0 开始扫描，保证每一步只做一件事。',
      operation: 'init',
      binding: {
        anchorIds: ['init'],
        variables: { ans: 0 }
      },
      frame: sumFrame({
        currentIndex: null,
        visitedBefore: 0,
        sum: 0,
        ansStatus: 'current',
        notes: ['数组从左到右扫描'],
        metrics: [
          { label: '已访问', value: 0 },
          { label: '累计', value: 0 },
          { label: '总数', value: 3 }
        ]
      })
    },
    {
      id: 1,
      title: '读取第一个元素',
      description: '读取 nums[0] = 1，把它累加到 ans。',
      narration: '当前元素 1 被读入临时变量 x，随后累加器由 0 变成 1。',
      operation: 'read',
      binding: {
        anchorIds: ['loop'],
        variables: { ans: 1, x: 1, i: 0 }
      },
      frame: sumFrame({
        currentIndex: 0,
        visitedBefore: 0,
        sum: 1,
        arrowText: 'x=1',
        notes: ['读入的元素用箭头指向累加器'],
        metrics: [
          { label: '已访问', value: 1 },
          { label: '累计', value: 1 },
          { label: '总数', value: 3 }
        ]
      })
    },
    {
      id: 2,
      title: '读取第二个元素',
      description: '读取 nums[1] = 2，ans 从 1 增加到 3。',
      narration: '上一个元素标记为已完成，焦点向右移动一格，确保视线只跟踪一个位置。',
      operation: 'read',
      binding: {
        anchorIds: ['loop'],
        variables: { ans: 3, x: 2, i: 1 }
      },
      frame: sumFrame({
        currentIndex: 1,
        visitedBefore: 1,
        sum: 3,
        arrowText: 'x=2',
        notes: ['已访问元素保留 done 状态'],
        metrics: [
          { label: '已访问', value: 2 },
          { label: '累计', value: 3 },
          { label: '总数', value: 3 }
        ]
      })
    },
    {
      id: 3,
      title: '读取第三个元素',
      description: '读取 nums[2] = 3，ans 从 3 增加到 6。',
      narration: '最后一个元素完成累加，数组扫描结束，结果为 6。',
      operation: 'read',
      binding: {
        anchorIds: ['loop'],
        variables: { ans: 6, x: 3, i: 2 }
      },
      frame: sumFrame({
        currentIndex: 2,
        visitedBefore: 2,
        sum: 6,
        arrowText: 'x=3',
        notes: ['最后一个元素也进入 done 轨迹'],
        metrics: [
          { label: '已访问', value: 3 },
          { label: '累计', value: 6 },
          { label: '总数', value: 3 }
        ]
      })
    },
    {
      id: 4,
      title: '返回结果',
      description: '返回累加结果 ans = 6。',
      narration: '所有元素访问完毕，返回最终累加值 6，动画停在结果状态。',
      operation: 'return',
      binding: {
        anchorIds: ['return'],
        variables: { ans: 6 }
      },
      frame: sumFrame({
        currentIndex: 3,
        visitedBefore: 3,
        sum: 6,
        ansStatus: 'done',
        ansLabel: 'return 6',
        notes: ['结果节点保持 done 状态'],
        metrics: [
          { label: '已访问', value: 3 },
          { label: '累计', value: 6 },
          { label: '总数', value: 3 }
        ]
      })
    }
  ];
}
