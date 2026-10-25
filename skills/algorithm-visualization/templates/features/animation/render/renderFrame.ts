import type { CanvasFrame } from '../../../types';
import { MOTION, motionDuration } from '../motion';
import type { LayerSelection } from './common';
import { renderArrows } from './arrows';
import { renderContainers } from './containers';
import { renderEdges } from './edges';
import { renderLabels } from './labels';
import { renderNodes } from './nodes';

/**
 * 单帧渲染入口：分层 keyed join + 过渡。
 * 必须在画布挂载后调用；每帧只更新有变化的元素，不做整屏重建。
 */
export function renderFrame(
  layer: LayerSelection,
  frame: CanvasFrame,
  speed: number,
  reduced: boolean
): void {
  const nodeById = new Map(frame.nodes.map((node) => [node.id, node]));
  const timing = {
    enterMs: motionDuration(MOTION.enterMs, speed, reduced),
    updateMs: motionDuration(MOTION.updateMs, speed, reduced),
    exitMs: motionDuration(MOTION.exitMs, speed, reduced),
    arrowMs: motionDuration(MOTION.arrowMs, speed, reduced),
    reduced
  };

  renderContainers(layer.select<SVGGElement>('.layer-containers'), frame.containers ?? [], timing);
  renderEdges(layer.select<SVGGElement>('.layer-edges'), frame.edges, nodeById, timing);
  renderArrows(layer.select<SVGGElement>('.layer-arrows'), frame.arrows, timing);
  renderNodes(layer.select<SVGGElement>('.layer-nodes'), frame.nodes, timing);
  renderLabels(layer.select<SVGGElement>('.layer-labels'), frame.labels, nodeById, timing);
}
