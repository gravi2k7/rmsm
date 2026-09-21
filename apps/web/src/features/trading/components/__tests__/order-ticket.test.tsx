import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { OrderTicket } from "../order-ticket";

import type {
  TradingAccount,
} from "../../types";

const account: TradingAccount = {
  id: "account-1",
  organizationId: "org-1",
  ownerUserId: "user-1",
  type: "DEMO",
  name: "Demo Account",
  currency: "USD",
  startingBalance: "100000",
  balance: "100000",
  leverage: "10",
  status: "ACTIVE",
  brokerConnectionId: null,
  brokerAccountId: null,
  createdAt: "2026-08-29T00:00:00.000Z",
  updatedAt: "2026-08-29T00:00:00.000Z",
  closedAt: null,
};

function renderTicket(
  overrides: Partial<React.ComponentProps<typeof OrderTicket>> = {},
) {
  const props: React.ComponentProps<typeof OrderTicket> = {
    account,
    symbol: "GC",
    instrumentName: "COMEX:GC",
    tickSize: "0.1",
    bidPrice: "4651.10",
    askPrice: "4651.30",
    quantity: "1",
    onQuantityChange: vi.fn(),
    orderType: "MARKET",
    onOrderTypeChange: vi.fn(),
    limitPrice: "",
    onLimitPriceChange: vi.fn(),
    stopPrice: "",
    onStopPriceChange: vi.fn(),
    onSubmit: vi.fn(),
    isPending: false,
    errorMessage: null,
    ...overrides,
  };

  return {
    ...render(<OrderTicket {...props} />),
    props,
  };
}

describe("OrderTicket", () => {
  it("renders the reference-style order controls and live bid/ask", () => {
    renderTicket();

    expect(
      screen.getByRole("region", { name: "Order" }),
    ).toBeInTheDocument();

    expect(screen.getByText("COMEX:GC")).toBeInTheDocument();
    expect(screen.getByText("4,651.1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sell/i }),
    ).toHaveTextContent("4,651.1");

    expect(
      screen.getByRole("button", { name: /^Buy ASK/ }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /^Sell BID/ }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Market" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Limit" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Stop" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Estimated Margin")).toBeInTheDocument();
    expect(screen.getByText("$465.13")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Confirm" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Cancel" }),
    ).toBeInTheDocument();
  });

  it("selects Buy and Sell independently", () => {
    renderTicket();

    const buy = screen.getByRole("button", { name: /^Buy ASK/ });
    const sell = screen.getByRole("button", { name: /^Sell BID/ });

    expect(buy).toHaveAttribute("aria-pressed", "false");
    expect(sell).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(buy);

    expect(buy).toHaveAttribute("aria-pressed", "true");
    expect(sell).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(sell);

    expect(buy).toHaveAttribute("aria-pressed", "false");
    expect(sell).toHaveAttribute("aria-pressed", "true");
  });

  it("uses Ask for Buy and Bid for Sell pricing", () => {
    renderTicket();

    expect(
      screen.getByRole("button", { name: /^Buy ASK 4,651\.3$/ }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /^Sell BID 4,651\.1$/ }),
    ).toBeInTheDocument();
  });

  it("changes order type and exposes the appropriate price input", () => {
    const onOrderTypeChange = vi.fn();

    renderTicket({ onOrderTypeChange });

    fireEvent.click(
      screen.getByRole("button", { name: "Limit" }),
    );

    expect(onOrderTypeChange).toHaveBeenCalledWith("LIMIT");

    fireEvent.click(
      screen.getByRole("button", { name: "Stop" }),
    );

    expect(onOrderTypeChange).toHaveBeenCalledWith("STOP");
  });

  it("changes quantity with the quantity controls", () => {
    const onQuantityChange = vi.fn();

    renderTicket({
      onQuantityChange,
      quantity: "2",
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Decrease quantity",
      }),
    );

    expect(onQuantityChange).toHaveBeenCalledWith("1");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Increase quantity",
      }),
    );

    expect(onQuantityChange).toHaveBeenCalledWith("3");
  });

  it("requires a side before Market Confirm is enabled", () => {
    renderTicket();

    expect(
      screen.getByRole("button", { name: "Confirm" }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: /^Buy ASK/ }),
    );

    expect(
      screen.getByRole("button", { name: "Confirm" }),
    ).toBeEnabled();
  });

  it("submits the selected side", () => {
    const onSubmit = vi.fn();

    renderTicket({ onSubmit });

    fireEvent.click(
      screen.getByRole("button", { name: /^Buy ASK/ }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Confirm" }),
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("BUY", null, null);
  });

  it("enables Confirm for a valid Buy Limit order", () => {
    const onSubmit = vi.fn();

    renderTicket({
      orderType: "LIMIT",
      limitPrice: "4650",
      onSubmit,
    });

    fireEvent.click(
      screen.getByRole("button", { name: /^Buy ASK/ }),
    );

    expect(
      screen.getByRole("button", { name: "Confirm" }),
    ).toBeEnabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Confirm" }),
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("BUY", null, null);
  });

  it("enables Confirm for a valid Sell Limit order", () => {
    const onSubmit = vi.fn();

    renderTicket({
      orderType: "LIMIT",
      limitPrice: "4650",
      onSubmit,
    });

    fireEvent.click(
      screen.getByRole("button", { name: /^Sell BID/ }),
    );

    expect(
      screen.getByRole("button", { name: "Confirm" }),
    ).toBeEnabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Confirm" }),
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("SELL", null, null);
  });

  it("enables Confirm for a valid Stop order", () => {
    renderTicket({
      orderType: "STOP",
      stopPrice: "4660",
    });

    fireEvent.click(
      screen.getByRole("button", { name: /^Buy ASK/ }),
    );

    expect(
      screen.getByRole("button", { name: "Confirm" }),
    ).toBeEnabled();
  });

  it("shows and toggles risk controls", () => {
    renderTicket();

    const stopLoss = screen.getByRole("checkbox", {
      name: "Stop Loss",
    });

    const trail = screen.getByRole("checkbox", {
      name: "Trailing Stop",
    });

    const takeProfit = screen.getByRole("checkbox", {
      name: "Take Profit",
    });

    fireEvent.click(stopLoss);

    expect(
      screen.getByRole("textbox", {
        name: "Stop loss price",
      }),
    ).toBeInTheDocument();

    fireEvent.click(trail);

    expect(
      screen.getByRole("textbox", {
        name: "Trailing stop ticks",
      }),
    ).toBeInTheDocument();

    fireEvent.click(takeProfit);

    expect(
      screen.getByRole("textbox", {
        name: "Take profit price",
      }),
    ).toBeInTheDocument();
  });

  it("resets ticket selections when Cancel is clicked", () => {
    renderTicket();

    const buy = screen.getByRole("button", { name: /^Buy ASK/ });

    fireEvent.click(buy);

    expect(buy).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Stop Loss",
      }),
    );

    expect(
      screen.getByRole("textbox", {
        name: "Stop loss price",
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Cancel" }),
    );

    expect(buy).toHaveAttribute("aria-pressed", "false");

    expect(
      screen.queryByRole("textbox", {
        name: "Stop loss price",
      }),
    ).not.toBeInTheDocument();
  });
});
