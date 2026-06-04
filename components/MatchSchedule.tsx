import { EmptyState, ErrorState, SkeletonRows } from "@/components/StateViews";
import { formatMatchDate } from "@/lib/date";
import { isNashvilleVenue } from "@/lib/venue";
import type { Match } from "@/types";

export default function MatchSchedule({
  matches,
  loading,
  error,
  onRetry
}: {
  matches: Match[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const upcoming = matches
    .filter((match) => match.status === "SCHEDULED")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  return (
    <section className="card">
      <div className="card-head">
        <span className="card-title">Upcoming Matches</span>
        <span className="card-sub">Next fixtures</span>
      </div>
      {loading ? <SkeletonRows /> : null}
      {!loading && error && upcoming.length === 0 ? <ErrorState label="matches" onRetry={onRetry} /> : null}
      {!loading && upcoming.length === 0 ? <EmptyState>No scheduled fixture data</EmptyState> : null}
      {!loading && upcoming.length > 0 ? (
        <div className="schedule">
          {upcoming.map((match) => {
            const nashville = isNashvilleVenue(match.venue) || isNashvilleVenue(match.city);
            return (
              <div className={`match-row ${nashville ? "featured" : ""}`} key={match.id}>
                <div className="mr-time">
                  {formatMatchDate(match.date)
                    .split("\n")
                    .map((part) => (
                      <span key={part}>
                        {part}
                        <br />
                      </span>
                    ))}
                </div>
                <div className="mr-teams">
                  <span className="mr-team-name">{match.homeTeam.shortName}</span>
                  <span className="mr-vs">vs</span>
                  <span className="mr-team-name">{match.awayTeam.shortName}</span>
                </div>
                <div className="mr-right">
                  <div className="mr-venue">{match.city}</div>
                  {nashville ? <div className="mr-tag">★ Your City</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
