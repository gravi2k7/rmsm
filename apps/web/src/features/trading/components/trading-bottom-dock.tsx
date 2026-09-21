"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import type {
  TradingAccount,
  TradingOrder,
  TradingPosition,
  TradingTrade,
} from "../types";
import { SimulatedAccountSelector } from "./simulated-account-selector";

export type TradingDockTab =
  | "accounts"
  | "positions"
  | "orders"
  | "trades";

interface TradingBottomDockProps {
  accounts: TradingAccount[];
  accountId: string;
  account?: TradingAccount;
  positions: TradingPosition[];
  orders: TradingOrder[];
  trades: TradingTrade[];
  currentPrices?: Record<string, number>;
  instruments?: Record<
    string,
    {
      symbol: string;
      tickSize?: string | null;
      lotSize?: string | null;
      currency?: string;
    }
  >;
  onAccountChange: (accountId: string) => void;
  activeTab: TradingDockTab;
  onTabChange: (tab: TradingDockTab) => void;
  isLoading?: boolean;
  disabled?: boolean;

  onCancelAllOrders?: () => void;
  onCancelOrder?: (orderId: string) => void;
  onPositionRiskChange?: (
    positionId: string,
    risk: {
      stopLossPrice: string | null;
      takeProfitPrice: string | null;
    },
  ) => void;
  onClosePosition?: (positionId: string) => void;
  onReversePosition?: (positionId: string) => void;
  onFlattenAllPositions?: () => void;
  isTradingActionPending?: boolean;
}

const tabs: Array<{
  value: TradingDockTab;
  label: string;
}> = [
  { value: "accounts", label: "Accounts" },
  { value: "positions", label: "Positions" },
  { value: "orders", label: "Orders" },
  { value: "trades", label: "Trades" },
];

export function TradingBottomDock({
  accounts,
  accountId,
  account,
  positions,
  orders,
  trades,
  currentPrices = {},
  instruments = {},
  onAccountChange,
  activeTab,
  onTabChange,
  isLoading = false,
  disabled = false,
  onCancelAllOrders,
  onCancelOrder,
  onPositionRiskChange,
  onClosePosition,
  onReversePosition,
  onFlattenAllPositions,
  isTradingActionPending = false,
}: TradingBottomDockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatMoney = (
    value: string | number | null | undefined,
    currency = "USD",
  ) => {
    if (value == null) {
      return "—";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "—";
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(number);
  };

  const formatNumber = (
    value: string | number | null | undefined,
    tickSize?: string | null,
  ) => {
    if (value == null) {
      return "—";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "—";
    }

    const tick = Number(tickSize);

    let fractionDigits = 2;

    if (Number.isFinite(tick) && tick > 0) {
      const tickText = tick
        .toFixed(12)
        .replace(/0+$/, "");

      const decimalIndex = tickText.indexOf(".");

      fractionDigits =
        decimalIndex === -1
          ? 0
          : tickText.length - decimalIndex - 1;
    }

    return number.toLocaleString("en-US", {
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits,
    });
  };

  const positionPnl = (
    position: TradingPosition,
  ) => {
    const currentPrice =
      currentPrices[position.instrumentId];

    const instrument =
      instruments[position.instrumentId];

    if (
      currentPrice == null ||
      !Number.isFinite(currentPrice) ||
      !instrument
    ) {
      return null;
    }

    const quantity = Number(position.quantity);
    const entry = Number(position.averageEntryPrice);
    const lotSize = Number(instrument.lotSize);

    if (
      !Number.isFinite(quantity) ||
      !Number.isFinite(entry) ||
      !Number.isFinite(lotSize) ||
      lotSize <= 0
    ) {
      return null;
    }

    const priceDelta =
      position.side === "LONG"
        ? currentPrice - entry
        : entry - currentPrice;

    const quoteCurrency =
      instrument.currency?.toUpperCase() ?? "USD";

    let conversionRate = 1;

    if (quoteCurrency !== "USD") {
      const conversionInstrumentId =
        quoteCurrency === "CAD"
          ? "4d24f270-0ea6-43b1-bdf6-06dc01e245ad"
          : quoteCurrency === "CHF"
            ? "8b6fd6ce-b62b-4625-b97c-e8bfce922a02"
            : quoteCurrency === "JPY"
              ? "5842a239-dee5-48f1-8add-7fb946b59e40"
              : null;

      const conversionPrice =
        conversionInstrumentId != null
          ? currentPrices[conversionInstrumentId]
          : null;

      if (
        conversionPrice == null ||
        !Number.isFinite(conversionPrice) ||
        conversionPrice <= 0
      ) {
        return null;
      }

      conversionRate = 1 / conversionPrice;
    }

    return (
      priceDelta *
      quantity *
      lotSize *
      conversionRate
    );
  };

  const renderAccounts = () => (
    <div className="grid gap-3 md:grid-cols-4">
      <div className="rounded-lg border px-3 py-2">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Account
        </div>
        <div className="mt-1 text-sm font-semibold">
          {account?.name ?? "—"}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {account?.currency ?? "USD"} · {account?.status ?? "—"}
        </div>
      </div>

      <div className="rounded-lg border px-3 py-2">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Balance
        </div>
        <div className="mt-1 text-sm font-semibold">
          {formatMoney(
            account?.balance,
            account?.currency ?? "USD",
          )}
        </div>
      </div>

      <div className="rounded-lg border px-3 py-2">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Open Positions
        </div>
        <div className="mt-1 text-sm font-semibold">
          {positions.filter(
            (position) => position.status === "OPEN",
          ).length}
        </div>
      </div>

      <div className="rounded-lg border px-3 py-2">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Trades
        </div>
        <div className="mt-1 text-sm font-semibold">
          {trades.length}
        </div>
      </div>
    </div>
  );

  const openPositions = positions.filter(
    (position) => position.status === "OPEN",
  );

  const renderPositions = () => (
    <div className="overflow-x-auto">
      <div className="mb-2 flex items-center justify-between gap-3 px-3">
        <div>
          <div className="text-xs font-semibold">
            Positions
          </div>

          <div className="text-[10px] text-muted-foreground">
            {openPositions.length} open position
            {positions.length === 1 ? "" : "s"}
          </div>
        </div>

        {positions.length > 0 &&
          onFlattenAllPositions && (
            <button
              type="button"
              className="rounded-md border border-destructive/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                disabled ||
                isTradingActionPending
              }
              onClick={() => {
                if (
                  window.confirm(
                    "Flatten all open positions?",
                  )
                ) {
                  onFlattenAllPositions();
                }
              }}
            >
              {isTradingActionPending
                ? "Flattening…"
                : "Flatten All"}
            </button>
          )}
      </div>

      {openPositions.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          No open positions.
        </div>
      ) : (
        <table className="w-full min-w-[1100px] text-xs">
          <thead>
            <tr className="border-b text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Instrument</th>
              <th className="px-3 py-2">Side</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Entry</th>
              <th className="px-3 py-2">Current</th>
              <th className="px-3 py-2">SL</th>
              <th className="px-3 py-2">TP</th>
              <th className="px-3 py-2 text-right">P&L</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {openPositions.map((position) => {
              const current =
                currentPrices[position.instrumentId];

              const instrument =
                instruments[position.instrumentId];

              const pnl = positionPnl(position);

              return (
                <tr
                  key={position.id}
                  className="border-b last:border-0"
                >
                  <td className="px-3 py-2 font-medium">
                    {instrument?.symbol ?? "—"}
                  </td>

                  <td
                    className={[
                      "px-3 py-2 font-semibold",
                      position.side === "LONG"
                        ? "text-success"
                        : "text-destructive",
                    ].join(" ")}
                  >
                    {position.side}
                  </td>

                  <td className="px-3 py-2">
                    {formatNumber(position.quantity)}
                  </td>

                  <td className="px-3 py-2">
                    {formatNumber(
                      position.averageEntryPrice,
                      instrument?.tickSize,
                    )}
                  </td>

                  <td className="px-3 py-2">
                    {formatNumber(
                      current,
                      instrument?.tickSize,
                    )}
                  </td>

                  <td className="px-3 py-2">
                    <div className="inline-flex items-center rounded-md border border-destructive/50 bg-background">
                      <span className="px-2 py-1 text-[10px] font-semibold text-destructive">
                        SL
                      </span>
                      <span className="px-2 py-1 text-destructive">
                        {formatNumber(
                          position.stopLossPrice,
                          instrument?.tickSize,
                        )}
                      </span>
                      {position.stopLossPrice != null &&
                        onPositionRiskChange && (
                          <button
                            type="button"
                            aria-label="Remove stop loss"
                            title="Remove stop loss"
                            className="border-l border-destructive/30 px-2 py-1 text-destructive transition-colors hover:bg-destructive/10"
                            disabled={
                              disabled ||
                              isTradingActionPending
                            }
                            onClick={() =>
                              onPositionRiskChange(
                                position.id,
                                {
                                  stopLossPrice: null,
                                  takeProfitPrice:
                                    position.takeProfitPrice,
                                },
                              )
                            }
                          >
                            ×
                          </button>
                        )}
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="inline-flex items-center rounded-md border border-success/50 bg-background">
                      <span className="px-2 py-1 text-[10px] font-semibold text-success">
                        TP
                      </span>
                      <span className="px-2 py-1 text-success">
                        {formatNumber(
                          position.takeProfitPrice,
                          instrument?.tickSize,
                        )}
                      </span>
                      {position.takeProfitPrice != null &&
                        onPositionRiskChange && (
                          <button
                            type="button"
                            aria-label="Remove take profit"
                            title="Remove take profit"
                            className="border-l border-success/30 px-2 py-1 text-success transition-colors hover:bg-success/10"
                            disabled={
                              disabled ||
                              isTradingActionPending
                            }
                            onClick={() =>
                              onPositionRiskChange(
                                position.id,
                                {
                                  stopLossPrice:
                                    position.stopLossPrice,
                                  takeProfitPrice: null,
                                },
                              )
                            }
                          >
                            ×
                          </button>
                        )}
                    </div>
                  </td>

                  <td
                    className={[
                      "px-3 py-2 text-right font-semibold",
                      pnl == null
                        ? "text-muted-foreground"
                        : pnl >= 0
                          ? "text-success"
                          : "text-destructive",
                    ].join(" ")}
                  >
                    {pnl == null
                      ? "—"
                      : `${pnl >= 0 ? "+" : ""}${formatMoney(
                          pnl,
                          account?.currency ?? "USD",
                        )}`}
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1.5">
                      {onClosePosition && (
                        <button
                          type="button"
                          aria-label="Close position"
                          title="Close position"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-destructive/50 text-base font-semibold leading-none text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={
                            disabled ||
                            isTradingActionPending
                          }
                          onClick={() => {
                            if (
                              window.confirm(
                                `Close ${instrument?.symbol ?? "Position"} position?`,
                              )
                            ) {
                              onClosePosition(
                                position.id,
                              );
                            }
                          }}
                        >
                          ×
                        </button>
                      )}

                      {onReversePosition && (
                        <button
                          type="button"
                          className="rounded-md border border-warning/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-warning transition-colors hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={
                            disabled ||
                            isTradingActionPending
                          }
                          onClick={() => {
                            if (
                              window.confirm(
                                `Reverse ${instrument?.symbol ?? "Position"} position?`,
                              )
                            ) {
                              onReversePosition(
                                position.id,
                              );
                            }
                          }}
                        >
                          Reverse
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderOrders = () => (
    <div className="overflow-x-auto">
      <div className="mb-2 flex items-center justify-between gap-3 px-3">
        <div>
          <div className="text-xs font-semibold">
            Orders
          </div>

          <div className="text-[10px] text-muted-foreground">
            {orders.length} order{orders.length === 1 ? "" : "s"}
          </div>
        </div>

        {orders.some((order) => order.status === "PENDING") &&
          onCancelAllOrders && (
            <button
              type="button"
              className="rounded-md border border-destructive/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                disabled ||
                isTradingActionPending
              }
              onClick={() => {
                if (
                  window.confirm(
                    "Cancel all pending orders?",
                  )
                ) {
                  onCancelAllOrders();
                }
              }}
            >
              {isTradingActionPending
                ? "Cancelling…"
                : "Cancel All"}
            </button>
          )}
      </div>

      {orders.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          No orders.
        </div>
      ) : (
        <table className="w-full min-w-[850px] text-xs">
          <thead>
            <tr className="border-b text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Instrument</th>
              <th className="px-3 py-2">Side</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Requested</th>
              <th className="px-3 py-2">Executed</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => {
              const instrument =
                instruments[order.instrumentId];

              return (
                <tr
                  key={order.id}
                  className="border-b last:border-0"
                >
                  <td className="px-3 py-2 font-medium">
                    {instrument?.symbol ?? "—"}
                  </td>

                  <td
                    className={[
                      "px-3 py-2 font-semibold",
                      order.side === "BUY"
                        ? "text-success"
                        : "text-destructive",
                    ].join(" ")}
                  >
                    {order.side}
                  </td>

                  <td className="px-3 py-2">
                    {formatNumber(order.quantity)}
                  </td>

                  <td className="px-3 py-2">
                    {formatNumber(
                      order.requestedPrice ??
                        (order.type === "LIMIT"
                          ? order.limitPrice
                          : order.stopPrice),
                      instrument?.tickSize,
                    )}
                  </td>

                  <td className="px-3 py-2">
                    {formatNumber(
                      order.executedPrice,
                      instrument?.tickSize,
                    )}
                  </td>

                  <td className="px-3 py-2">
                    <span
                      className={[
                        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        order.status === "PENDING"
                          ? "border-warning/40 text-warning"
                          : order.status === "FILLED"
                            ? "border-success/40 text-success"
                            : order.status === "REJECTED"
                              ? "border-destructive/40 text-destructive"
                              : "border-muted text-muted-foreground",
                      ].join(" ")}
                    >
                      {order.status}
                    </span>
                  </td>

                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(
                      order.createdAt,
                    ).toLocaleString()}
                  </td>
                
                  <td className="px-3 py-2 text-right">
                    {order.status === "PENDING" &&
                      onCancelOrder && (
                        <button
                          type="button"
                          aria-label="Cancel order"
                          title="Cancel order"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-destructive/50 text-base font-semibold leading-none text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={
                            disabled ||
                            isTradingActionPending
                          }
                          onClick={() => {
                            if (
                              window.confirm(
                                `Cancel ${order.type} ${order.side} order?`,
                              )
                            ) {
                              onCancelOrder(order.id);
                            }
                          }}
                        >
                          ×
                        </button>
                      )}
                  </td>
</tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderTrades = () => (
    <div className="h-full min-h-0 overflow-auto">
      {trades.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          No closed trades.
        </div>
      ) : (
        <table className="w-full min-w-[850px] text-xs">
          <thead>
            <tr className="border-b text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Instrument</th>
              <th className="px-3 py-2">Side</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Entry</th>
              <th className="px-3 py-2">Exit</th>
              <th className="px-3 py-2">Open Time</th>
              <th className="px-3 py-2 text-right">Realized P&L</th>
              <th className="px-3 py-2">Closed</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => {
              const instrument =
                instruments[trade.instrumentId];
              const pnl = Number(trade.realizedPnl);

              return (
                <tr
                  key={trade.id}
                  className="border-b last:border-0"
                >
                  <td className="px-3 py-2 font-medium">
                    {instrument?.symbol ?? "—"}
                  </td>
                  <td
                    className={[
                      "px-3 py-2 font-semibold",
                      trade.side === "LONG"
                        ? "text-success"
                        : "text-destructive",
                    ].join(" ")}
                  >
                    {trade.side}
                  </td>
                  <td className="px-3 py-2">
                    {formatNumber(trade.quantity)}
                  </td>
                  <td className="px-3 py-2">
                    {formatNumber(
                      trade.entryPrice,
                      instrument?.tickSize,
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {formatNumber(
                      trade.exitPrice,
                      instrument?.tickSize,
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(
                      trade.openedAt,
                    ).toLocaleString()}
                  </td>
                  <td
                    className={[
                      "px-3 py-2 text-right font-semibold",
                      Number.isFinite(pnl) && pnl >= 0
                        ? "text-success"
                        : "text-destructive",
                    ].join(" ")}
                  >
                    {Number.isFinite(pnl)
                      ? `${pnl >= 0 ? "+" : ""}${formatMoney(
                          pnl,
                          account?.currency ?? "USD",
                        )}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(
                      trade.closedAt,
                    ).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div
      className={`pointer-events-auto relative flex w-full min-h-0 flex-col overflow-visible rounded-xl border bg-background/95 shadow-2xl backdrop-blur transition-[height] duration-200 ${
        isExpanded ? "h-[420px]" : "h-[190px]"
      }`}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        className="absolute -top-3 left-1/2 z-30 flex h-6 w-10 -translate-x-1/2 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label={
          isExpanded
            ? "Collapse bottom trading dock"
            : "Expand bottom trading dock"
        }
        title={
          isExpanded
            ? "Collapse bottom trading dock"
            : "Expand bottom trading dock"
        }
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>

      <div className="flex min-h-12 shrink-0 items-center gap-2 px-2 pt-2">
        <SimulatedAccountSelector
          accounts={accounts}
          value={accountId}
          onChange={onAccountChange}
          isLoading={isLoading}
          disabled={disabled}
        />

        <div className="h-6 w-px bg-border" />

        <nav
          aria-label="Trading workspace"
          className="flex min-w-0 flex-1 items-center overflow-x-auto"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                aria-pressed={active}
                onClick={() => onTabChange(tab.value)}
                className={[
                  "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-success text-success-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
          Paper
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto border-t px-2 py-3">
        {activeTab === "accounts" && renderAccounts()}
        {activeTab === "positions" && renderPositions()}
        {activeTab === "orders" && renderOrders()}
        {activeTab === "trades" && renderTrades()}
      </div>
    </div>
  );
}

