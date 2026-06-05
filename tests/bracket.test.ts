import assert from "node:assert/strict";
import { test } from "node:test";
import { buildUserBracketRounds, countGroupWinnerPicks, getChampion, type GroupWinnerPicks, type KnockoutPicks } from "@/lib/bracket";
import type { GroupStanding, Team } from "@/types";

function team(id: string, shortName: string): Team {
  return { id, name: shortName, shortName, flag: shortName.slice(0, 2).toUpperCase() };
}

const standings: GroupStanding[] = Array.from({ length: 12 }, (_, index) => {
  const letter = String.fromCharCode(65 + index);
  return {
    group: `Group ${letter}`,
    playedLabel: "Test",
    teams: [team(`team-${letter}-1`, `${letter}1`), team(`team-${letter}-2`, `${letter}2`)].map((item, position) => ({
      position: position + 1,
      team: item,
      played: 0,
      won: 0,
      goalDifference: 0,
      points: 0,
      form: [],
      qualifies: position === 0
    }))
  };
});

const completeGroupPicks: GroupWinnerPicks = Object.fromEntries(standings.map((group) => [group.group, group.teams[0].team.id]));

test("counts completed group winner picks", () => {
  assert.equal(countGroupWinnerPicks(standings, { "Group A": "team-A-1" }), 1);
  assert.equal(countGroupWinnerPicks(standings, completeGroupPicks), 12);
});

test("locks knockout rounds until every group has a winner", () => {
  const rounds = buildUserBracketRounds(standings, { "Group A": "team-A-1" }, {});

  assert.deepEqual(rounds, []);
});

test("builds a seeded 12-team group-winner bracket", () => {
  const rounds = buildUserBracketRounds(standings, completeGroupPicks, {});

  assert.equal(rounds.length, 4);
  assert.equal(rounds[0].title, "Play-In Round");
  assert.equal(rounds[0].matches[0].home.team?.shortName, "E1");
  assert.equal(rounds[0].matches[0].away.team?.shortName, "L1");
  assert.equal(rounds[1].matches[0].home.team?.shortName, "A1");
  assert.equal(rounds[1].matches[0].away.placeholder, "Winner Play-in 1");
});

test("advances knockout picks through the final champion", () => {
  const picks: KnockoutPicks = {
    "play-in-1": "team-E-1",
    "play-in-2": "team-F-1",
    "play-in-3": "team-G-1",
    "play-in-4": "team-H-1",
    "quarter-1": "team-A-1",
    "quarter-2": "team-F-1",
    "quarter-3": "team-C-1",
    "quarter-4": "team-H-1",
    "semi-1": "team-A-1",
    "semi-2": "team-C-1",
    final: "team-C-1"
  };

  const rounds = buildUserBracketRounds(standings, completeGroupPicks, picks);

  assert.equal(rounds[2].matches[0].home.team?.shortName, "A1");
  assert.equal(rounds[3].matches[0].away.team?.shortName, "C1");
  assert.equal(getChampion(standings, picks)?.shortName, "C1");
});
