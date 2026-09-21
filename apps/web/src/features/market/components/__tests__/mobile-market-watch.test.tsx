import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MobileMarketWatch, type MobileMarketWatchRow } from "../mobile-market-watch";
import { useWatchlistStore } from "@/features/watchlists/store";
import type { Instrument, Quote } from "../../types";

function instrument(overrides: Partial<Instrument> = {}): Instrument {
  return {
    id: "instrument-1",
    exchangeId: "exchange-1",
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

function quote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: "quote-1",
    instrumentId: "instrument-1",
    bidPrice: "1.10010",
    askPrice: "1.10020",
    lastPrice: "1.10015",
    bidSize: "100000",
    askSize: "100000",
    eventTime: "2026-09-16T10:00:00.000Z",
    providerId: "provider-1",
    source: "LIVE",
    ...overrides,
  };
}

function renderMobileMarketWatch(
  overrides: Partial<{
    rows: MobileMarketWatchRow[];
    category: "ALL" | "FOREX" | "INDEX" | "COMMODITY" | "CRYPTO" | "EQUITY";
    search: string;
    favoritesOnly: boolean;
    isLoading: boolean;
  }> = {},
) {
  const props = {
    rows: [
      {
        instrument: instrument(),
        quote: quote(),
      },
    ],
    category: "FOREX" as const,
    onCategoryChange: vi.fn(),
    search: "",
    onSearchChange: vi.fn(),
    favoritesOnly: false,
    onFavoritesOnlyChange: vi.fn(),
    isLoading: false,
    ...overrides,
  };

  render(<MobileMarketWatch {...props} />);

  return props;
}

describe("MobileMarketWatch", () => {
  beforeEach(() => {
    useWatchlistStore.setState({
      favoriteInstrumentIds: [],
    });
  });

  it("renders market cards with instrument and live quote data", () => {
    renderMobileMarketWatch();

    expect(screen.getByText("EURUSD")).toBeInTheDocument();
    expect(screen.getByText("Euro / US Dollar")).toBeInTheDocument();
    expect(screen.getByText("1.10015")).toBeInTheDocument();
    expect(screen.getByText("● LIVE")).toBeInTheDocument();

    expect(
      screen.getByRole("link", {
        name: /EURUSD.*Euro \/ US Dollar.*1\.10015/i,
      }),
    ).toHaveAttribute("href", "/trading?instrument=instrument-1");
  });

  it("switches to Watchlist and enables favorites-only mode", async () => {
    const user = userEvent.setup();
    const props = renderMobileMarketWatch();

    await user.click(screen.getByRole("button", { name: "Watchlist" }));

    expect(props.onFavoritesOnlyChange).toHaveBeenCalledWith(true);
    expect(props.onCategoryChange).toHaveBeenCalledWith("ALL");
  });

  it("switches from Watchlist to an asset category", async () => {
    const user = userEvent.setup();
    const props = renderMobileMarketWatch({
      category: "ALL",
      favoritesOnly: true,
    });

    await user.click(screen.getByRole("button", { name: "Forex" }));

    expect(props.onFavoritesOnlyChange).toHaveBeenCalledWith(false);
    expect(props.onCategoryChange).toHaveBeenCalledWith("FOREX");
  });

  it("passes search changes to the parent", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();

    function SearchHarness() {
      const [value, setValue] = useState("");

      return (
        <MobileMarketWatch
          rows={[
            {
              instrument: instrument(),
              quote: quote(),
            },
          ]}
          category="FOREX"
          onCategoryChange={vi.fn()}
          search={value}
          onSearchChange={(nextValue) => {
            onSearchChange(nextValue);
            setValue(nextValue);
          }}
          favoritesOnly={false}
          onFavoritesOnlyChange={vi.fn()}
          isLoading={false}
        />
      );
    }

    render(<SearchHarness />);

    const searchInput = screen.getByRole("textbox", {
      name: "Search markets",
    });

    await user.type(searchInput, "gold");

    expect(onSearchChange).toHaveBeenLastCalledWith("gold");
    expect(searchInput).toHaveValue("gold");
  });

  it("toggles an instrument favorite without navigating", async () => {
    const user = userEvent.setup();
    renderMobileMarketWatch();

    const favoriteButton = screen.getByRole("button", {
      name: "Add EURUSD to favorites",
    });

    await user.click(favoriteButton);

    expect(useWatchlistStore.getState().favoriteInstrumentIds).toContain("instrument-1");

    expect(
      screen.getByRole("button", {
        name: "Remove EURUSD from favorites",
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("renders the empty state when there are no rows", () => {
    renderMobileMarketWatch({ rows: [] });

    expect(screen.getByText("No instruments match your filters.")).toBeInTheDocument();
  });

  it("renders loading cards while market data is loading", () => {
    renderMobileMarketWatch({
      rows: [],
      isLoading: true,
    });

    expect(
      screen.getByRole("region", {
        name: "Mobile market watchlist",
      }),
    ).toBeInTheDocument();

    expect(screen.queryByText("No instruments match your filters.")).not.toBeInTheDocument();
  });
});
