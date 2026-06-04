import assert from "node:assert/strict";
import { test } from "node:test";
import { cached } from "@/lib/serverCache";

test("caches loader results within the TTL", async () => {
  let calls = 0;
  const first = await cached("cache-test-stable", 60_000, async () => {
    calls += 1;
    return { value: calls };
  });
  const second = await cached("cache-test-stable", 60_000, async () => {
    calls += 1;
    return { value: calls };
  });

  assert.deepEqual(first, { value: 1 });
  assert.deepEqual(second, { value: 1 });
  assert.equal(calls, 1);
});

test("reloads when the TTL has expired", async () => {
  let calls = 0;
  const key = `cache-test-expired-${Date.now()}`;
  await cached(key, -1, async () => {
    calls += 1;
    return calls;
  });
  const second = await cached(key, -1, async () => {
    calls += 1;
    return calls;
  });

  assert.equal(second, 2);
});
