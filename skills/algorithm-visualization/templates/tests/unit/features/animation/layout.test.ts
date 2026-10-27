import { describe, expect, it } from 'vitest';
import type { CanvasLabel, CanvasNode } from '../../../../types';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  clampLabelCenter,
  fitNodeLabel,
  labelOffset,
  measureLabel,
  placeLabels,
  rectAt,
  rectsOverlap,
  trimSegment
} from '../../../../features/animation/layout';
import { fitNodeLabel, measureTextWidth } from '../../../../features/animation/text';

function node(id: string, x: number, y: number, overrides: Partial<CanvasNode> = {}): CanvasNode {
  return { id, label: id, x, y, ...overrides };
}

function label(id: string, targetId: string, overrides: Partial<CanvasLabel> = {}): CanvasLabel {
  return { id, targetId, text: '标签', position: 'top', ...overrides };
}

describe('标签尺寸与几何', () => {
  it('中文按 1em、拉丁字符按 0.6em 估算宽度', () => {
    expect(measureTextWidth('中文', 10)).toBe(20);
    expect(measureTextWidth('abcd', 10)).toBe(24);
    expect(measureLabel({ text: '累加器', detail: '保存当前和' })).toEqual({ width: 72, height: 40 });
    expect(measureLabel({ text: 'a' })).toEqual({ width: 72, height: 24 });
  });

  it('按方向与节点半径计算偏移，长标签不会压住节点', () => {
    const size = measureLabel({ text: '当前和', detail: '保存累计结果' });
    expect(labelOffset('top', size, 24)).toEqual({ x: 0, y: -(20 + 24 + 14) });
    expect(labelOffset('bottom', size, 24)).toEqual({ x: 0, y: 20 + 24 + 14 });
    expect(labelOffset('left', size, 24).x).toBeLessThan(0);
    expect(labelOffset('right', size, 24).x).toBeGreaterThan(0);
  });

  it('标签中心被钳制在逻辑画布安全区内', () => {
    const size = measureLabel({ text: '一个很长的标签' });
    const clamped = clampLabelCenter({ x: -100, y: CANVAS_HEIGHT + 100 }, size);
    expect(clamped.x).toBe(8 + size.width / 2);
    expect(clamped.y).toBe(CANVAS_HEIGHT - 8 - size.height / 2);
    expect(CANVAS_WIDTH).toBe(1200);
  });
});

describe('placeLabels', () => {
  it('无冲突时使用首选方向，并按尺寸留出间距', () => {
    const nodes = new Map([['a', node('a', 600, 400)]]);
    const placements = placeLabels([label('l', 'a', { text: '当前节点' })], nodes);

    const placement = placements.get('l');
    expect(placement?.position).toBe('top');
    expect(placement?.x).toBe(600);
    expect(placement?.y).toBe(400 - (12 + 24 + 14));
  });

  it('首选方向被占用时自动换向，两个标签互不重叠', () => {
    const nodes = new Map([['a', node('a', 600, 360)]]);
    const placements = placeLabels([label('first', 'a'), label('second', 'a')], nodes);
    const first = placements.get('first');
    const second = placements.get('second');

    expect(first?.position).toBe('top');
    expect(second?.position).not.toBe('top');
    expect(rectsOverlap(rectAt(first!, first!), rectAt(second!, second!))).toBe(false);
  });

  it('靠近画布边缘的标签保持在安全区内', () => {
    const nodes = new Map([['corner', node('corner', 20, 20)]]);
    const placement = placeLabels([label('l', 'corner', { position: 'left' })], nodes).get('l');

    expect(placement).toBeDefined();
    expect(placement!.x - placement!.width / 2).toBeGreaterThanOrEqual(8);
    expect(placement!.y - placement!.height / 2).toBeGreaterThanOrEqual(8);
  });

  it('引导线从标签边缘指向节点外沿', () => {
    const nodes = new Map([['a', node('a', 600, 400)]]);
    const placement = placeLabels([label('l', 'a')], nodes).get('l')!;

    // 标签在节点正上方：引导线下端停在节点外沿（50 - 24 - 4 = 22）。
    expect(placement.leader.x1).toBe(0);
    expect(placement.leader.y1).toBe(12);
    expect(placement.leader.x2).toBe(0);
    expect(placement.leader.y2).toBe(22);
  });

  it('忽略目标不存在的标签，并避免压住容器', () => {
    const nodes = new Map([['a', node('a', 600, 300)]]);
    const placements = placeLabels(
      [label('ok', 'a', { position: 'bottom' }), label('ghost', 'missing')],
      nodes,
      { containers: [{ id: 'c', kind: 'queue', x: 450, y: 360, width: 300, height: 120, capacity: 4, items: [] }] }
    );

    expect(placements.has('ok')).toBe(true);
    expect(placements.has('ghost')).toBe(false);
    // 下方会压住容器，自动改到上方。
    expect(placements.get('ok')?.position).toBe('top');
  });
});

describe('fitNodeLabel', () => {
  it('短文本保持 12px', () => {
    expect(fitNodeLabel('7', 24)).toEqual({ text: '7', fontSize: 12, truncated: false });
  });

  it('长文本先缩小到 9px，仍超宽再截断并加省略号', () => {
    const fitted = fitNodeLabel('1234567890', 24);
    expect(fitted.fontSize).toBe(9);
    expect(fitted.truncated).toBe(true);
    expect(fitted.text.endsWith('…')).toBe(true);
    expect(measureTextWidth(fitted.text, fitted.fontSize)).toBeLessThanOrEqual(36);
  });

  it('中文在缩小后能放下时不截断', () => {
    expect(fitNodeLabel('根节点值', 24)).toEqual({
      text: '根节点值',
      fontSize: 9,
      truncated: false
    });
  });

  it('空文本不产生省略号', () => {
    expect(fitNodeLabel('', 24)).toEqual({ text: '', fontSize: 12, truncated: false });
  });
});

describe('trimSegment', () => {
  it('把连线裁到两个节点外沿并保留 2px 间隙', () => {
    expect(trimSegment({ x: 100, y: 100 }, { x: 300, y: 100 }, 24, 24)).toEqual({
      from: { x: 126, y: 100 },
      to: { x: 274, y: 100 }
    });
  });

  it('节点相切或重叠时没有可读连线', () => {
    expect(trimSegment({ x: 100, y: 100 }, { x: 140, y: 100 }, 24, 24)).toBeNull();
    expect(trimSegment({ x: 100, y: 100 }, { x: 100, y: 100 }, 24, 24)).toBeNull();
  });
});
