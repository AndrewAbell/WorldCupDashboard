import type { GroupStanding, Match, Team } from "@/types";

export type GroupLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L";
export type GroupPosition = "first" | "second" | "third";
export type GroupPositionPicks = Record<string, Partial<Record<GroupPosition, string>>>;
export type KnockoutPicks = Record<string, string>;

export type SavedBracket = {
  id: string;
  name: string;
  createdAt: number;
  groupPicks: GroupPositionPicks;
  thirdQualifiers: GroupLetter[];
  knockoutPicks: KnockoutPicks;
};

export type BracketScore = {
  bracket: SavedBracket;
  correct: number;
  possible: number;
};

export type BracketParticipant = {
  team?: Team;
  placeholder: string;
  source?: string;
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

type RoundOf32Slot =
  | { id: string; label: string; home: string; away: string }
  | { id: string; label: string; home: string; thirdCandidates: GroupLetter[] };

const GROUPS: GroupLetter[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const ROUND_OF_32: RoundOf32Slot[] = [
  { id: "M73", label: "M73", home: "2A", away: "2B" },
  { id: "M74", label: "M74", home: "1E", thirdCandidates: ["A", "B", "C", "D", "F"] },
  { id: "M75", label: "M75", home: "1F", away: "2C" },
  { id: "M76", label: "M76", home: "1C", away: "2F" },
  { id: "M77", label: "M77", home: "1I", thirdCandidates: ["C", "D", "F", "G", "H"] },
  { id: "M78", label: "M78", home: "2E", away: "2I" },
  { id: "M79", label: "M79", home: "1A", thirdCandidates: ["C", "E", "F", "H", "I"] },
  { id: "M80", label: "M80", home: "1L", thirdCandidates: ["E", "H", "I", "J", "K"] },
  { id: "M81", label: "M81", home: "1D", thirdCandidates: ["B", "E", "F", "I", "J"] },
  { id: "M82", label: "M82", home: "1G", thirdCandidates: ["A", "E", "H", "I", "J"] },
  { id: "M83", label: "M83", home: "2K", away: "2L" },
  { id: "M84", label: "M84", home: "1H", away: "2J" },
  { id: "M85", label: "M85", home: "1B", thirdCandidates: ["E", "F", "G", "I", "J"] },
  { id: "M86", label: "M86", home: "1J", away: "2H" },
  { id: "M87", label: "M87", home: "1K", thirdCandidates: ["D", "E", "I", "J", "L"] },
  { id: "M88", label: "M88", home: "2D", away: "2G" }
];

const ROUND_LINKS = {
  round16: [
    ["M89", "M74", "M77"],
    ["M90", "M73", "M75"],
    ["M91", "M76", "M78"],
    ["M92", "M79", "M80"],
    ["M93", "M83", "M84"],
    ["M94", "M81", "M82"],
    ["M95", "M86", "M88"],
    ["M96", "M85", "M87"]
  ],
  quarterfinals: [
    ["M97", "M89", "M90"],
    ["M98", "M93", "M94"],
    ["M99", "M91", "M92"],
    ["M100", "M95", "M96"]
  ],
  semifinals: [
    ["M101", "M97", "M98"],
    ["M102", "M99", "M100"]
  ],
  final: [["M104", "M101", "M102"]]
} as const;

function groupName(letter: GroupLetter): string {
  return `Group ${letter}`;
}

function letterFromGroup(group: string): GroupLetter | undefined {
  const letter = group.replace("Group ", "") as GroupLetter;
  return GROUPS.includes(letter) ? letter : undefined;
}

function teamMap(standings: GroupStanding[]): Map<string, Team> {
  return new Map(standings.flatMap((group) => group.teams.map((row) => [row.team.id, row.team] as const)));
}

function teamByPick(standings: GroupStanding[], picks: GroupPositionPicks, ref: string): Team | undefined {
  const [, position, letter] = ref.match(/^([123])([A-L])$/) ?? [];
  const field = position === "1" ? "first" : position === "2" ? "second" : "third";
  const teamId = picks[groupName(letter as GroupLetter)]?.[field];
  return teamMap(standings).get(teamId ?? "");
}

function participant(team: Team | undefined, placeholder: string, source?: string): BracketParticipant {
  return { team, placeholder, source };
}

function assignThirdPlaceSlots(thirdQualifiers: GroupLetter[]): Record<string, GroupLetter> {
  const slots = ROUND_OF_32.filter((slot): slot is Extract<RoundOf32Slot, { thirdCandidates: GroupLetter[] }> => "thirdCandidates" in slot);
  const selected = [...thirdQualifiers].sort();

  function search(index: number, used: Set<GroupLetter>, assignment: Record<string, GroupLetter>): Record<string, GroupLetter> | null {
    if (index === slots.length) {
      return assignment;
    }

    const slot = slots[index];
    const candidates = selected.filter((group) => !used.has(group) && slot.thirdCandidates.includes(group));
    for (const group of candidates) {
      const nextUsed = new Set(used);
      nextUsed.add(group);
      const result = search(index + 1, nextUsed, { ...assignment, [slot.id]: group });
      if (result) {
        return result;
      }
    }

    return null;
  }

  return search(0, new Set(), {}) ?? {};
}

function winnerParticipant(standings: GroupStanding[], picks: KnockoutPicks, matchId: string): BracketParticipant {
  const team = teamMap(standings).get(picks[matchId]);
  return participant(team, `Winner ${matchId}`, matchId);
}

export function areGroupPositionPicksComplete(standings: GroupStanding[], picks: GroupPositionPicks): boolean {
  return standings.every((group) => Boolean(picks[group.group]?.first && picks[group.group]?.second && picks[group.group]?.third));
}

export function countGroupPositionPicks(standings: GroupStanding[], picks: GroupPositionPicks): number {
  return standings.reduce((total, group) => total + (picks[group.group]?.first ? 1 : 0) + (picks[group.group]?.second ? 1 : 0) + (picks[group.group]?.third ? 1 : 0), 0);
}

export function thirdPlaceTeam(standings: GroupStanding[], picks: GroupPositionPicks, letter: GroupLetter): Team | undefined {
  return teamByPick(standings, picks, `3${letter}`);
}

export function buildOfficialBracketRounds(
  standings: GroupStanding[],
  groupPicks: GroupPositionPicks,
  thirdQualifiers: GroupLetter[],
  knockoutPicks: KnockoutPicks
): BracketRound[] {
  if (!areGroupPositionPicksComplete(standings, groupPicks) || thirdQualifiers.length !== 8) {
    return [];
  }

  const thirdAssignments = assignThirdPlaceSlots(thirdQualifiers);
  const r32: BracketMatch[] = ROUND_OF_32.map((slot) => {
    const thirdGroup = "thirdCandidates" in slot ? thirdAssignments[slot.id] : undefined;
    return {
      id: slot.id,
      label: slot.label,
      home: participant(teamByPick(standings, groupPicks, slot.home), slot.home, slot.home),
      away:
        "away" in slot
          ? participant(teamByPick(standings, groupPicks, slot.away), slot.away, slot.away)
          : participant(
              thirdGroup ? thirdPlaceTeam(standings, groupPicks, thirdGroup) : undefined,
              `3rd ${slot.thirdCandidates.join("/")}`,
              thirdGroup ? `3${thirdGroup}` : undefined
            )
    };
  });

  const makeRound = (id: string, title: string, links: readonly (readonly [string, string, string])[]): BracketRound => ({
    id,
    title,
    matches: links.map(([matchId, homeSource, awaySource]) => ({
      id: matchId,
      label: matchId,
      home: winnerParticipant(standings, knockoutPicks, homeSource),
      away: winnerParticipant(standings, knockoutPicks, awaySource)
    }))
  });

  return [
    { id: "round32", title: "Round of 32", matches: r32 },
    makeRound("round16", "Round of 16", ROUND_LINKS.round16),
    makeRound("quarterfinals", "Quarterfinals", ROUND_LINKS.quarterfinals),
    makeRound("semifinals", "Semifinals", ROUND_LINKS.semifinals),
    makeRound("final", "Final", ROUND_LINKS.final)
  ];
}

export function getChampion(standings: GroupStanding[], knockoutPicks: KnockoutPicks): Team | undefined {
  return teamMap(standings).get(knockoutPicks.M104);
}

export function scoreBracket(bracket: SavedBracket, standings: GroupStanding[], matches: Match[] = []): BracketScore {
  let correct = 0;
  let possible = 0;

  standings.forEach((group) => {
    const letter = letterFromGroup(group.group);
    const played = group.teams.some((row) => row.played > 0);
    if (!letter || !played) {
      return;
    }

    (["first", "second", "third"] as const).forEach((position, index) => {
      const actual = group.teams[index]?.team.id;
      if (actual) {
        possible += 1;
        if (bracket.groupPicks[group.group]?.[position] === actual) {
          correct += 1;
        }
      }
    });
  });

  matches
    .filter((match) => match.status === "FINISHED" && match.score)
    .forEach((match) => {
      const winnerId = match.score && match.score.home > match.score.away ? match.homeTeam.id : match.awayTeam.id;
      if (bracket.knockoutPicks[match.id]) {
        possible += 1;
        if (bracket.knockoutPicks[match.id] === winnerId) {
          correct += 1;
        }
      }
    });

  return { bracket, correct, possible };
}
