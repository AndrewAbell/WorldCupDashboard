import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildOfficialBracketRounds,
  countGroupPositionPicks,
  getChampion,
  scoreBracket,
  type GroupPositionPicks,
  type KnockoutPicks,
  type SavedBracket
} from "@/lib/bracket";
import type { GroupStanding, Match, Team } from "@/types";

function team(id: string, shortName: string): Team {
  return { id, name: shortName, shortName, flag: shortName.slice(0, 2).toUpperCase() };
}

const standings: GroupStanding[] = Array.from({ length: 12 }, (_, index) => {
  const letter = String.fromCharCode(65 + index);
  return {
    group: `Group ${letter}`,
    playedLabel: "Test",
    teams: [team(`team-${letter}-1`, `${letter}1`), team(`team-${letter}-2`, `${letter}2`), team(`team-${letter}-3`, `${letter}3`)].map(
      (item, position) => ({
        position: position + 1,
        team: item,
        played: 3,
        won: 0,
        goalDifference: 0,
        points: 0,
        form: [],
        qualifies: position < 2
      })
    )
  };
});

const groupPicks: GroupPositionPicks = Object.fromEntries(
  standings.map((group) => [
    group.group,
    {
      first: group.teams[0].team.id,
      second: group.teams[1].team.id,
      third: group.teams[2].team.id
    }
  ])
);

const thirdQualifiers = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

test("counts completed first, second, and third group picks", () => {
  assert.equal(countGroupPositionPicks(standings, { "Group A": { first: "team-A-1", second: "team-A-2" } }), 2);
  assert.equal(countGroupPositionPicks(standings, groupPicks), 36);
});

test("locks official bracket until group positions and best thirds are complete", () => {
  assert.deepEqual(buildOfficialBracketRounds(standings, { "Group A": { first: "team-A-1" } }, [], {}), []);
  assert.deepEqual(buildOfficialBracketRounds(standings, groupPicks, ["A", "B"], {}), []);
});

test("builds the official Round of 32 path with third-place slots", () => {
  const rounds = buildOfficialBracketRounds(standings, groupPicks, [...thirdQualifiers], {});

  assert.equal(rounds.length, 5);
  assert.equal(rounds[0].title, "Round of 32");
  assert.equal(rounds[0].matches.length, 16);
  assert.equal(rounds[0].matches[0].id, "M73");
  assert.equal(rounds[0].matches[0].home.team?.shortName, "A2");
  assert.equal(rounds[0].matches[0].away.team?.shortName, "B2");
  assert.equal(rounds[0].matches[1].id, "M74");
  assert.equal(rounds[0].matches[1].home.team?.shortName, "E1");
  assert.ok(rounds[0].matches[1].away.placeholder.startsWith("3rd"));
});

test("advances knockout picks through M104 champion", () => {
  const picks: KnockoutPicks = {
    M73: "team-A-2",
    M74: "team-E-1",
    M75: "team-F-1",
    M77: "team-I-1",
    M89: "team-E-1",
    M90: "team-A-2",
    M97: "team-E-1",
    M101: "team-E-1",
    M104: "team-E-1"
  };

  const rounds = buildOfficialBracketRounds(standings, groupPicks, [...thirdQualifiers], picks);

  assert.equal(rounds[1].matches[0].home.team?.shortName, "E1");
  assert.equal(rounds[3].matches[0].home.team?.shortName, "E1");
  assert.equal(getChampion(standings, picks)?.shortName, "E1");
});

test("scores saved brackets against completed standings and matches", () => {
  const bracket: SavedBracket = {
    id: "1",
    name: "Alex",
    createdAt: 1,
    groupPicks,
    thirdQualifiers: [...thirdQualifiers],
    knockoutPicks: { "live-match": "team-A-1" }
  };
  const matches: Match[] = [
    {
      id: "live-match",
      date: "2026-07-01T00:00:00Z",
      status: "FINISHED",
      group: "Knockout",
      stage: "Round of 32",
      venue: "Test",
      city: "Test",
      homeTeam: team("team-A-1", "A1"),
      awayTeam: team("team-B-1", "B1"),
      score: { home: 2, away: 1 },
      homeForm: [],
      awayForm: []
    }
  ];

  const score = scoreBracket(bracket, standings, matches);

  assert.equal(score.correct, 37);
  assert.equal(score.possible, 37);
});
