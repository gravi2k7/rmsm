import { describe, expect, it } from "vitest";
import { Position } from "../entities/position";
import { Holding } from "../entities/holding";
import { Trade } from "../entities/trade";
import { Balance } from "../entities/balance";
import { Equity } from "../entities/equity";
import { SymbolCode } from "@rmsm/market";

function symbol() {
  const r = SymbolCode.create("EURUSD");
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

describe("Position", () => {
  it("starts OPEN", () => {
    const position = Position.open("p1", { symbolCode: symbol(), side: "LONG", quantityUnits: 1000, averageEntryPrice: 1.1, openedAt: new Date() });
    expect(position.status).toBe("OPEN");
  });

  it("unrealizedPnlAt is positive for a LONG position when price rises", () => {
    const position = Position.open("p1", { symbolCode: symbol(), side: "LONG", quantityUnits: 1000, averageEntryPrice: 1.1, openedAt: new Date() });
    expect(position.unrealizedPnlAt(1.12)).toBeCloseTo(20);
  });

  it("unrealizedPnlAt is positive for a SHORT position when price falls", () => {
    const position = Position.open("p1", { symbolCode: symbol(), side: "SHORT", quantityUnits: 1000, averageEntryPrice: 1.1, openedAt: new Date() });
    expect(position.unrealizedPnlAt(1.08)).toBeCloseTo(20);
  });

  it("close() records exit price and realized P&L, transitions to CLOSED", () => {
    const position = Position.open("p1", { symbolCode: symbol(), side: "LONG", quantityUnits: 1000, averageEntryPrice: 1.1, openedAt: new Date() });
    position.close(1.12);
    expect(position.status).toBe("CLOSED");
    expect(position.averageExitPrice).toBe(1.12);
    expect(position.realizedPnl).toBeCloseTo(20);
  });

  it("rejects closing an already-closed position", () => {
    const position = Position.open("p1", { symbolCode: symbol(), side: "LONG", quantityUnits: 1000, averageEntryPrice: 1.1, openedAt: new Date() });
    position.close(1.12);
    expect(() => position.close(1.15)).toThrow();
  });

  it("rejects a non-positive quantity", () => {
    expect(() => Position.open("p1", { symbolCode: symbol(), side: "LONG", quantityUnits: 0, averageEntryPrice: 1.1, openedAt: new Date() })).toThrow();
  });
});

describe("Holding", () => {
  it("isLong/isShort/isFlat reflect net quantity sign", () => {
    expect(Holding.create("h1", { symbolCode: symbol(), netQuantityUnits: 100, averagePrice: 1.1 }).isLong()).toBe(true);
    expect(Holding.create("h2", { symbolCode: symbol(), netQuantityUnits: -100, averagePrice: 1.1 }).isShort()).toBe(true);
    expect(Holding.create("h3", { symbolCode: symbol(), netQuantityUnits: 0, averagePrice: 1.1 }).isFlat()).toBe(true);
  });

  it("marketValueAt uses the absolute quantity", () => {
    const holding = Holding.create("h1", { symbolCode: symbol(), netQuantityUnits: -100, averagePrice: 1.1 });
    expect(holding.marketValueAt(1.2)).toBeCloseTo(120);
  });
});

describe("Trade", () => {
  it("isWin() reflects positive realizedPnl", () => {
    const win = Trade.create("t1", { symbolCode: symbol(), side: "LONG", quantityUnits: 100, entryPrice: 1.1, exitPrice: 1.2, realizedPnl: 10, openedAt: new Date("2026-01-01"), closedAt: new Date("2026-01-02") });
    expect(win.isWin()).toBe(true);
  });

  it("rejects closedAt before openedAt", () => {
    expect(() =>
      Trade.create("t1", { symbolCode: symbol(), side: "LONG", quantityUnits: 100, entryPrice: 1.1, exitPrice: 1.2, realizedPnl: 10, openedAt: new Date("2026-01-02"), closedAt: new Date("2026-01-01") }),
    ).toThrow();
  });

  it("fromClosedPosition builds a Trade from a closed Position", () => {
    const position = Position.open("p1", { symbolCode: symbol(), side: "LONG", quantityUnits: 100, averageEntryPrice: 1.1, openedAt: new Date("2026-01-01") });
    position.close(1.2, new Date("2026-01-02"));
    const trade = Trade.fromClosedPosition("t1", position);
    expect(trade.realizedPnl).toBeCloseTo(10);
  });

  it("fromClosedPosition throws for a still-open position", () => {
    const position = Position.open("p1", { symbolCode: symbol(), side: "LONG", quantityUnits: 100, averageEntryPrice: 1.1, openedAt: new Date() });
    expect(() => Trade.fromClosedPosition("t1", position)).toThrow();
  });
});

describe("Balance", () => {
  it("accepts a valid entry", () => {
    const balance = Balance.record("b1", { type: "DEPOSIT", amount: 1000, resultingBalance: 1000, occurredAt: new Date() });
    expect(balance.type).toBe("DEPOSIT");
  });
});

describe("Equity", () => {
  it("value is balance + unrealizedPnl", () => {
    const equity = Equity.record("e1", { balance: 10000, unrealizedPnl: -200, recordedAt: new Date() });
    expect(equity.value).toBe(9800);
  });
});
