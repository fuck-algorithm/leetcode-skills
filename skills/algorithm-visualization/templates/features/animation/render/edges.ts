import * as d3 from 'd3';
import type { CanvasEdge, CanvasNode } from '../../../types';
import { fadeOutAndRemove, type LayerSelection, type RenderTiming } from './common';

export function renderEdges(
  layer: LayerSelection,
  edgesData: CanvasEdge[],
  nodeById: Map<string, CanvasNode>,
  timing: RenderTiming
): void {
  const valid = edgesData.filter((edge) => nodeById.has(edge.from) && nodeById.has(edge.to));
  const pointOf = (id: string) => nodeById.get(id) ?? { x: 0, y: 0 };

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

  if (timing.reduced) {
    fadeOutAndRemove(join.exit<CanvasEdge>(), timing);
    edges.attr('opacity', 1);
    line
      .attr('x1', (edge) => pointOf(edge.from).x)
      .attr('y1', (edge) => pointOf(edge.from).y)
      .attr('x2', (edge) => pointOf(edge.to).x)
      .attr('y2', (edge) => pointOf(edge.to).y);
    label
      .attr('x', (edge) => (pointOf(edge.from).x + pointOf(edge.to).x) / 2)
      .attr('y', (edge) => (pointOf(edge.from).y + pointOf(edge.to).y) / 2 - 8);
  } else {
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
      .attr('x1', (edge) => pointOf(edge.from).x)
      .attr('y1', (edge) => pointOf(edge.from).y)
      .attr('x2', (edge) => pointOf(edge.to).x)
      .attr('y2', (edge) => pointOf(edge.to).y);

    label
      .interrupt('label')
      .transition('label')
      .duration(timing.updateMs)
      .attr('x', (edge) => (pointOf(edge.from).x + pointOf(edge.to).x) / 2)
      .attr('y', (edge) => (pointOf(edge.from).y + pointOf(edge.to).y) / 2 - 8);
  }
}
