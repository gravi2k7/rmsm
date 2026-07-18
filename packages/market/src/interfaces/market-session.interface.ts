import type { MarketSession } from "../entities/market-session";

/** The port for sourcing session-schedule data (e.g. daylight-saving-
 * adjusted session hours, which shift twice a year and are realistically
 * sourced from an external schedule rather than hardcoded here). */
export interface MarketSessionProvider {
  getAllSessions(): Promise<MarketSession[]>;
}
