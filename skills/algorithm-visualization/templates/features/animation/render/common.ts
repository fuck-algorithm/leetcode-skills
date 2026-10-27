import type { BaseType, Selection } from 'd3';

export { NODE_RADIUS, nodeRadius } from '../layout';

export type LayerSelection = Selection<SVGGElement, unknown, null, undefined>;

export type RenderTiming = {
  enterMs: number;
  updateMs: number;
  exitMs: number;
  arrowMs: number;
  reduced: boolean;
};

/**
 * 退场淡出并在结束后自行移除。
 * 不能用 transition.remove()：同一元素上还有其它命名过渡（如 move/fade）时，
 * d3 的 remove 会因为 __transition 里仍有别的 id 而静默跳过删除，快速切换帧时
 * 就会残留透明元素。这里在 end 回调里直接 remove，避免该问题。
 */
export function fadeOutAndRemove<E extends Element, T, P extends BaseType>(
  exit: Selection<E, T, P, unknown>,
  timing: RenderTiming
): void {
  if (timing.reduced) {
    exit.remove();
    return;
  }

  exit
    .interrupt('exit')
    .transition('exit')
    .duration(timing.exitMs)
    .attr('opacity', 0)
    .on('end.exit-remove', function () {
      this.remove();
    });
}
