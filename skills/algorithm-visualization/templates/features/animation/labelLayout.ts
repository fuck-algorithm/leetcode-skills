import type { CanvasContainer, CanvasLabel, CanvasNode } from '../../types';
import {
  clampLabelCenter,
  labelOffset,
  measureLabel,
  nodeRadius,
  overlapArea,
  rectAt,
  type LabelPlacement,
  type LabelPosition,
  type Point,
  type Rect,
  type Size
} from './layout';

const POSITION_ORDER: LabelPosition[] = ['top', 'bottom', 'left', 'right'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function circleRectPenalty(rect: Rect, node: CanvasNode): number {
  const radius = nodeRadius(node);
  const closestX = clamp(node.x, rect.x, rect.x + rect.width);
  const closestY = clamp(node.y, rect.y, rect.y + rect.height);
  const distance = Math.hypot(node.x - closestX, node.y - closestY);
  if (distance >= radius) {
    return 0;
  }
  const penetration = radius - distance;
  return 10_000 + penetration * penetration;
}

/** 引导线从标签框边缘走向节点外沿。 */
function leaderLine(center: Point, size: Size, target: CanvasNode) {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.001) {
    return { x1: 0, y1: 0, x2: 0, y2: 0 };
  }
  const ux = dx / distance;
  const uy = dy / distance;
  const edgeX = Math.abs(ux) < 0.001 ? Number.POSITIVE_INFINITY : size.width / 2 / Math.abs(ux);
  const edgeY = Math.abs(uy) < 0.001 ? Number.POSITIVE_INFINITY : size.height / 2 / Math.abs(uy);
  const startDistance = Math.min(edgeX, edgeY);
  const endDistance = distance - nodeRadius(target) - 4;
  const visibleDistance = Math.max(startDistance, endDistance);
  return {
    x1: ux * startDistance,
    y1: uy * startDistance,
    x2: ux * visibleDistance,
    y2: uy * visibleDistance
  };
}

function candidatesFor(label: CanvasLabel, target: CanvasNode, size: Size) {
  const preferred = label.position;
  const order = [preferred, ...POSITION_ORDER.filter((position) => position !== preferred)];
  return order.map((position) => {
    const offset = labelOffset(position, size, nodeRadius(target));
    return {
      center: clampLabelCenter({ x: target.x + offset.x, y: target.y + offset.y }, size),
      position
    };
  });
}

function candidateScore(
  center: Point,
  size: Size,
  rank: number,
  placed: Rect[],
  nodes: CanvasNode[],
  containers: CanvasContainer[],
  positionBias: number
): number {
  const rect = rectAt(center, size);
  let score = rank * positionBias;
  for (const other of placed) {
    score += overlapArea(rect, other);
  }
  for (const node of nodes) {
    score += circleRectPenalty(rect, node);
  }
  for (const container of containers) {
    score += overlapArea(rect, container) * 2;
  }
  return score;
}

export type LabelLayoutOptions = {
  containers?: CanvasContainer[];
  /** 碰撞惩罚之外，给首选方向保留的轻微偏好分。 */
  positionBias?: number;
};

/** 确定性标签避让：候选方向零碰撞时立即采用，否则最小化重叠惩罚。 */
export function placeLabels(
  labels: CanvasLabel[],
  nodeById: Map<string, CanvasNode>,
  options: LabelLayoutOptions = {}
): Map<string, LabelPlacement> {
  const nodes = [...nodeById.values()];
  const containers = options.containers ?? [];
  const positionBias = options.positionBias ?? 0.01;
  const placedRects: Rect[] = [];
  const placements = new Map<string, LabelPlacement>();

  for (const label of labels) {
    const target = nodeById.get(label.targetId);
    if (!target) {
      continue;
    }

    const size = measureLabel(label);
    let best: { center: Point; position: LabelPosition; score: number } | null = null;
    for (const [rank, candidate] of candidatesFor(label, target, size).entries()) {
      const score = candidateScore(
        candidate.center,
        size,
        rank,
        placedRects,
        nodes,
        containers,
        positionBias
      );
      if (!best || score < best.score) {
        best = { ...candidate, score };
      }
      if (score <= 0.0001) {
        break;
      }
    }

    if (!best) {
      continue;
    }
    placements.set(label.id, {
      x: best.center.x,
      y: best.center.y,
      width: size.width,
      height: size.height,
      position: best.position,
      leader: leaderLine(best.center, size, target)
    });
    placedRects.push(rectAt(best.center, size));
  }
  return placements;
}
