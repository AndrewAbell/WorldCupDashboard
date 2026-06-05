import type { PredictionResult } from "@/types";
import type { SavedBracket } from "@/lib/bracket";

const FOLLOWED_TEAMS_KEY = "wc2026_followed_teams";
const PREDICTION_CACHE_KEY = "wc2026_prediction_cache";
const DISMISSED_KEY = "wc2026_dismissed";
const USER_BRACKETS_KEY = "wc2026_user_brackets";
const DAY_MS = 24 * 60 * 60 * 1000;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getFollowedTeams(): string[] {
  return readJson<string[]>(FOLLOWED_TEAMS_KEY, []);
}

export function setFollowedTeams(teamIds: string[]): void {
  writeJson(FOLLOWED_TEAMS_KEY, teamIds.slice(0, 8));
}

export function getDismissedNotifications(): string[] {
  return readJson<string[]>(DISMISSED_KEY, []);
}

export function setDismissedNotifications(ids: string[]): void {
  writeJson(DISMISSED_KEY, ids);
}

export function getPredictionFromCache(matchId: string): PredictionResult | null {
  const cache = readJson<Record<string, PredictionResult>>(PREDICTION_CACHE_KEY, {});
  const item = cache[matchId];
  if (!item?.cachedAt || Date.now() - item.cachedAt > DAY_MS) {
    return null;
  }
  return { ...item, source: "cache" };
}

export function savePredictionToCache(matchId: string, prediction: PredictionResult): void {
  const cache = readJson<Record<string, PredictionResult>>(PREDICTION_CACHE_KEY, {});
  cache[matchId] = { ...prediction, cachedAt: Date.now() };
  writeJson(PREDICTION_CACHE_KEY, cache);
}

export function getUserBrackets(): SavedBracket[] {
  return dedupeUserBrackets(readJson<SavedBracket[]>(USER_BRACKETS_KEY, []));
}

export function saveUserBracket(bracket: SavedBracket): void {
  const ownerKey = bracketOwnerKey(bracket);
  const brackets = getUserBrackets().filter((item) => item.id !== bracket.id && bracketOwnerKey(item) !== ownerKey);
  writeJson(USER_BRACKETS_KEY, [bracket, ...brackets].slice(0, 50));
}

function bracketOwnerKey(bracket: Pick<SavedBracket, "name">): string {
  return bracket.name.trim().toLowerCase().replace(/\s+/g, " ");
}

function dedupeUserBrackets(brackets: SavedBracket[]): SavedBracket[] {
  const byOwner = new Map<string, SavedBracket>();

  for (const bracket of brackets) {
    const key = bracketOwnerKey(bracket);
    if (!key) {
      continue;
    }
    const current = byOwner.get(key);
    if (!current || bracket.createdAt > current.createdAt) {
      byOwner.set(key, bracket);
    }
  }

  return [...byOwner.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
}
