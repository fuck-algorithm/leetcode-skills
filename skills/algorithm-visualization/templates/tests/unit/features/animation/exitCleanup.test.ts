import * as d3 from 'd3';
import { describe, expect, it } from 'vitest';
import type { CanvasFrame } from '../../../../types';
import { renderFrame } from '../../../../features/animation/render/renderFrame';

function frame(overrides: Partial<CanvasFrame> = {}): CanvasFrame {
  return { nodes: [], edges: [], arrows: [], labels: [], notes: [], ...overrides };
}

function setup() {
  document.body.innerHTML = `
    <svg>
      <g class="root">
        <g class="layer-containers"></g>
        <g class="layer-edges"></g>
        <g class="layer-arrows"></g>
        <g class="layer-nodes"></g>
        <g class="layer-labels"></g>
      </g>
    </svg>
  `;
  return d3.select<SVGGElement, unknown>('g.root');
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const oldFrame = frame({
  nodes: [
    { id: 'a0', label: '1', x: 100, y: 100 },
    { id: 'a1', label: '2', x: 200, y: 100 }
  ],
  edges: [{ id: 'e-old', from: 'a0', to: 'a1' }],
  arrows: [{ id: 'arrow-old', from: { x: 100, y: 100 }, to: { x: 200, y: 100 }, text: '旧箭头' }],
  labels: [{ id: 'label-old', targetId: 'a0', text: '旧标签', position: 'top' }]
});

const newFrame = frame({
  nodes: [{ id: 'b0', label: '9', x: 300, y: 100 }],
  labels: [{ id: 'label-new', targetId: 'b0', text: '新标签', position: 'top' }]
});

describe('退场清理', () => {
  it('平稳切换后旧节点与旧标签会被移除', async () => {
    const layer = setup();
    renderFrame(layer, oldFrame, 1, false);
    await wait(400);

    renderFrame(layer, newFrame, 1, false);
    await wait(800);

    expect(layer.selectAll('g.canvas-node').size()).toBe(1);
    expect(layer.select('g.canvas-node').attr('data-node-id')).toBe('b0');
    expect(layer.selectAll('g.canvas-label').size()).toBe(1);
    expect(layer.select('g.canvas-label').attr('data-label-id')).toBe('label-new');
  });

  it('快速连续切换时旧元素也不会残留', async () => {
    const layer = setup();
    renderFrame(layer, oldFrame, 1, false);
    await wait(360);
    renderFrame(layer, newFrame, 1, false);
    await wait(60);
    // 在上一轮 exit 过渡仍未结束时再切回旧帧的变体，触发命名过渡重叠。
    renderFrame(
      layer,
      frame({ nodes: [{ id: 'c0', label: '7', x: 400, y: 100 }], labels: [] }),
      1,
      false
    );
    await wait(900);

    expect(layer.selectAll('g.canvas-node').size()).toBe(1);
    expect(layer.select('g.canvas-node').attr('data-node-id')).toBe('c0');
    expect(layer.selectAll('g.canvas-label').size()).toBe(0);
    expect(layer.selectAll('g.canvas-edge').size()).toBe(0);
    expect(layer.selectAll('g.canvas-arrow').size()).toBe(0);
  });

  it('退场期间同一 id 重新出现时保留元素', async () => {
    const layer = setup();
    renderFrame(layer, oldFrame, 1, false);
    await wait(300);
    renderFrame(layer, frame({ nodes: [{ id: 'a0', label: '1', x: 120, y: 100 }] }), 1, false);
    await wait(600);

    expect(layer.selectAll('g.canvas-node').size()).toBe(1);
    const survivor = layer.select('g.canvas-node');
    expect(survivor.attr('data-node-id')).toBe('a0');
    expect(survivor.attr('opacity')).toBe('1');
  });
});
