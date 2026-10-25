import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getCached,
  getCachedEvenExpired,
  getSetting,
  setCached,
  setSetting
} from '../../../../services/storage/indexedDbStore';

describe('indexedDbStore', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists and reads settings', async () => {
    await setSetting('test-setting', 'python');
    await expect(getSetting('test-setting', 'java')).resolves.toBe('python');
  });

  it('returns fallback for missing settings', async () => {
    await expect(getSetting('missing-setting', 1)).resolves.toBe(1);
  });

  it('returns fresh cache values', async () => {
    await setCached('fresh-cache', { value: 42 }, 60);
    await expect(getCached<{ value: number }>('fresh-cache')).resolves.toEqual({ value: 42 });
  });

  it('expires cache entries but keeps them for stale fallback', async () => {
    // 只伪造 Date，避免冻结 fake-indexeddb 内部使用的真实定时器。
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    await setCached('expiring-cache', 'old', 1);
    vi.setSystemTime(new Date('2026-01-01T00:00:02Z'));

    await expect(getCached('expiring-cache')).resolves.toBeUndefined();
    await expect(getCachedEvenExpired('expiring-cache')).resolves.toBe('old');
  });
});
