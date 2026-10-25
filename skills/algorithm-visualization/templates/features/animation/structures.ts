import type { CanvasContainer, CanvasNode, NodeStatus } from '../../types';

export interface StructureItem {
  id: string;
  label: string;
  status?: NodeStatus;
  badge?: string;
  sublabel?: string;
  radius?: number;
}

export interface StackOptions {
  id: string;
  x: number;
  y: number;
  items: StructureItem[];
  /** 固定容量用于稳定槽位；不填时至少展示 items.length 与 4 个槽 */
  capacity?: number;
  title?: string;
  width?: number;
  slotHeight?: number;
  itemRadius?: number;
  emptyText?: string;
}

export interface QueueOptions {
  id: string;
  x: number;
  y: number;
  items: StructureItem[];
  capacity?: number;
  title?: string;
  width?: number;
  height?: number;
  slotWidth?: number;
  itemRadius?: number;
  emptyText?: string;
}

export interface StructureLayout {
  nodes: CanvasNode[];
  containers: CanvasContainer[];
}

const STACK_WIDTH = 116;
const STACK_SLOT_HEIGHT = 64;
const STACK_HEADER = 30;
const STACK_PADDING = 8;
const QUEUE_HEIGHT = 104;
const QUEUE_HEADER = 28;
const QUEUE_PADDING = 8;
const QUEUE_SLOT_WIDTH = 64;
const ITEM_RADIUS = 20;

function normalizeCapacity(capacity: number | undefined, count: number, fallback = 4): number {
  return Math.max(capacity ?? 0, count, fallback);
}

function toNode(item: StructureItem, x: number, y: number, radius: number): CanvasNode {
  return {
    id: item.id,
    label: item.label,
    x,
    y,
    status: item.status,
    badge: item.badge,
    sublabel: item.sublabel,
    radius: item.radius ?? radius
  };
}

/**
 * 垂直栈：栈底在下、栈顶在上。items 顺序必须是栈底→栈顶，
 * 同一元素跨步骤复用同一个 id，才能得到“入栈落下 / 出栈浮起”的过渡。
 */
export function createStack(options: StackOptions): StructureLayout {
  const capacity = normalizeCapacity(options.capacity, options.items.length);
  const width = options.width ?? STACK_WIDTH;
  const slotHeight = options.slotHeight ?? STACK_SLOT_HEIGHT;
  const radius = options.itemRadius ?? ITEM_RADIUS;
  const height = STACK_HEADER + capacity * slotHeight + STACK_PADDING;
  const centerX = options.x + width / 2;
  const bottom = options.y + height - STACK_PADDING;

  const nodes = options.items.map((item, index) =>
    toNode(item, centerX, bottom - slotHeight * (index + 0.5), radius)
  );

  const container: CanvasContainer = {
    id: options.id,
    kind: 'stack',
    x: options.x,
    y: options.y,
    width,
    height,
    title: options.title ?? '栈',
    capacity,
    items: options.items.map((item) => item.id),
    emptyText: options.emptyText ?? '空栈'
  };

  return { nodes, containers: [container] };
}

/**
 * 水平队列：队首在左、队尾在右。出队后剩余元素自动左移，
 * 入队元素从右侧槽位落下；items 顺序必须是队首→队尾。
 */
export function createQueue(options: QueueOptions): StructureLayout {
  const capacity = normalizeCapacity(options.capacity, options.items.length);
  const slotWidth = options.slotWidth ?? QUEUE_SLOT_WIDTH;
  const width = options.width ?? capacity * slotWidth + QUEUE_PADDING * 2;
  const height = options.height ?? QUEUE_HEIGHT;
  const radius = options.itemRadius ?? ITEM_RADIUS;
  const centerY = options.y + QUEUE_HEADER + (height - QUEUE_HEADER) / 2 - 2;
  // 节点必须落在容器实际槽位中心：custom width 与 slotWidth 同时给出时以 width 为准。
  const effectiveSlotWidth = (width - QUEUE_PADDING * 2) / capacity;

  const nodes = options.items.map((item, index) =>
    toNode(item, options.x + QUEUE_PADDING + effectiveSlotWidth * (index + 0.5), centerY, radius)
  );

  const container: CanvasContainer = {
    id: options.id,
    kind: 'queue',
    x: options.x,
    y: options.y,
    width,
    height,
    title: options.title ?? '队列',
    capacity,
    items: options.items.map((item) => item.id),
    emptyText: options.emptyText ?? '空队列'
  };

  return { nodes, containers: [container] };
}
