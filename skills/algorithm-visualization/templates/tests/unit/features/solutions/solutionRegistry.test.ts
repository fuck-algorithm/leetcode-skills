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
      expect(step.binding.anchorIds).toBeDefined();
      expect(Array.isArray(step.frame.nodes)).toBe(true);
    }
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
