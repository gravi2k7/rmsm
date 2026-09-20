import { useEffect, useMemo, useRef, useState } from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { marketDataApi, tradingApi } from '../../api';
import { WebView } from 'react-native-webview';
import { MarketDataSocket } from '../../realtime/market-data-socket';
import { useTradingAccount } from '../../account/trading-account-context';
import { colors } from '../../theme/colors';

import { radius, spacing } from '../../theme/spacing';
import type {
  Candle,
  CandleInterval,
  Instrument,
} from '../../types/market-data';

type ChartPosition = {
  positionId: string;
  side: 'LONG' | 'SHORT';
  quantity: string;
  averageEntryPrice: string;
  stopLossPrice: string | null;
  takeProfitPrice: string | null;
};

type ChartPendingOrder = {
  orderId: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'STOP';
  quantity: string;
  limitPrice: string | null;
  stopPrice: string | null;
  stopLossPrice: string | null;
  takeProfitPrice: string | null;
};

type Timeframe =
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1H'
  | '4H'
  | '1D'
  | '1W'
  | '1M';

const timeframeOptions: Array<{
  label: Timeframe;
  interval: CandleInterval;
  historyMs: number;
}> = [
  {
    label: '1m',
    interval: 'ONE_MINUTE',
    historyMs: 30 * 24 * 60 * 60 * 1000,
  },
  {
    label: '5m',
    interval: 'FIVE_MINUTES',
    historyMs: 60 * 24 * 60 * 60 * 1000,
  },
  {
    label: '15m',
    interval: 'FIFTEEN_MINUTES',
    historyMs: 6 * 30 * 24 * 60 * 60 * 1000,
  },
  {
    label: '30m',
    interval: 'THIRTY_MINUTES',
    historyMs: 365 * 24 * 60 * 60 * 1000,
  },
  {
    label: '1H',
    interval: 'ONE_HOUR',
    historyMs: 2 * 365 * 24 * 60 * 60 * 1000,
  },
  {
    label: '4H',
    interval: 'FOUR_HOURS',
    historyMs: 4 * 365 * 24 * 60 * 60 * 1000,
  },
  {
    label: '1D',
    interval: 'ONE_DAY',
    historyMs: 5 * 365 * 24 * 60 * 60 * 1000,
  },
  {
    label: '1W',
    interval: 'ONE_WEEK',
    historyMs: 10 * 365 * 24 * 60 * 60 * 1000,
  },
  {
    label: '1M',
    interval: 'ONE_MONTH',
    historyMs: 10 * 365 * 24 * 60 * 60 * 1000,
  },
];

const timeframeIntervals: Record<Timeframe, CandleInterval> =
  Object.fromEntries(
    timeframeOptions.map((option) => [option.label, option.interval]),
  ) as Record<Timeframe, CandleInterval>;

const timeframeHistoryMs: Record<Timeframe, number> =
  Object.fromEntries(
    timeframeOptions.map((option) => [option.label, option.historyMs]),
  ) as Record<Timeframe, number>;

function getMarketDataWebSocketUrl() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured');
  }

  const websocketUrl = apiUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');

  return `${websocketUrl}/market-data/ws`;
}



function formatPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return '—';
  }

  return numeric.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  });
}

function getChartEmbedUrl() {
  const chartEmbedUrl = process.env.EXPO_PUBLIC_CHART_EMBED_URL;

  if (chartEmbedUrl) {
    return chartEmbedUrl.replace(/\/$/, '');
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured');
  }

  return apiUrl.replace(/\/api\/v1\/?$/, '');
}

function ChartWebView({
  instrumentId,
  candles,
  interval,
  liveBid,
  liveAsk,
  liveLast,
  positions,
  pendingOrders,
  onReady,
  onTimeframeChange,
  onDrawingState,
  webViewRef,
}: {
  instrumentId: string;
  candles: Candle[];
  interval: CandleInterval;
  liveBid: string | null;
  liveAsk: string | null;
  liveLast: string | null;
  positions: ChartPosition[];
  pendingOrders: ChartPendingOrder[];
  onReady: () => void;
  onTimeframeChange: (interval: CandleInterval) => void;
  onDrawingState: (state: unknown) => void;
  webViewRef: React.RefObject<any>;
}) {
  const [webViewReady, setWebViewReady] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);

  const chartUrl = useMemo(
    () =>
      `${getChartEmbedUrl()}/chart-embed/${encodeURIComponent(
        instrumentId,
      )}`,
    [instrumentId],
  );

  const send = (message: Record<string, unknown>) => {
    webViewRef.current?.postMessage(JSON.stringify(message));
  };

  const sendCurrentData = () => {
    console.log('[RMSM Chart] Sending trading state to WebView:', {
      instrumentId,
      webViewReady,
      positionCount: positions.length,
      pendingOrderCount: pendingOrders.length,
      positions,
      pendingOrders,
    });


    send({
      type: 'rmsm:init',
      candles,
      interval,
      quote: {
        bid: liveBid,
        ask: liveAsk,
        last: liveLast,
      },
      positions,
      pendingOrders,
    });
  };

  useEffect(() => {
    if (!webViewReady) {
      return;
    }

    sendCurrentData();
  }, [
    webViewReady,
    candles,
    interval,
    liveBid,
    liveAsk,
    liveLast,
    positions,
    pendingOrders,
  ]);

  const ChartWebViewComponent = WebView as any;

  return (
    <View style={styles.chartWebViewContainer}>
      <ChartWebViewComponent
        ref={webViewRef}
        source={{ uri: chartUrl }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={styles.chartWebView}
        onMessage={(event: any) => {
          console.log(
            '[RMSM Chart] WebView -> Native:',
            event.nativeEvent?.data,
          );

          try {
            const rawData = event.nativeEvent.data;

            if (!rawData || !rawData.trim()) {
              console.warn('[RMSM Chart] Ignoring empty WebView message');
              return;
            }

            let message: {
              type?: string;
              [key: string]: unknown;
            };

            try {
              message = JSON.parse(rawData);
            } catch (error) {
              console.warn('[RMSM Chart] Ignoring invalid WebView message:', {
                rawData,
                error,
              });
              return;
            }

            if (message.type === 'rmsm:ready') {
              setWebViewReady(true);
              setWebViewError(null);
              onReady();
              return;
            }

            if (message.type === 'rmsm:drawing-state') {
              onDrawingState(message.state);
              return;
            }

            if (message.type === 'rmsm:drawing-tool') {
              return;
            }

            if (message.type === 'rmsm:timeframe-change') {
              const interval = message.interval as CandleInterval;

              if (
                timeframeOptions.some(
                  (option) => option.interval === interval,
                )
              ) {
                onTimeframeChange(interval);
              }

              return;
            }

            if (message.type === 'rmsm:chart-state') {
              return;
            }
          } catch {
            // Ignore malformed bridge messages.
          }
        }}
        onError={(event: any) => {
          const error =
            event?.nativeEvent?.description ||
            'RMSM chart WebView failed to load';

          console.warn('[RMSM Chart WebView]', error);
          setWebViewError(error);
        }}
        onHttpError={(event: any) => {
          const status = event?.nativeEvent?.statusCode;

          const description =
            event?.nativeEvent?.description ||
            'RMSM chart WebView HTTP error';

          const error =
            `HTTP ${status ?? 'unknown'}: ${description}`;

          console.warn('[RMSM Chart WebView]', error);
          setWebViewError(error);
        }}
      />

      {!webViewReady && !webViewError ? (
        <View pointerEvents="none" style={styles.chartDiagnosticOverlay}>
          <Text style={styles.chartDiagnosticText}>
            Loading RMSM chart…
          </Text>
        </View>
      ) : null}

      {webViewError ? (
        <View pointerEvents="none" style={styles.chartDiagnosticOverlay}>
          <Text style={styles.chartDiagnosticText}>
            Chart error: {webViewError}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function ChartScreen({
  instrumentId,
  onBack,
  onOpenTrade,
  favorite,
  onToggleFavorite,
}: {
  instrumentId: string;
  onBack?: () => void;
  onOpenTrade?: (instrumentId: string) => void;
  favorite: boolean;
  onToggleFavorite: () => void;
}) {
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<Timeframe>('15m');
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [liveBid, setLiveBid] = useState<string | null>(null);
  const [liveAsk, setLiveAsk] = useState<string | null>(null);
  const [liveLast, setLiveLast] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quickQuantity, setQuickQuantity] = useState(1);
  const [positions, setPositions] =
    useState<ChartPosition[]>([]);
  const [pendingOrders, setPendingOrders] =
    useState<ChartPendingOrder[]>([]);

  const {
    organizationId,
    currentAccount: account,
  } = useTradingAccount();

  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<any>(null);

  const sendChartCommand = (
    message: Record<string, unknown>,
  ) => {
    webViewRef.current?.postMessage(
      JSON.stringify(message),
    );
  };


  const [webViewReady, setWebViewReady] = useState(false);

  const [drawings, setDrawings] = useState<unknown[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadChartTradingState = async () => {
    console.log('[RMSM Chart] Trading state loader:', {
      organizationId,
      accountId: account?.id,
      instrumentId,
    });


      if (!organizationId || !account?.id) {
        setPositions([]);
        setPendingOrders([]);
        return;
      }

      try {
        const [positionResponse, orderResponse] = await Promise.all([
          tradingApi.listPositions(
            organizationId,
            account.id,
          ),
          tradingApi.listOrders(
            organizationId,
            account.id,
          ),
        ]);

        if (cancelled) {
          return;
        }

        console.log('[RMSM Chart] Position matching:', {
          accountId: account.id,
          chartInstrumentId: instrumentId,
          totalPositions: positionResponse.length,
          positions: positionResponse.map((position) => ({
            id: position.id,
            instrumentId: position.instrumentId,
            status: position.status,
            side: position.side,
            quantity: position.quantity,
            averageEntryPrice: position.averageEntryPrice,
            stopLossPrice: position.stopLossPrice,
            takeProfitPrice: position.takeProfitPrice,
          })),
        });

        const currentPositions = positionResponse
          .filter(
            (position) =>
              position.instrumentId === instrumentId &&
              position.status === 'OPEN',
          )
          .map((position) => ({
            positionId: position.id,
            side: position.side,
            quantity: position.quantity,
            averageEntryPrice: position.averageEntryPrice,
            stopLossPrice: position.stopLossPrice ?? null,
            takeProfitPrice: position.takeProfitPrice ?? null,
          }));

        const currentPendingOrders = orderResponse
          .filter(
            (order): order is typeof order & {
              type: 'LIMIT' | 'STOP';
            } =>
              order.instrumentId === instrumentId &&
              order.status === 'PENDING' &&
              (order.type === 'LIMIT' || order.type === 'STOP'),
          )
          .map((order) => ({
            orderId: order.id,
            side: order.side,
            type: order.type,
            quantity: order.quantity,
            limitPrice: order.limitPrice ?? null,
            stopPrice: order.stopPrice ?? null,
            stopLossPrice: order.stopLossPrice ?? null,
            takeProfitPrice: order.takeProfitPrice ?? null,
          }));

        setPositions(currentPositions);
        setPendingOrders(currentPendingOrders);
      } catch (err) {
        if (!cancelled) {
          console.warn(
            '[RMSM Chart] Failed to load trading overlays:',
            err,
          );
          setPositions([]);
          setPendingOrders([]);
        }
      }
    };

    void loadChartTradingState();

    return () => {
      cancelled = true;
    };
  }, [organizationId, account?.id, instrumentId]);

  useEffect(() => {
    let cancelled = false;

    const loadChart = async () => {
      try {
        setLoading(true);
        setError(null);

        const to = new Date();
        const from = new Date(
          to.getTime() - timeframeHistoryMs[selectedTimeframe],
        );

        const [instrumentResponse, candlesResponse] =
          await Promise.all([
            marketDataApi.getInstrument(instrumentId),
            marketDataApi.getCandles({
              instrumentId,
              interval: timeframeIntervals[selectedTimeframe],
              from: from.toISOString(),
              to: to.toISOString(),
              limit: 5000,
            }),
          ]);

        if (cancelled) {
          return;
        }

        setInstrument(instrumentResponse);
        setCandles(candlesResponse);
      } catch (err) {
        if (!cancelled) {
          setInstrument(null);
          setCandles([]);
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load chart data',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadChart();

    return () => {
      cancelled = true;
    };
  }, [instrumentId, selectedTimeframe]);

  useEffect(() => {
    let cancelled = false;

    const socket = new MarketDataSocket(
      getMarketDataWebSocketUrl(),
      [instrumentId],
      {
      onConnected: () => {
        if (!cancelled) {
          setSocketConnected(true);
        }
      },

      onQuote: (message) => {
        if (cancelled || message.data.instrumentId !== instrumentId) {
          return;
        }

        setLiveBid(message.data.bidPrice ?? null);
        setLiveAsk(message.data.askPrice ?? null);
        setLiveLast(message.data.lastPrice ?? null);
      },

      onCandle: (message) => {
        if (
          cancelled ||
          message.data.instrumentId !== instrumentId ||
          message.data.interval !== timeframeIntervals[selectedTimeframe]
        ) {
          return;
        }

        setCandles((current) => {
          const incoming = message.data;

          const incomingCandle: Candle = {
            id: [
              incoming.instrumentId,
              incoming.interval,
              incoming.eventTime,
            ].join(":"),
            instrumentId: incoming.instrumentId,
            interval: incoming.interval,
            eventTime: incoming.eventTime,
            open: incoming.open,
            high: incoming.high,
            low: incoming.low,
            close: incoming.close,
            volume: incoming.volume,
            providerId: incoming.providerId,
            source: incoming.source,
            isCorrection: false,
          };

          const existingIndex = current.findIndex(
            (candle) =>
              candle.instrumentId === incomingCandle.instrumentId &&
              candle.interval === incomingCandle.interval &&
              candle.eventTime === incomingCandle.eventTime,
          );

          if (existingIndex >= 0) {
            const next = [...current];
            next[existingIndex] = incomingCandle;
            return next;
          }

          return [...current, incomingCandle]
            .sort(
              (a, b) =>
                new Date(a.eventTime).getTime() -
                new Date(b.eventTime).getTime(),
            )
            .slice(-5000);
        });
      },

      onError: () => {
        if (!cancelled) {
          setSocketConnected(false);
        }
      },

      onClosed: () => {
        if (!cancelled) {
          setSocketConnected(false);
        }
      },
    });

    try {
      void socket.connect();
    } catch {
      setSocketConnected(false);
    }

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, [instrumentId, selectedTimeframe]);

  const latestCandle = useMemo(() => {
    if (candles.length === 0) {
      return null;
    }

    return [...candles].sort(
      (a, b) =>
        new Date(a.eventTime).getTime() -
        new Date(b.eventTime).getTime(),
    )[candles.length - 1];
  }, [candles]);

  const symbol =
    instrument?.symbol ?? instrumentId.toUpperCase();

  const name =
    instrument?.name ?? 'Loading instrument...';

  const currentPrice = liveLast
    ? formatPrice(liveLast)
    : latestCandle
      ? formatPrice(latestCandle.close)
      : '—';

  const bidPrice = liveBid
    ? formatPrice(liveBid)
    : '—';

  const askPrice = liveAsk
    ? formatPrice(liveAsk)
    : '—';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.instrument}>
          <View>
            <View style={styles.instrumentTitleRow}>
              <Text style={styles.symbol}>{symbol}</Text>

              {socketConnected && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>

            <Text style={styles.name}>{name}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel={
              favorite ? 'Remove from watchlist' : 'Add to watchlist'
            }
            onPress={onToggleFavorite}
          >
            <Text style={styles.headerButtonText}>
              {favorite ? '★' : '☆'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tradeButton}
            onPress={() => onOpenTrade?.(instrumentId)}
          >
            <Text style={styles.tradeButtonText}>Trade</Text>
          </TouchableOpacity>

        </View>
      </View>

      <View style={styles.quoteRow}>
        <View>
          <Text style={styles.currentPrice}>
            {currentPrice}
          </Text>

          {error ? (
            <Text style={styles.positiveChange}>
              Chart data unavailable
            </Text>
          ) : null}
        </View>

        <View style={styles.quoteSide}>
          <Text style={styles.bidAskLabel}>BID / ASK</Text>
          <Text style={styles.bidAsk}>
            {bidPrice} / {askPrice}
          </Text>
        </View>
      </View>

      <View style={styles.chartWrapper}>
        {loading ? (
          <View style={styles.chartState}>
            <ActivityIndicator />
            <Text style={styles.chartStateText}>
              Loading chart...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.chartState}>
            <Text style={styles.chartStateText}>{error}</Text>
          </View>
        ) : candles.length === 0 ? (
          <View style={styles.chartState}>
            <Text style={styles.chartStateText}>
              No candle data available.
            </Text>
          </View>
        ) : (
          <View style={styles.chartWebViewContainer}>
            <ChartWebView
              instrumentId={instrumentId}
              candles={candles}
              interval={timeframeIntervals[selectedTimeframe]}
              liveBid={liveBid}
              liveAsk={liveAsk}
              liveLast={liveLast}
              positions={positions}
              pendingOrders={pendingOrders}
              onReady={() => setWebViewReady(true)}
              onTimeframeChange={(interval) => {
                const nextTimeframe = timeframeOptions.find(
                  (option) => option.interval === interval,
                );

                if (nextTimeframe) {
                  setSelectedTimeframe(nextTimeframe.label);
                }
              }}
              onDrawingState={(state) => {
                setDrawings(
                  Array.isArray((state as any)?.drawings)
                    ? (state as any).drawings
                    : [],
                );
              }}
              webViewRef={webViewRef}
            />
          </View>
        )}



      </View>

      <View style={styles.quickTradeBar}>
        <TouchableOpacity
          activeOpacity={0.82}
          style={[
            styles.quickTradeButton,
            styles.quickBuyButton,
          ]}
          onPress={() => onOpenTrade?.(instrumentId)}
        >
          <Text style={styles.quickTradeButtonText}>BUY</Text>
        </TouchableOpacity>

        <View style={styles.quickQuantityControl}>
          <TouchableOpacity
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Decrease quantity"
            style={styles.quickQuantityButton}
            onPress={() =>
              setQuickQuantity((value) =>
                Number(Math.max(0.01, value - 0.01).toFixed(2)),
              )
            }
          >
            <Text style={styles.quickQuantityButtonText}>−</Text>
          </TouchableOpacity>

          <TextInput
            value={quickQuantity.toFixed(2).replace(/\.00$/, '')}
            onChangeText={(value) => {
              const cleaned = value.replace(/[^0-9.]/g, '');
              const numeric = Number(cleaned);

              if (cleaned === '') {
                return;
              }

              if (Number.isFinite(numeric) && numeric > 0) {
                setQuickQuantity(numeric);
              }
            }}
            keyboardType="decimal-pad"
            selectTextOnFocus
            style={styles.quickQuantityInput}
          />

          <TouchableOpacity
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Increase quantity"
            style={styles.quickQuantityButton}
            onPress={() =>
              setQuickQuantity((value) =>
                Number((value + 0.01).toFixed(2)),
              )
            }
          >
            <Text style={styles.quickQuantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.82}
          style={[
            styles.quickTradeButton,
            styles.quickSellButton,
          ]}
          onPress={() => onOpenTrade?.(instrumentId)}
        >
          <Text style={styles.quickTradeButtonText}>SELL</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  quickTradeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },

  quickTradeButton: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickBuyButton: {
    backgroundColor: colors.accent,
  },

  quickSellButton: {
    backgroundColor: colors.danger,
  },

  quickTradeButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  quickQuantityControl: {
    height: 46,
    minWidth: 104,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },

  quickQuantityButton: {
    width: 30,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickQuantityButtonText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
  },

  quickQuantityInput: {
    flex: 1,
    minWidth: 42,
    paddingHorizontal: 2,
    paddingVertical: 0,
    textAlign: 'center',
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },


  screen: {
    flex: 1,
  },

  header: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 30,
  },

  instrument: {
    flex: 1,
    paddingHorizontal: 10,
  },

  instrumentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  symbol: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  name: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
  },

  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: colors.success,
    marginRight: 4,
  },

  liveText: {
    color: colors.success,
    fontSize: 8,
    fontWeight: '800',
  },

  headerActions: {
    flexDirection: 'row',
    gap: 5,
  },

  tradeButton: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tradeButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },

  headerButton: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerButtonText: {
    color: colors.textSecondary,
    fontSize: 23,
  },

  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: 7,
  },

  currentPrice: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
  },

  positiveChange: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },

  quoteSide: {
    alignItems: 'flex-end',
  },

  bidAskLabel: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '700',
  },

  bidAsk: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 3,
  },

  timeframeBar: {
    height: 40,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  timeframeContent: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },

  timeframe: {
    paddingHorizontal: 13,
    height: 32,
    marginVertical: 3,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timeframeActive: {
    backgroundColor: colors.accentSoft,
  },

  timeframeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },

  timeframeTextActive: {
    color: colors.accent,
  },

  chartWrapper: {
    flex: 1,
    minHeight: 420,
    marginTop: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },

  chartState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },

  chartStateText: {
    color: colors.textSecondary,
    fontSize: 12,
  },

  chartWebViewContainer: {
    position: 'relative',
    flex: 1,
    overflow: 'hidden',
  },

  chartDiagnosticOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },

  chartDiagnosticText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  rmsmDrawingToolbox: {
    position: 'absolute',
    left: 6,
    top: 52,
    zIndex: 50,
    width: 42,
    maxHeight: 360,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(10, 18, 32, 0.96)',
    alignItems: 'center',
  },

  rmsmDrawingButton: {
    width: 34,
    height: 32,
    marginVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  rmsmDrawingButtonActive: {
    backgroundColor: colors.accent,
  },

  rmsmDrawingIcon: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '800',
  },

  chartWebView: {
    flex: 1,
    backgroundColor: colors.background,
  },




















  chartModeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  chartModeText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '800',
  },

  indicatorBar: {
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },

  indicatorTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginRight: 2,
  },

  indicatorChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  indicatorChipActive: {
    borderColor: colors.accent,
  },

  indicatorText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '600',
  },

  addIndicator: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addIndicatorText: {
    color: colors.accent,
    fontSize: 17,
  },

  statsCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: 6,
  },

  statsTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 9,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  stat: {
    alignItems: 'flex-start',
  },

  statLabel: {
    color: colors.textMuted,
    fontSize: 8,
  },

  statValue: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
});
