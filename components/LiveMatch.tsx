import { EmptyState, ErrorState, SkeletonRows } from "@/components/StateViews";
import type { Match } from "@/types";

export default function LiveMatch({
  match,
  loading,
  error,
  onRetry
}: {
  match: Match | null;
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
    return <ErrorState label="scores" onRetry={onRetry} />;
  }

  if (!match) {
    return <EmptyState>No match is live right now</EmptyState>;
  }

  return (
    <section className="live-match">
      <div className="lm-teams">
        <div className="lm-team">
          <div className="lm-flag">{match.homeTeam.flag}</div>
          <div className="lm-name">{match.homeTeam.shortName}</div>
        </div>
        <div className="lm-score-wrap">
          <div className="lm-score">
            {match.score?.home ?? 0} - {match.score?.away ?? 0}
          </div>
          <div className="lm-min">
            <div className="live-dot" />
            {match.minute ?? 0}' · LIVE
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
        <div className="lm-ai">🤖 AI called {match.homeTeam.shortName} - still on track</div>
      </div>
    </section>
  );
}
