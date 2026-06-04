"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/StateViews";
import { getPredictionFromCache, savePredictionToCache } from "@/lib/localStorage";
import type { Match, PredictResponse, PredictionResult } from "@/types";

function formatRetry(seconds: number) {
  return `${Math.max(1, Math.ceil(seconds / 60))} min`;
}

function PredictorContent({ match }: { match: Match }) {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [remaining, setRemaining] = useState(5);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setPrediction(getPredictionFromCache(match.id));
    setMessage("");
    setRetryAfter(null);
  }, [match.id]);

  const labels = useMemo(
    () =>
      prediction
        ? [
            { label: match.homeTeam.shortName, value: prediction.homeWin, color: "var(--blue)" },
            { label: "Draw", value: prediction.draw, color: "var(--text3)" },
            { label: match.awayTeam.shortName, value: prediction.awayWin, color: "var(--gold)" }
          ]
        : [],
    [match.awayTeam.shortName, match.homeTeam.shortName, prediction]
  );

  async function predict() {
    const cached = getPredictionFromCache(match.id);
    if (cached) {
      setPrediction(cached);
      setMessage("Using cached prediction");
      return;
    }

    setLoading(true);
    setMessage("");
    setRetryAfter(null);
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          homeForm: match.homeForm,
          awayForm: match.awayForm,
          group: match.group,
          stage: match.stage
        })
      });

      if (response.status === 429) {
        const limited = (await response.json()) as { retryAfter: number; remaining: number };
        setRemaining(limited.remaining);
        setRetryAfter(limited.retryAfter);
        setMessage(`5 free predictions per hour · Resets in ${formatRetry(limited.retryAfter)}`);
        return;
      }

      const payload = (await response.json()) as PredictResponse;
      setRemaining(payload.remaining);

      if (!response.ok || !payload.prediction) {
        setPrediction(null);
        setMessage("No prediction data from model");
        return;
      }

      setPrediction(payload.prediction);
      setMessage("Fresh prediction ready");
      savePredictionToCache(match.id, payload.prediction);
    } catch {
      setPrediction(null);
      setMessage("No prediction data from model");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <span className="card-title">AI Match Predictor</span>
        <span className="card-sub">{remaining} left</span>
      </div>
      <div className="predictor">
        <div className="pred-teams">
          <div className="pred-team">
            <div className="pred-flag">{match.homeTeam.flag}</div>
            <div className="pred-name">{match.homeTeam.shortName}</div>
          </div>
          <div className="pred-vs">VS</div>
          <div className="pred-team">
            <div className="pred-flag">{match.awayTeam.flag}</div>
            <div className="pred-name">{match.awayTeam.shortName}</div>
          </div>
        </div>
        {prediction ? (
          <>
            <div className="bars">
              {labels.map((item) => (
                <div className="bar-row" key={item.label}>
                  <div className="bar-label">{item.label}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${item.value}%`, background: item.color }} />
                  </div>
                  <div className="bar-val">{item.value}%</div>
                </div>
              ))}
            </div>
            <div className="reasoning">
              <div className="reasoning-label">Why</div>
              <div className="reasoning-text">{prediction.reasoning}</div>
            </div>
          </>
        ) : (
          <EmptyState>No prediction data</EmptyState>
        )}
        {message ? <div className={`pred-message ${retryAfter ? "limited" : ""}`}>{message}</div> : null}
        <button className="pred-btn" type="button" onClick={predict} disabled={loading || Boolean(retryAfter)}>
          {loading ? "Thinking..." : "↻ New Prediction"}
        </button>
      </div>
    </section>
  );
}

export default function AiPredictor({ match }: { match: Match | null }) {
  if (!match) {
    return (
      <section className="card">
        <div className="card-head">
          <span className="card-title">AI Match Predictor</span>
          <span className="card-sub">No data</span>
        </div>
        <EmptyState>No match data available for predictions</EmptyState>
      </section>
    );
  }

  return <PredictorContent match={match} />;
}
