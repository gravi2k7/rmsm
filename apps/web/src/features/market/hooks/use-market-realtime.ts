"use client";

import { useEffect, useState } from "react";

import type { Candle, CandleInterval, Quote } from "../types";
import {
  MarketDataRealtimeService,
} from "../services/market-data-realtime.service";
import {
  MarketDataWebSocketClient,
  type MarketDataCandleEvent,
  type MarketDataDepthEvent,
  type MarketDataQuoteEvent,
} from "../services/market-data-websocket.client";

const CANDLE_INTERVALS: readonly CandleInterval[] = [
  "ONE_MINUTE",
  "FIVE_MINUTES",
  "FIFTEEN_MINUTES",
  "THIRTY_MINUTES",
  "ONE_HOUR",
  "FOUR_HOURS",
  "ONE_DAY",
  "ONE_WEEK",
  "ONE_MONTH",
];

function isCandleInterval(
  value: string,
): value is CandleInterval {
  return CANDLE_INTERVALS.includes(
    value as CandleInterval,
  );
}

function toQuote(event: MarketDataQuoteEvent): Quote {
  return {
    id: `${event.instrumentId}:${event.eventTime}`,
    instrumentId: event.instrumentId,
    bidPrice: event.bidPrice ?? null,
    askPrice: event.askPrice ?? null,
    lastPrice: event.lastPrice ?? null,
    bidSize: event.bidSize ?? null,
    askSize: event.askSize ?? null,
    eventTime: event.eventTime,
    providerId: "",
    source: "LIVE",
  };
}

export interface MarketDepthLevel {
  price: string;
  size?: string;
}

export interface MarketDepth {
  instrumentId: string;
  providerSymbol: string;
  bids: readonly MarketDepthLevel[];
  asks: readonly MarketDepthLevel[];
  eventTime: string;
}

function toDepth(
  event: MarketDataDepthEvent,
): MarketDepth {
  return {
    instrumentId: event.instrumentId,
    providerSymbol: event.providerSymbol,
    bids: event.bids.map((level) => ({
      price: level.price,
      ...(level.size !== undefined
        ? { size: level.size }
        : {}),
    })),
    asks: event.asks.map((level) => ({
      price: level.price,
      ...(level.size !== undefined
        ? { size: level.size }
        : {}),
    })),
    eventTime: event.eventTime,
  };
}

function toCandle(
  event: MarketDataCandleEvent,
): Candle | null {
  if (!isCandleInterval(event.interval)) {
    return null;
  }

  return {
    id: `${event.instrumentId}:${event.interval}:${event.eventTime}`,
    instrumentId: event.instrumentId,
    interval: event.interval,
    eventTime: event.eventTime,
    open: event.open,
    high: event.high,
    low: event.low,
    close: event.close,
    volume: event.volume,
    isCorrection: false,
  };
}

export function useMarketRealtime(
  instrumentId: string | undefined,
  interval: CandleInterval,
  quoteInstrumentIds: string[] = [],
): {
  liveCandle: Candle | null;
  liveQuote: Quote | null;
  liveDepth: MarketDepth | null;
  liveQuotes: Record<string, Quote>;
} {
  const [liveCandle, setLiveCandle] =
    useState<Candle | null>(null);
  const [liveQuote, setLiveQuote] =
    useState<Quote | null>(null);
  const [liveDepth, setLiveDepth] =
    useState<MarketDepth | null>(null);
  const [liveQuotes, setLiveQuotes] =
    useState<Record<string, Quote>>({});

  useEffect(() => {
    if (!instrumentId) {
      setLiveCandle(null);
      setLiveQuote(null);
      setLiveDepth(null);
      setLiveQuotes({});
      return;
    }

    let serviceQuoteListener:
      | ((quote: MarketDataQuoteEvent) => void)
      | undefined;

    let serviceCandleListener:
      | ((candle: MarketDataCandleEvent) => void)
      | undefined;

    let serviceDepthListener:
      | ((depth: MarketDataDepthEvent) => void)
      | undefined;

    const client = new MarketDataWebSocketClient({
      onQuote: (quote) => {
        serviceQuoteListener?.(quote);
      },
      onCandle: (candle) => {
        serviceCandleListener?.(candle);
      },
      onDepth: (depth) => {
        serviceDepthListener?.(depth);
      },
    });

    const service = new MarketDataRealtimeService({
      client,
      onQuote: (listener) => {
        serviceQuoteListener = listener;

        return () => {
          if (serviceQuoteListener === listener) {
            serviceQuoteListener = undefined;
          }
        };
      },
      onCandle: (listener) => {
        serviceCandleListener = listener;

        return () => {
          if (serviceCandleListener === listener) {
            serviceCandleListener = undefined;
          }
        };
      },
      onDepth: (listener) => {
        serviceDepthListener = listener;

        return () => {
          if (serviceDepthListener === listener) {
            serviceDepthListener = undefined;
          }
        };
      },
    });

    const subscribedQuoteIds = new Set(
      [instrumentId, ...quoteInstrumentIds].filter(
        (id): id is string => Boolean(id),
      ),
    );

    const removeQuoteListener = service.addQuoteListener(
      (quote) => {
        if (!subscribedQuoteIds.has(quote.instrumentId)) {
          return;
        }

        const normalized = toQuote(quote);

        setLiveQuotes((previous) => ({
          ...previous,
          [quote.instrumentId]: normalized,
        }));

        if (quote.instrumentId === instrumentId) {
          setLiveQuote(normalized);
        }
      },
    );

    const removeCandleListener = service.addCandleListener(
      (candle) => {
        if (
          candle.instrumentId !== instrumentId ||
          candle.interval !== interval
        ) {
          return;
        }

        const normalized = toCandle(candle);

        if (normalized) {
          setLiveCandle(normalized);
        }
      },
    );

    const removeDepthListener = service.addDepthListener(
      (depth) => {
        if (depth.instrumentId !== instrumentId) {
          return;
        }

        setLiveDepth(toDepth(depth));
      },
    );

    const subscribedIds = [
      ...new Set(
        [instrumentId, ...quoteInstrumentIds].filter(
          (id): id is string => Boolean(id),
        ),
      ),
    ];

    service.subscribe(subscribedIds);

    return () => {
      removeQuoteListener();
      removeCandleListener();
      removeDepthListener();
      service.unsubscribe(subscribedIds);
      service.destroy();
    };
  }, [instrumentId, interval, quoteInstrumentIds]);


  return {
    liveCandle,
    liveQuote,
    liveDepth,
    liveQuotes,
  };
}
