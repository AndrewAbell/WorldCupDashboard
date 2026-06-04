type RateResult = {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
};

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 5;
const hits = new Map<string, number[]>();

export function checkRateLimit(ip: string, now = Date.now()): RateResult {
  Array.from(hits.entries()).forEach(([key, timestamps]) => {
    const fresh = timestamps.filter((timestamp: number) => now - timestamp < WINDOW_MS);
    if (fresh.length === 0) {
      hits.delete(key);
    } else {
      hits.set(key, fresh);
    }
  });

  const current = (hits.get(ip) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (current.length >= LIMIT) {
    const oldest = Math.min(...current);
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((WINDOW_MS - (now - oldest)) / 1000)
    };
  }

  current.push(now);
  hits.set(ip, current);

  return {
    allowed: true,
    remaining: Math.max(0, LIMIT - current.length)
  };
}

export function getRemainingPredictions(ip: string, now = Date.now()): number {
  const current = (hits.get(ip) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);
  return Math.max(0, LIMIT - current.length);
}

export function resetRateLimitForTests(): void {
  hits.clear();
}
