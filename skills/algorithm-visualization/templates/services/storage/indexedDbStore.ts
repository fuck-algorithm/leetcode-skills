import { openDB } from 'idb';

const DB_NAME = 'algo-viz';
const DB_VERSION = 1;
const STORE_SETTINGS = 'settings';
const STORE_CACHE = 'cache';

type CachedValue<T> = {
  value: T;
  expiresAt: number;
};

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS);
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE);
      }
    }
  });
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDb();
  await db.put(STORE_SETTINGS, value, key);
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const db = await getDb();
  const value = await db.get(STORE_SETTINGS, key);
  return (value as T | undefined) ?? fallback;
}

export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const db = await getDb();
  const payload: CachedValue<T> = {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  };
  await db.put(STORE_CACHE, payload, key);
}

export async function getCached<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  const payload = (await db.get(STORE_CACHE, key)) as CachedValue<T> | undefined;
  if (!payload) {
    return undefined;
  }
  if (Date.now() > payload.expiresAt) {
    return undefined;
  }
  return payload.value;
}

export async function getCachedEvenExpired<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  const payload = (await db.get(STORE_CACHE, key)) as CachedValue<T> | undefined;
  return payload?.value;
}
