import { useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { marketDataApi } from '../../api';
import { MarketDataSocket } from '../../realtime/market-data-socket';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import type {
  Candle,
  CandleInterval,
  Instrument,
} from '../../types/market-data';

type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

const timeframes: Timeframe[] = [
  '1m',
  '5m',
  '15m',
  '1H',
  '4H',
  '1D',
];

const timeframeIntervals: Record<Timeframe, CandleInterval> = {
  '1m': 'ONE_MINUTE',
  '5m': 'FIVE_MINUTES',
  '15m': 'FIFTEEN_MINUTES',
  '1H': 'ONE_HOUR',
  '4H': 'FOUR_HOURS',
  '1D': 'ONE_DAY',
};

const timeframeHistoryMs: Record<Timeframe, number> = {
  '1m': 2 * 60 * 60 * 1000,
  '5m': 8 * 60 * 60 * 1000,
  '15m': 24 * 60 * 60 * 1000,
  '1H': 4 * 24 * 60 * 60 * 1000,
  '4H': 14 * 24 * 60 * 60 * 1000,
  '1D': 100 * 24 * 60 * 60 * 1000,
};

function getMarketDataWebSocketUrl() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured');
  }

  const websocketUrl = apiUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');

  return `${websocketUrl}/market-data/ws`;
}

type RenderCandle = {
  open: number;
  close: number;
  high: number;
  low: number;
};

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

function formatAxisTime(eventTime: string) {
  const date = new Date(eventTime);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function normalizeCandles(candles: Candle[]): RenderCandle[] {
  const parsed = candles
    .map((candle) => ({
      source: candle,
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
    }))
    .filter(
      (candle) =>
        Number.isFinite(candle.open) &&
        Number.isFinite(candle.high) &&
        Number.isFinite(candle.low) &&
        Number.isFinite(candle.close),
    )
    .sort(
      (a, b) =>
        new Date(a.source.eventTime).getTime() -
        new Date(b.source.eventTime).getTime(),
    )
    .slice(-60);

  if (parsed.length === 0) {
    return [];
  }

  const minPrice = Math.min(...parsed.map((candle) => candle.low));
  const maxPrice = Math.max(...parsed.map((candle) => candle.high));
  const range = Math.max(maxPrice - minPrice, Number.EPSILON);

  const toChartY = (price: number) =>
    4 + ((maxPrice - price) / range) * 88;

  return parsed.map((candle) => ({
    open: toChartY(candle.open),
    close: toChartY(candle.close),
    high: toChartY(candle.high),
    low: toChartY(candle.low),
  }));
}

function Candle({
  open,
  close,
  high,
  low,
}: RenderCandle) {
  const bullish = close <= open;
  const bodyTop = Math.min(open, close);
  const bodyHeight = Math.max(Math.abs(close - open), 1.5);

  return (
    <View style={styles.candleColumn}>
      <View
        style={[
          styles.wick,
          {
            top: `${high}%`,
            height: `${Math.max(low - high, 1)}%`,
          },
        ]}
      />

      <View
        style={[
          styles.candleBody,
          bullish
            ? styles.bullishCandle
            : styles.bearishCandle,
          {
            top: `${bodyTop}%`,
            height: `${bodyHeight}%`,
          },
        ]}
      />
    </View>
  );
}

function ChartCanvas({
  candles,
  latestPrice,
  axisTimes,
}: {
  candles: RenderCandle[];
  latestPrice: string;
  axisTimes: string[];
}) {
  return (
    <View style={styles.chartCanvas}>
      <View style={styles.gridHorizontalTop} />
      <View style={styles.gridHorizontalMiddle} />
      <View style={styles.gridHorizontalBottom} />

      {latestPrice !== '—' && (
        <View style={styles.priceLine}>
          <View style={styles.priceLineStroke} />
          <View style={styles.priceLabel}>
            <Text style={styles.priceLabelText}>{latestPrice}</Text>
          </View>
        </View>
      )}

      <View style={styles.candles}>
        {candles.map((candle, index) => (
          <Candle key={index} {...candle} />
        ))}
      </View>

      <View style={styles.chartAxis}>
        {axisTimes.map((time, index) => (
          <Text key={`${time}-${index}`} style={styles.axisText}>
            {time}
          </Text>
        ))}
      </View>
    </View>
  );
}


export function ChartScreen({
  instrumentId,
  onBack,
  onOpenTrade,
}: {
  instrumentId: string;
  onBack?: () => void;
  onOpenTrade?: (instrumentId: string) => void;
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
  const [error, setError] = useState<string | null>(null);

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
              limit: 100,
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
            .slice(-100);
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

  const renderCandles = useMemo(
    () => normalizeCandles(candles),
    [candles],
  );

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

  const axisTimes = useMemo(() => {
    if (candles.length === 0) {
      return [];
    }

    const sorted = [...candles].sort(
      (a, b) =>
        new Date(a.eventTime).getTime() -
        new Date(b.eventTime).getTime(),
    );

    const indexes = [
      0,
      Math.floor((sorted.length - 1) / 3),
      Math.floor(((sorted.length - 1) * 2) / 3),
      sorted.length - 1,
    ];

    return indexes.map((index) =>
      formatAxisTime(sorted[index].eventTime),
    );
  }, [candles]);

  const symbol = instrument?.symbol ?? instrumentId.toUpperCase();
  const name = instrument?.name ?? 'Loading instrument...';

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
          <TouchableOpacity style={styles.headerButton}>
            <Text style={styles.headerButtonText}>☆</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tradeButton}
            onPress={() => onOpenTrade?.(instrumentId)}
          >
            <Text style={styles.tradeButtonText}>Trade</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerButton}>
            <Text style={styles.headerButtonText}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.quoteRow}>
        <View>
          <Text style={styles.currentPrice}>
            {currentPrice}
          </Text>

          <Text style={styles.positiveChange}>
            {error
              ? 'Chart data unavailable'
              : `${candles.length} candles`}
          </Text>
        </View>

        <View style={styles.quoteSide}>
          <Text style={styles.bidAskLabel}>BID / ASK</Text>
          <Text style={styles.bidAsk}>
            {bidPrice} / {askPrice}
          </Text>
        </View>
      </View>

      <View style={styles.timeframeBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeframeContent}
        >
          {timeframes.map((timeframe) => {
            const active = timeframe === selectedTimeframe;

            return (
              <TouchableOpacity
                key={timeframe}
                style={[
                  styles.timeframe,
                  active && styles.timeframeActive,
                ]}
                onPress={() => setSelectedTimeframe(timeframe)}
              >
                <Text
                  style={[
                    styles.timeframeText,
                    active && styles.timeframeTextActive,
                  ]}
                >
                  {timeframe}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
        ) : renderCandles.length === 0 ? (
          <View style={styles.chartState}>
            <Text style={styles.chartStateText}>
              No candle data available.
            </Text>
          </View>
        ) : (
          <ChartCanvas
            candles={renderCandles}
            latestPrice={currentPrice}
            axisTimes={axisTimes}
          />
        )}

        <View style={styles.chartTools}>
          {['＋', '╱', '⌕', 'ƒ', '↻'].map((tool) => (
            <TouchableOpacity
              key={tool}
              style={styles.toolButton}
            >
              <Text style={styles.toolText}>{tool}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.indicatorBar}>
        <Text style={styles.indicatorTitle}>Indicators</Text>

        <TouchableOpacity style={styles.indicatorChip}>
          <Text style={styles.indicatorText}>EMA 20</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.indicatorChip}>
          <Text style={styles.indicatorText}>RSI</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addIndicator}>
          <Text style={styles.addIndicatorText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Market Stats</Text>

        <View style={styles.statsRow}>
          <Stat
            label="Open"
            value={
              latestCandle
                ? formatPrice(latestCandle.open)
                : '—'
            }
          />
          <Stat
            label="High"
            value={
              latestCandle
                ? formatPrice(latestCandle.high)
                : '—'
            }
          />
          <Stat
            label="Low"
            value={
              latestCandle
                ? formatPrice(latestCandle.low)
                : '—'
            }
          />
          <Stat
            label="Prev."
            value={
              candles.length > 1
                ? formatPrice(
                    [...candles].sort(
                      (a, b) =>
                        new Date(a.eventTime).getTime() -
                        new Date(b.eventTime).getTime(),
                    )[candles.length - 2].close,
                  )
                : '—'
            }
          />
        </View>
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
    minHeight: 300,
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

  chartCanvas: {
    flex: 1,
    position: 'relative',
    marginRight: 7,
  },

  gridHorizontalTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '20%',
    height: 1,
    backgroundColor: colors.border,
  },

  gridHorizontalMiddle: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: colors.border,
  },

  gridHorizontalBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '80%',
    height: 1,
    backgroundColor: colors.border,
  },

  priceLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '34%',
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 3,
  },

  priceLineStroke: {
    flex: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent,
  },

  priceLabel: {
    backgroundColor: colors.accent,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 3,
  },

  priceLabelText: {
    color: colors.black,
    fontSize: 8,
    fontWeight: '800',
  },

  candles: {
    position: 'absolute',
    left: 10,
    right: 15,
    top: 10,
    bottom: 35,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-around',
  },

  candleColumn: {
    width: 12,
    height: '100%',
    position: 'relative',
  },

  wick: {
    position: 'absolute',
    left: 5,
    width: 1,
    backgroundColor: colors.textSecondary,
  },

  candleBody: {
    position: 'absolute',
    left: 2,
    width: 7,
    minHeight: 4,
    borderRadius: 1,
  },

  bullishCandle: {
    backgroundColor: colors.success,
  },

  bearishCandle: {
    backgroundColor: colors.danger,
  },

  chartAxis: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  axisText: {
    color: colors.textMuted,
    fontSize: 8,
  },

  chartTools: {
    position: 'absolute',
    left: 7,
    top: 8,
    bottom: 42,
    justifyContent: 'space-between',
  },

  toolButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  toolText: {
    color: colors.textSecondary,
    fontSize: 14,
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
