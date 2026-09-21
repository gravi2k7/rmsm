"use client";

import type {
  TradingAccount,
  TradingOrderSide,
} from "../types";
import { PaperOrderTicket } from "./paper-order-ticket";

interface QuickTradingFloatProps {
  account: TradingAccount;

  symbol: string;
  bidPrice: string | null | undefined;
  askPrice: string | null | undefined;

  quantity: string;
  onQuantityChange: (value: string) => void;
  onSubmit: (side: TradingOrderSide) => void;

  isPending?: boolean;
  errorMessage?: string | null;
}

export function QuickTradingFloat({
  account,
  symbol,
  bidPrice,
  askPrice,
  quantity,
  onQuantityChange,
  onSubmit,
  isPending = false,
  errorMessage,
}: QuickTradingFloatProps) {
  return (
    <div className="inline-flex items-center">
      <PaperOrderTicket
        account={account}
        symbol={symbol}
        bidPrice={bidPrice}
        askPrice={askPrice}
        quantity={quantity}
        onQuantityChange={onQuantityChange}
        onSubmit={onSubmit}
        isPending={isPending}
        errorMessage={errorMessage}
        compact
      />
    </div>
  );
}
