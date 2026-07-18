import { describe, expect, it } from "vitest";
import { SessionService } from "../../services/session.service";
import { MarketSession } from "../../entities/market-session";
import type { ExchangeRepository } from "../../repositories/exchange.repository";

function fakeRepo(sessions: MarketSession[]): ExchangeRepository {
  return {
    findById: async () => null,
    findAll: async () => [],
    save: async () => undefined,
    findSessionByType: async (type) => sessions.find((s) => s.type === type) ?? null,
    findAllSessions: async () => sessions,
    saveSession: async () => undefined,
  };
}

const london = MarketSession.create("london", { type: "LONDON", openHourUtc: 8, closeHourUtc: 16 });
const newYork = MarketSession.create("ny", { type: "NEW_YORK", openHourUtc: 13, closeHourUtc: 21 });
const tokyo = MarketSession.create("tokyo", { type: "TOKYO", openHourUtc: 0, closeHourUtc: 9 });

describe("SessionService.getCurrentSessions", () => {
  it("returns every session active at the given hour", async () => {
    const service = new SessionService(fakeRepo([london, newYork, tokyo]));
    const asOf = new Date("2026-01-01T14:00:00Z"); // 14:00 UTC — London + NY overlap
    const current = await service.getCurrentSessions(asOf);
    expect(current.map((s) => s.type).sort()).toEqual(["LONDON", "NEW_YORK"]);
  });

  it("returns an empty array when no session is active", async () => {
    const service = new SessionService(fakeRepo([london]));
    const asOf = new Date("2026-01-01T20:00:00Z"); // after London closes
    expect(await service.getCurrentSessions(asOf)).toHaveLength(0);
  });
});

describe("SessionService.getActiveOverlaps", () => {
  it("detects the London/New York overlap pair", async () => {
    const service = new SessionService(fakeRepo([london, newYork, tokyo]));
    const asOf = new Date("2026-01-01T14:00:00Z");
    const overlaps = await service.getActiveOverlaps(asOf);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0]?.map((s) => s.type).sort()).toEqual(["LONDON", "NEW_YORK"]);
  });

  it("returns no overlaps when only one session is active", async () => {
    const service = new SessionService(fakeRepo([tokyo]));
    const asOf = new Date("2026-01-01T03:00:00Z");
    expect(await service.getActiveOverlaps(asOf)).toHaveLength(0);
  });
});

describe("SessionService.getNextSession", () => {
  it("finds the next session to open and hours until it does", async () => {
    const service = new SessionService(fakeRepo([london]));
    const asOf = new Date("2026-01-01T05:00:00Z"); // 5:00 UTC, London opens at 8:00
    const result = await service.getNextSession(asOf);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.session.type).toBe("LONDON");
      expect(result.value.hoursUntilOpen).toBe(3);
    }
  });

  it("returns an error when there are no sessions registered at all", async () => {
    const service = new SessionService(fakeRepo([]));
    const result = await service.getNextSession(new Date());
    expect(result.ok).toBe(false);
  });
});
