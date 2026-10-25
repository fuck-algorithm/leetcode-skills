import * as d3 from 'd3';
import type { CanvasArrow } from '../../../types';
import { fadeOutAndRemove, type LayerSelection, type RenderTiming } from './common';

function markerOf(kind: CanvasArrow['kind']): string {
  switch (kind) {
    case 'transfer':
      return 'url(#transfer-arrow)';
    case 'return':
      return 'url(#return-arrow)';
    case 'pointer':
      return 'url(#pointer-arrow)';
    default:
      return 'url(#flow-arrow)';
  }
}

/**
 * 二次贝塞尔路径。curve 表示顶点偏离直线的像素数，
 * 正负决定弯曲方向，便于给重叠的边让路。
 */
export function arrowPath(arrow: CanvasArrow): string {
  const { from, to, curve = 0 } = arrow;
  if (Math.abs(curve) < 0.5) {
    return `M${from.x},${from.y} L${to.x},${to.y}`;
  }
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const controlX = (from.x + to.x) / 2 + normalX * curve * 2;
  const controlY = (from.y + to.y) / 2 + normalY * curve * 2;
  return `M${from.x},${from.y} Q${controlX},${controlY} ${to.x},${to.y}`;
}

/** 箭头文字锚点：按参数 t 取贝塞尔曲线上的点。 */
export function arrowLabelPoint(arrow: CanvasArrow): { x: number; y: number } {
  const t = Math.min(Math.max(arrow.labelPosition ?? 0.5, 0), 1);
  const { from, to, curve = 0 } = arrow;
  if (Math.abs(curve) < 0.5) {
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  }
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const controlX = (from.x + to.x) / 2 + (-dy / length) * curve * 2;
  const controlY = (from.y + to.y) / 2 + (dx / length) * curve * 2;
  const inverse = 1 - t;
  return {
    x: inverse * inverse * from.x + 2 * inverse * t * controlX + t * t * to.x,
    y: inverse * inverse * from.y + 2 * inverse * t * controlY + t * t * to.y
  };
}

/**
 * 箭头：新增时沿路径生长，同 id 换坐标时只做位置过渡。
 * 文字默认贴在曲线中点上方，可单独偏移避免压住节点。
 */
export function renderArrows(layer: LayerSelection, arrowsData: CanvasArrow[], timing: RenderTiming): void {
  const join = layer.selectAll<SVGGElement, CanvasArrow>('g.canvas-arrow').data(arrowsData, (arrow) => arrow.id);

  const enter = join
    .enter()
    .append('g')
    .attr('class', 'canvas-arrow')
    .call((group) =>
      group
        .append('path')
        .attr('class', 'arrow-line')
        .attr('fill', 'none')
        .attr('d', (arrow) => arrowPath(arrow))
    )
    .call((group) =>
      group
        .append('text')
        .attr('class', 'arrow-label')
        .attr('text-anchor', 'middle')
        .attr('x', (arrow) => arrowLabelPoint(arrow).x + (arrow.labelOffset?.x ?? 0))
        .attr('y', (arrow) => arrowLabelPoint(arrow).y + (arrow.labelOffset?.y ?? -10))
    );

  const arrows = enter.merge(join);
  const path = arrows
    .select<SVGPathElement>('path.arrow-line')
    .attr('marker-end', (arrow) => markerOf(arrow.kind))
    .attr('stroke-width', (arrow) => arrow.width ?? 2)
    .attr('pathLength', 1);
  const label = arrows
    .select<SVGTextElement>('text.arrow-label')
    .text((arrow) => arrow.text ?? '')
    .attr('opacity', (arrow) => (arrow.text ? 1 : 0));

  arrows
    .attr('class', (arrow) => `canvas-arrow arrow--${arrow.kind ?? 'flow'}`)
    .attr('data-arrow-id', (arrow) => arrow.id)
    .attr('data-curve', (arrow) => arrow.curve ?? 0);

  if (timing.reduced) {
    fadeOutAndRemove(join.exit<CanvasArrow>(), timing);
    arrows.attr('opacity', 1);
    path.attr('d', arrowPath);
    label
      .attr('x', (arrow) => arrowLabelPoint(arrow).x + (arrow.labelOffset?.x ?? 0))
      .attr('y', (arrow) => arrowLabelPoint(arrow).y + (arrow.labelOffset?.y ?? -10));
    return;
  }

  fadeOutAndRemove(join.exit<CanvasArrow>(), timing);
  arrows.interrupt('exit');

  enter
    .select<SVGPathElement>('path.arrow-line')
    .attr('stroke-dasharray', '1 1')
    .attr('stroke-dashoffset', 1)
    .transition('draw')
    .duration(timing.arrowMs)
    .ease(d3.easeCubicOut)
    .attr('stroke-dashoffset', 0);

  arrows
    .interrupt('fade')
    .transition('fade')
    .duration(timing.updateMs)
    .attr('opacity', 1);

  path
    .interrupt('line')
    .transition('line')
    .duration(timing.updateMs)
    .ease(d3.easeCubicOut)
    .attr('d', arrowPath);

  label
    .interrupt('label')
    .transition('label')
    .duration(timing.updateMs)
    .attr('x', (arrow) => arrowLabelPoint(arrow).x + (arrow.labelOffset?.x ?? 0))
    .attr('y', (arrow) => arrowLabelPoint(arrow).y + (arrow.labelOffset?.y ?? -10));
}
