"use client";

import type {
  TradingAccount,
  TradingOrderSide,
  TradingOrderType,
  TradingPosition,
} from "../types";
import type { TradingMode } from "./trading-mode-switcher";
import type { MarketDepth } from "@/features/market/hooks/use-market-realtime";
import { TradingModeSwitcher } from "./trading-mode-switcher";
import { OrderTicket } from "./order-ticket";
import { CreateDemoAccount } from "./create-demo-account";
import { DomPanel } from "./dom-panel";

interface TradingRightPanelProps {
  mode: TradingMode;
  onModeChange: (mode: TradingMode) => void;

  account: TradingAccount | undefined;

  symbol: string;
  instrumentName?: string;
  tickSize?: string | null | undefined;
  bidPrice: string | null | undefined;
  askPrice: string | null | undefined;
  depth: MarketDepth | null;

  quantity: string;
  onQuantityChange: (value: string) => void;
  onSubmit: (side: TradingOrderSide) => void;

  orderType: TradingOrderType;
  onOrderTypeChange: (value: TradingOrderType) => void;
  requestedSide?: TradingOrderSide | null;
  orderQuantity: string;
  onOrderQuantityChange: (value: string) => void;
  orderLimitPrice: string;
  onOrderLimitPriceChange: (value: string) => void;
  orderStopPrice: string;
  onOrderStopPriceChange: (value: string) => void;
  onOrderSubmit: (
    side: TradingOrderSide,
    stopLossPrice?: string | null,
    takeProfitPrice?: string | null,
  ) => void;

  onCreateDemoAccount: (input: {
    name: string;
    currency: string;
    startingBalance: number;
    leverage?: number;
  }) => void;

  isCreatingDemoAccount?: boolean;
  createDemoAccountError?: string | null;

  isPending?: boolean;
  errorMessage?: string | null;

  currentPosition?: TradingPosition;
  onClosePosition?: (positionId: string) => void;
  onReversePosition?: (positionId: string) => void;
  onCancelAllOrders?: () => void;
  onFlattenAllPositions?: () => void;
  isTradingActionPending?: boolean;
}

export function TradingRightPanel({
  mode,
  onModeChange,
  account,
  symbol,
  instrumentName,
  tickSize,
  bidPrice,
  askPrice,
  depth,
  quantity,
  onQuantityChange,
  onSubmit,
  orderType,
  onOrderTypeChange,
  requestedSide,
  orderQuantity,
  onOrderQuantityChange,
  orderLimitPrice,
  onOrderLimitPriceChange,
  orderStopPrice,
  onOrderStopPriceChange,
  onOrderSubmit,
  onCreateDemoAccount,
  isCreatingDemoAccount = false,
  createDemoAccountError,
  isPending = false,
  errorMessage,
  currentPosition,
  onClosePosition,
  onReversePosition,
  onCancelAllOrders,
  onFlattenAllPositions,
  isTradingActionPending = false,
}: TradingRightPanelProps) {
  return (
    <aside
      aria-label="Paper trading"
      className="flex h-full w-full shrink-0 flex-col overflow-hidden rounded-md border border-border/70 bg-card/50"
    >
      <div className="flex h-10 shrink-0 border-b">
        <TradingModeSwitcher
          value={mode}
          onChange={onModeChange}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {!account ? (
          <CreateDemoAccount
            onSubmit={onCreateDemoAccount}
            isPending={isCreatingDemoAccount}
            errorMessage={createDemoAccountError}
          />
        ) : (
          <>
            {mode === "ORDER" && (
              <OrderTicket
                account={account}
                symbol={symbol}
                instrumentName={instrumentName}
                tickSize={tickSize}
                bidPrice={bidPrice}
                askPrice={askPrice}
                quantity={orderQuantity}
                onQuantityChange={onOrderQuantityChange}
                orderType={orderType}
                onOrderTypeChange={onOrderTypeChange}
                requestedSide={requestedSide}
                limitPrice={orderLimitPrice}
                onLimitPriceChange={onOrderLimitPriceChange}
                stopPrice={orderStopPrice}
                onStopPriceChange={onOrderStopPriceChange}
                onSubmit={onOrderSubmit}
                isPending={
                  orderType === "MARKET" &&
                  isPending
                }
                errorMessage={errorMessage}
              />
            )}

            {mode === "DOM" && (
              <DomPanel
                symbol={symbol}
                depth={depth}
                quantity={quantity}
                onQuantityChange={onQuantityChange}
                onSubmit={onSubmit}
                currentPosition={currentPosition}
                onClosePosition={onClosePosition}
                onReversePosition={onReversePosition}
                onCancelAllOrders={onCancelAllOrders}
                onFlattenAllPositions={onFlattenAllPositions}
                isPending={
                  isPending ||
                  isTradingActionPending
                }
                errorMessage={errorMessage}
              />
            )}
          </>
        )}
      </div>
    </aside>
  );
}
