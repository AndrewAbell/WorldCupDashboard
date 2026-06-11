import { officialGroupStageFixtures, officialGroupStandings, teams } from "@/lib/appData";
import type { ApiPayload, GroupStanding, Match, Team, TeamStanding, TournamentStats } from "@/types";

const FOOTBALL_BASE = "https://api.football-data.org/v4";
const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
const LIVE_WINDOW_MS = 150 * 60 * 1000;

let lastLiveMatches: Match[] = [];

export function resetLiveScoreMemoryForTests(): void {
  lastLiveMatches = [];
}

type FootballDataTeam = {
  id?: number;
  name?: string;
  shortName?: string;
  tla?: string;
  crest?: string;
};

type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  minute?: number | null;
  venue?: string | null;
  stage?: string | null;
  group?: string | null;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  score?: {
    fullTime?: {
      home?: number | null;
      away?: number | null;
    };
  };
};

type StandingTableRow = {
  position: number;
  team: FootballDataTeam;
  playedGames: number;
  won: number;
  goalDifference: number;
  points: number;
  form?: string | null;
};

type StandingGroup = {
  group?: string;
  table: StandingTableRow[];
};

type FootballDataScorer = {
  player?: {
    name?: string;
  };
  goals?: number | null;
};

type ApiFootballFixture = {
  fixture: {
    id: number;
    date: string;
    status?: {
      elapsed?: number | null;
      short?: string | null;
    };
    venue?: {
      name?: string | null;
      city?: string | null;
    };
  };
  league?: {
    round?: string | null;
  };
  teams: {
    home: {
      id?: number;
      name?: string;
    };
    away: {
      id?: number;
      name?: string;
    };
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
};

function flagForName(name: string | undefined): string {
  const normalized = (name ?? "").toLowerCase();
  const known = teams.find(
    (item) => item.name.toLowerCase() === normalized || item.shortName.toLowerCase() === normalized
  );
  return known?.flag ?? "TBD";
}

function mapStatus(status: string | null | undefined): Match["status"] {
  if (["1H", "2H", "ET", "P", "BT"].includes(status ?? "")) {
    return "LIVE";
  }
  if (status === "HT") {
    return "PAUSED";
  }
  if (status === "FT") {
    return "FINISHED";
  }
  return "SCHEDULED";
}

function mapFootballDataStatus(status: string | null | undefined): Match["status"] {
  if (status === "IN_PLAY") {
    return "LIVE";
  }
  if (status === "PAUSED") {
    return "PAUSED";
  }
  if (status === "FINISHED") {
    return "FINISHED";
  }
  return "SCHEDULED";
}

function mapTeam(input: FootballDataTeam): Team {
  const known = findKnownTeam(input);
  if (known) {
    return known;
  }

  const name = input.shortName || input.name || "TBD";
  return {
    id: input.id ? String(input.id) : name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    shortName: input.tla || name,
    flag: flagForName(input.name || input.shortName)
  };
}

function normalizeTeamName(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const teamAliases = new Map<string, string>([
  ["bosnia herzegovina", "bosnia-herzegovina"],
  ["bosnia and herzegovina", "bosnia-herzegovina"],
  ["cote d ivoire", "cote-divoire"],
  ["cote divoire", "cote-divoire"],
  ["ivory coast", "cote-divoire"],
  ["czech republic", "czechia"],
  ["congo dr", "dr-congo"],
  ["democratic republic of congo", "dr-congo"],
  ["south korea", "korea-republic"],
  ["korea republic", "korea-republic"],
  ["united states", "usa"],
  ["united states of america", "usa"],
  ["turkey", "turkiye"],
  ["turkiye", "turkiye"]
]);

function findKnownTeam(input: FootballDataTeam): Team | undefined {
  const keys = [input.name, input.shortName, input.tla].map(normalizeTeamName).filter(Boolean);
  const alias = keys.map((key) => teamAliases.get(key)).find((id): id is string => Boolean(id));
  if (alias) {
    return teams.find((team) => team.id === alias);
  }

  return teams.find((team) => teamKeys(team).some((key) => keys.includes(key)));
}

function teamKeys(team: Team): string[] {
  return [team.id, team.name, team.shortName].map(normalizeTeamName).filter(Boolean);
}

function mapGroup(group: string | null | undefined): string {
  const value = group ?? "";
  const match = value.match(/(?:GROUP[_\s-]?|Group\s*)([A-L])/i);
  return match ? `Group ${match[1].toUpperCase()}` : value || "Group Stage";
}

function mapStage(stage: string | null | undefined): string {
  if (!stage) {
    return "Group Stage";
  }

  return stage
    .toLowerCase()
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sameTeam(left: Team, right: Team): boolean {
  const rightKeys = teamKeys(right);
  return teamKeys(left).some((leftKey) => rightKeys.includes(leftKey));
}

function findOfficialFixture(match: Pick<Match, "date" | "group" | "homeTeam" | "awayTeam">): Match | undefined {
  const matchDate = new Date(match.date).getTime();

  return officialGroupStageFixtures.find((fixture) => {
    const dateClose = Math.abs(new Date(fixture.date).getTime() - matchDate) <= 3 * 60 * 60 * 1000;
    const sameGroup = fixture.group === match.group;
    const sameTeams = sameTeam(fixture.homeTeam, match.homeTeam) && sameTeam(fixture.awayTeam, match.awayTeam);

    return dateClose && sameGroup && sameTeams;
  });
}

function matchIdentity(match: Pick<Match, "date" | "homeTeam" | "awayTeam">): string {
  return `${match.homeTeam.id}-${match.awayTeam.id}-${new Date(match.date).toISOString().slice(0, 10)}`;
}

function enrichMatchWithOfficial(match: Match): Match {
  const official = findOfficialFixture(match);
  if (!official) {
    return match;
  }

  return {
    ...match,
    group: official.group,
    stage: official.stage,
    venue: match.venue === "Venue TBD" ? official.venue : match.venue,
    city: match.city === "Host City TBD" || match.city === match.venue ? official.city : match.city,
    homeTeam: official.homeTeam,
    awayTeam: official.awayTeam
  };
}

function updateLastLiveMatches(matches: Match[]): Match[] {
  lastLiveMatches = matches;
  return matches;
}

function activeOfficialMatches(now = Date.now()): Match[] {
  return officialGroupStageFixtures
    .filter((match) => {
      const kickoff = new Date(match.date).getTime();
      return kickoff <= now && now - kickoff <= LIVE_WINDOW_MS;
    })
    .map((match) => {
      const kickoff = new Date(match.date).getTime();
      const estimatedMinute = Math.max(1, Math.min(120, Math.floor((now - kickoff) / 60_000)));
      const cached = lastLiveMatches.find((item) => matchIdentity(item) === matchIdentity(match));

      return {
        ...match,
        status: "LIVE",
        minute: Math.max(estimatedMinute, cached?.minute ?? 0),
        score: cached?.score,
        id: cached?.id ?? match.id
      };
    });
}

function mergeStandingsWithOfficial(liveStandings: GroupStanding[]): GroupStanding[] {
  if (liveStandings.length === 0) {
    return officialGroupStandings;
  }

  const liveRows = new Map<string, TeamStanding>();
  liveStandings
    .flatMap((group) => group.teams)
    .forEach((row) => {
      teamKeys(row.team).forEach((key) => liveRows.set(key, row));
    });

  return officialGroupStandings.map((officialGroup) => ({
    ...officialGroup,
    playedLabel: liveStandings.length ? "Live table" : officialGroup.playedLabel,
    teams: officialGroup.teams.map((officialRow, index) => {
      const liveRow = teamKeys(officialRow.team)
        .map((key) => liveRows.get(key))
        .find((row): row is TeamStanding => Boolean(row));

      if (!liveRow) {
        return officialRow;
      }

      return {
        ...officialRow,
        position: index + 1,
        played: liveRow.played,
        won: liveRow.won,
        goalDifference: liveRow.goalDifference,
        points: liveRow.points,
        form: liveRow.form
      };
    })
  }));
}

async function footballFetch<T>(path: string): Promise<T> {
  const key = process.env.FOOTBALL_DATA_KEY;
  if (!key) {
    throw new Error("FOOTBALL_DATA_KEY is not configured");
  }

  const response = await fetch(`${FOOTBALL_BASE}${path}`, {
    headers: {
      "X-Auth-Token": key
    }
  });

  if (!response.ok) {
    throw new Error(`football-data.org returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function apiFootballFetch<T>(path: string): Promise<T> {
  const key = process.env.API_FOOTBALL_KEY || process.env.RAPIDAPI_KEY;
  if (!key) {
    throw new Error("API_FOOTBALL_KEY or RAPIDAPI_KEY is not configured");
  }

  const response = await fetch(`${API_FOOTBALL_BASE}${path}`, {
    headers: {
      "x-apisports-key": key
    }
  });

  if (!response.ok) {
    throw new Error(`API-FOOTBALL returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getMatches(): Promise<ApiPayload<Match[]>> {
  try {
    const payload = await footballFetch<{ matches: FootballDataMatch[] }>("/competitions/WC/matches?season=2026");
    const matches = payload.matches.map((match) => {
      const home = match.score?.fullTime?.home;
      const away = match.score?.fullTime?.away;
      return enrichMatchWithOfficial({
        id: String(match.id),
        date: match.utcDate,
        status: mapFootballDataStatus(match.status),
        minute: match.minute ?? undefined,
        group: mapGroup(match.group),
        stage: mapStage(match.stage),
        venue: match.venue || "Venue TBD",
        city: match.venue || "Host City TBD",
        homeTeam: mapTeam(match.homeTeam),
        awayTeam: mapTeam(match.awayTeam),
        score: typeof home === "number" && typeof away === "number" ? { home, away } : undefined,
        homeForm: ["W", "D", "W", "W", "L"],
        awayForm: ["L", "W", "D", "L", "W"]
      } satisfies Match);
    });

    return matches.length
      ? { data: matches, source: "live" }
      : { data: officialGroupStageFixtures, source: "official" };
  } catch (error) {
    return {
      data: officialGroupStageFixtures,
      source: "official"
    };
  }
}

export async function getStandings(): Promise<ApiPayload<GroupStanding[]>> {
  try {
    const payload = await footballFetch<{ standings: StandingGroup[] }>("/competitions/WC/standings?season=2026");
    const standings = payload.standings.map((group, groupIndex) => ({
      group: group.group || `Group ${String.fromCharCode(65 + groupIndex)}`,
      playedLabel: "Live table",
      teams: group.table.map((row) => ({
        position: row.position,
        team: mapTeam(row.team),
        played: row.playedGames,
        won: row.won,
        goalDifference: row.goalDifference,
        points: row.points,
        form: (row.form?.split(",").slice(-5) as Array<"W" | "D" | "L"> | undefined) ?? [],
        qualifies: row.position <= 2
      }))
    }));

    return standings.length
      ? { data: mergeStandingsWithOfficial(standings), source: "live" }
      : { data: officialGroupStandings, source: "official" };
  } catch (error) {
    return {
      data: officialGroupStandings,
      source: "official"
    };
  }
}

export async function getScores(): Promise<ApiPayload<Match[]>> {
  let footballDataError: string | undefined;
  try {
    const payload = await footballFetch<{ matches: FootballDataMatch[] }>("/competitions/WC/matches?season=2026");
    const live = payload.matches
      .filter((match) => ["LIVE", "IN_PLAY", "PAUSED"].includes(match.status))
      .map((match) => {
        const home = match.score?.fullTime?.home;
        const away = match.score?.fullTime?.away;
        return enrichMatchWithOfficial({
          id: String(match.id),
          date: match.utcDate,
          status: mapFootballDataStatus(match.status),
          minute: match.minute ?? undefined,
          group: mapGroup(match.group),
          stage: mapStage(match.stage),
          venue: match.venue || "Venue TBD",
          city: match.venue || "Host City TBD",
          homeTeam: mapTeam(match.homeTeam),
          awayTeam: mapTeam(match.awayTeam),
          score: typeof home === "number" && typeof away === "number" ? { home, away } : undefined,
          homeForm: [],
          awayForm: []
        } satisfies Match);
      });

    if (live.length) {
      return { data: updateLastLiveMatches(live), source: "live" };
    }
  } catch (error) {
    footballDataError = error instanceof Error ? error.message : "Unknown error";
  }

  try {
    const payload = await apiFootballFetch<{ response: ApiFootballFixture[] }>("/fixtures?league=1&season=2026&live=all");
    const apiLive = payload.response.map((item) => enrichMatchWithOfficial({
      id: String(item.fixture.id),
      date: item.fixture.date,
      status: mapStatus(item.fixture.status?.short),
      minute: item.fixture.status?.elapsed ?? undefined,
      group: mapGroup(item.league?.round),
      stage: mapStage(item.league?.round),
      venue: item.fixture.venue?.name || "Venue TBD",
      city: item.fixture.venue?.city || "Host City TBD",
      homeTeam: mapTeam(item.teams.home),
      awayTeam: mapTeam(item.teams.away),
      score:
        typeof item.goals?.home === "number" && typeof item.goals?.away === "number"
          ? { home: item.goals.home, away: item.goals.away }
          : undefined,
      homeForm: [],
      awayForm: []
    }));

    if (apiLive.length) {
      return {
        data: updateLastLiveMatches(apiLive),
        source: "live"
      };
    }

    const inferredLive = activeOfficialMatches();
    return {
      data: inferredLive,
      source: inferredLive.length ? "live" : "none",
      error: inferredLive.length ? undefined : footballDataError || "No live matches returned"
    };
  } catch (error) {
    const inferredLive = activeOfficialMatches();
    if (inferredLive.length) {
      return {
        data: inferredLive,
        source: "live"
      };
    }

    return {
      data: [],
      source: "none",
      error: footballDataError || (error instanceof Error ? error.message : "Unknown error")
    };
  }
}

export async function getStats(): Promise<ApiPayload<TournamentStats | null>> {
  let payload: { matches: FootballDataMatch[] };
  try {
    payload = await footballFetch<{ matches: FootballDataMatch[] }>("/competitions/WC/matches?season=2026");
  } catch (error) {
    return { data: null, source: "none", error: error instanceof Error ? error.message : "Unknown error" };
  }

  const matches = payload.matches.map((match) => {
    const home = match.score?.fullTime?.home;
    const away = match.score?.fullTime?.away;
    return enrichMatchWithOfficial({
      id: String(match.id),
      date: match.utcDate,
      status: mapFootballDataStatus(match.status),
      minute: match.minute ?? undefined,
      group: mapGroup(match.group),
      stage: mapStage(match.stage),
      venue: match.venue || "Venue TBD",
      city: match.venue || "Host City TBD",
      homeTeam: mapTeam(match.homeTeam),
      awayTeam: mapTeam(match.awayTeam),
      score: typeof home === "number" && typeof away === "number" ? { home, away } : undefined,
      homeForm: [],
      awayForm: []
    } satisfies Match);
  });
  const playedMatches = matches.filter((match) => match.status === "FINISHED" || match.status === "LIVE");
  const goals = matches.reduce((total, match) => total + (match.score ? match.score.home + match.score.away : 0), 0);
  let topScorer: string | null = null;

  try {
    const scorersPayload = await footballFetch<{ scorers: FootballDataScorer[] }>("/competitions/WC/scorers?season=2026");
    const scorer = scorersPayload.scorers[0];
    if (scorer?.player?.name && typeof scorer.goals === "number") {
      topScorer = `${scorer.player.name} ⚽ ${scorer.goals}`;
    }
  } catch {
    topScorer = null;
  }

  return {
    data: {
      goalsScored: goals,
      matchesPlayed: playedMatches.length,
      totalMatches: matches.length,
      topScorer,
      aiAccuracy: "No data"
    },
    source: matches.length ? "live" : "none",
    error: matches.length ? undefined : "No match data returned"
  };
}
