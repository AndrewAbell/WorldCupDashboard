import type { GroupStanding, Team } from "@/types";

export type GroupWinnerPicks = Record<string, string>;
export type KnockoutPicks = Record<string, string>;

export type BracketParticipant = {
  team?: Team;
  placeholder: string;
};

export type BracketMatch = {
  id: string;
  label: string;
  home: BracketParticipant;
  away: BracketParticipant;
};

export type BracketRound = {
  id: string;
  title: string;
  matches: BracketMatch[];
};

const PLAY_IN_MATCHES = [
  { id: "play-in-1", label: "Play-in 1", homeGroup: "Group E", awayGroup: "Group L" },
  { id: "play-in-2", label: "Play-in 2", homeGroup: "Group F", awayGroup: "Group K" },
  { id: "play-in-3", label: "Play-in 3", homeGroup: "Group G", awayGroup: "Group J" },
  { id: "play-in-4", label: "Play-in 4", homeGroup: "Group H", awayGroup: "Group I" }
];

const QUARTER_FINALS = [
  { id: "quarter-1", label: "Quarterfinal 1", seedGroup: "Group A", sourceMatchId: "play-in-1" },
  { id: "quarter-2", label: "Quarterfinal 2", seedGroup: "Group B", sourceMatchId: "play-in-2" },
  { id: "quarter-3", label: "Quarterfinal 3", seedGroup: "Group C", sourceMatchId: "play-in-3" },
  { id: "quarter-4", label: "Quarterfinal 4", seedGroup: "Group D", sourceMatchId: "play-in-4" }
];

const SEMI_FINALS = [
  { id: "semi-1", label: "Semifinal 1", homeSource: "quarter-1", awaySource: "quarter-2" },
  { id: "semi-2", label: "Semifinal 2", homeSource: "quarter-3", awaySource: "quarter-4" }
];

const FINAL = { id: "final", label: "Final", homeSource: "semi-1", awaySource: "semi-2" };

function teamById(standings: GroupStanding[]): Map<string, Team> {
  return new Map(standings.flatMap((group) => group.teams.map((row) => [row.team.id, row.team] as const)));
}

function participant(team: Team | undefined, placeholder: string): BracketParticipant {
  return { team, placeholder };
}

export function getGroupWinnerTeam(standings: GroupStanding[], groupName: string, picks: GroupWinnerPicks): Team | undefined {
  const teamId = picks[groupName];
  return standings.find((group) => group.group === groupName)?.teams.find((row) => row.team.id === teamId)?.team;
}

export function countGroupWinnerPicks(standings: GroupStanding[], picks: GroupWinnerPicks): number {
  return standings.filter((group) => Boolean(getGroupWinnerTeam(standings, group.group, picks))).length;
}

export function areGroupWinnerPicksComplete(standings: GroupStanding[], picks: GroupWinnerPicks): boolean {
  return standings.length > 0 && countGroupWinnerPicks(standings, picks) === standings.length;
}

export function buildUserBracketRounds(
  standings: GroupStanding[],
  groupPicks: GroupWinnerPicks,
  knockoutPicks: KnockoutPicks
): BracketRound[] {
  if (!areGroupWinnerPicksComplete(standings, groupPicks)) {
    return [];
  }

  const teams = teamById(standings);
  const winnerOf = (matchId: string): Team | undefined => teams.get(knockoutPicks[matchId]);
  const groupWinner = (groupName: string): Team | undefined => getGroupWinnerTeam(standings, groupName, groupPicks);

  const playIn: BracketMatch[] = PLAY_IN_MATCHES.map((match) => ({
    id: match.id,
    label: match.label,
    home: participant(groupWinner(match.homeGroup), `${match.homeGroup} winner`),
    away: participant(groupWinner(match.awayGroup), `${match.awayGroup} winner`)
  }));

  const quarters: BracketMatch[] = QUARTER_FINALS.map((match) => ({
    id: match.id,
    label: match.label,
    home: participant(groupWinner(match.seedGroup), `${match.seedGroup} winner`),
    away: participant(winnerOf(match.sourceMatchId), `Winner ${match.sourceMatchId.replace("play-in-", "Play-in ")}`)
  }));

  const semis: BracketMatch[] = SEMI_FINALS.map((match) => ({
    id: match.id,
    label: match.label,
    home: participant(winnerOf(match.homeSource), `Winner ${match.homeSource.replace("quarter-", "QF ")}`),
    away: participant(winnerOf(match.awaySource), `Winner ${match.awaySource.replace("quarter-", "QF ")}`)
  }));

  const final: BracketMatch = {
    id: FINAL.id,
    label: FINAL.label,
    home: participant(winnerOf(FINAL.homeSource), "Winner Semifinal 1"),
    away: participant(winnerOf(FINAL.awaySource), "Winner Semifinal 2")
  };

  return [
    { id: "play-in", title: "Play-In Round", matches: playIn },
    { id: "quarterfinals", title: "Quarterfinals", matches: quarters },
    { id: "semifinals", title: "Semifinals", matches: semis },
    { id: "final", title: "Final", matches: [final] }
  ];
}

export function getChampion(standings: GroupStanding[], knockoutPicks: KnockoutPicks): Team | undefined {
  return teamById(standings).get(knockoutPicks.final);
}
