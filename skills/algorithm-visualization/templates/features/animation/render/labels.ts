import * as d3 from 'd3';
import type { CanvasLabel, CanvasNode } from '../../../types';
import { fadeOutAndRemove, nodeRadius } from './common';
import type { LayerSelection, RenderTiming } from './common';

/** 标签背景与目标节点之间保留的呼吸间距。 */
const LABEL_GAP = 14;

function labelSize(label: CanvasLabel): { width: number; height: number } {
  const mainWidth = label.text.length * 12;
  const detailWidth = label.detail ? label.detail.length * 10 : 0;
  return {
    width: Math.max(52, mainWidth, detailWidth) + 20,
    height: label.detail ? 40 : 24
  };
}

/** 按标签实际尺寸与节点半径计算偏移，避免长文案压住节点。 */
function labelOffset(label: CanvasLabel, radius: number): { dx: number; dy: number } {
  const size = labelSize(label);
  switch (label.position) {
    case 'left':
      return { dx: -(size.width / 2 + radius + LABEL_GAP), dy: 0 };
    case 'right':
      return { dx: size.width / 2 + radius + LABEL_GAP, dy: 0 };
    case 'top':
      return { dx: 0, dy: -(size.height / 2 + radius + LABEL_GAP) };
    default:
      return { dx: 0, dy: size.height / 2 + radius + LABEL_GAP };
  }
}

/** pointer/callout 标签到目标节点的引导线，坐标相对标签组。 */
function leaderLine(label: CanvasLabel, target: CanvasNode): { x1: number; y1: number; x2: number; y2: number } {
  const size = labelSize(label);
  const radius = nodeRadius(target);
  const offset = labelOffset(label, radius);
  const edge = radius + 4;
  if (label.position === 'top') {
    return { x1: 0, y1: size.height / 2, x2: 0, y2: -offset.dy - edge };
  }
  if (label.position === 'bottom') {
    return { x1: 0, y1: -size.height / 2, x2: 0, y2: -offset.dy + edge };
  }
  if (label.position === 'left') {
    return { x1: size.width / 2, y1: 0, x2: -offset.dx - edge, y2: 0 };
  }
  return { x1: -size.width / 2, y1: 0, x2: -offset.dx + edge, y2: 0 };
}

export function renderLabels(
  layer: LayerSelection,
  labelsData: CanvasLabel[],
  nodeById: Map<string, CanvasNode>,
  timing: RenderTiming
): void {
  const valid = labelsData.filter((label) => nodeById.has(label.targetId));
  const nodeOf = (id: string) => nodeById.get(id) ?? { id, label: id, x: 0, y: 0 };
  const position = (label: CanvasLabel) => {
    const target = nodeOf(label.targetId);
    const offset = labelOffset(label, nodeRadius(target));
    return `translate(${target.x + offset.dx},${target.y + offset.dy})`;
  };

  const join = layer.selectAll<SVGGElement, CanvasLabel>('g.canvas-label').data(valid, (label) => label.id);

  const enter = join
    .enter()
    .append('g')
    .attr('class', 'canvas-label')
    .attr('opacity', 0)
    .attr('transform', position)
    .call((group) => group.append('line').attr('class', 'label-leader'))
    .call((group) => group.append('rect').attr('class', 'label-bg').attr('rx', 8))
    .call((group) => group.append('text').attr('class', 'label-text').attr('text-anchor', 'middle'))
    .call((group) =>
      group.append('text').attr('class', 'label-detail').attr('text-anchor', 'middle')
    );

  const labels = enter.merge(join);
  labels
    .attr('class', (label) => `canvas-label label--${label.variant ?? 'callout'} label-tone--${label.tone ?? 'neutral'}`)
    .attr('data-label-id', (label) => label.id)
    .attr('data-label-variant', (label) => label.variant ?? 'callout');

  const bg = labels
    .select<SVGRectElement>('rect.label-bg')
    .attr('x', (label) => -labelSize(label).width / 2)
    .attr('y', (label) => -labelSize(label).height / 2)
    .attr('width', (label) => labelSize(label).width)
    .attr('height', (label) => labelSize(label).height);

  labels
    .select<SVGTextElement>('text.label-text')
    .text((label) => label.text)
    .attr('y', (label) => (label.detail ? -5 : 4));

  labels
    .select<SVGTextElement>('text.label-detail')
    .text((label) => label.detail ?? '')
    .attr('y', 12)
    .attr('opacity', (label) => (label.detail ? 1 : 0));

  labels
    .select<SVGLineElement>('line.label-leader')
    .attr('x1', (label) => leaderLine(label, nodeOf(label.targetId)).x1)
    .attr('y1', (label) => leaderLine(label, nodeOf(label.targetId)).y1)
    .attr('x2', (label) => leaderLine(label, nodeOf(label.targetId)).x2)
    .attr('y2', (label) => leaderLine(label, nodeOf(label.targetId)).y2)
    .attr('opacity', (label) => (label.variant === 'pointer' ? 1 : 0));

  if (timing.reduced) {
    fadeOutAndRemove(join.exit<CanvasLabel>(), timing);
    labels.attr('transform', position).attr('opacity', 1);
    bg.attr('opacity', 1);
    return;
  }

  fadeOutAndRemove(join.exit<CanvasLabel>(), timing);
  labels.interrupt('exit');

  labels
    .interrupt('label')
    .transition('label')
    .duration(timing.updateMs)
    .ease(d3.easeCubicOut)
    .attr('transform', position)
    .attr('opacity', 1);

  bg.attr('opacity', 1);
}
