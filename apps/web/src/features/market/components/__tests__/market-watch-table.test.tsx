import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarketWatchTable, type MarketWatchRow } from "../market-watch-table";
import { useWatchlistStore } from "@/features/watchlists/store";
import type { Instrument, Quote } from "../../types";

function instrument(overrides: Partial<Instrument>): Instrument {
  return {
    id: "instr-1",
    exchangeId: "ex-1",
    symbol: "EURUSD",
    name: "Euro / US Dollar",
    assetClass: "FOREX",
    status: "ACTIVE",
    currency: "USD",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function quote(overrides: Partial<Quote>): Quote {
  return {
    id: "q1",
    instrumentId: "instr-1",
    bidPrice: "1.10000",
    askPrice: "1.10020",
    lastPrice: "1.10010",
    eventTime: "2026-07-20T00:00:00.000Z",
    providerId: "provider-1",
    source: "PROVIDER",
    ...overrides,
  };
}

describe("MarketWatchTable", () => {
  beforeEach(() => {
    useWatchlistStore.setState({
      watchlists: [{ id: "default", name: "My Watchlist", instrumentIds: [] }],
      activeWatchlistId: "default",
      favoriteInstrumentIds: [],
      pinnedInstrumentIds: [],
      recentInstrumentIds: [],
    });
  });

  it("shows a loading skeleton state", () => {
    render(<MarketWatchTable rows={[]} isLoading />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no rows", () => {
    render(<MarketWatchTable rows={[]} isLoading={false} />);
    expect(screen.getByText(/no instruments match/i)).toBeInTheDocument();
  });

  it("renders symbol, name, and quote prices for each row", () => {
    const rows: MarketWatchRow[] = [{ instrument: instrument({}), quote: quote({}) }];
    render(<MarketWatchTable rows={rows} isLoading={false} />);
    expect(screen.getByText("EURUSD")).toBeInTheDocument();
    expect(screen.getByText("Euro / US Dollar")).toBeInTheDocument();
    expect(screen.getByText("1.10010")).toBeInTheDocument();
    expect(screen.getByText("1.10000")).toBeInTheDocument();
    expect(screen.getByText("1.10020")).toBeInTheDocument();
  });

  it("shows a dash when no quote is available for an instrument", () => {
    const rows: MarketWatchRow[] = [{ instrument: instrument({}), quote: undefined }];
    render(<MarketWatchTable rows={rows} isLoading={false} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("toggling the favorite star updates the watchlist store", async () => {
    const user = userEvent.setup();
    const rows: MarketWatchRow[] = [{ instrument: instrument({ id: "instr-1" }), quote: quote({}) }];
    render(<MarketWatchTable rows={rows} isLoading={false} />);

    const favoriteButton = screen.getByRole("button", { name: /add to favorites/i });
    await user.click(favoriteButton);

    expect(useWatchlistStore.getState().favoriteInstrumentIds).toContain("instr-1");
  });

  it("the Watch action adds the instrument to the active watchlist", async () => {
    const user = userEvent.setup();
    const rows: MarketWatchRow[] = [{ instrument: instrument({ id: "instr-1" }), quote: quote({}) }];
    render(<MarketWatchTable rows={rows} isLoading={false} />);

    await user.click(screen.getByRole("button", { name: /watch/i }));

    expect(useWatchlistStore.getState().watchlists[0]!.instrumentIds).toContain("instr-1");
  });
});
