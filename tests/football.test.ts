import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { getMatches, getScores, getStandings, getStats, resetLiveScoreMemoryForTests } from "@/lib/football";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const originalDateNow = Date.now;

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  Date.now = originalDateNow;
  resetLiveScoreMemoryForTests();
  process.env = { ...originalEnv };
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

test("returns official fixture data when football-data key is missing", async () => {
  delete process.env.FOOTBALL_DATA_KEY;
  const result = await getMatches();

  assert.equal(result.source, "official");
  assert.equal(result.data[0].homeTeam.name, "Mexico");
  assert.equal(result.data[0].awayTeam.name, "South Africa");
  assert.equal(result.data[0].status, "SCHEDULED");
});

test("maps football-data matches into app matches", async () => {
  process.env.FOOTBALL_DATA_KEY = "key";
  globalThis.fetch = async () =>
    jsonResponse({
      matches: [
        {
          id: 10,
          utcDate: "2026-06-11T19:00:00Z",
          status: "SCHEDULED",
          venue: "Mexico City Stadium",
          stage: "GROUP_STAGE",
          group: "GROUP_A",
          homeTeam: { id: 1, name: "Mexico", shortName: "Mexico", tla: "MEX" },
          awayTeam: { id: 2, name: "South Africa", shortName: "South Africa", tla: "RSA" },
          score: { fullTime: { home: null, away: null } }
        }
      ]
    });

  const result = await getMatches();

  assert.equal(result.source, "live");
  assert.equal(result.data[0].id, "10");
  assert.equal(result.data[0].homeTeam.name, "Mexico");
  assert.equal(result.data[0].awayTeam.shortName, "South Africa");
});

test("uses official venue and city when live matches omit host details", async () => {
  process.env.FOOTBALL_DATA_KEY = "key";
  globalThis.fetch = async () =>
    jsonResponse({
      matches: [
        {
          id: 14,
          utcDate: "2026-06-14T23:00:00Z",
          status: "TIMED",
          venue: null,
          stage: "GROUP_STAGE",
          group: "GROUP_E",
          homeTeam: { id: 31, name: "Côte d'Ivoire", shortName: "Côte d'Ivoire", tla: "CIV" },
          awayTeam: { id: 32, name: "Ecuador", shortName: "Ecuador", tla: "ECU" },
          score: { fullTime: { home: null, away: null } }
        }
      ]
    });

  const result = await getMatches();

  assert.equal(result.source, "live");
  assert.equal(result.data[0].status, "SCHEDULED");
  assert.equal(result.data[0].group, "Group E");
  assert.equal(result.data[0].homeTeam.name, "Côte d'Ivoire");
  assert.equal(result.data[0].awayTeam.name, "Ecuador");
  assert.equal(result.data[0].venue, "Lincoln Financial Field");
  assert.equal(result.data[0].city, "Philadelphia");
});

test("overlays football-data standings onto official four-team groups", async () => {
  process.env.FOOTBALL_DATA_KEY = "key";
  globalThis.fetch = async () =>
    jsonResponse({
      standings: [
        {
          group: "Group A",
          table: [
            {
              position: 1,
              team: { id: 1, name: "Mexico", shortName: "Mexico", tla: "MEX" },
              playedGames: 3,
              won: 2,
              goalDifference: 4,
              points: 7,
              form: "W,D,W"
            },
            {
              position: 2,
              team: { id: 2, name: "Canada", shortName: "Canada", tla: "CAN" },
              playedGames: 3,
              won: 1,
              goalDifference: 1,
              points: 4,
              form: "L,W,D"
            }
          ]
        }
      ]
    });

  const result = await getStandings();
  const groupA = result.data.find((group) => group.group === "Group A");
  const groupB = result.data.find((group) => group.group === "Group B");

  assert.equal(result.source, "live");
  assert.equal(result.data.length, 12);
  assert.deepEqual(
    groupA?.teams.map((row) => row.team.name),
    ["Mexico", "South Africa", "Korea Republic", "Czechia"]
  );
  assert.equal(groupA?.teams.length, 4);
  assert.equal(groupA?.teams[0].points, 7);
  assert.deepEqual(groupA?.teams[0].form, ["W", "D", "W"]);
  assert.equal(groupA?.teams.some((row) => row.team.name === "Canada"), false);
  assert.equal(groupB?.teams.find((row) => row.team.name === "Canada")?.points, 4);
});

test("returns official zero-point group tables when football-data standings are unavailable", async () => {
  delete process.env.FOOTBALL_DATA_KEY;
  const result = await getStandings();

  assert.equal(result.source, "official");
  assert.equal(result.data.length, 12);
  assert.equal(result.data[0].group, "Group A");
  assert.equal(result.data[0].teams[0].played, 0);
  assert.equal(result.data[0].teams[0].points, 0);
});

test("uses API-FOOTBALL live fixtures when football-data has no live scores", async () => {
  process.env.FOOTBALL_DATA_KEY = "key";
  process.env.API_FOOTBALL_KEY = "api-football";
  const requestedUrls: string[] = [];
  globalThis.fetch = async (input: string | URL | Request) => {
    const url = String(input);
    requestedUrls.push(url);
    if (url.includes("api.football-data.org")) {
      return jsonResponse({ matches: [] });
    }
    return jsonResponse({
      response: [
        {
          fixture: {
            id: 99,
            date: "2026-06-12T20:00:00Z",
            status: { short: "2H", elapsed: 67 },
            venue: { name: "Nissan Stadium", city: "Nashville" }
          },
          league: { round: "Group Stage" },
          teams: {
            home: { id: 1, name: "USA" },
            away: { id: 2, name: "Mexico" }
          },
          goals: { home: 2, away: 1 }
        }
      ]
    });
  };

  const result = await getScores();

  assert.equal(result.source, "live");
  assert.equal(result.error, undefined);
  assert.equal(result.data[0].status, "LIVE");
  assert.equal(result.data[0].minute, 67);
  assert.equal(result.data[0].score?.home, 2);
  assert.ok(requestedUrls.some((url) => url.includes("/fixtures?league=1&season=2026&live=all")));
});

test("infers live match from official kickoff window when providers lag", async () => {
  process.env.FOOTBALL_DATA_KEY = "key";
  process.env.API_FOOTBALL_KEY = "api-football";
  Date.now = () => new Date("2026-06-11T19:34:00Z").getTime();
  globalThis.fetch = async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("api.football-data.org")) {
      return jsonResponse({
        matches: [
          {
            id: 537327,
            utcDate: "2026-06-11T19:00:00Z",
            status: "SCHEDULED",
            venue: "Estadio Azteca",
            stage: "GROUP_STAGE",
            group: "GROUP_A",
            homeTeam: { id: 1, name: "Mexico", shortName: "Mexico", tla: "MEX" },
            awayTeam: { id: 2, name: "South Africa", shortName: "South Africa", tla: "RSA" },
            score: { fullTime: { home: null, away: null } }
          }
        ]
      });
    }
    return jsonResponse({ response: [] });
  };

  const result = await getScores();

  assert.equal(result.source, "live");
  assert.equal(result.error, undefined);
  assert.equal(result.data[0].status, "LIVE");
  assert.equal(result.data[0].minute, 34);
  assert.equal(result.data[0].homeTeam.name, "Mexico");
  assert.equal(result.data[0].awayTeam.name, "South Africa");
  assert.equal(result.data[0].score, undefined);
});

test("reuses last provider score when live providers temporarily drop the match", async () => {
  process.env.FOOTBALL_DATA_KEY = "key";
  process.env.API_FOOTBALL_KEY = "api-football";
  Date.now = () => new Date("2026-06-11T19:20:00Z").getTime();
  globalThis.fetch = async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("api.football-data.org")) {
      return jsonResponse({ matches: [] });
    }
    return jsonResponse({
      response: [
        {
          fixture: {
            id: 537327,
            date: "2026-06-11T19:00:00Z",
            status: { short: "1H", elapsed: 20 },
            venue: { name: "Estadio Azteca", city: "Mexico City" }
          },
          league: { round: "Group Stage" },
          teams: {
            home: { id: 1, name: "Mexico" },
            away: { id: 2, name: "South Africa" }
          },
          goals: { home: 1, away: 0 }
        }
      ]
    });
  };

  await getScores();

  Date.now = () => new Date("2026-06-11T19:36:00Z").getTime();
  globalThis.fetch = async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("api.football-data.org")) {
      return jsonResponse({ matches: [] });
    }
    return jsonResponse({ response: [] });
  };

  const result = await getScores();

  assert.equal(result.source, "live");
  assert.equal(result.data[0].status, "LIVE");
  assert.equal(result.data[0].minute, 36);
  assert.equal(result.data[0].score?.home, 1);
  assert.equal(result.data[0].score?.away, 0);
});

test("returns null stats when match API is unavailable", async () => {
  delete process.env.FOOTBALL_DATA_KEY;
  const result = await getStats();

  assert.equal(result.source, "none");
  assert.equal(result.data, null);
});

test("calculates stats from real match data and scorer data", async () => {
  process.env.FOOTBALL_DATA_KEY = "key";
  globalThis.fetch = async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("scorers")) {
      return jsonResponse({ scorers: [{ player: { name: "Alex Morgan" }, goals: 4 }] });
    }
    return jsonResponse({
      matches: [
        {
          id: 10,
          utcDate: "2026-06-11T19:00:00Z",
          status: "FINISHED",
          venue: "Mexico City Stadium",
          stage: "GROUP_STAGE",
          group: "GROUP_A",
          homeTeam: { id: 1, name: "Mexico", shortName: "Mexico", tla: "MEX" },
          awayTeam: { id: 2, name: "South Africa", shortName: "South Africa", tla: "RSA" },
          score: { fullTime: { home: 3, away: 1 } }
        }
      ]
    });
  };

  const result = await getStats();

  assert.equal(result.source, "live");
  assert.equal(result.data?.goalsScored, 4);
  assert.equal(result.data?.matchesPlayed, 1);
  assert.ok(result.data?.topScorer?.includes("Alex Morgan"));
  assert.ok(result.data?.topScorer?.includes("4"));
});
