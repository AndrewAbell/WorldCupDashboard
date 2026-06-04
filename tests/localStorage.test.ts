import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  getDismissedNotifications,
  getFollowedTeams,
  getPredictionFromCache,
  savePredictionToCache,
  setDismissedNotifications,
  setFollowedTeams
} from "@/lib/localStorage";

function installLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      }
    } as Storage
  };
}

beforeEach(() => {
  installLocalStorage();
});

test("stores followed teams and caps them at eight", () => {
  setFollowedTeams(["a", "b", "c", "d", "e", "f", "g", "h", "i"]);
  assert.deepEqual(getFollowedTeams(), ["a", "b", "c", "d", "e", "f", "g", "h"]);
});

test("stores dismissed notification ids", () => {
  setDismissedNotifications(["intro", "rate-limit"]);
  assert.deepEqual(getDismissedNotifications(), ["intro", "rate-limit"]);
});

test("stores prediction cache with a timestamp", () => {
  savePredictionToCache("match-1", {
    homeWin: 50,
    draw: 25,
    awayWin: 25,
    reasoning: "Fresh data favors the home side."
  });

  const cached = getPredictionFromCache("match-1");
  assert.equal(cached?.homeWin, 50);
  assert.equal(cached?.source, "cache");
});
