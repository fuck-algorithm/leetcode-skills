import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayback } from '../../../../features/playback/usePlayback';

describe('usePlayback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with step 0 and not playing', () => {
    const { result } = renderHook(() => usePlayback({ totalSteps: 5, initialSpeed: 1 }));
    expect(result.current.currentStep).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });

  it('should increment step when next() is called', () => {
    const { result } = renderHook(() => usePlayback({ totalSteps: 5, initialSpeed: 1 }));
    act(() => result.current.next());
    expect(result.current.currentStep).toBe(1);
  });

  it('should clamp next() at totalSteps - 1', () => {
    const { result } = renderHook(() => usePlayback({ totalSteps: 3, initialSpeed: 1 }));
    act(() => {
      result.current.next();
      result.current.next();
      result.current.next();
      result.current.next();
    });
    expect(result.current.currentStep).toBe(2);
  });

  it('should decrement step when prev() is called', () => {
    const { result } = renderHook(() => usePlayback({ totalSteps: 5, initialSpeed: 1 }));
    act(() => result.current.next());
    act(() => result.current.prev());
    expect(result.current.currentStep).toBe(0);
  });

  it('should clamp prev() at 0', () => {
    const { result } = renderHook(() => usePlayback({ totalSteps: 5, initialSpeed: 1 }));
    act(() => result.current.prev());
    expect(result.current.currentStep).toBe(0);
  });

  it('should auto-advance during play and stop at end', () => {
    const { result } = renderHook(() => usePlayback({ totalSteps: 3, initialSpeed: 1 }));
    act(() => result.current.togglePlay());
    expect(result.current.isPlaying).toBe(true);

    act(() => vi.advanceTimersByTime(1100));
    expect(result.current.currentStep).toBe(1);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.currentStep).toBe(2);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.currentStep).toBe(2);
    expect(result.current.isPlaying).toBe(false);
  });

  it('should seek to specified step within bounds', () => {
    const { result } = renderHook(() => usePlayback({ totalSteps: 5, initialSpeed: 1 }));
    act(() => result.current.seek(3));
    expect(result.current.currentStep).toBe(3);
    act(() => result.current.seek(-1));
    expect(result.current.currentStep).toBe(0);
    act(() => result.current.seek(99));
    expect(result.current.currentStep).toBe(4);
  });

  it('should reset to step 0 and stop playing', () => {
    const { result } = renderHook(() => usePlayback({ totalSteps: 5, initialSpeed: 1 }));
    act(() => {
      result.current.next();
      result.current.togglePlay();
    });
    act(() => result.current.reset());
    expect(result.current.currentStep).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });
});
