export type Team = {
  id: string;
  name: string;
  shortName: string;
  flag: string;
};

export type TeamStanding = {
  position: number;
  team: Team;
  played: number;
  won: number;
  goalDifference: number;
  points: number;
  form: Array<"W" | "D" | "L">;
  qualifies: boolean;
};

export type GroupStanding = {
  group: string;
  playedLabel: string;
  teams: TeamStanding[];
};

export type MatchStatus = "SCHEDULED" | "LIVE" | "IN_PLAY" | "PAUSED" | "FINISHED";

export type Match = {
  id: string;
  date: string;
  status: MatchStatus;
  minute?: number;
  group: string;
  stage: string;
  venue: string;
  city: string;
  homeTeam: Team;
  awayTeam: Team;
  score?: {
    home: number;
    away: number;
  };
  homeForm: Array<"W" | "D" | "L">;
  awayForm: Array<"W" | "D" | "L">;
};

export type PredictionResult = {
  homeWin: number;
  draw: number;
  awayWin: number;
  reasoning: string;
  cachedAt?: number;
  source?: "huggingface" | "cache";
};

export type PredictRequest = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeForm: string[];
  awayForm: string[];
  group: string;
  stage: string;
};

export type PredictResponse = {
  prediction: PredictionResult | null;
  remaining: number;
  retryAfter?: number;
  error?: string;
};

export type TournamentStats = {
  goalsScored: number;
  matchesPlayed: number;
  totalMatches: number;
  topScorer: string | null;
  aiAccuracy: string;
};

export type ApiPayload<T> = {
  data: T;
  source: "live" | "official" | "none";
  error?: string;
};
