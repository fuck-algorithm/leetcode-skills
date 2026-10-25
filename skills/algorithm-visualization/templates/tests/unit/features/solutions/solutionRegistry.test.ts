import { describe, it, expect } from 'vitest';
import { createSolutionRegistry } from '../../../../features/solutions/solutionRegistry';

describe('createSolutionRegistry', () => {
  it('should return at least one solution', () => {
    const registry = createSolutionRegistry();
    expect(registry.length).toBeGreaterThan(0);
  });

  it('should have valid AlgorithmStep shapes', () => {
    const registry = createSolutionRegistry();
    const sol = registry[0];
    expect(sol.steps.length).toBeGreaterThan(0);

    for (const step of sol.steps) {
      expect(step.id).toBeDefined();
      expect(step.title).toBeDefined();
      expect(step.operation).toBeDefined();
      expect(step.binding.anchorIds).toBeDefined();
      expect(Array.isArray(step.frame.nodes)).toBe(true);
    }
  });

  it('should use unique stable node ids and valid references in every frame', () => {
    const registry = createSolutionRegistry();
    const sol = registry[0];

    for (const step of sol.steps) {
      const ids = step.frame.nodes.map((node) => node.id);
      expect(new Set(ids).size).toBe(ids.length);

      const idSet = new Set(ids);
      for (const edge of step.frame.edges) {
        expect(idSet.has(edge.from)).toBe(true);
        expect(idSet.has(edge.to)).toBe(true);
      }
      for (const label of step.frame.labels) {
        expect(idSet.has(label.targetId)).toBe(true);
      }
      for (const arrow of step.frame.arrows) {
        expect(arrow.id.length).toBeGreaterThan(0);
      }

      const focused = step.frame.nodes.filter(
        (node) => node.status === 'current' || (!node.status && node.kind === 'highlight')
      );
      expect(focused.length).toBeLessThanOrEqual(1);
    }
  });

  it('should keep node ids stable across animation steps', () => {
    const registry = createSolutionRegistry();
    const sol = registry[0];
    const first = new Set(sol.steps[0].frame.nodes.map((node) => node.id));
    const reused = sol.steps[1].frame.nodes.filter((node) => first.has(node.id));

    expect(reused.length).toBeGreaterThan(0);
  });

  it('should contain all four language code artifacts', () => {
    const registry = createSolutionRegistry();
    const sol = registry[0];
    expect(sol.codes.java).toBeDefined();
    expect(sol.codes.python).toBeDefined();
    expect(sol.codes.go).toBeDefined();
    expect(sol.codes.javascript).toBeDefined();
  });

  it('should reject invalid JSON array input', () => {
    const registry = createSolutionRegistry();
    const result = registry[0].validateInput('not-json');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should accept valid JSON array input', () => {
    const registry = createSolutionRegistry();
    const result = registry[0].validateInput('[1,2,3]');
    expect(result.valid).toBe(true);
    expect(result.parsed).toEqual([1, 2, 3]);
  });

  it('should reject non-array JSON input', () => {
    const registry = createSolutionRegistry();
    const result = registry[0].validateInput('{"a":1}');
    expect(result.valid).toBe(false);
  });

  it('should generate random input as valid JSON array', () => {
    const registry = createSolutionRegistry();
    const raw = registry[0].generateRandom();
    const parsed = JSON.parse(raw);
    expect(Array.isArray(parsed)).toBe(true);
  });
});
