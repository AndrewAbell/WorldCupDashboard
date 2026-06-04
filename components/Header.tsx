"use client";

import { useEffect, useState } from "react";
import { TOURNAMENT_START_ISO } from "@/lib/appData";

function getCountdown() {
  const diff = new Date(TOURNAMENT_START_ISO).getTime() - Date.now();
  if (diff <= 0) {
    return "LIVE NOW";
  }
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  return `${days}d ${hours}h`;
}

export default function Header({ liveCount }: { liveCount: number }) {
  const [countdown, setCountdown] = useState(getCountdown);

  useEffect(() => {
    const interval = window.setInterval(() => setCountdown(getCountdown()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <div className="trophy" aria-hidden="true">
          🏆
        </div>
        <div className="header-text">
          <h1>World Cup 2026</h1>
          <p>USA · Canada · Mexico &nbsp;·&nbsp; June 11 - July 19</p>
        </div>
      </div>
      <div className="header-right">
        <div className="badge badge-live">
          <div className="live-dot" />
          {liveCount} Match{liveCount === 1 ? "" : "es"} Live
        </div>
        <div className="badge badge-stage">Group Stage</div>
        <div className="countdown-pill">
          Starts in <span className="countdown-num">{countdown}</span>
        </div>
      </div>
    </header>
  );
}
