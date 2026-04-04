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

export interface CanvasNode {
  id: string;
  label: string;
  x: number;
  y: number;
  kind?: 'normal' | 'null' | 'highlight';
}

export interface CanvasEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface CanvasArrow {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  text?: string;
}

export interface CanvasLabel {
  id: string;
  targetId: string;
  text: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export interface CanvasFrame {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  arrows: CanvasArrow[];
  labels: CanvasLabel[];
  notes: string[];
}

export interface AlgorithmStep {
  id: number;
  title: string;
  description: string;
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
