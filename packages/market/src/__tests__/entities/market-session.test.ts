import { describe, expect, it } from "vitest";
import { MarketSession } from "../../entities/market-session";

describe("MarketSession.isActiveAt", () => {
  it("handles a normal (non-wrapping) window", () => {
    const london = MarketSession.create("london", { type: "LONDON", openHourUtc: 8, closeHourUtc: 16 });
    expect(london.isActiveAt(8)).toBe(true);
    expect(london.isActiveAt(12)).toBe(true);
    expect(london.isActiveAt(16)).toBe(false);
    expect(london.isActiveAt(7)).toBe(false);
  });

  it("handles a midnight-wrapping window", () => {
    const sydney = MarketSession.create("sydney", { type: "SYDNEY", openHourUtc: 21, closeHourUtc: 6 });
    expect(sydney.isActiveAt(22)).toBe(true);
    expect(sydney.isActiveAt(2)).toBe(true);
    expect(sydney.isActiveAt(6)).toBe(false);
    expect(sydney.isActiveAt(12)).toBe(false);
  });
});

describe("MarketSession.overlapsWith", () => {
  it("detects the classic London/New York overlap", () => {
    const london = MarketSession.create("london", { type: "LONDON", openHourUtc: 8, closeHourUtc: 16 });
    const newYork = MarketSession.create("ny", { type: "NEW_YORK", openHourUtc: 13, closeHourUtc: 21 });
    expect(london.overlapsWith(newYork)).toBe(true);
  });

  it("returns false for non-overlapping sessions", () => {
    const tokyo = MarketSession.create("tokyo", { type: "TOKYO", openHourUtc: 0, closeHourUtc: 6 });
    const london = MarketSession.create("london", { type: "LONDON", openHourUtc: 8, closeHourUtc: 16 });
    expect(tokyo.overlapsWith(london)).toBe(false);
  });
});

describe("MarketSession open/close", () => {
  it("open() raises SessionOpenedEvent with the session type", () => {
    const session = MarketSession.create("london", { type: "LONDON", openHourUtc: 8, closeHourUtc: 16 });
    session.open();
    const events = session.pullDomainEvents();
    expect(events[0]).toMatchObject({ kind: "SessionOpened", sessionType: "LONDON" });
  });

  it("close() raises SessionClosedEvent", () => {
    const session = MarketSession.create("london", { type: "LONDON", openHourUtc: 8, closeHourUtc: 16 });
    session.open();
    session.pullDomainEvents();
    session.close();
    expect(session.pullDomainEvents()[0]?.kind).toBe("SessionClosed");
  });

  it("rejects an out-of-range hour", () => {
    expect(() => MarketSession.create("x", { type: "LONDON", openHourUtc: 25, closeHourUtc: 16 })).toThrow();
  });
});
