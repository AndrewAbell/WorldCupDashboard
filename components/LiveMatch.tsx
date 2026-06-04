import { EmptyState, ErrorState, SkeletonRows } from "@/components/StateViews";
import { formatMatchDate } from "@/lib/date";
import type { Match } from "@/types";

export default function LiveMatch({
  match,
  mode,
  loading,
  error,
  onRetry
}: {
  match: Match | null;
  mode: "live" | "upcoming";
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <section className="live-match">
        <SkeletonRows count={2} />
      </section>
    );
  }

  if (error && !match) {
    return <ErrorState label="match data" onRetry={onRetry} />;
  }

  if (!match) {
    return <EmptyState>No live or upcoming match data</EmptyState>;
  }

  const isLive = mode === "live";
  const kickoff = formatMatchDate(match.date).replace("\n", " ");

  return (
    <section className="live-match">
      <div className="lm-teams">
        <div className="lm-team">
          <div className="lm-flag">{match.homeTeam.flag}</div>
          <div className="lm-name">{match.homeTeam.shortName}</div>
        </div>
        <div className="lm-score-wrap">
          <div className={isLive ? "lm-score" : "lm-kickoff"}>
            {isLive ? `${match.score?.home ?? 0} - ${match.score?.away ?? 0}` : kickoff}
          </div>
          <div className="lm-min">
            {isLive ? <div className="live-dot" /> : null}
            {isLive ? `${match.minute ?? 0}' · LIVE` : "Next match"}
          </div>
        </div>
        <div className="lm-team">
          <div className="lm-flag">{match.awayTeam.flag}</div>
          <div className="lm-name">{match.awayTeam.shortName}</div>
        </div>
      </div>
      <div className="lm-right">
        <div className="lm-venue">
          {match.group} · {match.venue} · {match.city}
        </div>
        <div className="lm-ai">
          {isLive ? `AI called ${match.homeTeam.shortName} - still on track` : `${match.homeTeam.shortName} vs ${match.awayTeam.shortName}`}
        </div>
      </div>
    </section>
  );
}
