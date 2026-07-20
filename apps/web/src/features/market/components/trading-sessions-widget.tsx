"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Badge, cn } from "@rmsm/ui";
import { getAllSessionStates, getOverlappingSessions, formatMinutes } from "../lib/trading-sessions";

export function TradingSessionsWidget() {
  // Recomputed every 60s from the client clock — see trading-sessions.ts
  // for why this is standard reference data rather than a live feed.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!now) {
    // Avoids an SSR/client mismatch — session open/closed state depends
    // on the visitor's own clock, which isn't known during SSR.
    return null;
  }

  const states = getAllSessionStates(now);
  const overlapping = getOverlappingSessions(now);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {now.toUTCString().slice(17, 25)} UTC
      </div>

      <ul className="space-y-2">
        {states.map(({ session, isOpen, minutesUntilChange }) => (
          <li key={session.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", isOpen ? "bg-success" : "bg-muted-foreground/30")} aria-hidden="true" />
              <span>{session.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {isOpen ? `closes in ${formatMinutes(minutesUntilChange)}` : `opens in ${formatMinutes(minutesUntilChange)}`}
            </span>
          </li>
        ))}
      </ul>

      {/* Visual timeline: a 24h UTC bar with each session's open window shaded. */}
      <div className="relative h-6 overflow-hidden rounded-md bg-muted">
        {states.map(({ session }) => {
          const startPct = (session.openUtcHour / 24) * 100;
          const endHour = session.closeUtcHour > session.openUtcHour ? session.closeUtcHour : session.closeUtcHour + 24;
          const widthPct = ((endHour - session.openUtcHour) / 24) * 100;
          return (
            <div
              key={session.name}
              className="absolute top-0 h-full bg-primary/25"
              style={{ left: `${startPct}%`, width: `${widthPct}%` }}
              title={`${session.name}: ${session.openUtcHour}:00–${session.closeUtcHour}:00 UTC`}
            />
          );
        })}
        <div
          className="absolute top-0 h-full w-px bg-foreground"
          style={{ left: `${((now.getUTCHours() + now.getUTCMinutes() / 60) / 24) * 100}%` }}
          aria-hidden="true"
        />
      </div>

      {overlapping.length > 1 && (
        <div className="flex items-center gap-1.5 text-xs">
          <Badge variant="success">Overlap</Badge>
          <span className="text-muted-foreground">{overlapping.join(" + ")} — highest liquidity window</span>
        </div>
      )}
    </div>
  );
}
