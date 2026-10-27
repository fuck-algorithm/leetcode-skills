import * as d3 from 'd3';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CanvasFrame, CanvasNode } from '../../../../types';
import { arrowLabelPoint, arrowPath } from '../../../../features/animation/render/arrows';
import { renderFrame } from '../../../../features/animation/render/renderFrame';

function node(id: string, overrides: Partial<CanvasNode> = {}): CanvasNode {
  return { id, label: id, x: 100, y: 100, ...overrides };
}

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

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('renderFrame', () => {
  it('按状态渲染节点并保留语义类名', () => {
    const layer = setup();
    renderFrame(
      layer,
      frame({
        nodes: [node('a0', { status: 'current' }), node('a1', { status: 'done' }), node('a2', { kind: 'null' })]
      }),
      1,
      true
    );

    const nodes = layer.selectAll('g.canvas-node');
    expect(nodes.size()).toBe(3);
    expect(nodes.nodes().map((element) => element.getAttribute('data-status'))).toEqual([
      'current',
      'done',
      'idle'
    ]);
    expect(layer.select('g.node--current').size()).toBe(1);
    expect(layer.select('g.is-null').size()).toBe(1);
  });

  it('同一 id 在相邻帧复用同一个 DOM 节点', () => {
    const layer = setup();
    renderFrame(layer, frame({ nodes: [node('a0')] }), 1, true);
    const first = layer.select('g.canvas-node').node();
    renderFrame(layer, frame({ nodes: [node('a0', { status: 'visited', x: 300 })] }), 1, true);
    const second = layer.select('g.canvas-node').node();

    expect(second).toBe(first);
    expect(second?.getAttribute('data-status')).toBe('visited');
    expect(layer.selectAll('g.canvas-node').size()).toBe(1);
  });

  it('只渲染端点存在的边，并同步状态与箭头标记', () => {
    const layer = setup();
    renderFrame(
      layer,
      frame({
        nodes: [node('a0', { x: 100, y: 100 }), node('a1', { x: 300, y: 100 })],
        edges: [
          { id: 'e0', from: 'a0', to: 'a1', status: 'active', directed: true },
          { id: 'e-bad', from: 'a0', to: 'ghost' }
        ]
      }),
      1,
      true
    );

    expect(layer.selectAll('g.canvas-edge').size()).toBe(1);
    const edge = layer.select('g.canvas-edge');
    expect(edge.attr('data-edge-id')).toBe('e0');
    expect(edge.attr('data-status')).toBe('active');
    expect(edge.select('line').attr('marker-end')).toBe('url(#flow-arrow)');
    // 线从节点外沿出发：100 + 24 + 2，300 - 24 - 2。
    expect(edge.select('line').attr('x1')).toBe('126');
    expect(edge.select('line').attr('x2')).toBe('274');
  });

  it('箭头按 kind 选择 marker，用 pathLength 做生长动画', () => {
    const layer = setup();
    renderFrame(
      layer,
      frame({
        nodes: [node('a0')],
        arrows: [
          {
            id: 'flow-a0',
            from: { x: 100, y: 80 },
            to: { x: 300, y: 200 },
            text: 'x=1',
            kind: 'transfer'
          }
        ]
      }),
      1,
      false
    );

    const path = layer.select('path.arrow-line');
    expect(path.attr('marker-end')).toBe('url(#transfer-arrow)');
    expect(path.attr('pathLength')).toBe('1');
    expect(path.attr('stroke-dasharray')).toBe('1 1');
    expect(path.attr('d')).toContain('L');
    expect(layer.select('text.arrow-label').text()).toBe('x=1');
  });

  it('曲线箭头生成二次贝塞尔路径，文字沿曲线定位', () => {
    const arrow = {
      id: 'curve',
      from: { x: 0, y: 0 },
      to: { x: 100, y: 0 },
      curve: -30,
      labelPosition: 0.5
    };
    expect(arrowPath(arrow)).toContain('Q');
    expect(arrowLabelPoint(arrow).y).toBeLessThan(0);
  });

  it('降级模式跳过箭头绘制动画但保留信息', () => {
    const layer = setup();
    renderFrame(
      layer,
      frame({
        nodes: [node('a0')],
        arrows: [{ id: 'a', from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, text: '1' }]
      }),
      1,
      true
    );

    expect(layer.select('path.arrow-line').attr('stroke-dasharray')).toBeNull();
    expect(layer.select('path.arrow-line').attr('d')).toBe('M0,0 L10,10');
    expect(layer.select('text.arrow-label').text()).toBe('1');
  });

  it('标签带两行说明与底色，并忽略不存在的目标', () => {
    const layer = setup();
    renderFrame(
      layer,
      frame({
        nodes: [node('ans', { x: 100, y: 100 })],
        labels: [
          {
            id: 'caption',
            targetId: 'ans',
            text: '累加器',
            detail: '保存当前和',
            position: 'top',
            variant: 'callout'
          },
          { id: 'ghost-label', targetId: 'ghost', text: '无目标' }
        ]
      }),
      1,
      true
    );

    expect(layer.selectAll('g.canvas-label').size()).toBe(1);
    const label = layer.select('g.canvas-label');
    expect(label.attr('data-label-id')).toBe('caption');
    expect(label.attr('data-label-variant')).toBe('callout');
    // 标签按自身高度 + 节点半径 + 间距定位，长文案不会压住节点。
    expect(label.attr('transform')).toBe('translate(100,42)');
    expect(label.select('text.label-text').text()).toBe('累加器');
    expect(label.select('text.label-detail').text()).toBe('保存当前和');
    expect(Number(label.select('rect.label-bg').attr('width'))).toBeGreaterThan(20);
  });

  it('栈容器绘制槽位、占用计数与栈顶/栈底指针', () => {
    const layer = setup();
    renderFrame(
      layer,
      frame({
        nodes: [node('s0'), node('s1')],
        containers: [
          {
            id: 'stack',
            kind: 'stack',
            x: 40,
            y: 40,
            width: 116,
            height: 176,
            capacity: 4,
            items: ['s0', 's1'],
            title: '栈'
          }
        ]
      }),
      1,
      true
    );

    const container = layer.select('g.canvas-container');
    expect(container.attr('data-container-kind')).toBe('stack');
    expect(container.attr('data-capacity')).toBe('4');
    expect(container.attr('data-item-count')).toBe('2');
    expect(container.attr('transform')).toBe('translate(40,40)');
    expect(container.selectAll('g.container-slot').size()).toBe(4);
    expect(container.selectAll('rect.slot-rect--filled').size()).toBe(2);
    expect(container.selectAll('text.container-pointer-label').nodes().map((element) => element.textContent)).toEqual([
      '栈顶',
      '栈底'
    ]);
  });

  it('节点文字过长时缩小并截断，完整内容保留在 title/aria-label', () => {
    const layer = setup();
    renderFrame(layer, frame({ nodes: [node('long', { label: '1234567890' })] }), 1, true);

    const group = layer.select('g.canvas-node');
    const label = group.select('text.node-label');
    expect(label.text()).toBe('12345…');
    expect(label.attr('data-truncated')).toBe('true');
    expect(label.style('font-size')).toBe('9px');
    expect(group.select('title').text()).toBe('1234567890');
    expect(group.attr('aria-label')).toBe('1234567890');
  });

  it('部分占用队列的队尾指针指向下一个可入队槽位，而不是容器右边框', () => {
    const layer = setup();
    renderFrame(
      layer,
      frame({
        containers: [
          {
            id: 'queue',
            kind: 'queue',
            x: 200,
            y: 40,
            width: 272,
            height: 92,
            capacity: 4,
            items: ['q0', 'q1']
          }
        ]
      }),
      1,
      true
    );

    const head = layer.select('g.container-pointer[data-pointer="head"]');
    const tail = layer.select('g.container-pointer[data-pointer="tail"]');
    // 4 槽、宽 272：槽宽 64；队首槽中心相对 40，队尾（第 3 槽）中心相对 168。
    expect(head.select('line').attr('x1')).toBe('40');
    expect(tail.select('line').attr('x1')).toBe('168');
    expect(tail.select('line').attr('x2')).toBe('168');
    expect(tail.select('text').text()).toBe('队尾');
  });

  it('元素数超过配置容量时自动扩槽，计数保持自洽', () => {
    const layer = setup();
    renderFrame(
      layer,
      frame({
        containers: [
          {
            id: 'stack',
            kind: 'stack',
            x: 0,
            y: 0,
            width: 100,
            height: 200,
            capacity: 2,
            items: ['s0', 's1', 's2']
          }
        ]
      }),
      1,
      true
    );

    const container = layer.select('g.canvas-container');
    expect(container.attr('data-capacity')).toBe('3');
    expect(container.selectAll('g.container-slot').size()).toBe(3);
    expect(container.select('text.container-count').text()).toBe('3/3');
  });

  it('空队列显示空状态且不画队首/队尾指针', () => {
    const layer = setup();
    renderFrame(
      layer,
      frame({
        containers: [
          {
            id: 'queue',
            kind: 'queue',
            x: 200,
            y: 40,
            width: 272,
            height: 92,
            capacity: 4,
            items: []
          }
        ]
      }),
      1,
      true
    );

    const container = layer.select('g.canvas-container');
    expect(container.select('text.container-empty').text()).toBe('空队列');
    expect(container.select('text.container-empty').attr('opacity')).toBe('1');
    expect(container.selectAll('g.container-pointer').size()).toBe(0);
  });
});
