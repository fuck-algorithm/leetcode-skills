import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'algo-viz';
const DB_VERSION = 1;
const STORE_SETTINGS = 'settings';
const STORE_CACHE = 'cache';

type CachedValue<T> = {
  value: T;
  expiresAt: number;
};

/**
 * IndexedDB 在部分环境（隐私模式、SSR、旧浏览器）不可用。
 * 这里保留进程内 fallback，保证偏好与缓存读写永远不会让页面崩溃。
 */
const memorySettings = new Map<string, unknown>();
const memoryCache = new Map<string, CachedValue<unknown>>();

let dbPromise: Promise<IDBPDatabase | null> | null = null;

function getDb(): Promise<IDBPDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS);
        }
        if (!db.objectStoreNames.contains(STORE_CACHE)) {
          db.createObjectStore(STORE_CACHE);
        }
      }
    }).catch(() => null);
  }

  return dbPromise;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  memorySettings.set(key, value);
  try {
    const db = await getDb();
    if (db) {
      await db.put(STORE_SETTINGS, value, key);
    }
  } catch {
    // 存储失败降级为内存值，不阻断交互。
  }
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const db = await getDb();
    if (db) {
      const value = await db.get(STORE_SETTINGS, key);
      if (value !== undefined) {
        return value as T;
      }
    }
  } catch {
    // fall through to memory fallback
  }
  return (memorySettings.get(key) as T | undefined) ?? fallback;
}

export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const payload: CachedValue<T> = {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  };
  memoryCache.set(key, payload);

  try {
    const db = await getDb();
    if (db) {
      await db.put(STORE_CACHE, payload, key);
    }
  } catch {
    // 缓存失败不影响页面主流程。
  }
}

export async function getCached<T>(key: string): Promise<T | undefined> {
  const payload = await readCached<T>(key);
  if (!payload) {
    return undefined;
  }
  if (Date.now() > payload.expiresAt) {
    return undefined;
  }
  return payload.value;
}

export async function getCachedEvenExpired<T>(key: string): Promise<T | undefined> {
  const payload = await readCached<T>(key);
  return payload?.value;
}

async function readCached<T>(key: string): Promise<CachedValue<T> | undefined> {
  try {
    const db = await getDb();
    if (db) {
      const payload = (await db.get(STORE_CACHE, key)) as CachedValue<T> | undefined;
      if (payload) {
        return payload;
      }
    }
  } catch {
    // fall through to memory fallback
  }
  return memoryCache.get(key) as CachedValue<T> | undefined;
}
