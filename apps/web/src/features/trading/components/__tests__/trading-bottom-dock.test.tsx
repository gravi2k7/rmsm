import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  TradingBottomDock,
  type TradingDockTab,
} from "../trading-bottom-dock";
import type {
  TradingAccount,
  TradingOrder,
  TradingPosition,
  TradingTrade,
} from "../../types";

const confirmMock = vi.fn();

const account: TradingAccount = {
  id: "account-1",
  name: "Demo Account",
  currency: "USD",
  status: "ACTIVE",
  balance: "10000",
} as TradingAccount;

const pendingOrder: TradingOrder = {
  id: "order-1",
  accountId: "account-1",
  instrumentId: "instrument-1",
  side: "BUY",
  quantity: "1",
  requestedPrice: "100",
  executedPrice: null,
  status: "PENDING",
  createdAt: "2026-08-28T12:00:00.000Z",
} as TradingOrder;

const filledOrder: TradingOrder = {
  id: "order-2",
  accountId: "account-1",
  instrumentId: "instrument-1",
  side: "BUY",
  quantity: "2",
  requestedPrice: "100",
  executedPrice: "101",
  status: "FILLED",
  createdAt: "2026-08-28T12:00:00.000Z",
} as TradingOrder;

const position: TradingPosition = {
  id: "position-1",
  accountId: "account-1",
  instrumentId: "instrument-1",
  side: "LONG",
  quantity: "1",
  averageEntryPrice: "100",
  stopLossPrice: null,
  takeProfitPrice: null,
  status: "OPEN",
} as TradingPosition;

const trade: TradingTrade = {
  id: "trade-1",
  accountId: "account-1",
  instrumentId: "instrument-1",
  side: "LONG",
  quantity: "1",
  entryPrice: "100",
  exitPrice: "101",
  realizedPnl: "1",
  closedAt: "2026-08-28T12:00:00.000Z",
} as TradingTrade;

function renderDock(
  overrides: Partial<{
    activeTab: TradingDockTab;
    orders: TradingOrder[];
    positions: TradingPosition[];
    isTradingActionPending: boolean;
    disabled: boolean;
    onCancelAllOrders: () => void;
    onClosePosition: (positionId: string) => void;
    onReversePosition: (positionId: string) => void;
    onFlattenAllPositions: () => void;
  }> = {},
) {
  const props = {
    accounts: [account],
    accountId: account.id,
    account,
    positions: overrides.positions ?? [],
    orders: overrides.orders ?? [],
    trades: [trade],
    currentPrices: {
      "instrument-1": 101,
    },
    instruments: {
      "instrument-1": {
        symbol: "TEST",
        tickSize: "0.01",
      },
    },
    onAccountChange: vi.fn(),
    activeTab: overrides.activeTab ?? "orders",
    onTabChange: vi.fn(),
    isLoading: false,
    disabled: overrides.disabled ?? false,
    onCancelAllOrders: overrides.onCancelAllOrders,
    onClosePosition: overrides.onClosePosition,
    onReversePosition: overrides.onReversePosition,
    onFlattenAllPositions: overrides.onFlattenAllPositions,
    isTradingActionPending:
      overrides.isTradingActionPending ?? false,
  };

  return render(<TradingBottomDock {...props} />);
}

describe("TradingBottomDock", () => {
  beforeEach(() => {
    confirmMock.mockReset();
    vi.stubGlobal("confirm", confirmMock);
  });

  it("renders the Orders tab and pending orders", () => {
    renderDock({
      orders: [pendingOrder],
      onCancelAllOrders: vi.fn(),
    });

    expect(
      screen.getByRole("button", { name: "Orders" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("TEST")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel All" }),
    ).toBeInTheDocument();
  });

  it("shows Cancel All only when at least one order is pending", () => {
    renderDock({
      orders: [filledOrder],
    });

    expect(
      screen.queryByRole("button", { name: "Cancel All" }),
    ).not.toBeInTheDocument();
  });

  it("does not cancel when confirmation is rejected", () => {
    const onCancelAllOrders = vi.fn();
    confirmMock.mockReturnValue(false);

    renderDock({
      orders: [pendingOrder],
      onCancelAllOrders,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Cancel All" }),
    );

    expect(confirmMock).toHaveBeenCalledWith(
      "Cancel all pending orders?",
    );
    expect(onCancelAllOrders).not.toHaveBeenCalled();
  });

  it("cancels all orders after confirmation", () => {
    const onCancelAllOrders = vi.fn();
    confirmMock.mockReturnValue(true);

    renderDock({
      orders: [pendingOrder],
      onCancelAllOrders,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Cancel All" }),
    );

    expect(confirmMock).toHaveBeenCalledWith(
      "Cancel all pending orders?",
    );
    expect(onCancelAllOrders).toHaveBeenCalledTimes(1);
  });

  it("does not render Cancel All without the callback", () => {
    renderDock({
      orders: [pendingOrder],
    });

    expect(
      screen.queryByRole("button", { name: "Cancel All" }),
    ).not.toBeInTheDocument();
  });

  it("disables Cancel All while a trading action is pending", () => {
    renderDock({
      orders: [pendingOrder],
      onCancelAllOrders: vi.fn(),
      isTradingActionPending: true,
    });

    expect(
      screen.getByRole("button", { name: "Cancelling…" }),
    ).toBeDisabled();
  });

  it("disables Cancel All when the dock is disabled", () => {
    renderDock({
      orders: [pendingOrder],
      onCancelAllOrders: vi.fn(),
      disabled: true,
    });

    expect(
      screen.getByRole("button", { name: "Cancel All" }),
    ).toBeDisabled();
  });

  it("renders Flatten All for open positions", () => {
    renderDock({
      activeTab: "positions",
      positions: [position],
      onFlattenAllPositions: vi.fn(),
    });

    expect(
      screen.getByRole("button", { name: "Flatten All" }),
    ).toBeInTheDocument();
  });

  it("confirms and closes an individual position", () => {
    const onClosePosition = vi.fn();
    confirmMock.mockReturnValue(true);

    renderDock({
      activeTab: "positions",
      positions: [position],
      onClosePosition,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Close position" }),
    );

    expect(confirmMock).toHaveBeenCalledWith(
      "Close TEST position?",
    );
    expect(onClosePosition).toHaveBeenCalledWith(
      "position-1",
    );
  });

  it("confirms and reverses an individual position", () => {
    const onReversePosition = vi.fn();
    confirmMock.mockReturnValue(true);

    renderDock({
      activeTab: "positions",
      positions: [position],
      onReversePosition,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Reverse" }),
    );

    expect(confirmMock).toHaveBeenCalledWith(
      "Reverse TEST position?",
    );
    expect(onReversePosition).toHaveBeenCalledWith(
      "position-1",
    );
  });

  it("confirms and flattens all positions", () => {
    const onFlattenAllPositions = vi.fn();
    confirmMock.mockReturnValue(true);

    renderDock({
      activeTab: "positions",
      positions: [position],
      onFlattenAllPositions,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Flatten All" }),
    );

    expect(confirmMock).toHaveBeenCalledWith(
      "Flatten all open positions?",
    );
    expect(onFlattenAllPositions).toHaveBeenCalledTimes(1);
  });
});
