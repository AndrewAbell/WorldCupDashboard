"use client";

import { FormEvent, useMemo, useState } from "react";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/StateViews";
import {
  areGroupWinnerPicksComplete,
  buildUserBracketRounds,
  countGroupWinnerPicks,
  getChampion,
  type BracketMatch,
  type GroupWinnerPicks,
  type KnockoutPicks
} from "@/lib/bracket";
import type { GroupStanding, Team } from "@/types";

type BuilderStep = "idle" | "name" | "picks";

function trimPicksForRound(picks: KnockoutPicks, matchId: string): KnockoutPicks {
  if (matchId.startsWith("play-in-")) {
    return Object.fromEntries(Object.entries(picks).filter(([id]) => id.startsWith("play-in-")));
  }
  if (matchId.startsWith("quarter-")) {
    return Object.fromEntries(Object.entries(picks).filter(([id]) => id.startsWith("play-in-") || id.startsWith("quarter-")));
  }
  if (matchId.startsWith("semi-")) {
    return Object.fromEntries(Object.entries(picks).filter(([id]) => id !== "final"));
  }
  return picks;
}

export default function KnockoutBracket({
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
  const [step, setStep] = useState<BuilderStep>("idle");
  const [nameInput, setNameInput] = useState("");
  const [builderName, setBuilderName] = useState("");
  const [groupPicks, setGroupPicks] = useState<GroupWinnerPicks>({});
  const [knockoutPicks, setKnockoutPicks] = useState<KnockoutPicks>({});
  const [animatedPick, setAnimatedPick] = useState("");

  const completeGroupPicks = areGroupWinnerPicksComplete(standings, groupPicks);
  const groupPickCount = countGroupWinnerPicks(standings, groupPicks);
  const bracketRounds = useMemo(() => buildUserBracketRounds(standings, groupPicks, knockoutPicks), [groupPicks, knockoutPicks, standings]);
  const champion = getChampion(standings, knockoutPicks);

  function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = nameInput.trim();
    if (!cleanName) {
      return;
    }
    setBuilderName(cleanName);
    setStep("picks");
  }

  function selectGroupWinner(group: string, team: Team) {
    setGroupPicks((current) => ({ ...current, [group]: team.id }));
    setKnockoutPicks({});
    setAnimatedPick(`group-${group}-${team.id}`);
  }

  function selectKnockoutWinner(match: BracketMatch, team: Team) {
    setKnockoutPicks((current) => ({ ...trimPicksForRound(current, match.id), [match.id]: team.id }));
    setAnimatedPick(`${match.id}-${team.id}`);
  }

  function resetBracket() {
    setStep("name");
    setNameInput(builderName);
    setBuilderName("");
    setGroupPicks({});
    setKnockoutPicks({});
    setAnimatedPick("");
  }

  function renderTeamButton({
    itemKey,
    team,
    placeholder,
    selected,
    animated,
    onClick
  }: {
    itemKey?: string;
    team?: Team;
    placeholder: string;
    selected: boolean;
    animated: boolean;
    onClick: () => void;
  }) {
    return (
      <button
        className={`bracket-team ${selected ? "selected" : ""} ${animated ? "picked" : ""}`}
        disabled={!team}
        key={itemKey}
        onClick={onClick}
        type="button"
      >
        {team ? (
          <>
            <span>{team.flag}</span>
            <span>{team.shortName}</span>
          </>
        ) : (
          <span>{placeholder}</span>
        )}
      </button>
    );
  }

  return (
    <section className="card bracket-card">
      <div className="card-head">
        <span className="card-title">Your Bracket</span>
        <span className="card-sub">{builderName ? `${builderName}'s picks` : "Group winners to final"}</span>
      </div>
      {loading ? <SkeletonRows count={4} /> : null}
      {!loading && error && standings.length === 0 ? <ErrorState label="bracket data" onRetry={onRetry} /> : null}
      {!loading && standings.length === 0 ? <EmptyState>No data for bracket builder</EmptyState> : null}
      {!loading && standings.length > 0 && step === "idle" ? (
        <div className="bracket-empty">
          <button className="bracket-create" onClick={() => setStep("name")} type="button">
            Create a bracket
          </button>
        </div>
      ) : null}
      {!loading && standings.length > 0 && step === "name" ? (
        <form className="bracket-form" onSubmit={submitName}>
          <label htmlFor="bracket-name">Name</label>
          <div className="bracket-form-row">
            <input
              id="bracket-name"
              maxLength={40}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="Enter your name"
              value={nameInput}
            />
            <button disabled={!nameInput.trim()} type="submit">
              Start
            </button>
          </div>
        </form>
      ) : null}
      {!loading && standings.length > 0 && step === "picks" ? (
        <div className="bracket-builder">
          <div className="bracket-progress">
            <span>
              Group winners: {groupPickCount}/{standings.length}
            </span>
            <button onClick={resetBracket} type="button">
              Reset
            </button>
          </div>
          <div className="group-pick-grid">
            {standings.map((group) => (
              <div className="group-pick" key={group.group}>
                <div className="group-pick-title">{group.group}</div>
                <div className="group-pick-options">
                  {group.teams.map((row) =>
                    renderTeamButton({
                      itemKey: `${group.group}-${row.team.id}`,
                      team: row.team,
                      placeholder: "TBD",
                      selected: groupPicks[group.group] === row.team.id,
                      animated: animatedPick === `group-${group.group}-${row.team.id}`,
                      onClick: () => selectGroupWinner(group.group, row.team)
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
          {completeGroupPicks ? (
            <div className="user-bracket">
              {bracketRounds.map((round) => (
                <div className="bracket-round" key={round.id}>
                  <div className="bracket-section">{round.title}</div>
                  {round.matches.map((match) => (
                    <div className="bracket-match" key={match.id}>
                      <div className="bracket-match-label">{match.label}</div>
                      <div className="bracket-match-teams">
                        {renderTeamButton({
                          team: match.home.team,
                          placeholder: match.home.placeholder,
                          selected: knockoutPicks[match.id] === match.home.team?.id,
                          animated: animatedPick === `${match.id}-${match.home.team?.id}`,
                          onClick: () => match.home.team && selectKnockoutWinner(match, match.home.team)
                        })}
                        {renderTeamButton({
                          team: match.away.team,
                          placeholder: match.away.placeholder,
                          selected: knockoutPicks[match.id] === match.away.team?.id,
                          animated: animatedPick === `${match.id}-${match.away.team?.id}`,
                          onClick: () => match.away.team && selectKnockoutWinner(match, match.away.team)
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {champion ? (
                <div className={`champion-card ${animatedPick === `final-${champion.id}` ? "picked" : ""}`}>
                  <span>Champion</span>
                  <strong>
                    {champion.flag} {champion.shortName}
                  </strong>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="state-box muted">Pick one winner from every group to unlock knockout picks</div>
          )}
        </div>
      ) : null}
    </section>
  );
}
