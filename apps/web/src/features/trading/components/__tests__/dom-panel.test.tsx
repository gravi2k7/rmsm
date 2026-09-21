import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DomPanel } from "../dom-panel";
import type { MarketDepth } from "@/features/market/hooks/use-market-realtime";

describe("DomPanel", () => {
  const depth: MarketDepth = {
    instrumentId: "instr-1",
    providerSymbol: "EURUSD",
    bids: [
      { price: "1.16936", size: "1000000" },
      { price: "1.16935", size: "500000" },
    ],
    asks: [
      { price: "1.16946", size: "750000" },
      { price: "1.16947", size: "250000" },
    ],
    eventTime: "2026-08-28T04:05:11.161Z",
  };

  it("renders the instrument and depth levels", () => {
    render(<DomPanel symbol="EURUSD" depth={depth} />);

    expect(screen.getByRole("region", { name: "DOM" })).toBeInTheDocument();
    expect(screen.getByText("EURUSD")).toBeInTheDocument();

    expect(screen.getAllByText("1.16936")).toHaveLength(2);
    expect(screen.getAllByText("1.16935")).toHaveLength(1);
    expect(screen.getAllByText("1.16946")).toHaveLength(2);
    expect(screen.getAllByText("1.16947")).toHaveLength(1);

    expect(screen.getByText("1,000,000")).toBeInTheDocument();
    expect(screen.getByText("500,000")).toBeInTheDocument();
    expect(screen.getByText("750,000")).toBeInTheDocument();
    expect(screen.getByText("250,000")).toBeInTheDocument();
  });

  it("sorts asks from highest to lowest and bids from highest to lowest", () => {
    render(
      <DomPanel
        symbol="EURUSD"
        depth={{
          ...depth,
          asks: [
            { price: "1.16946", size: "750000" },
            { price: "1.16948", size: "100000" },
            { price: "1.16947", size: "250000" },
          ],
          bids: [
            { price: "1.16935", size: "500000" },
            { price: "1.16937", size: "100000" },
            { price: "1.16936", size: "1000000" },
          ],
        }}
      />,
    );

    const region = screen.getByRole("region", { name: "DOM" });

    const priceElements = region.querySelectorAll(
      ".grid.h-7 > .border-x.font-medium",
    );

    const prices = Array.from(priceElements).map(
      (element) => element.textContent,
    );

    expect(prices).toEqual([
      "1.16948",
      "1.16947",
      "1.16946",
      "1.16937",
      "1.16936",
      "1.16935",
    ]);
  });

  it("shows the best bid and best ask in the summary", () => {
    render(<DomPanel symbol="EURUSD" depth={depth} />);

    const region = screen.getByRole("region", { name: "DOM" });

    expect(region).toHaveTextContent("1.16936");
    expect(region).toHaveTextContent("1.16946");
  });

  it("shows a waiting state when depth has not arrived", () => {
    render(<DomPanel symbol="EURUSD" depth={null} />);

    expect(
      screen.getByText("Waiting for market depth…"),
    ).toBeInTheDocument();
  });

  it("shows an empty state when depth contains no levels", () => {
    render(
      <DomPanel
        symbol="EURUSD"
        depth={{
          instrumentId: "instr-1",
    providerSymbol: "EURUSD",
          bids: [],
          asks: [],
          eventTime: "2026-08-28T04:05:11.161Z",
        }}
      />,
    );

    expect(
      screen.getByText("No depth levels available."),
    ).toBeInTheDocument();
  });

  it("renders a dash for a missing size", () => {
    render(
      <DomPanel
        symbol="EURUSD"
        depth={{
          ...depth,
          bids: [{ price: "1.16936" }],
          asks: [],
        }}
      />,
    );

    const region = screen.getByRole("region", { name: "DOM" });

    expect(region).toHaveTextContent("—");
    expect(
      region.querySelectorAll(".grid.h-7"),
    ).toHaveLength(2);
  });

  it("submits BUY and SELL orders from the DOM", () => {
    const onSubmit = vi.fn();

    render(
      <DomPanel
        symbol="EURUSD"
        depth={depth}
        quantity="2"
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Buy EURUSD",
      }),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Sell EURUSD",
      }),
    );

    expect(onSubmit).toHaveBeenNthCalledWith(1, "BUY");
    expect(onSubmit).toHaveBeenNthCalledWith(2, "SELL");
  });

  it("closes and reverses the current position", () => {
    const onClosePosition = vi.fn();
    const onReversePosition = vi.fn();

    const position = {
      id: "position-1",
      instrumentId: "instr-1",
      side: "LONG",
      quantity: "2",
    } as never;

    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <DomPanel
        symbol="EURUSD"
        depth={depth}
        currentPosition={position}
        onClosePosition={onClosePosition}
        onReversePosition={onReversePosition}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Close",
      }),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Reverse",
      }),
    );

    expect(onClosePosition).toHaveBeenCalledWith(
      "position-1",
    );
    expect(onReversePosition).toHaveBeenCalledWith(
      "position-1",
    );

    vi.restoreAllMocks();
  });

  it("cancels all orders and flattens all positions", () => {
    const onCancelAllOrders = vi.fn();
    const onFlattenAllPositions = vi.fn();

    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <DomPanel
        symbol="EURUSD"
        depth={depth}
        onCancelAllOrders={onCancelAllOrders}
        onFlattenAllPositions={onFlattenAllPositions}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cancel All",
      }),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Flatten All",
      }),
    );

    expect(onCancelAllOrders).toHaveBeenCalledTimes(1);
    expect(onFlattenAllPositions).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });

  it("does not submit trading actions while pending", () => {
    const onSubmit = vi.fn();
    const onCancelAllOrders = vi.fn();

    render(
      <DomPanel
        symbol="EURUSD"
        depth={depth}
        onSubmit={onSubmit}
        onCancelAllOrders={onCancelAllOrders}
        isPending
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Buy EURUSD",
      }),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cancel All",
      }),
    );

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCancelAllOrders).not.toHaveBeenCalled();
  });

});
