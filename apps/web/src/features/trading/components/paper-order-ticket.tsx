"use client";

import {
  Minus,
  Plus,
  X,
} from "lucide-react";

import { Button } from "@rmsm/ui";

import type {
  TradingAccount,
  TradingOrderSide,
} from "../types";

interface PaperOrderTicketProps {
  account: TradingAccount | undefined;
  symbol: string;
  bidPrice: string | null | undefined;
  askPrice: string | null | undefined;
  quantity: string;
  onQuantityChange: (value: string) => void;
  onSubmit: (side: TradingOrderSide) => void;
  isPending?: boolean;
  errorMessage?: string | null;
  compact?: boolean;
  onClose?: () => void;
}

function formatPrice(
  value: string | null | undefined,
) {
  if (value == null) return "—";

  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("en-US", {
        maximumFractionDigits: 8,
      })
    : value;
}

function adjustQuantity(
  value: string,
  direction: "increase" | "decrease",
): string {
  const current = Number(value);

  if (!Number.isFinite(current)) {
    return "1";
  }

  const next =
    direction === "increase"
      ? current + 1
      : Math.max(1, current - 1);

  return Number.isInteger(next)
    ? String(next)
    : next.toFixed(2).replace(/\.?0+$/, "");
}

export function PaperOrderTicket({
  account,
  symbol,
  bidPrice,
  askPrice,
  quantity,
  onQuantityChange,
  onSubmit,
  isPending = false,
  errorMessage,
  compact = false,
  onClose,
}: PaperOrderTicketProps) {
  const disabled =
    !account ||
    !quantity.trim() ||
    isPending;

  return (
    <div
      className={
        compact
          ? "inline-flex items-center"
          : "w-[300px] rounded-xl border bg-background/95 shadow-2xl backdrop-blur"
      }
    >
      {!compact && (
        <div className="relative flex h-10 items-center border-b px-3">
          <span className="text-xs font-semibold">
            Quick
          </span>

          <span className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold">
            {symbol}
          </span>

          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close Quick trading ticket"
              title="Close"
              className="ml-auto h-7 w-7"
            >
              <X
                className="h-4 w-4"
                aria-hidden="true"
              />
            </Button>
          )}
        </div>
      )}

      <div
        className={
          compact
            ? "flex items-center gap-2"
            : "space-y-2.5 p-3"
        }
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            disabled={disabled}
            onClick={() => onSubmit("BUY")}
            className={
              compact
                ? "h-8 min-w-[72px] rounded-md bg-success px-2 text-[11px] font-bold uppercase tracking-wide text-success-foreground transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
                : "h-10 rounded-md bg-success px-3 text-xs font-bold uppercase tracking-wide text-success-foreground transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            Buy
          </Button>

          <div
            className={
              compact
                ? "flex h-8 items-center rounded-md border bg-muted/20"
                : "flex h-10 items-center rounded-md border bg-muted/20"
            }
          >
            <button
              type="button"
              disabled={Number(quantity) <= 1 || isPending}
              onClick={() =>
                onQuantityChange(
                  adjustQuantity(
                    quantity,
                    "decrease",
                  ),
                )
              }
              aria-label="Decrease lots"
              title="Decrease lots"
              className={
                compact
                  ? "flex h-full w-7 items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  : "flex h-full w-9 items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              }
            >
              <Minus
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />
            </button>

            <span
              className={
                compact
                  ? "min-w-[64px] px-1.5 text-center text-[11px] font-medium tabular-nums"
                  : "min-w-[72px] px-2 text-center text-xs font-medium tabular-nums"
              }
            >
              {quantity || "1"} lots
            </span>

            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                onQuantityChange(
                  adjustQuantity(
                    quantity,
                    "increase",
                  ),
                )
              }
              aria-label="Increase lots"
              title="Increase lots"
              className={
                compact
                  ? "flex h-full w-7 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  : "flex h-full w-9 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              }
            >
              <Plus
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onSubmit("SELL")}
            className={
              compact
                ? "h-8 min-w-[72px] rounded-md bg-destructive px-2 text-[11px] font-bold uppercase tracking-wide text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
                : "h-10 rounded-md bg-destructive px-3 text-xs font-bold uppercase tracking-wide text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            Sell
          </Button>
        </div>

        {!compact && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={bidPrice == null || isPending}
              onClick={() =>
                onQuantityChange(quantity || "1")
              }
              className="h-9 justify-between px-3 text-xs"
            >
              <span>Join Bid</span>
              <span className="font-mono tabular-nums">
                {formatPrice(bidPrice)}
              </span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={askPrice == null || isPending}
              onClick={() =>
                onQuantityChange(quantity || "1")
              }
              className="h-9 justify-between px-3 text-xs"
            >
              <span>Join Ask</span>
              <span className="font-mono tabular-nums">
                {formatPrice(askPrice)}
              </span>
            </Button>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
