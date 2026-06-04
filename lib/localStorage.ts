import type { PredictionResult } from "@/types";

const FOLLOWED_TEAMS_KEY = "wc2026_followed_teams";
const PREDICTION_CACHE_KEY = "wc2026_prediction_cache";
const DISMISSED_KEY = "wc2026_dismissed";
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
