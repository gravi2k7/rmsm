import { describe, expect, it } from "vitest";
import { WatchlistService } from "../services/watchlist.service";
import { DuplicateWatchlistItemError, WatchlistItemNotFoundError } from "../../domain/errors/news-intelligence-domain.errors";

describe("WatchlistService", () => {
  const service = new WatchlistService();

  it("adds and removes items immutably", () => {
    const empty = service.create("wl1", "My Watchlist");
    const withItem = service.addItem(empty, "EURUSD", "Testing", new Date("2026-01-01"));

    expect(empty.items).toEqual([]);
    expect(withItem.items).toHaveLength(1);

    const removed = service.removeItem(withItem, "EURUSD");
    expect(removed.items).toEqual([]);
  });

  it("throws DuplicateWatchlistItemError when adding the same symbol twice", () => {
    const withItem = service.addItem(service.create("wl1", "My Watchlist"), "EURUSD", "Testing", new Date());
    expect(() => service.addItem(withItem, "EURUSD", "Again", new Date())).toThrow(DuplicateWatchlistItemError);
  });

  it("throws WatchlistItemNotFoundError when removing a symbol not on the list", () => {
    expect(() => service.removeItem(service.create("wl1", "My Watchlist"), "EURUSD")).toThrow(WatchlistItemNotFoundError);
  });
});
