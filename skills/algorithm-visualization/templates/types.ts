export type Language = 'java' | 'python' | 'go' | 'javascript';

export interface ProblemConfig {
  number: number;
  title: string;
  slug: string;
  leetcodeUrl: string;
  hot100Url: string;
  githubRepoUrl: string;
}

export interface ProblemData {
  raw: string;
  parsed: unknown;
}

export interface InputSample {
  id: string;
  label: string;
  value: string;
}

export interface InputValidationResult {
  valid: boolean;
  error?: string;
  parsed?: unknown;
}

export interface StepBinding {
  /**
   * 推荐使用 anchorId 绑定多语言代码行，避免语言切换后行号漂移
   */
  anchorIds: string[];
  variables: Record<string, unknown>;
}

/**
 * 画布状态的语义色。kind 仅为兼容旧步骤保留，显式 status 优先。
 */
export type NodeStatus = 'idle' | 'current' | 'compare' | 'visited' | 'done' | 'path' | 'error';

export type EdgeStatus = 'idle' | 'active' | 'visited' | 'path' | 'error';

/**
 * 每一步只表达一个语义动作，供操作徽标与动效语法使用。
 */
export type StepOperation =
  | 'init'
  | 'read'
  | 'compare'
  | 'swap'
  | 'move'
  | 'insert'
  | 'remove'
  | 'visit'
  | 'match'
  | 'push'
  | 'pop'
  | 'enqueue'
  | 'dequeue'
  | 'recurse'
  | 'return'
  | 'done';

export interface LegendItem {
  status: NodeStatus;
  label: string;
}

export interface MetricItem {
  label: string;
  value: string | number;
}

export interface CanvasNode {
  id: string;
  label: string;
  x: number;
  y: number;
  kind?: 'normal' | 'null' | 'highlight';
  status?: NodeStatus;
  /** 节点上方短标记：索引、指针名、深度等（≤ 3 字符） */
  badge?: string;
  /** 节点下方说明：如 `nums[0]`、`已入队`，用于补齐语义 */
  sublabel?: string;
  radius?: number;
}

export interface CanvasEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  status?: EdgeStatus;
  directed?: boolean;
}

export interface CanvasArrow {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  text?: string;
  kind?: 'flow' | 'transfer' | 'return' | 'pointer';
  /** 二次贝塞尔弯曲量；正负决定弯向哪一侧，0 为直线 */
  curve?: number;
  /** 文字沿箭头的位置，0 = 起点，1 = 终点，默认 0.5 */
  labelPosition?: number;
  /** 文字相对路径点的偏移 */
  labelOffset?: { x: number; y: number };
  /** 箭头线宽，默认 2 */
  width?: number;
}

/**
 * 栈/队列的外框。items 保存当前占用的节点 id，
 * 顺序为栈底→栈顶、队首→队尾；渲染器负责画槽位与指针。
 */
export interface CanvasContainer {
  id: string;
  kind: 'stack' | 'queue';
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  /** 展示的槽位数量（含空槽），默认至少为 items.length */
  capacity: number;
  /** 槽位内元素 ID，顺序：栈底→栈顶 / 队首→队尾；每个 ID 必须同时出现在 frame.nodes */
  items: string[];
  emptyText?: string;
}

export interface CanvasLabel {
  id: string;
  targetId: string;
  text: string;
  /** 第二行说明；用于解释“这个节点/标记是什么” */
  detail?: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  variant?: 'caption' | 'callout' | 'pointer';
  tone?: 'neutral' | 'accent' | 'warning';
}

export interface CanvasFrame {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  arrows: CanvasArrow[];
  labels: CanvasLabel[];
  /** 栈/队列等辅助结构容器；普通数组/树/图可省略 */
  containers?: CanvasContainer[];
  notes: string[];
  /** 不填时使用固定四色图例，保证跨步骤稳定 */
  legend?: LegendItem[];
  /** 不填时自动统计节点/进行中/已访问 */
  metrics?: MetricItem[];
}

export interface AlgorithmStep {
  id: number;
  title: string;
  description: string;
  /** 操作徽标，如“比较”“入栈” */
  operation?: StepOperation;
  /** 面向观众的一句话解说，缺省回退到 description */
  narration?: string;
  binding: StepBinding;
  frame: CanvasFrame;
}

export interface CodeArtifact {
  language: Language;
  code: string;
  anchorLineMap: Record<string, number[]>;
}

export interface SolutionDefinition {
  id: string;
  name: string;
  thought: string;
  samples: InputSample[];
  codes: Record<Language, CodeArtifact>;
  steps: AlgorithmStep[];
  validateInput: (raw: string) => InputValidationResult;
  generateRandom: () => string;
}
