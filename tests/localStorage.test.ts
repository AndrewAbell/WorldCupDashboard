import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  getDismissedNotifications,
  getFollowedTeams,
  getUserBrackets,
  getPredictionFromCache,
  savePredictionToCache,
  saveUserBracket,
  setDismissedNotifications,
  setFollowedTeams
} from "@/lib/localStorage";
import type { SavedBracket } from "@/lib/bracket";

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

test("replaces saved brackets with the same name", () => {
  const base: SavedBracket = {
    id: "test3-old",
    name: "TEST3",
    createdAt: 1,
    groupPicks: {},
    thirdQualifiers: [],
    knockoutPicks: { M104: "mexico" }
  };

  saveUserBracket(base);
  saveUserBracket({
    ...base,
    id: "test3-new",
    name: " test3 ",
    createdAt: 2,
    knockoutPicks: { M104: "usa" }
  });

  const brackets = getUserBrackets();
  assert.equal(brackets.length, 1);
  assert.equal(brackets[0].id, "test3-new");
  assert.equal(brackets[0].knockoutPicks.M104, "usa");
});

test("dedupes existing bracket leaderboard data by name", () => {
  window.localStorage.setItem(
    "wc2026_user_brackets",
    JSON.stringify([
      {
        id: "old",
        name: "Andrew",
        createdAt: 1,
        groupPicks: {},
        thirdQualifiers: [],
        knockoutPicks: {}
      },
      {
        id: "new",
        name: "andrew",
        createdAt: 2,
        groupPicks: {},
        thirdQualifiers: [],
        knockoutPicks: { M104: "canada" }
      },
      {
        id: "other",
        name: "TEST3",
        createdAt: 3,
        groupPicks: {},
        thirdQualifiers: [],
        knockoutPicks: {}
      }
    ])
  );

  const brackets = getUserBrackets();
  assert.deepEqual(brackets.map((item) => item.id), ["other", "new"]);
});
