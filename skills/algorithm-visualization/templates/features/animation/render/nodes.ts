import * as d3 from 'd3';
import type { CanvasNode } from '../../../types';
import { fitNodeLabel } from '../text';
import { normalizeNodeStatus } from '../motion';
import { nodeRadius, type LayerSelection, type RenderTiming } from './common';

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
    .call((group) => group.append('title'))
    .call((group) =>
      group
        .append('circle')
        .attr('class', 'node-ring')
        .attr('r', (node) => (nodeRadius(node) + 7) * 0.6)
    )
    .call((group) =>
      group.append('circle').attr('class', 'node-core').attr('r', (node) => nodeRadius(node) * 0.6)
    )
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
    .attr('data-status', (node) => normalizeNodeStatus(node))
    .attr('role', 'img');

  if (timing.reduced) {
    join.exit<CanvasNode>().remove();
    nodes.attr('transform', position).attr('opacity', 1);
    nodes.select<SVGCircleElement>('circle.node-core').attr('r', nodeRadius);
    nodes.select<SVGCircleElement>('circle.node-ring').attr('r', (node) => nodeRadius(node) + 7);
  } else {
    exitNodes(join.exit<CanvasNode>(), timing);

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

    // 入场用 0.6 → 1.0 的半径缩放，时长跟随 enterMs；
    // 已在画布上的节点只做 updateMs 的半径更新，两类过渡互不抢占。
    enter
      .select<SVGCircleElement>('circle.node-core')
      .interrupt('enter-radius')
      .transition('enter-radius')
      .duration(timing.enterMs)
      .ease(d3.easeBackOut)
      .attr('r', nodeRadius);
    enter
      .select<SVGCircleElement>('circle.node-ring')
      .interrupt('enter-ring')
      .transition('enter-ring')
      .duration(timing.enterMs)
      .ease(d3.easeBackOut)
      .attr('r', (node) => nodeRadius(node) + 7);

    join
      .select<SVGCircleElement>('circle.node-core')
      .interrupt('exit-radius')
      .interrupt('radius')
      .transition('radius')
      .duration(timing.updateMs)
      .ease(d3.easeCubicOut)
      .attr('r', nodeRadius);

    join
      .select<SVGCircleElement>('circle.node-ring')
      .interrupt('exit-ring')
      .interrupt('ring')
      .transition('ring')
      .duration(timing.updateMs)
      .ease(d3.easeCubicOut)
      .attr('r', (node) => nodeRadius(node) + 7);
  }

  nodes.each(function (node) {
    const group = d3.select(this);
    const radius = nodeRadius(node);
    const fitted = fitNodeLabel(node.label, radius);
    group.attr('aria-label', node.badge ? `${node.label}，${node.badge}` : node.label);
    group
      .selectAll<SVGTitleElement, CanvasNode>('title')
      .data([node])
      .join('title')
      .text(node.label);
    group
      .select<SVGTextElement>('text.node-label')
      .text(fitted.text)
      .style('font-size', `${fitted.fontSize}px`)
      .attr('data-truncated', fitted.truncated ? 'true' : 'false');
  });

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

/**
 * 节点退场：透明度淡出的同时把圆缩到 0.6 倍，和入场形成对称的“呼吸”语法。
 * 仍用 end 回调自行 remove，避免 transition.remove() 在命名过渡并存时静默跳过。
 */
function exitNodes(
  exit: d3.Selection<SVGGElement, CanvasNode, SVGGElement, unknown>,
  timing: RenderTiming
): void {
  exit
    .interrupt('exit')
    .transition('exit')
    .duration(timing.exitMs)
    .ease(d3.easeCubicIn)
    .attr('opacity', 0)
    .on('end.exit-remove', function () {
      this.remove();
    });

  exit
    .select<SVGCircleElement>('circle.node-core')
    .interrupt('enter-radius')
    .interrupt('radius')
    .transition('exit-radius')
    .duration(timing.exitMs)
    .ease(d3.easeCubicIn)
    .attr('r', (node) => nodeRadius(node) * 0.6);

  exit
    .select<SVGCircleElement>('circle.node-ring')
    .interrupt('enter-ring')
    .interrupt('ring')
    .transition('exit-ring')
    .duration(timing.exitMs)
    .ease(d3.easeCubicIn)
    .attr('r', (node) => (nodeRadius(node) + 7) * 0.6);
}
