import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { checkRateLimit, getRemainingPredictions, resetRateLimitForTests } from "@/lib/rateLimit";

beforeEach(() => {
  resetRateLimitForTests();
});

test("allows five prediction requests per IP per hour", () => {
  const ip = "203.0.113.10";
  for (let index = 0; index < 5; index += 1) {
    const result = checkRateLimit(ip, 1_000);
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 4 - index);
  }

  const blocked = checkRateLimit(ip, 1_000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.retryAfter, 3600);
});

test("expires old prediction hits after one hour", () => {
  const ip = "203.0.113.11";
  checkRateLimit(ip, 1_000);
  assert.equal(getRemainingPredictions(ip, 1_000), 4);

  const later = checkRateLimit(ip, 3_602_000);
  assert.equal(later.allowed, true);
  assert.equal(later.remaining, 4);
});
