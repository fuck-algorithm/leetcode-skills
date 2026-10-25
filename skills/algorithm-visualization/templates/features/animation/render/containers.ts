import * as d3 from 'd3';
import type { CanvasContainer } from '../../../types';
import { fadeOutAndRemove, type LayerSelection, type RenderTiming } from './common';

const HEADER = { stack: 30, queue: 28 } as const;
const PADDING = 8;

type Slot = { index: number; x: number; y: number; width: number; height: number };

function stackSlots(container: CanvasContainer): Slot[] {
  const slotHeight = (container.height - HEADER.stack - PADDING) / container.capacity;
  return Array.from({ length: container.capacity }, (_, index) => ({
    index,
    x: container.x + 6,
    y: container.y + container.height - PADDING - slotHeight * (index + 1) + 2,
    width: container.width - 12,
    height: slotHeight - 4
  }));
}

function queueSlots(container: CanvasContainer): Slot[] {
  const slotWidth = (container.width - PADDING * 2) / container.capacity;
  return Array.from({ length: container.capacity }, (_, index) => ({
    index,
    x: container.x + PADDING + slotWidth * index + 1,
    y: container.y + HEADER.queue + 4,
    width: slotWidth - 2,
    height: container.height - HEADER.queue - 12
  }));
}

function slotsOf(container: CanvasContainer): Slot[] {
  return container.kind === 'stack' ? stackSlots(container) : queueSlots(container);
}

function slotCenterY(container: CanvasContainer, index: number): number {
  const slots = slotsOf(container);
  const slot = slots[Math.min(index, slots.length - 1)];
  return slot ? slot.y + slot.height / 2 : container.y + container.height / 2;
}

/**
 * 绘制栈/队列外框、槽位、占用计数与栈顶/队首/队尾指针。
 * 节点由 renderNodes 单独绘制，这里只负责“容器语言”。
 */
export function renderContainers(
  layer: LayerSelection,
  containersData: CanvasContainer[],
  timing: RenderTiming
): void {
  const join = layer
    .selectAll<SVGGElement, CanvasContainer>('g.canvas-container')
    .data(containersData, (container) => container.id);

  const enter = join
    .enter()
    .append('g')
    .attr('class', 'canvas-container')
    .attr('opacity', 0)
    .attr('transform', (container) => `translate(${container.x},${container.y})`)
    .call((group) => group.append('rect').attr('class', 'container-box').attr('rx', 12))
    .call((group) => group.append('text').attr('class', 'container-title').attr('x', 12).attr('y', 20))
    .call((group) =>
      group.append('text').attr('class', 'container-count').attr('text-anchor', 'end').attr('y', 20)
    )
    .call((group) => group.append('g').attr('class', 'container-slots'))
    .call((group) => group.append('g').attr('class', 'container-pointers'))
    .call((group) =>
      group.append('text').attr('class', 'container-empty').attr('text-anchor', 'middle')
    );

  const containers = enter.merge(join);
  containers
    .attr('class', (container) => `canvas-container container--${container.kind}`)
    .attr('data-container-id', (container) => container.id)
    .attr('data-container-kind', (container) => container.kind)
    .attr('data-capacity', (container) => container.capacity)
    .attr('data-item-count', (container) => container.items.length);

  containers
    .select<SVGRectElement>('rect.container-box')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', (container) => container.width)
    .attr('height', (container) => container.height);
  containers
    .select<SVGTextElement>('text.container-title')
    .text((container) => container.title ?? (container.kind === 'stack' ? '栈' : '队列'));
  containers
    .select<SVGTextElement>('text.container-count')
    .attr('x', (container) => container.width - 12)
    .text((container) => `${container.items.length}/${container.capacity}`);
  containers
    .select<SVGTextElement>('text.container-empty')
    .attr('x', (container) => container.width / 2)
    .attr('y', (container) => {
      if (container.kind === 'stack') {
        return HEADER.stack + (container.height - HEADER.stack - PADDING) / 2 + 4;
      }
      return HEADER.queue + (container.height - HEADER.queue) / 2 + 4;
    })
    .text((container) =>
      container.items.length === 0
        ? container.emptyText ?? (container.kind === 'stack' ? '空栈' : '空队列')
        : ''
    )
    .attr('opacity', (container) => (container.items.length === 0 ? 1 : 0));

  renderSlots(containers, timing);
  renderPointers(containers, timing);

  if (timing.reduced) {
    fadeOutAndRemove(join.exit<CanvasContainer>(), timing);
    containers
      .attr('opacity', 1)
      .attr('transform', (container) => `translate(${container.x},${container.y})`);
    return;
  }

  fadeOutAndRemove(join.exit<CanvasContainer>(), timing);

  containers
    .interrupt('exit')
    .interrupt('fade')
    .transition('fade')
    .duration(timing.updateMs)
    .attr('opacity', 1)
    .attr('transform', (container) => `translate(${container.x},${container.y})`);
}

function renderSlots(
  containers: d3.Selection<SVGGElement, CanvasContainer, SVGGElement, unknown>,
  timing: RenderTiming
): void {
  containers.each(function (container) {
    const group = d3.select(this).select<SVGGElement>('g.container-slots');
    const slots = slotsOf(container);

    const join = group
      .selectAll<SVGGElement, Slot>('g.container-slot')
      .data(slots, (slot) => String(slot.index));

    const enter = join
      .enter()
      .append('g')
      .attr('class', 'container-slot')
      .call((slotGroup) => slotGroup.append('rect').attr('rx', 8))
      .call((slotGroup) =>
        slotGroup.append('text').attr('class', 'container-slot-index').attr('text-anchor', 'start')
      );

    join.exit<Slot>().remove();
    const merged = enter.merge(join);
    merged.attr('data-slot-index', (slot) => slot.index);

    const rect = merged
      .select<SVGRectElement>('rect')
      .attr('x', (slot) => slot.x - container.x)
      .attr('y', (slot) => slot.y - container.y)
      .attr('width', (slot) => slot.width)
      .attr('height', (slot) => slot.height)
      .attr('class', (slot) =>
        slot.index < container.items.length ? 'slot-rect slot-rect--filled' : 'slot-rect'
      );

    merged
      .select<SVGTextElement>('text.container-slot-index')
      // 放在槽位左上角：节点居中、sublabel 在下方，角落最不容易被遮挡。
      .attr('x', (slot) => slot.x - container.x + 6)
      .attr('y', (slot) => slot.y - container.y + 14)
      .text((slot) => slot.index);

    if (timing.reduced) {
      rect.attr('width', (slot) => slot.width);
    }
  });
}

function renderPointers(
  containers: d3.Selection<SVGGElement, CanvasContainer, SVGGElement, unknown>,
  timing: RenderTiming
): void {
  containers.each(function (container) {
    const group = d3.select(this).select<SVGGElement>('g.container-pointers');
    const pointers =
      container.kind === 'stack' ? stackPointers(container) : queuePointers(container);

    const join = group
      .selectAll<SVGGElement, { id: string; x1: number; y1: number; x2: number; y2: number; label: string; lx: number; ly: number }>(
        'g.container-pointer'
      )
      .data(pointers, (pointer) => pointer.id);

    const enter = join
      .enter()
      .append('g')
      .attr('class', 'container-pointer')
      .call((pointerGroup) => pointerGroup.append('line').attr('marker-end', 'url(#pointer-arrow)'))
      .call((pointerGroup) =>
        pointerGroup.append('text').attr('class', 'container-pointer-label').attr('text-anchor', 'middle')
      );

    join.exit().remove();
    const merged = enter.merge(join);
    merged.attr('data-pointer', (pointer) => pointer.id);

    merged
      .select<SVGLineElement>('line')
      .attr('x1', (pointer) => pointer.x1 - container.x)
      .attr('y1', (pointer) => pointer.y1 - container.y)
      .attr('x2', (pointer) => pointer.x2 - container.x)
      .attr('y2', (pointer) => pointer.y2 - container.y);
    merged
      .select<SVGTextElement>('text')
      .attr('x', (pointer) => pointer.lx - container.x)
      .attr('y', (pointer) => pointer.ly - container.y)
      .text((pointer) => pointer.label);

    if (timing.reduced) {
      merged.attr('opacity', 1);
    }
  });
}

function stackPointers(container: CanvasContainer) {
  const topIndex = Math.max(container.items.length - 1, 0);
  const topY = slotCenterY(container, topIndex);
  return [
    {
      id: 'top',
      x1: container.x + container.width + 30,
      y1: topY,
      x2: container.x + container.width + 2,
      y2: topY,
      label: '栈顶',
      lx: container.x + container.width + 30,
      ly: topY - 8
    },
    {
      id: 'bottom',
      x1: container.x + container.width + 30,
      y1: container.y + container.height - 8,
      x2: container.x + container.width + 2,
      y2: container.y + container.height - 8,
      label: '栈底',
      lx: container.x + container.width + 30,
      ly: container.y + container.height - 16
    }
  ];
}

function queuePointers(container: CanvasContainer) {
  if (container.items.length === 0) {
    return [];
  }
  const y = container.y + HEADER.queue + (container.height - HEADER.queue) / 2;
  return [
    {
      id: 'head',
      x1: container.x - 30,
      y1: y,
      x2: container.x - 2,
      y2: y,
      label: '队首',
      lx: container.x - 30,
      ly: y - 8
    },
    {
      id: 'tail',
      x1: container.x + container.width + 30,
      y1: y,
      x2: container.x + container.width + 2,
      y2: y,
      label: '队尾',
      lx: container.x + container.width + 30,
      ly: y - 8
    }
  ];
}
