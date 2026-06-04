type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

const cache = new Map<string, CacheEntry<unknown>>();

export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const found = cache.get(key) as CacheEntry<T> | undefined;
  if (found && found.expiresAt > Date.now()) {
    return found.data;
  }

  const data = await loader();
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs
  });
  return data;
}
