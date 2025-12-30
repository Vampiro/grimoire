import { idbGet, idbSet } from "./idbKeyValue";

/**
 * Map of resource name -> version number.
 *
 * @remarks
 * When a version changes, cached data for that resource is considered stale and
 * the loader will refetch.
 */
export type ResourceVersions = Record<string, number>;

type CachedResource<T> = {
  version: number;
  data: T;
};

const CACHE_PREFIX = "resource:";

/**
 * Fetches JSON from a URL.
 *
 * @typeParam T - Parsed JSON shape.
 * @param url - Resource URL.
 * @throws If the response is not OK.
 */
export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} (${res.status})`);
  }
  return (await res.json()) as T;
}

/**
 * Returns a JSON resource using a versioned IndexedDB cache.
 *
 * @remarks
 * - If a cached entry exists with a matching version, it is returned.
 * - Otherwise, the resource is fetched and the cache is updated.
 * - If the fetch fails (offline/transient error) and any cached value exists,
 *   the cached value is returned as a fallback.
 *
 * @typeParam T - Parsed JSON shape.
 */
export async function getResourceCached<T>(opts: {
  name: string;
  version: number;
  url: string;
}): Promise<T> {
  const key = `${CACHE_PREFIX}${opts.name}`;
  const cached = await idbGet<CachedResource<T>>(key);

  if (cached && cached.version === opts.version) {
    return cached.data;
  }

  try {
    const data = await fetchJson<T>(opts.url);
    await idbSet<CachedResource<T>>(key, { version: opts.version, data });
    return data;
  } catch (err) {
    // Offline or transient error: fall back to any cached data.
    if (cached) {
      return cached.data;
    }
    throw err;
  }
}
