import { EmptyState, ErrorState, SkeletonRows } from "@/components/StateViews";
import type { TournamentStats } from "@/types";

export default function TournamentStatsCard({
  stats,
  loading,
  error,
  onRetry
}: {
  stats: TournamentStats | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <section className="card">
      <div className="card-head">
        <span className="card-title">Tournament Stats</span>
        <span className="card-sub">Live</span>
      </div>
      {loading ? <SkeletonRows count={4} /> : null}
      {!loading && error && !stats ? <ErrorState label="stats" onRetry={onRetry} /> : null}
      {!loading && !stats ? <EmptyState>No tournament stats data</EmptyState> : null}
      {!loading && stats ? (
        <div className="stats">
          <div className="stat-row">
            <span className="stat-label">Goals Scored</span>
            <span className="stat-val gold">{stats.goalsScored}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Matches Played</span>
            <span className="stat-val">
              {stats.matchesPlayed} of {stats.totalMatches}
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Top Scorer</span>
            <span className="stat-val">{stats.topScorer ?? "No data"}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">AI Accuracy</span>
            <span className="stat-val good">{stats.aiAccuracy}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
