import * as d3 from 'd3';
import type { CanvasEdge, CanvasNode } from '../../../types';
import { trimSegment, type Point } from '../layout';
import { fadeOutAndRemove, nodeRadius, type LayerSelection, type RenderTiming } from './common';

type EdgeGeometry = { from: Point; to: Point };

/**
 * 边从节点外沿出发、到目标节点外沿结束，避免线头被节点圆盖住。
 * 两节点重叠时没有可读的连线，直接视为无效边。
 */
export function renderEdges(
  layer: LayerSelection,
  edgesData: CanvasEdge[],
  nodeById: Map<string, CanvasNode>,
  timing: RenderTiming
): void {
  const geometryOf = (edge: CanvasEdge): EdgeGeometry | null => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) {
      return null;
    }
    const trimmed = trimSegment(from, to, nodeRadius(from), nodeRadius(to));
    return trimmed ? { from: trimmed.from, to: trimmed.to } : null;
  };
  const valid = edgesData.filter((edge) => geometryOf(edge));

  const join = layer.selectAll<SVGGElement, CanvasEdge>('g.canvas-edge').data(valid, (edge) => edge.id);

  const enter = join
    .enter()
    .append('g')
    .attr('class', 'canvas-edge')
    .attr('opacity', 0)
    .call((group) => group.append('line').attr('class', 'edge-line'))
    .call((group) => group.append('text').attr('class', 'edge-label').attr('text-anchor', 'middle'));

  const edges = enter.merge(join);
  const line = edges.select<SVGLineElement>('line').attr('marker-end', (edge) =>
    edge.directed ? 'url(#flow-arrow)' : null
  );
  const label = edges
    .select<SVGTextElement>('text.edge-label')
    .text((edge) => edge.label ?? '')
    .attr('opacity', (edge) => (edge.label ? 1 : 0));

  edges
    .attr('data-edge-id', (edge) => edge.id)
    .attr('data-status', (edge) => edge.status ?? 'idle')
    .attr('class', (edge) => `canvas-edge edge--${edge.status ?? 'idle'}`);

  const x1 = (edge: CanvasEdge) => geometryOf(edge)?.from.x ?? 0;
  const y1 = (edge: CanvasEdge) => geometryOf(edge)?.from.y ?? 0;
  const x2 = (edge: CanvasEdge) => geometryOf(edge)?.to.x ?? 0;
  const y2 = (edge: CanvasEdge) => geometryOf(edge)?.to.y ?? 0;
  const midX = (edge: CanvasEdge) => (x1(edge) + x2(edge)) / 2;
  const midY = (edge: CanvasEdge) => (y1(edge) + y2(edge)) / 2;

  if (timing.reduced) {
    fadeOutAndRemove(join.exit<CanvasEdge>(), timing);
    edges.attr('opacity', 1);
    line.attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2);
    label.attr('x', midX).attr('y', (edge) => midY(edge) - 8);
    return;
  }

  fadeOutAndRemove(join.exit<CanvasEdge>(), timing);

  edges
    .interrupt('exit')
    .interrupt('fade')
    .transition('fade')
    .duration(timing.updateMs)
    .attr('opacity', 1);

  line
    .interrupt('line')
    .transition('line')
    .duration(timing.updateMs)
    .ease(d3.easeCubicOut)
    .attr('x1', x1)
    .attr('y1', y1)
    .attr('x2', x2)
    .attr('y2', y2);

  label
    .interrupt('label')
    .transition('label')
    .duration(timing.updateMs)
    .attr('x', midX)
    .attr('y', (edge) => midY(edge) - 8);
}
