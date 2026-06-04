import { EmptyState, ErrorState, SkeletonRows } from "@/components/StateViews";
import type { Team } from "@/types";

export default function KnockoutBracket({
  teams,
  loading,
  error,
  onRetry
}: {
  teams: Team[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <section className="card">
      <div className="card-head">
        <span className="card-title">Knockout Bracket</span>
        <span className="card-sub">AI projected · updates after each result</span>
      </div>
      {loading ? <SkeletonRows count={4} /> : null}
      {!loading && error && teams.length === 0 ? <ErrorState label="bracket data" onRetry={onRetry} /> : null}
      {!loading && teams.length === 0 ? <EmptyState>No data for projected bracket</EmptyState> : null}
      {!loading && teams.length > 0 ? (
        <div className="bracket">
          <div className="bracket-section">Round of 16 - Projected</div>
          {teams.map((team) => (
            <div className="b-row" key={team.id}>
              <div className="b-slot">
                <span>{team.flag}</span> {team.shortName}
              </div>
              <div className="b-arrow">→</div>
              <div className="b-slot tbd">Winner TBD</div>
              <div className="b-arrow">→</div>
              <div className="b-slot tbd">QF TBD</div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
