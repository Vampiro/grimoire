import { openDB } from "idb";

const DB_NAME = "dnd2e-grimoire";
const DB_VERSION = 1;
const STORE_NAME = "kv";

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  },
});

/**
 * Reads a value from the app's IndexedDB key/value store.
 *
 * @typeParam T - The expected value type.
 * @param key - The storage key.
 * @returns The stored value, or `undefined` if not present.
 */
export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await dbPromise;
  return (await db.get(STORE_NAME, key)) as T | undefined;
}

/**
 * Writes a value to the app's IndexedDB key/value store.
 *
 * @typeParam T - The value type.
 * @param key - The storage key.
 * @param value - The value to persist.
 */
export async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await dbPromise;
  await db.put(STORE_NAME, value, key);
}
