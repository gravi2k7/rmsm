import { describe, expect, it } from "vitest";
import { SESSIONS, getSessionState, getAllSessionStates, getOverlappingSessions, formatMinutes } from "../trading-sessions";

function utc(hour: number, minute = 0): Date {
  return new Date(Date.UTC(2026, 0, 15, hour, minute, 0));
}

describe("trading-sessions", () => {
  it("defines exactly the four standard FX sessions", () => {
    expect(SESSIONS.map((s) => s.name)).toEqual(["Sydney", "Tokyo", "London", "New York"]);
  });

  it("London is open at 10:00 UTC and closed at 20:00 UTC", () => {
    const london = SESSIONS.find((s) => s.name === "London")!;
    expect(getSessionState(london, utc(10)).isOpen).toBe(true);
    expect(getSessionState(london, utc(20)).isOpen).toBe(false);
  });

  it("Sydney (a session crossing midnight UTC) is open at 23:00 UTC and at 3:00 UTC", () => {
    const sydney = SESSIONS.find((s) => s.name === "Sydney")!;
    expect(getSessionState(sydney, utc(23)).isOpen).toBe(true);
    expect(getSessionState(sydney, utc(3)).isOpen).toBe(true);
    expect(getSessionState(sydney, utc(12)).isOpen).toBe(false);
  });

  it("reports minutesUntilChange counting down to close while open", () => {
    const london = SESSIONS.find((s) => s.name === "London")!;
    const state = getSessionState(london, utc(16, 30));
    expect(state.isOpen).toBe(true);
    expect(state.minutesUntilChange).toBe(30);
  });

  it("reports minutesUntilChange counting up to open while closed", () => {
    const london = SESSIONS.find((s) => s.name === "London")!;
    const state = getSessionState(london, utc(7, 45));
    expect(state.isOpen).toBe(false);
    expect(state.minutesUntilChange).toBe(15);
  });

  it("getAllSessionStates returns one state per session", () => {
    expect(getAllSessionStates(utc(10))).toHaveLength(4);
  });

  it("getOverlappingSessions identifies the London/New York overlap window", () => {
    // London: 08-17 UTC, New York: 13-22 UTC -> overlap 13-17 UTC
    expect(getOverlappingSessions(utc(14))).toEqual(expect.arrayContaining(["London", "New York"]));
  });

  it("getOverlappingSessions returns fewer sessions outside the overlap window", () => {
    expect(getOverlappingSessions(utc(20))).not.toEqual(expect.arrayContaining(["London"]));
  });

  it("formatMinutes formats sub-hour durations as minutes only", () => {
    expect(formatMinutes(45)).toBe("45m");
  });

  it("formatMinutes formats hour-plus durations as hours and minutes", () => {
    expect(formatMinutes(125)).toBe("2h 5m");
  });
});
