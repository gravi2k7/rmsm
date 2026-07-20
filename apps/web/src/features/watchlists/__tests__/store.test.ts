import { describe, expect, it, beforeEach } from "vitest";
import { useWatchlistStore } from "../store";

describe("watchlist store", () => {
  beforeEach(() => {
    useWatchlistStore.setState({
      watchlists: [{ id: "default", name: "My Watchlist", instrumentIds: [] }],
      activeWatchlistId: "default",
      favoriteInstrumentIds: [],
      pinnedInstrumentIds: [],
      recentInstrumentIds: [],
    });
  });

  it("starts with a single default watchlist", () => {
    const state = useWatchlistStore.getState();
    expect(state.watchlists).toHaveLength(1);
    expect(state.watchlists[0]!.name).toBe("My Watchlist");
  });

  it("createWatchlist() adds a new watchlist and makes it active", () => {
    const id = useWatchlistStore.getState().createWatchlist("Majors");
    const state = useWatchlistStore.getState();
    expect(state.watchlists).toHaveLength(2);
    expect(state.watchlists.find((w) => w.id === id)?.name).toBe("Majors");
    expect(state.activeWatchlistId).toBe(id);
  });

  it("renameWatchlist() updates only the targeted watchlist's name", () => {
    useWatchlistStore.getState().renameWatchlist("default", "Renamed");
    expect(useWatchlistStore.getState().watchlists[0]!.name).toBe("Renamed");
  });

  it("addToWatchlist() adds an instrument id without duplicating it", () => {
    useWatchlistStore.getState().addToWatchlist("default", "instrument-1");
    useWatchlistStore.getState().addToWatchlist("default", "instrument-1");
    expect(useWatchlistStore.getState().watchlists[0]!.instrumentIds).toEqual(["instrument-1"]);
  });

  it("removeFromWatchlist() removes only the targeted instrument", () => {
    useWatchlistStore.getState().addToWatchlist("default", "a");
    useWatchlistStore.getState().addToWatchlist("default", "b");
    useWatchlistStore.getState().removeFromWatchlist("default", "a");
    expect(useWatchlistStore.getState().watchlists[0]!.instrumentIds).toEqual(["b"]);
  });

  it("reorderWatchlist() replaces the instrument order", () => {
    useWatchlistStore.getState().addToWatchlist("default", "a");
    useWatchlistStore.getState().addToWatchlist("default", "b");
    useWatchlistStore.getState().reorderWatchlist("default", ["b", "a"]);
    expect(useWatchlistStore.getState().watchlists[0]!.instrumentIds).toEqual(["b", "a"]);
  });

  it("deleteWatchlist() falls back to a fresh default watchlist when the last one is deleted", () => {
    useWatchlistStore.getState().deleteWatchlist("default");
    const state = useWatchlistStore.getState();
    expect(state.watchlists).toHaveLength(1);
    expect(state.activeWatchlistId).toBe(state.watchlists[0]!.id);
  });

  it("deleteWatchlist() re-points activeWatchlistId only when the active one was deleted", () => {
    const otherId = useWatchlistStore.getState().createWatchlist("Other");
    useWatchlistStore.getState().setActiveWatchlist("default");
    useWatchlistStore.getState().deleteWatchlist(otherId);
    expect(useWatchlistStore.getState().activeWatchlistId).toBe("default");
  });

  it("toggleFavorite() adds then removes an instrument id", () => {
    useWatchlistStore.getState().toggleFavorite("instrument-1");
    expect(useWatchlistStore.getState().favoriteInstrumentIds).toContain("instrument-1");
    useWatchlistStore.getState().toggleFavorite("instrument-1");
    expect(useWatchlistStore.getState().favoriteInstrumentIds).not.toContain("instrument-1");
  });

  it("togglePinned() adds then removes an instrument id", () => {
    useWatchlistStore.getState().togglePinned("instrument-1");
    expect(useWatchlistStore.getState().pinnedInstrumentIds).toContain("instrument-1");
    useWatchlistStore.getState().togglePinned("instrument-1");
    expect(useWatchlistStore.getState().pinnedInstrumentIds).not.toContain("instrument-1");
  });

  it("recordRecentlyViewed() moves a re-viewed symbol to the front without duplicating it", () => {
    useWatchlistStore.getState().recordRecentlyViewed("a");
    useWatchlistStore.getState().recordRecentlyViewed("b");
    useWatchlistStore.getState().recordRecentlyViewed("a");
    expect(useWatchlistStore.getState().recentInstrumentIds).toEqual(["a", "b"]);
  });
});
