import * as d3 from 'd3';
import type { CanvasNode } from '../../../types';
import { normalizeNodeStatus } from '../motion';
import { fadeOutAndRemove, nodeRadius, type LayerSelection, type RenderTiming } from './common';

/**
 * 按稳定 id 复用节点，位置只动 transform；
 * 入场缩放淡入、退场缩放淡出，避免整屏重建。
 */
export function renderNodes(layer: LayerSelection, nodesData: CanvasNode[], timing: RenderTiming): void {
  const join = layer
    .selectAll<SVGGElement, CanvasNode>('g.canvas-node')
    .data(nodesData, (node) => node.id);

  const enter = join
    .enter()
    .append('g')
    .attr('class', 'canvas-node')
    .attr('transform', (node) => `translate(${node.x},${node.y})`)
    .attr('opacity', 0)
    .call((group) => group.append('circle').attr('class', 'node-ring').attr('r', 0))
    .call((group) => group.append('circle').attr('class', 'node-core').attr('r', 0))
    .call((group) =>
      group.append('text').attr('class', 'node-label').attr('text-anchor', 'middle').attr('dy', '0.35em')
    )
    .call((group) => group.append('text').attr('class', 'node-badge').attr('text-anchor', 'middle'))
    .call((group) =>
      group.append('text').attr('class', 'node-sublabel').attr('text-anchor', 'middle')
    );

  const nodes = enter.merge(join);
  const position = (node: CanvasNode) => `translate(${node.x},${node.y})`;

  nodes
    .attr('class', (node) => {
      const status = normalizeNodeStatus(node);
      return `canvas-node node--${status}${node.kind === 'null' ? ' is-null' : ''}`;
    })
    .attr('data-node-id', (node) => node.id)
    .attr('data-status', (node) => normalizeNodeStatus(node));

  if (timing.reduced) {
    fadeOutAndRemove(join.exit<CanvasNode>(), timing);
    nodes.attr('transform', position).attr('opacity', 1);
    nodes.select<SVGCircleElement>('circle.node-core').attr('r', nodeRadius);
    nodes.select<SVGCircleElement>('circle.node-ring').attr('r', (node) => nodeRadius(node) + 7);
  } else {
    fadeOutAndRemove(join.exit<CanvasNode>(), timing);

    // 同一 id 重新出现时取消退场，避免被上一轮 exit 过渡删掉。
    nodes.interrupt('exit');

    nodes
      .interrupt('move')
      .transition('move')
      .duration(timing.updateMs)
      .ease(d3.easeCubicOut)
      .attr('transform', position);

    join.attr('opacity', 1);
    enter
      .interrupt('enter')
      .transition('enter')
      .duration(timing.enterMs)
      .ease(d3.easeBackOut)
      .attr('opacity', 1);

    nodes
      .select<SVGCircleElement>('circle.node-core')
      .interrupt('radius')
      .transition('radius')
      .duration(timing.updateMs)
      .ease(d3.easeCubicOut)
      .attr('r', nodeRadius);

    nodes
      .select<SVGCircleElement>('circle.node-ring')
      .interrupt('ring')
      .transition('ring')
      .duration(timing.updateMs)
      .ease(d3.easeCubicOut)
      .attr('r', (node) => nodeRadius(node) + 7);
  }

  nodes.select<SVGTextElement>('text.node-label').text((node) => node.label);

  nodes
    .select<SVGTextElement>('text.node-badge')
    .text((node) => node.badge ?? '')
    .attr('y', (node) => -nodeRadius(node) - 10)
    .attr('opacity', (node) => (node.badge ? 1 : 0));

  nodes
    .select<SVGTextElement>('text.node-sublabel')
    .text((node) => node.sublabel ?? '')
    .attr('y', (node) => nodeRadius(node) + 15)
    .attr('opacity', (node) => (node.sublabel ? 1 : 0));
}
