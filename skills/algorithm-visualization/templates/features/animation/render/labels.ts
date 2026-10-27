import * as d3 from 'd3';
import type { CanvasContainer, CanvasLabel, CanvasNode } from '../../../types';
import { placeLabels, type LabelPlacement } from '../layout';
import { fadeOutAndRemove } from './common';
import type { LayerSelection, RenderTiming } from './common';

/**
 * 标签位置不是固定上下左右偏移，而是每帧做一次轻量布局：
 * 先按首选方向计算，再依次尝试其它方向，避开节点、容器和已放好的标签。
 */
export function renderLabels(
  layer: LayerSelection,
  labelsData: CanvasLabel[],
  nodeById: Map<string, CanvasNode>,
  timing: RenderTiming,
  containers: CanvasContainer[] = []
): void {
  const valid = labelsData.filter((label) => nodeById.has(label.targetId));
  const placements = placeLabels(valid, nodeById, { containers });
  const placementOf = (label: CanvasLabel): LabelPlacement | undefined => placements.get(label.id);
  const position = (label: CanvasLabel) => {
    const placement = placementOf(label);
    return placement ? `translate(${placement.x},${placement.y})` : 'translate(0,0)';
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
    .attr('data-label-variant', (label) => label.variant ?? 'callout')
    .attr('data-label-position', (label) => placementOf(label)?.position ?? label.position);

  const bg = labels
    .select<SVGRectElement>('rect.label-bg')
    .attr('x', (label) => -(placementOf(label)?.width ?? 0) / 2)
    .attr('y', (label) => -(placementOf(label)?.height ?? 0) / 2)
    .attr('width', (label) => placementOf(label)?.width ?? 0)
    .attr('height', (label) => placementOf(label)?.height ?? 0);

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
    .attr('x1', (label) => placementOf(label)?.leader.x1 ?? 0)
    .attr('y1', (label) => placementOf(label)?.leader.y1 ?? 0)
    .attr('x2', (label) => placementOf(label)?.leader.x2 ?? 0)
    .attr('y2', (label) => placementOf(label)?.leader.y2 ?? 0)
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
