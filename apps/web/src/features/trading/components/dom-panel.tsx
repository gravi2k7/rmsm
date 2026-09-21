"use client";

import type { TradingPosition } from "../types";
import type { MarketDepth } from "@/features/market/hooks/use-market-realtime";

interface DomPanelProps {
  symbol: string;
  depth: MarketDepth | null;

  quantity?: string;
  onQuantityChange?: (value: string) => void;
  onSubmit?: (side: "BUY" | "SELL") => void;

  currentPosition?: TradingPosition;
  onClosePosition?: (positionId: string) => void;
  onReversePosition?: (positionId: string) => void;
  onCancelAllOrders?: () => void;
  onFlattenAllPositions?: () => void;

  isPending?: boolean;
  errorMessage?: string | null;
}

function formatPrice(value: string): string {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("en-US", {
        maximumFractionDigits: 8,
      })
    : value;
}

function formatSize(value: string | undefined): string {
  if (value == null) {
    return "—";
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("en-US", {
        maximumFractionDigits: 8,
      })
    : value;
}

function maxSize(
  levels: readonly {
    price: string;
    size?: string;
  }[],
): number {
  return levels.reduce((maximum, level) => {
    const size = Number(level.size);

    return Number.isFinite(size)
      ? Math.max(maximum, size)
      : maximum;
  }, 0);
}

function DepthRow({
  side,
  price,
  size,
  maximumSize,
  isBest,
}: {
  side: "BID" | "ASK";
  price: string;
  size?: string;
  maximumSize: number;
  isBest?: boolean;
}) {
  const numericSize = Number(size);

  const width =
    maximumSize > 0 &&
    Number.isFinite(numericSize) &&
    numericSize > 0
      ? Math.min(100, Math.max(0, (numericSize / maximumSize) * 100))
      : 0;

  return (
    <div
      className={[
        "relative grid h-7 grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)]",
        "items-center border-b border-border/30 text-[11px] tabular-nums",
        isBest ? "bg-muted/40" : "",
      ].join(" ")}
    >
      {/* BID SIZE */}
      <div className="relative h-full overflow-hidden text-right">
        {side === "BID" && width > 0 && (
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 bg-success/20"
            style={{ width: `${width}%` }}
          />
        )}

        {side === "BID" && (
          <span className="relative z-10 px-2 font-medium text-success">
            {formatSize(size)}
          </span>
        )}
      </div>

      {/* PRICE */}
      <div
        className={[
          "relative flex h-full items-center justify-center border-x",
          "border-border/40 font-medium",
          isBest
            ? side === "ASK"
              ? "text-destructive"
              : "text-success"
            : "text-foreground",
        ].join(" ")}
      >
        {formatPrice(price)}
      </div>

      {/* ASK SIZE */}
      <div className="relative h-full overflow-hidden">
        {side === "ASK" && width > 0 && (
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 bg-destructive/20"
            style={{ width: `${width}%` }}
          />
        )}

        {side === "ASK" && (
          <span className="relative z-10 px-2 font-medium text-destructive">
            {formatSize(size)}
          </span>
        )}
      </div>
    </div>
  );
}

export function DomPanel({
  symbol,
  depth,
  quantity = "1",
  onQuantityChange,
  onSubmit,
  currentPosition,
  onClosePosition,
  onReversePosition,
  onCancelAllOrders,
  onFlattenAllPositions,
  isPending = false,
  errorMessage,
}: DomPanelProps) {
  const asks = depth?.asks ?? [];
  const bids = depth?.bids ?? [];

  const orderedAsks = [...asks].sort(
    (a, b) => Number(b.price) - Number(a.price),
  );

  const orderedBids = [...bids].sort(
    (a, b) => Number(b.price) - Number(a.price),
  );

  /*
   * DOM display limit:
   * - show the 10 asks closest to the market
   * - show the 10 highest bids
   *
   * Keep the full live depth arrays untouched. This is only
   * a presentation limit for the ladder.
   */
  const visibleAsks = orderedAsks.slice(-10);
  const visibleBids = orderedBids.slice(0, 10);

  const maximumSize = Math.max(
    maxSize(visibleAsks),
    maxSize(visibleBids),
  );

  const bestAsk = visibleAsks.length
    ? visibleAsks[visibleAsks.length - 1]
    : undefined;

  const bestBid = visibleBids[0];

  const position = currentPosition;

  return (
    <div
      role="region"
      aria-label="DOM"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="shrink-0 border-b border-border/70">
        <div className="flex items-start justify-between px-3 py-2.5">
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              {symbol}
            </div>

            <div className="mt-0.5 text-[10px] text-muted-foreground">
              US Tech 100
            </div>
          </div>

          <span
            aria-label="Favorite instrument"
            className="text-muted-foreground"
          >
            ★
          </span>
        </div>

        {depth && (
          <div className="grid grid-cols-3 border-t border-border/50 text-center">
            <div className="px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                Bid
              </div>

              <div className="mt-0.5 text-xs font-semibold tabular-nums text-success">
                {bestBid ? formatPrice(bestBid.price) : "—"}
              </div>
            </div>

            <div className="border-x border-border/50 px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                Spread
              </div>

              <div className="mt-0.5 text-xs font-semibold tabular-nums">
                {bestBid && bestAsk
                  ? formatPrice(
                      String(
                        Number(bestAsk.price) - Number(bestBid.price),
                      ),
                    )
                  : "—"}
              </div>
            </div>

            <div className="px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                Ask
              </div>

              <div className="mt-0.5 text-xs font-semibold tabular-nums text-destructive">
                {bestAsk ? formatPrice(bestAsk.price) : "—"}
              </div>
            </div>
          </div>
        )}
      </div>

      {!depth ? (
        <div className="p-4 text-xs text-muted-foreground">
          Waiting for market depth…
        </div>
      ) : (
        <>
          <div className="shrink-0">
            <div className="grid h-7 grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] items-center border-b border-border/70 bg-muted/20 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="px-2 text-right">Bid Size</span>

              <span className="border-x border-border/40 px-2 text-center">
                Price
              </span>

              <span className="px-2">Ask Size</span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {orderedAsks.length > 0 && (
              <div>
                {visibleAsks.map((level) => (
                  <DepthRow
                    key={`ask-${level.price}`}
                    side="ASK"
                    price={level.price}
                    size={level.size}
                    maximumSize={maximumSize}
                    isBest={bestAsk?.price === level.price}
                  />
                ))}
              </div>
            )}

            {orderedBids.length > 0 && (
              <div className="border-t border-border/70">
                {visibleBids.map((level) => (
                  <DepthRow
                    key={`bid-${level.price}`}
                    side="BID"
                    price={level.price}
                    size={level.size}
                    maximumSize={maximumSize}
                    isBest={bestBid?.price === level.price}
                  />
                ))}
              </div>
            )}

            {orderedAsks.length === 0 &&
              orderedBids.length === 0 && (
                <div className="p-4 text-xs text-muted-foreground">
                  No depth levels available.
                </div>
              )}
          </div>
        </>
      )}

      {(onSubmit ||
        onClosePosition ||
        onReversePosition ||
        onCancelAllOrders ||
        onFlattenAllPositions) && (
        <div className="border-t p-3">
          {onSubmit && (
            <>
              <label
                htmlFor="dom-quantity"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Quantity
              </label>

              <div className="mb-2 flex h-9 items-center rounded-md border bg-background">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  title="Decrease quantity"
                  disabled={
                    isPending ||
                    !onQuantityChange ||
                    Number(quantity) <= 1
                  }
                  onClick={() => {
                    const current = Number(quantity);
              
                    onQuantityChange?.(
                      Number.isFinite(current)
                        ? String(Math.max(1, current - 1))
                        : "1",
                    );
                  }}
                  className="flex h-full w-9 items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  −
                </button>
              
                <input
                  id="dom-quantity"
                  aria-label="Quantity"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(event) =>
                    onQuantityChange?.(
                      event.target.value,
                    )
                  }
                  disabled={isPending}
                  className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-center text-sm tabular-nums outline-none focus:ring-0 disabled:opacity-50"
                />
              
                <button
                  type="button"
                  aria-label="Increase quantity"
                  title="Increase quantity"
                  disabled={
                    isPending ||
                    !onQuantityChange
                  }
                  onClick={() => {
                    const current = Number(quantity);
              
                    onQuantityChange?.(
                      Number.isFinite(current)
                        ? String(current + 1)
                        : "1",
                    );
                  }}
                  className="flex h-full w-9 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  +
                </button>
              </div>

              <div className="mb-2 flex h-9 items-center justify-between rounded-md border bg-background/50 px-2.5">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex h-4 w-4 items-center justify-center rounded border border-muted-foreground/50 text-[9px] text-muted-foreground"
                  >
                    □
                  </span>

                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Position Bracket
                  </span>
                </div>

                <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                  Disabled
                  <span aria-hidden="true">⌄</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-label={`Buy ${symbol}`}
                  disabled={isPending}
                  onClick={() => onSubmit("BUY")}
                  className="h-10 rounded-md bg-success px-3 text-xs font-bold uppercase tracking-wide text-success-foreground transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "…" : "BUY MARKET"}
                </button>

                <button
                  type="button"
                  aria-label={`Sell ${symbol}`}
                  disabled={isPending}
                  onClick={() => onSubmit("SELL")}
                  className="h-10 rounded-md bg-destructive px-3 text-xs font-bold uppercase tracking-wide text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "…" : "SELL MARKET"}
                </button>
              </div>
            </>
          )}

          {position && (
            <div className="mt-3 rounded-md border bg-background/30 p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Position
                </span>

                <span
                  className={[
                    "text-xs font-bold",
                    position.side === "LONG"
                      ? "text-success"
                      : "text-destructive",
                  ].join(" ")}
                >
                  {position.side}{" "}
                  {formatSize(
                    position.quantity,
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {onClosePosition && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Close ${symbol} position?`,
                        )
                      ) {
                        onClosePosition(
                          position.id,
                        );
                      }
                    }}
                    className="h-9 rounded-md border px-2 text-[10px] font-bold uppercase tracking-wide transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Close
                  </button>
                )}

                {onReversePosition && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Reverse ${symbol} position?`,
                        )
                      ) {
                        onReversePosition(
                          position.id,
                        );
                      }
                    }}
                    className="h-9 rounded-md border border-warning/40 px-2 text-[10px] font-bold uppercase tracking-wide text-warning transition-colors hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reverse
                  </button>
                )}
              </div>
            </div>
          )}

          {(onCancelAllOrders ||
            onFlattenAllPositions) && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {onCancelAllOrders && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Cancel all pending orders?",
                      )
                    ) {
                      onCancelAllOrders();
                    }
                  }}
                  className="h-9 rounded-md border border-destructive/40 px-2 text-[10px] font-bold uppercase tracking-wide text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel All
                </button>
              )}

              {onFlattenAllPositions && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Flatten all open positions?",
                      )
                    ) {
                      onFlattenAllPositions();
                    }
                  }}
                  className="h-9 rounded-md border border-destructive/40 px-2 text-[10px] font-bold uppercase tracking-wide text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Flatten All
                </button>
              )}
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-[10px] text-destructive"
            >
              {errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
