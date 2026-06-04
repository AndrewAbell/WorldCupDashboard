"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AiPredictor from "@/components/AiPredictor";
import GroupStandings from "@/components/GroupStandings";
import Header from "@/components/Header";
import KnockoutBracket from "@/components/KnockoutBracket";
import LiveMatch from "@/components/LiveMatch";
import MatchSchedule from "@/components/MatchSchedule";
import MyTeams from "@/components/MyTeams";
import TournamentStatsCard from "@/components/TournamentStats";
import type { ApiPayload, GroupStanding, Match, TournamentStats } from "@/types";

type LoadState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  source: "live" | "official" | "none";
};

const initialState: {
  matches: LoadState<Match[]>;
  scores: LoadState<Match[]>;
  standings: LoadState<GroupStanding[]>;
  stats: LoadState<TournamentStats | null>;
} = {
  matches: { data: [], loading: true, error: null, source: "none" },
  scores: {
    data: [],
    loading: true,
    error: null,
    source: "none"
  },
  standings: { data: [], loading: true, error: null, source: "none" },
  stats: { data: null, loading: true, error: null, source: "none" }
};

async function fetchPayload<T>(path: string): Promise<ApiPayload<T>> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return response.json() as Promise<ApiPayload<T>>;
}

export default function Dashboard() {
  const [matches, setMatches] = useState(initialState.matches);
  const [scores, setScores] = useState(initialState.scores);
  const [standings, setStandings] = useState(initialState.standings);
  const [stats, setStats] = useState(initialState.stats);

  const loadAll = useCallback(async () => {
    setMatches((state) => ({ ...state, loading: true, error: null }));
    setScores((state) => ({ ...state, loading: true, error: null }));
    setStandings((state) => ({ ...state, loading: true, error: null }));
    setStats((state) => ({ ...state, loading: true, error: null }));

    const [matchResult, scoreResult, standingResult, statResult] = await Promise.allSettled([
      fetchPayload<Match[]>("/api/matches"),
      fetchPayload<Match[]>("/api/scores"),
      fetchPayload<GroupStanding[]>("/api/standings"),
      fetchPayload<TournamentStats | null>("/api/stats")
    ]);

    if (matchResult.status === "fulfilled") {
      setMatches({
        data: matchResult.value.data,
        source: matchResult.value.source,
        error: matchResult.value.error ?? null,
        loading: false
      });
    } else {
      setMatches({ ...initialState.matches, loading: false, error: matchResult.reason?.message ?? "Couldn't load matches" });
    }

    if (scoreResult.status === "fulfilled") {
      setScores({
        data: scoreResult.value.data,
        source: scoreResult.value.source,
        error: scoreResult.value.error ?? null,
        loading: false
      });
    } else {
      setScores({ ...initialState.scores, loading: false, error: scoreResult.reason?.message ?? "Couldn't load scores" });
    }

    if (standingResult.status === "fulfilled") {
      setStandings({
        data: standingResult.value.data,
        source: standingResult.value.source,
        error: standingResult.value.error ?? null,
        loading: false
      });
    } else {
      setStandings({
        ...initialState.standings,
        loading: false,
        error: standingResult.reason?.message ?? "Couldn't load standings"
      });
    }

    if (statResult.status === "fulfilled") {
      setStats({
        data: statResult.value.data,
        source: statResult.value.source,
        error: statResult.value.error ?? null,
        loading: false
      });
    } else {
      setStats({ ...initialState.stats, loading: false, error: statResult.reason?.message ?? "Couldn't load stats" });
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const nextUpcomingMatch = useMemo(
    () =>
      matches.data
        .filter((match) => match.status === "SCHEDULED")
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null,
    [matches.data]
  );
  const featuredMatch = scores.data[0] ?? nextUpcomingMatch;
  const featuredMatchMode = scores.data[0] ? "live" : "upcoming";
  const featuredMatchLoading = scores.loading || (!scores.data.length && matches.loading);
  const featuredMatchError = featuredMatch ? null : scores.error ?? matches.error;
  const predictorMatch = useMemo(() => matches.data.find((match) => match.id === "usa-mex-nashville") ?? matches.data[0] ?? null, [matches.data]);
  const bracketTeams = useMemo(
    () =>
      standings.data
        .flatMap((group) => group.teams.filter((team) => team.qualifies).map((team) => team.team))
        .slice(0, 4),
    [standings.data]
  );

  return (
    <main className="wrap">
      <Header liveCount={scores.data.length} />
      <MyTeams matches={matches.data} />
      <LiveMatch
        match={featuredMatch}
        mode={featuredMatchMode}
        loading={featuredMatchLoading}
        error={featuredMatchError}
        onRetry={loadAll}
      />
      <div className="grid3">
        <GroupStandings standings={standings.data} loading={standings.loading} error={standings.error} onRetry={loadAll} />
        <MatchSchedule matches={matches.data} loading={matches.loading} error={matches.error} onRetry={loadAll} />
        <AiPredictor match={predictorMatch} />
      </div>
      <div className="grid2">
        <KnockoutBracket teams={bracketTeams} loading={standings.loading} error={standings.error} onRetry={loadAll} />
        <TournamentStatsCard stats={stats.data} loading={stats.loading} error={stats.error} onRetry={loadAll} />
      </div>
    </main>
  );
}
