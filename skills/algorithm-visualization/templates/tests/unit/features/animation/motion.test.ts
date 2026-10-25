import { afterEach, describe, expect, it } from 'vitest';
import type { CanvasFrame, CanvasNode } from '../../../../types';
import {
  DEFAULT_LEGEND,
  MOTION,
  STATUS_LABELS,
  deriveMetrics,
  motionDuration,
  normalizeNodeStatus,
  operationLabel,
  prefersReducedMotion,
  resolveLegend
} from '../../../../features/animation/motion';

function frame(nodes: CanvasNode[], overrides: Partial<CanvasFrame> = {}): CanvasFrame {
  return {
    nodes,
    edges: [],
    arrows: [],
    labels: [],
    notes: [],
    ...overrides
  };
}

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: originalMatchMedia
  });
});

describe('normalizeNodeStatus', () => {
  it('prefers explicit status over legacy kind', () => {
    expect(normalizeNodeStatus({ id: 'n', label: 'n', x: 0, y: 0, kind: 'highlight', status: 'done' })).toBe(
      'done'
    );
  });

  it('maps legacy highlight and normal kinds', () => {
    expect(normalizeNodeStatus({ id: 'n', label: 'n', x: 0, y: 0, kind: 'highlight' })).toBe('current');
    expect(normalizeNodeStatus({ id: 'n', label: 'n', x: 0, y: 0 })).toBe('idle');
    expect(normalizeNodeStatus({ id: 'n', label: 'null', x: 0, y: 0, kind: 'null' })).toBe('idle');
  });
});

describe('resolveLegend', () => {
  it('returns the stable default legend when frame does not declare one', () => {
    expect(resolveLegend(frame([]))).toEqual(DEFAULT_LEGEND);
  });

  it('uses the explicit legend as-is', () => {
    const explicit = [{ status: 'current' as const, label: '焦点' }];
    expect(resolveLegend(frame([], { legend: explicit }))).toEqual(explicit);
  });

  it('appends path and error only when they are used', () => {
    const legend = resolveLegend(
      frame([{ id: 'p', label: 'p', x: 0, y: 0, status: 'path' }])
    );
    expect(legend.map((item) => item.status)).toContain('path');
    expect(legend.map((item) => item.status)).not.toContain('error');
    expect(legend[legend.length - 1].label).toBe(STATUS_LABELS.path);
  });
});

describe('deriveMetrics', () => {
  it('uses explicit metrics when provided', () => {
    const metrics = [{ label: '已访问', value: 2 }];
    expect(deriveMetrics(frame([], { metrics }))).toEqual(metrics);
  });

  it('counts current, compare, visited and done as a fallback', () => {
    const metrics = deriveMetrics(
      frame([
        { id: 'a', label: 'a', x: 0, y: 0, status: 'current' },
        { id: 'b', label: 'b', x: 0, y: 0, status: 'compare' },
        { id: 'c', label: 'c', x: 0, y: 0, status: 'visited' },
        { id: 'd', label: 'd', x: 0, y: 0, status: 'done' },
        { id: 'e', label: 'e', x: 0, y: 0 }
      ])
    );

    expect(metrics).toEqual([
      { label: '节点', value: 5 },
      { label: '进行中', value: 2 },
      { label: '已访问', value: 2 }
    ]);
  });
});

describe('operationLabel', () => {
  it('returns a readable Chinese label', () => {
    expect(operationLabel('compare')).toBe('比较');
    expect(operationLabel('push')).toBe('入栈');
    expect(operationLabel()).toBe('');
  });
});

describe('motionDuration', () => {
  it('returns zero under reduced motion', () => {
    expect(motionDuration(MOTION.updateMs, 1, true)).toBe(0);
  });

  it('scales with playback speed and keeps a floor', () => {
    expect(motionDuration(360, 2)).toBe(180);
    expect(motionDuration(360, 0.5)).toBe(720);
    expect(motionDuration(100, 10)).toBe(MOTION.minDurationMs);
    expect(motionDuration(400, Number.NaN)).toBe(400);
  });
});

describe('prefersReducedMotion', () => {
  it('reflects the media query', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => ({ matches: true }) as unknown as MediaQueryList
    });
    expect(prefersReducedMotion()).toBe(true);
  });
});
