"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/StateViews";
import {
  buildOfficialBracketRounds,
  countGroupPositionPicks,
  getChampion,
  scoreBracket,
  thirdPlaceTeam,
  type BracketMatch,
  type GroupLetter,
  type GroupPosition,
  type GroupPositionPicks,
  type KnockoutPicks,
  type SavedBracket
} from "@/lib/bracket";
import { getUserBrackets, saveUserBracket } from "@/lib/localStorage";
import type { GroupStanding, Match, Team } from "@/types";

type BuilderStep = "name" | "groups" | "thirds" | "knockout";

const GROUPS: GroupLetter[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
const POSITIONS: Array<{ key: GroupPosition; label: string }> = [
  { key: "first", label: "1st" },
  { key: "second", label: "2nd" },
  { key: "third", label: "3rd" }
];

function groupName(letter: GroupLetter): string {
  return `Group ${letter}`;
}

function safeName(name: string): string {
  return name.trim().slice(0, 40);
}

export default function KnockoutBracket({
  standings,
  matches,
  loading,
  error,
  onRetry
}: {
  standings: GroupStanding[];
  matches: Match[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<BuilderStep>("name");
  const [nameInput, setNameInput] = useState("");
  const [builderName, setBuilderName] = useState("");
  const [groupPicks, setGroupPicks] = useState<GroupPositionPicks>({});
  const [thirdQualifiers, setThirdQualifiers] = useState<GroupLetter[]>([]);
  const [knockoutPicks, setKnockoutPicks] = useState<KnockoutPicks>({});
  const [animatedPick, setAnimatedPick] = useState("");
  const [savedBrackets, setSavedBrackets] = useState<SavedBracket[]>([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

  useEffect(() => {
    setSavedBrackets(getUserBrackets());
  }, []);

  const totalGroupPicks = standings.length * 3;
  const groupPickCount = countGroupPositionPicks(standings, groupPicks);
  const groupsComplete = standings.length > 0 && groupPickCount === totalGroupPicks;
  const currentGroup = standings[currentGroupIndex] ?? standings[0];
  const currentGroupPicks = currentGroup ? groupPicks[currentGroup.group] ?? {} : {};
  const currentGroupComplete = Boolean(currentGroupPicks.first && currentGroupPicks.second && currentGroupPicks.third);
  const bracketRounds = useMemo(
    () => buildOfficialBracketRounds(standings, groupPicks, thirdQualifiers, knockoutPicks),
    [groupPicks, knockoutPicks, standings, thirdQualifiers]
  );
  const champion = getChampion(standings, knockoutPicks);
  const leaderboard = useMemo(
    () =>
      savedBrackets
        .map((bracket) => scoreBracket(bracket, standings, matches))
        .sort((a, b) => b.correct - a.correct || b.possible - a.possible || b.bracket.createdAt - a.bracket.createdAt)
        .slice(0, 10),
    [matches, savedBrackets, standings]
  );

  function openModal() {
    setModalOpen(true);
    setStep(builderName ? "groups" : "name");
    setSaveMessage("");
  }

  function closeModal() {
    setModalOpen(false);
    setSaveMessage("");
  }

  function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = safeName(nameInput);
    if (!cleanName) {
      return;
    }
    setBuilderName(cleanName);
    setStep("groups");
  }

  function selectGroupTeam(group: string, position: GroupPosition, team: Team) {
    setGroupPicks((current) => {
      const nextGroup = { ...(current[group] ?? {}) };
      POSITIONS.forEach(({ key }) => {
        if (nextGroup[key] === team.id) {
          delete nextGroup[key];
        }
      });
      nextGroup[position] = team.id;
      return { ...current, [group]: nextGroup };
    });
    setThirdQualifiers([]);
    setKnockoutPicks({});
    setAnimatedPick(`${group}-${position}-${team.id}`);
  }

  function toggleThirdQualifier(group: GroupLetter) {
    setThirdQualifiers((current) => {
      const exists = current.includes(group);
      if (exists) {
        return current.filter((item) => item !== group);
      }
      if (current.length >= 8) {
        return current;
      }
      return [...current, group].sort();
    });
    setKnockoutPicks({});
    setAnimatedPick(`third-${group}`);
  }

  function selectKnockoutWinner(match: BracketMatch, team: Team) {
    setKnockoutPicks((current) => ({ ...current, [match.id]: team.id }));
    setAnimatedPick(`${match.id}-${team.id}`);
  }

  function saveBracket() {
    if (!builderName || !champion) {
      return;
    }
    const bracket: SavedBracket = {
      id: `${Date.now()}-${builderName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: builderName,
      createdAt: Date.now(),
      groupPicks,
      thirdQualifiers,
      knockoutPicks
    };
    saveUserBracket(bracket);
    setSavedBrackets(getUserBrackets());
    setSaveMessage("Bracket saved to leaderboard");
  }

  function resetBuilder() {
    setStep("name");
    setNameInput("");
    setBuilderName("");
    setGroupPicks({});
    setThirdQualifiers([]);
    setKnockoutPicks({});
    setAnimatedPick("");
    setSaveMessage("");
    setCurrentGroupIndex(0);
  }

  function goToNextGroup() {
    if (currentGroupIndex < standings.length - 1) {
      setCurrentGroupIndex((index) => index + 1);
      setAnimatedPick(`group-card-${currentGroupIndex + 1}`);
      return;
    }
    if (groupsComplete) {
      setStep("thirds");
    }
  }

  function goToPreviousGroup() {
    setCurrentGroupIndex((index) => Math.max(0, index - 1));
  }

  function teamButton(team: Team | undefined, label: string, selected: boolean, animated: boolean, onClick: () => void) {
    return (
      <button className={`bracket-team ${selected ? "selected" : ""} ${animated ? "picked" : ""}`} disabled={!team} onClick={onClick} type="button">
        {team ? (
          <>
            <span>{team.flag}</span>
            <span>{team.shortName}</span>
            {animated ? <span className="winner-burst" /> : null}
          </>
        ) : (
          <span>{label}</span>
        )}
      </button>
    );
  }

  return (
    <section className="card bracket-card">
      <div className="card-head">
        <span className="card-title">Bracket Challenge</span>
        <span className="card-sub">Official 2026 path</span>
      </div>
      {loading ? <SkeletonRows count={4} /> : null}
      {!loading && error && standings.length === 0 ? <ErrorState label="bracket data" onRetry={onRetry} /> : null}
      {!loading && standings.length === 0 ? <EmptyState>No data for bracket builder</EmptyState> : null}
      {!loading && standings.length > 0 ? (
        <>
          <div className="bracket-empty">
            <button className="bracket-create" onClick={openModal} type="button">
              Create a bracket
            </button>
          </div>
          <div className="leaderboard">
            <div className="bracket-section">Top 10 closest brackets</div>
            {leaderboard.length ? (
              leaderboard.map((row, index) => (
                <div className="leader-row" key={row.bracket.id}>
                  <span>{index + 1}. {row.bracket.name}</span>
                  <strong>{row.correct} correct</strong>
                </div>
              ))
            ) : (
              <div className="state-box muted">No saved brackets yet</div>
            )}
          </div>
        </>
      ) : null}
      {modalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div aria-modal="true" className="bracket-modal" role="dialog">
            <div className="modal-head">
              <div>
                <div className="card-title">Create Bracket</div>
                <div className="card-sub">Pick group finishers, best thirds, and every knockout winner</div>
              </div>
              <button aria-label="Close bracket builder" className="modal-close" onClick={closeModal} type="button">×</button>
            </div>
            {step === "name" ? (
              <form className="bracket-form" onSubmit={submitName}>
                <label htmlFor="bracket-name">Name</label>
                <div className="bracket-form-row">
                  <input id="bracket-name" maxLength={40} onChange={(event) => setNameInput(event.target.value)} placeholder="Enter your name" value={nameInput} />
                  <button disabled={!nameInput.trim()} type="submit">Start</button>
                </div>
              </form>
            ) : null}
            {step !== "name" ? (
              <div className="bracket-builder">
                <div className="bracket-progress">
                  <span>{builderName}'s bracket</span>
                  <div className="bracket-actions">
                    <button onClick={resetBuilder} type="button">Reset</button>
                    <button onClick={saveBracket} disabled={!champion} type="button">Save</button>
                  </div>
                </div>
                <div className="bracket-steps">
                  <button className={step === "groups" ? "selected" : ""} onClick={() => setStep("groups")} type="button">Groups</button>
                  <button className={step === "thirds" ? "selected" : ""} disabled={!groupsComplete} onClick={() => setStep("thirds")} type="button">Best thirds</button>
                  <button className={step === "knockout" ? "selected" : ""} disabled={thirdQualifiers.length !== 8} onClick={() => setStep("knockout")} type="button">Knockout</button>
                </div>
                {step === "groups" ? (
                  <>
                    <div className="bracket-progress">
                      <span>Group {currentGroupIndex + 1} of {standings.length}</span>
                      <span>{groupPickCount}/{totalGroupPicks} picks</span>
                    </div>
                    {currentGroup ? (
                      <div className={`group-step-card ${animatedPick === `group-card-${currentGroupIndex}` ? "slide-in" : ""}`}>
                        <div className="group-step-head">
                          <div>
                            <div className="group-step-eyebrow">Group stage</div>
                            <div className="group-step-title">{currentGroup.group}</div>
                          </div>
                          <div className="group-step-meter">
                            {POSITIONS.map(({ key }) => (
                              <span className={currentGroupPicks[key] ? "filled" : ""} key={key} />
                            ))}
                          </div>
                        </div>
                        <div className="group-step-slots">
                          {POSITIONS.map(({ key, label }) => (
                            <div className="position-row guided" key={key}>
                              <span>{label}</span>
                              <div className="position-options">
                                {currentGroup.teams.map((row) =>
                                  teamButton(
                                    row.team,
                                    row.team.shortName,
                                    currentGroupPicks[key] === row.team.id,
                                    animatedPick === `${currentGroup.group}-${key}-${row.team.id}`,
                                    () => selectGroupTeam(currentGroup.group, key, row.team)
                                  )
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="group-step-nav">
                          <button className="bracket-next secondary" disabled={currentGroupIndex === 0} onClick={goToPreviousGroup} type="button">Previous group</button>
                          <button className="bracket-next" disabled={currentGroupIndex === standings.length - 1 ? !groupsComplete : !currentGroupComplete} onClick={goToNextGroup} type="button">
                            {currentGroupIndex === standings.length - 1 ? "Choose best thirds" : "Next group"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
                {step === "thirds" ? (
                  <>
                    <div className="bracket-progress"><span>Best third-place teams: {thirdQualifiers.length}/8</span></div>
                    <div className="third-grid">
                      {GROUPS.map((group) => {
                        const team = thirdPlaceTeam(standings, groupPicks, group);
                        const selected = thirdQualifiers.includes(group);
                        return teamButton(team, `Group ${group} third`, selected, animatedPick === `third-${group}`, () => toggleThirdQualifier(group));
                      })}
                    </div>
                    <button className="bracket-next" disabled={thirdQualifiers.length !== 8} onClick={() => setStep("knockout")} type="button">Build official knockout bracket</button>
                  </>
                ) : null}
                {step === "knockout" ? (
                  <div className="user-bracket">
                    {bracketRounds.map((round) => (
                      <div className="bracket-round official" key={round.id}>
                        <div className="bracket-section">{round.title}</div>
                        {round.matches.map((match) => (
                          <div className="bracket-match" key={match.id}>
                            <div className="bracket-match-label">{match.label}</div>
                            <div className="bracket-match-teams">
                              {teamButton(match.home.team, match.home.placeholder, knockoutPicks[match.id] === match.home.team?.id, animatedPick === `${match.id}-${match.home.team?.id}`, () => match.home.team && selectKnockoutWinner(match, match.home.team))}
                              {teamButton(match.away.team, match.away.placeholder, knockoutPicks[match.id] === match.away.team?.id, animatedPick === `${match.id}-${match.away.team?.id}`, () => match.away.team && selectKnockoutWinner(match, match.away.team))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                    {champion ? (
                      <div className={`champion-card ${animatedPick === `M104-${champion.id}` ? "picked" : ""}`}>
                        <span>Champion</span>
                        <strong>{champion.flag} {champion.shortName}</strong>
                      </div>
                    ) : null}
                    {saveMessage ? <div className="state-box muted">{saveMessage}</div> : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
