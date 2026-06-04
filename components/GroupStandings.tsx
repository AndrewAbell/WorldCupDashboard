"use client";

import { useState } from "react";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/StateViews";
import type { GroupStanding } from "@/types";

function formColor(form: "W" | "D" | "L") {
  if (form === "W") return "var(--green)";
  if (form === "D") return "var(--gold)";
  return "var(--red)";
}

export default function GroupStandings({
  standings,
  loading,
  error,
  onRetry
}: {
  standings: GroupStanding[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const group = standings[selected] ?? standings[0];

  return (
    <section className="card">
      <div className="card-head">
        <span className="card-title">{group?.group ?? "Group Standings"}</span>
        <span className="card-sub">{group?.playedLabel ?? "Live table"}</span>
      </div>
      {standings.length > 1 ? (
        <div className="group-tabs">
          {standings.map((item, index) => (
            <button className={index === selected ? "selected" : ""} key={item.group} type="button" onClick={() => setSelected(index)}>
              {item.group.replace("Group ", "")}
            </button>
          ))}
        </div>
      ) : null}
      {loading ? <SkeletonRows /> : null}
      {!loading && error && !group ? <ErrorState label="standings" onRetry={onRetry} /> : null}
      {!loading && !group ? <EmptyState>No standings available yet</EmptyState> : null}
      {!loading && group ? (
        <div className="standings">
          <div className="col-head">
            <span className="col-h team-col">Team</span>
            <span className="col-h stat-col">P</span>
            <span className="col-h stat-col">W</span>
            <span className="col-h gd-col">GD</span>
            <span className="col-h pts-col">Pts</span>
            <span className="col-h form-col">Form</span>
          </div>
          {group.teams.map((row) => (
            <div className="standing-row" key={row.team.id}>
              <span className="pos">{row.position}</span>
              <div className="qual-bar" style={{ background: row.qualifies ? "var(--green)" : "var(--border)" }} />
              <span className="s-flag">{row.team.flag}</span>
              <span className="s-name">{row.team.shortName}</span>
              <span className="s-stat">{row.played}</span>
              <span className="s-stat">{row.won}</span>
              <span className="s-stat">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</span>
              <span className="s-pts">{row.points}</span>
              <div className="s-form">
                {row.form.map((item, index) => (
                  <div className="fd" style={{ background: formColor(item) }} key={`${item}-${index}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
