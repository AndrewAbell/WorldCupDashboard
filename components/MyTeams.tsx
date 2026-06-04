"use client";

import { useEffect, useMemo, useState } from "react";
import { formatShortDate } from "@/lib/date";
import { getFollowedTeams, setFollowedTeams } from "@/lib/localStorage";
import { teams } from "@/lib/appData";
import type { Match } from "@/types";

export default function MyTeams({ matches }: { matches: Match[] }) {
  const [followed, setFollowed] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    const stored = getFollowedTeams();
    if (stored.length) {
      setFollowed(stored);
    } else {
      const defaults = ["usa", "england"];
      setFollowed(defaults);
      setFollowedTeams(defaults);
    }
  }, []);

  const followedTeams = followed.map((id) => teams.find((team) => team.id === id)).filter(Boolean);
  const filteredTeams = useMemo(
    () =>
      teams.filter(
        (team) =>
          !followed.includes(team.id) &&
          (team.name.toLowerCase().includes(query.toLowerCase()) || team.shortName.toLowerCase().includes(query.toLowerCase()))
      ),
    [followed, query]
  );

  function nextMatchFor(teamId: string) {
    const next = matches
      .filter((match) => match.homeTeam.id === teamId || match.awayTeam.id === teamId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    if (!next) {
      return "Next match TBD";
    }
    const opponent = next.homeTeam.id === teamId ? next.awayTeam.shortName : next.homeTeam.shortName;
    return `vs ${opponent} · ${formatShortDate(next.date)}`;
  }

  function addTeam(teamId: string) {
    if (followed.length >= 8) {
      setWarning("Maximum 8 followed teams");
      return;
    }
    const next = [...followed, teamId];
    setFollowed(next);
    setFollowedTeams(next);
    setQuery("");
    setOpen(false);
    setWarning("");
  }

  function removeTeam(teamId: string) {
    const next = followed.filter((id) => id !== teamId);
    setFollowed(next);
    setFollowedTeams(next);
    setWarning("");
  }

  return (
    <section className="my-teams" aria-label="My teams">
      <span className="section-title">My Teams</span>
      <div className="teams-scroll">
        {followedTeams.map((team, index) =>
          team ? (
            <div className={`team-card ${index === 0 ? "active" : ""}`} key={team.id}>
              <span className="flag">{team.flag}</span>
              <div className="team-info">
                <div className="name">{team.shortName}</div>
                <div className="next">{nextMatchFor(team.id)}</div>
              </div>
              <button className="pill-x" type="button" onClick={() => removeTeam(team.id)} aria-label={`Remove ${team.name}`}>
                ×
              </button>
            </div>
          ) : null
        )}
        <button className="add-btn" type="button" onClick={() => setOpen((value) => !value)}>
          + Follow a team
        </button>
      </div>
      {open ? (
        <div className="team-search">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search teams"
            aria-label="Search teams"
          />
          <div className="team-options">
            {filteredTeams.slice(0, 6).map((team) => (
              <button key={team.id} type="button" onClick={() => addTeam(team.id)}>
                <span>{team.flag}</span>
                {team.name}
              </button>
            ))}
          </div>
          {warning ? <div className="warning">{warning}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
