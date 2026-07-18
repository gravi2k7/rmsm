import { ok, err, type Result } from "@rmsm/core";
import type { ExchangeRepository } from "../repositories/exchange.repository";
import type { MarketSession } from "../entities/market-session";
import { UnknownSessionError } from "../errors/market.errors";

/** Domain service for session detection/overlap — depends on
 * `ExchangeRepository` (the port that also stores `MarketSession`
 * entities), never a concrete data source. */
export class SessionService {
  constructor(private readonly exchangeRepository: ExchangeRepository) {}

  /** Every session active at `asOf`'s UTC hour — usually one, sometimes
   * two during an overlap window (e.g. London/New York), occasionally
   * zero (the quiet gap between the New York close and Sydney open). */
  async getCurrentSessions(asOf: Date = new Date()): Promise<MarketSession[]> {
    const sessions = await this.exchangeRepository.findAllSessions();
    const utcHour = asOf.getUTCHours();
    return sessions.filter((s) => s.isActiveAt(utcHour));
  }

  /** The next session to open after `asOf`, and how many hours until it
   * does — scans forward hour-by-hour up to 24h, since sessions repeat
   * daily and there's always a next one within a day. */
  async getNextSession(asOf: Date = new Date()): Promise<Result<{ session: MarketSession; hoursUntilOpen: number }, UnknownSessionError>> {
    const sessions = await this.exchangeRepository.findAllSessions();
    if (sessions.length === 0) return err(new UnknownSessionError("<any>"));

    const currentHour = asOf.getUTCHours();
    for (let offset = 1; offset <= 24; offset++) {
      const hour = (currentHour + offset) % 24;
      const opening = sessions.find((s) => s.openHourUtc === hour);
      if (opening) return ok({ session: opening, hoursUntilOpen: offset });
    }
    return err(new UnknownSessionError("<any>"));
  }

  /** Every pair of sessions currently overlapping — the general form of
   * "is London/New York overlap active right now." */
  async getActiveOverlaps(asOf: Date = new Date()): Promise<[MarketSession, MarketSession][]> {
    const current = await this.getCurrentSessions(asOf);
    const overlaps: [MarketSession, MarketSession][] = [];
    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const a = current[i];
        const b = current[j];
        if (a && b && a.overlapsWith(b)) overlaps.push([a, b]);
      }
    }
    return overlaps;
  }
}
