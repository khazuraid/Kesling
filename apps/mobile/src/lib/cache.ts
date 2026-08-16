import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Stale-while-revalidate cache for GET lists (sasaran, templates).
 * ponytail: single-scope cache; add per-key TTL map when lists grow.
 */
const PREFIX = "kesling_cache_";
const TTL_MS = 24 * 60 * 60 * 1000;

type Entry<T> = { data: T; ts: number };

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (Date.now() - entry.ts > TTL_MS) return entry.data; // stale OK, caller refreshes
    return entry.data;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, data: T) {
  try {
    const entry: Entry<T> = { data, ts: Date.now() };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // storage full — ignore
  }
}

export async function cacheTimestamp(key: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return (JSON.parse(raw) as Entry<unknown>).ts;
  } catch {
    return null;
  }
}

/** Wrap an api fn: instant cached value, then fresh network value. */
export function withCache<T>(key: string, fn: () => Promise<T>): Promise<T> & { cached?: Promise<T | null> } {
  // fire cache read in parallel; network promise resolves fresh
  const cached = cacheGet<T>(key);
  const fresh = fn().then((data) => {
    cacheSet(key, data);
    return data;
  });
  const combined = fresh as Promise<T> & { cached?: Promise<T | null> };
  combined.cached = cached;
  return combined;
}
