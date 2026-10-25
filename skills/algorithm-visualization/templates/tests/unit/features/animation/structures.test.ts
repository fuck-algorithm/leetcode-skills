import { describe, expect, it } from 'vitest';
import { createQueue, createStack } from '../../../../features/animation/structures';

const items = [
  { id: 'x1', label: '1', status: 'done' as const, sublabel: '已处理' },
  { id: 'x2', label: '2', status: 'current' as const },
  { id: 'x3', label: '3' }
];

describe('createStack', () => {
  it('按栈底→栈顶排列，固定容量保持槽位稳定', () => {
    const { nodes, containers } = createStack({
      id: 'stack',
      x: 100,
      y: 50,
      items,
      capacity: 5,
      title: '单调栈'
    });

    expect(nodes.map((node) => node.id)).toEqual(['x1', 'x2', 'x3']);
    expect(nodes[0].y).toBeGreaterThan(nodes[1].y);
    expect(nodes[1].y).toBeGreaterThan(nodes[2].y);
    expect(nodes.every((node) => node.x === 158)).toBe(true);
    expect(nodes[0].sublabel).toBe('已处理');
    expect(containers[0]).toMatchObject({
      id: 'stack',
      kind: 'stack',
      title: '单调栈',
      capacity: 5,
      items: ['x1', 'x2', 'x3']
    });
  });

  it('空栈仍返回容器，容量至少为 4', () => {
    const { nodes, containers } = createStack({ id: 'empty-stack', x: 0, y: 0, items: [] });
    expect(nodes).toEqual([]);
    expect(containers[0].capacity).toBe(4);
    expect(containers[0].emptyText).toBe('空栈');
  });
});

describe('createQueue', () => {
  it('按队首→队尾水平排列，容量可配置', () => {
    const { nodes, containers } = createQueue({
      id: 'queue',
      x: 400,
      y: 300,
      items,
      capacity: 4,
      slotWidth: 60,
      itemRadius: 18
    });

    expect(nodes.map((node) => node.id)).toEqual(['x1', 'x2', 'x3']);
    expect(nodes[0].x).toBeLessThan(nodes[1].x);
    expect(nodes[1].x).toBeLessThan(nodes[2].x);
    expect(nodes.every((node) => node.y === nodes[0].y)).toBe(true);
    expect(nodes[0].radius).toBe(18);
    expect(containers[0]).toMatchObject({ kind: 'queue', capacity: 4, items: ['x1', 'x2', 'x3'] });
  });

  it('出队后剩余元素左移，但节点 id 不变', () => {
    const first = createQueue({ id: 'queue', x: 0, y: 0, items, capacity: 4 }).nodes;
    const afterDequeue = createQueue({
      id: 'queue',
      x: 0,
      y: 0,
      items: items.slice(1),
      capacity: 4
    }).nodes;

    expect(afterDequeue.map((node) => node.id)).toEqual(['x2', 'x3']);
    // 剩余元素整体左移一格，但 id 不变，渲染层才能做位置过渡。
    expect(afterDequeue[0].x).toBe(first[0].x);
    expect(afterDequeue[1].x).toBe(first[1].x);
    expect(afterDequeue[0].x).toBeLessThan(first[1].x);
  });
});
