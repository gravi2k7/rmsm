"use client";

import * as React from "react";
import { Alert, AlertDescription, Button, Input } from "@rmsm/ui";

import type {
  TradingAccount,
  TradingOrderSide,
  TradingOrderType,
} from "../types";

interface OrderTicketProps {
  account: TradingAccount | undefined;
  symbol: string;
  instrumentName?: string;
  tickSize?: string | null;
  bidPrice: string | null | undefined;
  askPrice: string | null | undefined;
  quantity: string;
  onQuantityChange: (value: string) => void;
  orderType: TradingOrderType;
  onOrderTypeChange: (value: TradingOrderType) => void;
  limitPrice: string;
  onLimitPriceChange: (value: string) => void;
  stopPrice: string;
  onStopPriceChange: (value: string) => void;
  onSubmit: (
    side: TradingOrderSide,
    stopLossPrice?: string | null,
    takeProfitPrice?: string | null,
  ) => void;
  requestedSide?: TradingOrderSide | null;
  isPending?: boolean;
  errorMessage?: string | null;
}

function formatPrice(value: string | null | undefined) {
  if (value == null || value === "") {
    return "—";
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 8,
      })
    : value;
}

function adjustQuantity(
  quantity: string,
  delta: number,
  onChange: (value: string) => void,
) {
  const current = Number(quantity);

  if (!Number.isFinite(current)) {
    onChange(delta > 0 ? "1" : "1");
    return;
  }

  const next = Math.max(1, current + delta);

  onChange(String(next));
}

export function OrderTicket({
  account,
  symbol,
  instrumentName,
  tickSize,
  bidPrice,
  askPrice,
  quantity,
  onQuantityChange,
  orderType,
  onOrderTypeChange,
  limitPrice,
  onLimitPriceChange,
  stopPrice,
  onStopPriceChange,
  onSubmit,
  requestedSide = null,
  isPending = false,
  errorMessage,
}: OrderTicketProps) {
  const [selectedSide, setSelectedSide] =
    React.useState<TradingOrderSide | null>(null);

  React.useEffect(() => {
    if (requestedSide != null) {
      setSelectedSide(requestedSide);
    }
  }, [requestedSide]);

  const [stopLossEnabled, setStopLossEnabled] =
    React.useState(false);

  const [trailEnabled, setTrailEnabled] =
    React.useState(false);

  const [takeProfitEnabled, setTakeProfitEnabled] =
    React.useState(false);

  const [stopLossTicks, setStopLossTicks] =
    React.useState("20");

  const [stopLossPrice, setStopLossPrice] =
    React.useState("");

  const [trailTicks, setTrailTicks] =
    React.useState("20");

  const [takeProfitTicks, setTakeProfitTicks] =
    React.useState("10");

  const [takeProfitPrice, setTakeProfitPrice] =
    React.useState("");

  const riskBasePrice = React.useMemo(() => {
    if (orderType === "LIMIT") {
      const value = Number(limitPrice);
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }

    if (orderType === "STOP") {
      const value = Number(stopPrice);
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }

    if (selectedSide === "SELL") {
      const value = Number(bidPrice);
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }

    const value = Number(askPrice);
    return Number.isFinite(value) && value > 0 ? value : null;
  }, [
    askPrice,
    bidPrice,
    limitPrice,
    orderType,
    selectedSide,
    stopPrice,
  ]);

  const tick = Number(tickSize);
  const validTickSize = Number.isFinite(tick) && tick > 0;

  const estimatedMargin = React.useMemo(() => {
    const price = riskBasePrice;
    const qty = Number(quantity);
    const leverage = Number(account?.leverage);

    if (
      price == null ||
      !Number.isFinite(price) ||
      !Number.isFinite(qty) ||
      qty <= 0 ||
      !Number.isFinite(leverage) ||
      leverage <= 0
    ) {
      return null;
    }

    return (price * qty) / leverage;
  }, [account?.leverage, quantity, riskBasePrice]);

  function formatMargin(value: number | null) {
    if (value == null || !Number.isFinite(value)) {
      return "—";
    }

    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatRiskPoints(ticks: string) {
    const value = Number(ticks);

    if (!Number.isFinite(value) || !validTickSize) {
      return "—";
    }

    return `${formatRiskInput(Math.abs(value * tick))} pts`;
  }

  function roundToTick(value: number) {
    if (!validTickSize) return value;
    return Math.round(value / tick) * tick;
  }

  function formatRiskInput(value: number) {
    if (!Number.isFinite(value)) return "";
    return String(Number(value.toFixed(8)));
  }

  function calculateRiskPrice(
    side: TradingOrderSide,
    kind: "SL" | "TP",
    ticks: string,
  ) {
    if (riskBasePrice == null || !validTickSize) {
      return "";
    }

    const distance = Number(ticks);
    if (!Number.isFinite(distance) || distance < 0) {
      return "";
    }

    const direction =
      kind === "SL"
        ? side === "BUY"
          ? -1
          : 1
        : side === "BUY"
          ? 1
          : -1;

    return formatRiskInput(
      roundToTick(
        riskBasePrice + direction * distance * tick,
      ),
    );
  }

  function calculateRiskTicks(
    price: string,
  ) {
    if (
      riskBasePrice == null ||
      !validTickSize
    ) {
      return "";
    }

    const value = Number(price);
    if (!Number.isFinite(value)) {
      return "";
    }

    return String(
      Math.max(
        0,
        Math.round(
          Math.abs(value - riskBasePrice) / tick,
        ),
      ),
    );
  }

  React.useEffect(() => {
    if (selectedSide == null) {
      return;
    }

    if (stopLossEnabled) {
      const next = calculateRiskPrice(
        selectedSide,
        "SL",
        stopLossTicks,
      );
      if (next) {
        setStopLossPrice(next);
      }
    }

    if (takeProfitEnabled) {
      const next = calculateRiskPrice(
        selectedSide,
        "TP",
        takeProfitTicks,
      );
      if (next) {
        setTakeProfitPrice(next);
      }
    }
  }, [
    limitPrice,
    orderType,
    selectedSide,
    stopPrice,
    stopLossEnabled,
    stopLossTicks,
    takeProfitEnabled,
    takeProfitTicks,
    tickSize,
  ]);

  const quantityValid =
    quantity.trim() !== "" &&
    Number.isFinite(Number(quantity)) &&
    Number(quantity) > 0;

  const limitValid =
    orderType !== "LIMIT" &&
    orderType !== "STOP_LIMIT"
      ? true
      : limitPrice.trim() !== "" &&
        Number.isFinite(Number(limitPrice)) &&
        Number(limitPrice) > 0;

  const stopValid =
    orderType !== "STOP" &&
    orderType !== "STOP_LIMIT"
      ? true
      : stopPrice.trim() !== "" &&
        Number.isFinite(Number(stopPrice)) &&
        Number(stopPrice) > 0;

    const canConfirm =
      Boolean(account) &&
      Boolean(selectedSide) &&
      quantityValid &&
      limitValid &&
      stopValid &&
      !isPending &&
      (
        orderType === "MARKET" ||
        orderType === "LIMIT" ||
        orderType === "STOP"
      );

  function handleCancel() {
    setSelectedSide(null);
    setStopLossEnabled(false);
    setTrailEnabled(false);
    setTakeProfitEnabled(false);
    setStopLossPrice("");
    setTakeProfitPrice("");
  }

  return (
    <div
      role="region"
      aria-label="Order"
      className="w-full"
    >
      <div className="space-y-3 p-3">
        {/* Instrument */}
        <div className="flex min-w-0 items-start justify-between border-b border-border/70 pb-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              {symbol}
            </div>

            <div className="mt-1 truncate text-[11px] text-muted-foreground">
              {instrumentName}
            </div>
          </div>

          <button
            type="button"
            aria-label={`Favorite ${symbol}`}
            className="ml-2 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            ★
          </button>
        </div>

        {/* Buy / Spread / Sell */}
        <div className="grid grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] items-stretch gap-2">
          <button
            type="button"
            aria-pressed={selectedSide === "BUY"}
            onClick={() => setSelectedSide("BUY")}
            className={[
              "h-16 min-w-0 overflow-hidden rounded-md border px-3 py-2 text-left transition-colors",
              selectedSide === "BUY"
                ? "border-success bg-success text-success-foreground hover:bg-success/90"
                : "border-success/50 bg-success/5 text-foreground hover:bg-success/10",
              "disabled:cursor-not-allowed disabled:opacity-50",
            ].join(" ")}
          >
            <div className="text-xs font-bold uppercase tracking-wide">
              Buy
            </div>

            <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-success/80">
              ASK
            </div>

            <div className="mt-0.5 truncate text-sm font-semibold tabular-nums">
              {formatPrice(askPrice)}
            </div>
          </button>

          <div
            aria-label="Spread"
            className="flex h-16 min-w-0 flex-col items-center justify-center rounded-md border border-border bg-background/60 px-1"
          >
            <div className="text-xs font-semibold tabular-nums text-foreground">
              {formatPrice(
                bidPrice != null && askPrice != null
                  ? String(Number(askPrice) - Number(bidPrice))
                  : null,
              )}
            </div>
            <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">
              Spread
            </div>
          </div>

          <button
            type="button"
            aria-pressed={selectedSide === "SELL"}
            onClick={() => setSelectedSide("SELL")}
            className={[
              "h-16 min-w-0 overflow-hidden rounded-md border px-3 py-2 text-left transition-colors",
              selectedSide === "SELL"
                ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "border-destructive/50 bg-destructive/5 text-foreground hover:bg-destructive/10",
              "disabled:cursor-not-allowed disabled:opacity-50",
            ].join(" ")}
          >
            <div className="text-xs font-bold uppercase tracking-wide">
              Sell
            </div>

            <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-destructive/80">
              BID
            </div>

            <div className="mt-0.5 truncate text-sm font-semibold tabular-nums">
              {formatPrice(bidPrice)}
            </div>
          </button>
        </div>

        {/* Order type */}
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["MARKET", "Market"],
              ["LIMIT", "Limit"],
              ["STOP", "Stop"],
            ] as const
          ).map(([value, label]) => {
            const active = orderType === value;

            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onOrderTypeChange(
                    value as TradingOrderType,
                  )
                }
                className={[
                  "h-9 rounded-md border text-xs font-semibold uppercase tracking-wide transition-colors",
                  active
                    ? "border-success bg-success text-success-foreground"
                    : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>


        {orderType === "LIMIT" && (
          <div>
            <label
              htmlFor="order-limit-price"
              className="mb-1.5 block text-xs text-muted-foreground"
            >
              Limit Price
            </label>

            <Input
              id="order-limit-price"
              inputMode="decimal"
              value={limitPrice}
              onChange={(event) =>
                onLimitPriceChange(event.target.value)
              }
              placeholder={formatPrice(
                selectedSide === "SELL"
                  ? bidPrice
                  : askPrice,
              )}
              className="h-10 tabular-nums"
            />
          </div>
        )}

        {orderType === "STOP" && (
          <div>
            <label
              htmlFor="order-stop-price"
              className="mb-1.5 block text-xs text-muted-foreground"
            >
              Stop Price
            </label>

            <Input
              id="order-stop-price"
              inputMode="decimal"
              value={stopPrice}
              onChange={(event) =>
                onStopPriceChange(event.target.value)
              }
              placeholder={formatPrice(
                selectedSide === "SELL"
                  ? bidPrice
                  : askPrice,
              )}
              className="h-10 tabular-nums"
            />
          </div>
        )}

        {/* Quantity */}
        <div className="space-y-2">
          <div>
            <div className="mb-1.5 text-xs text-muted-foreground">
              Quantity
            </div>

            <div className="flex items-center gap-2">
              <Input
                id="order-quantity"
                aria-label="Quantity"
                inputMode="decimal"
                value={quantity}
                onChange={(event) =>
                  onQuantityChange(event.target.value)
                }
                className="h-9 flex-1 tabular-nums"
              />

              <Button
                type="button"
                variant="outline"
                aria-label="Decrease quantity"
                className="h-9 w-9 shrink-0 px-0 text-base"
                onClick={() =>
                  adjustQuantity(
                    quantity,
                    -1,
                    onQuantityChange,
                  )
                }
              >
                −
              </Button>

              <Button
                type="button"
                variant="outline"
                aria-label="Increase quantity"
                className="h-9 w-9 shrink-0 px-0 text-base"
                onClick={() =>
                  adjustQuantity(
                    quantity,
                    1,
                    onQuantityChange,
                  )
                }
              >
                +
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Estimated Margin
            </span>
            <span className="tabular-nums text-muted-foreground">
              {formatMargin(estimatedMargin)}
            </span>
          </div>
        </div>

        {/* Stop Loss */}
        <div className="border-b py-2 last:border-b-0">
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={stopLossEnabled}
              onChange={(event) => {
                const enabled = event.target.checked;
                setStopLossEnabled(enabled);

                if (enabled && selectedSide) {
                  const next = calculateRiskPrice(
                    selectedSide,
                    "SL",
                    stopLossTicks,
                  );
                  setStopLossPrice(next);
                } else {
                  setStopLossPrice("");
                }
              }}
              className="h-4 w-4 rounded border-border"
            />
            <span>Stop Loss</span>
          </label>

          {stopLossEnabled && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Input
                  aria-label="Stop loss price"
                  inputMode="decimal"
                  value={stopLossPrice}
                  onChange={(event) => {
                    const value = event.target.value;
                    setStopLossPrice(value);

                    const nextTicks =
                      calculateRiskTicks(value);
                    if (nextTicks !== "") {
                      setStopLossTicks(nextTicks);
                    }
                  }}
                  className="h-9 min-w-0 flex-1 tabular-nums"
                  placeholder="Price"
                />

                <Button
                  type="button"
                  variant="outline"
                  aria-label="Decrease stop loss"
                  disabled={!validTickSize}
                  className="h-9 w-9 shrink-0 px-0"
                  onClick={() => {
                    const nextTicks = String(
                      Math.max(
                        0,
                        Number(stopLossTicks || "0") - 1,
                      ),
                    );
                    setStopLossTicks(nextTicks);

                    if (selectedSide) {
                      setStopLossPrice(
                        calculateRiskPrice(
                          selectedSide,
                          "SL",
                          nextTicks,
                        ),
                      );
                    }
                  }}
                >
                  −
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  aria-label="Increase stop loss"
                  disabled={!validTickSize}
                  className="h-9 w-9 shrink-0 px-0"
                  onClick={() => {
                    const nextTicks = String(
                      Math.max(
                        0,
                        Number(stopLossTicks || "0") + 1,
                      ),
                    );
                    setStopLossTicks(nextTicks);

                    if (selectedSide) {
                      setStopLossPrice(
                        calculateRiskPrice(
                          selectedSide,
                          "SL",
                          nextTicks,
                        ),
                      );
                    }
                  }}
                >
                  +
                </Button>

                <span className="w-14 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                  {formatRiskPoints(stopLossTicks)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Trail */}
        <div className="border-b py-2 last:border-b-0">
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={trailEnabled}
              onChange={(event) =>
                setTrailEnabled(event.target.checked)
              }
              className="h-4 w-4 rounded border-border"
            />
            <span>Trailing Stop</span>
          </label>

          {trailEnabled && (
            <div className="mt-2 flex items-center gap-1.5">
              <Input
                aria-label="Trailing stop ticks"
                inputMode="numeric"
                value={trailTicks}
                onChange={(event) =>
                  setTrailTicks(event.target.value)
                }
                className="h-9 min-w-0 flex-1 tabular-nums"
              />

              <Button
                type="button"
                variant="outline"
                aria-label="Decrease trailing stop"
                disabled={!validTickSize}
                className="h-9 w-9 shrink-0 px-0"
                onClick={() =>
                  setTrailTicks(
                    String(
                      Math.max(
                        0,
                        Number(trailTicks || "0") - 1,
                      ),
                    ),
                  )
                }
              >
                −
              </Button>

              <Button
                type="button"
                variant="outline"
                aria-label="Increase trailing stop"
                disabled={!validTickSize}
                className="h-9 w-9 shrink-0 px-0"
                onClick={() =>
                  setTrailTicks(
                    String(
                      Math.max(
                        0,
                        Number(trailTicks || "0") + 1,
                      ),
                    ),
                  )
                }
              >
                +
              </Button>

              <span className="w-14 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                {formatRiskPoints(trailTicks)}
              </span>
            </div>
          )}
        </div>

        {/* Take Profit */}
        <div className="border-b py-2 last:border-b-0">
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={takeProfitEnabled}
              onChange={(event) => {
                const enabled = event.target.checked;
                setTakeProfitEnabled(enabled);

                if (enabled && selectedSide) {
                  const next = calculateRiskPrice(
                    selectedSide,
                    "TP",
                    takeProfitTicks,
                  );
                  setTakeProfitPrice(next);
                } else {
                  setTakeProfitPrice("");
                }
              }}
              className="h-4 w-4 rounded border-border"
            />
            <span>Take Profit</span>
          </label>

          {takeProfitEnabled && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Input
                  aria-label="Take profit price"
                  inputMode="decimal"
                  value={takeProfitPrice}
                  onChange={(event) => {
                    const value = event.target.value;
                    setTakeProfitPrice(value);

                    const nextTicks =
                      calculateRiskTicks(value);
                    if (nextTicks !== "") {
                      setTakeProfitTicks(nextTicks);
                    }
                  }}
                  className="h-9 min-w-0 flex-1 tabular-nums"
                  placeholder="Price"
                />

                <Button
                  type="button"
                  variant="outline"
                  aria-label="Decrease take profit"
                  disabled={!validTickSize}
                  className="h-9 w-9 shrink-0 px-0"
                  onClick={() => {
                    const nextTicks = String(
                      Math.max(
                        0,
                        Number(takeProfitTicks || "0") - 1,
                      ),
                    );
                    setTakeProfitTicks(nextTicks);

                    if (selectedSide) {
                      setTakeProfitPrice(
                        calculateRiskPrice(
                          selectedSide,
                          "TP",
                          nextTicks,
                        ),
                      );
                    }
                  }}
                >
                  −
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  aria-label="Increase take profit"
                  disabled={!validTickSize}
                  className="h-9 w-9 shrink-0 px-0"
                  onClick={() => {
                    const nextTicks = String(
                      Math.max(
                        0,
                        Number(takeProfitTicks || "0") + 1,
                      ),
                    );
                    setTakeProfitTicks(nextTicks);

                    if (selectedSide) {
                      setTakeProfitPrice(
                        calculateRiskPrice(
                          selectedSide,
                          "TP",
                          nextTicks,
                        ),
                      );
                    }
                  }}
                >
                  +
                </Button>

                <span className="w-14 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                  {formatRiskPoints(takeProfitTicks)}
                </span>
              </div>
            </div>
          )}
        </div>

        {errorMessage && (
          <Alert
            variant="destructive"
            className="py-2"
          >
            <AlertDescription className="text-xs">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}


        {/* Actions */}
        <div className="space-y-2 pt-1">
          <Button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              if (selectedSide) {
                onSubmit(
                  selectedSide,
                  stopLossEnabled
                    ? stopLossPrice || null
                    : null,
                  takeProfitEnabled
                    ? takeProfitPrice || null
                    : null,
                );
              }
            }}
            className={[
              "h-10 w-full rounded-md text-xs font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              selectedSide === "SELL"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-success text-success-foreground hover:bg-success/90",
            ].join(" ")}
          >
            {isPending ? "Submitting..." : "Confirm"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="h-10 w-full rounded-md text-xs font-semibold uppercase tracking-wide"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
