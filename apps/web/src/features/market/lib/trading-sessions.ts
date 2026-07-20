export type SessionName = "Sydney" | "Tokyo" | "London" | "New York";

export interface SessionDefinition {
  name: SessionName;
  /** UTC hour the session opens, 0-23. */
  openUtcHour: number;
  /** UTC hour the session closes, 0-23. Sessions crossing midnight UTC
   * (openUtcHour > closeUtcHour) are handled by the functions below. */
  closeUtcHour: number;
}

/**
 * apps/api has a real `TradingSession` Prisma model and a
 * `TradingSessionRepository` (packages/database... wired in
 * apps/api/src/modules/market-data/repositories/trading-session.repository.ts)
 * but no controller anywhere exposes it over HTTP — a genuine, verified
 * gap, not an oversight on this app's part. The four major FX trading
 * sessions' standard hours are globally standardized, publicly known
 * reference data (the same kind of fixed knowledge as IANA timezone
 * definitions), so — rather than omit this widget entirely or fabricate
 * a fake API call — these are hardcoded here, explicitly documented as
 * such. If/when a real trading-sessions endpoint is added, this should
 * be replaced by consuming it (and would then also reflect real
 * per-exchange holiday/weekend closures, which this static table does
 * not).
 */
export const SESSIONS: readonly SessionDefinition[] = [
  { name: "Sydney", openUtcHour: 22, closeUtcHour: 7 },
  { name: "Tokyo", openUtcHour: 0, closeUtcHour: 9 },
  { name: "London", openUtcHour: 8, closeUtcHour: 17 },
  { name: "New York", openUtcHour: 13, closeUtcHour: 22 },
];

export interface SessionState {
  session: SessionDefinition;
  isOpen: boolean;
  /** Minutes until this session's next open (if closed) or next close
   * (if open). */
  minutesUntilChange: number;
}

function utcHourFraction(date: Date): number {
  return date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
}

function isSessionOpenAt(session: SessionDefinition, hourFraction: number): boolean {
  if (session.openUtcHour === session.closeUtcHour) return true; // 24h session, not used today but handled
  if (session.openUtcHour < session.closeUtcHour) {
    return hourFraction >= session.openUtcHour && hourFraction < session.closeUtcHour;
  }
  // Crosses midnight UTC (e.g. Sydney 22 -> 7)
  return hourFraction >= session.openUtcHour || hourFraction < session.closeUtcHour;
}

/** Minutes from `hourFraction` until the given target UTC hour is next
 * reached (always a positive value, wrapping past midnight if needed). */
function minutesUntilUtcHour(hourFraction: number, targetHour: number): number {
  let diff = targetHour - hourFraction;
  if (diff <= 0) diff += 24;
  return Math.round(diff * 60);
}

export function getSessionState(session: SessionDefinition, now: Date = new Date()): SessionState {
  const hourFraction = utcHourFraction(now);
  const isOpen = isSessionOpenAt(session, hourFraction);
  const minutesUntilChange = isOpen ? minutesUntilUtcHour(hourFraction, session.closeUtcHour) : minutesUntilUtcHour(hourFraction, session.openUtcHour);
  return { session, isOpen, minutesUntilChange };
}

export function getAllSessionStates(now: Date = new Date()): SessionState[] {
  return SESSIONS.map((session) => getSessionState(session, now));
}

export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

/** Sessions currently open, for computing overlaps (e.g. London/New York
 * overlap, the highest-liquidity window of the trading day). */
export function getOverlappingSessions(now: Date = new Date()): SessionName[] {
  return getAllSessionStates(now)
    .filter((s) => s.isOpen)
    .map((s) => s.session.name);
}
