import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

const timeframes: Timeframe[] = [
  '1m',
  '5m',
  '15m',
  '1H',
  '4H',
  '1D',
];

const candles = [
  { open: 48, close: 67, high: 39, low: 75 },
  { open: 64, close: 53, high: 45, low: 72 },
  { open: 51, close: 73, high: 42, low: 80 },
  { open: 70, close: 62, high: 54, low: 77 },
  { open: 59, close: 81, high: 50, low: 87 },
  { open: 78, close: 69, high: 61, low: 84 },
  { open: 67, close: 88, high: 57, low: 93 },
  { open: 85, close: 76, high: 68, low: 91 },
  { open: 74, close: 92, high: 65, low: 97 },
  { open: 90, close: 79, high: 70, low: 96 },
  { open: 77, close: 84, high: 71, low: 89 },
  { open: 82, close: 68, high: 60, low: 87 },
  { open: 66, close: 79, high: 58, low: 85 },
  { open: 76, close: 91, high: 67, low: 96 },
  { open: 88, close: 82, high: 73, low: 94 },
  { open: 80, close: 95, high: 74, low: 99 },
];

function Candle({
  open,
  close,
  high,
  low,
}: {
  open: number;
  close: number;
  high: number;
  low: number;
}) {
  const bullish = close >= open;
  const bodyTop = Math.min(open, close);
  const bodyHeight = Math.max(Math.abs(close - open), 5);

  return (
    <View style={styles.candleColumn}>
      <View
        style={[
          styles.wick,
          {
            top: high,
            height: Math.max(low - high, 8),
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
            top: bodyTop,
            height: bodyHeight,
          },
        ]}
      />
    </View>
  );
}

function ChartCanvas() {
  return (
    <View style={styles.chartCanvas}>
      <View style={styles.gridHorizontalTop} />
      <View style={styles.gridHorizontalMiddle} />
      <View style={styles.gridHorizontalBottom} />

      <View style={styles.priceLine}>
        <View style={styles.priceLineStroke} />
        <View style={styles.priceLabel}>
          <Text style={styles.priceLabelText}>3,648.42</Text>
        </View>
      </View>

      <View style={styles.candles}>
        {candles.map((candle, index) => (
          <Candle key={index} {...candle} />
        ))}
      </View>

      <View style={styles.chartAxis}>
        <Text style={styles.axisText}>14:00</Text>
        <Text style={styles.axisText}>15:00</Text>
        <Text style={styles.axisText}>16:00</Text>
        <Text style={styles.axisText}>17:00</Text>
      </View>
    </View>
  );
}

export function ChartScreen({
  instrumentId = 'xauusd',
  onBack,
  onOpenTrade,
}: {
  instrumentId?: string;
  onBack?: () => void;
  onOpenTrade?: (instrumentId: string) => void;
}) {
  const instrument =
    instrumentId === 'xauusd'
      ? {
          symbol: 'XAUUSD',
          name: 'Gold Spot',
          price: '3,648.42',
          change: '+18.24  +0.50%',
          bid: '3,648.42',
          ask: '3,648.71',
        }
      : {
          symbol: instrumentId.toUpperCase(),
          name: instrumentId.toUpperCase(),
          price: '—',
          change: '—',
          bid: '—',
          ask: '—',
        };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.instrument}>
          <View>
            <View style={styles.instrumentTitleRow}>
              <Text style={styles.symbol}>{instrument.symbol}</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>

            <Text style={styles.name}>{instrument.name}</Text>
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
          <Text style={styles.currentPrice}>{instrument.price}</Text>
          <Text style={styles.positiveChange}>
            {instrument.change}
          </Text>
        </View>

        <View style={styles.quoteSide}>
          <Text style={styles.bidAskLabel}>BID / ASK</Text>
          <Text style={styles.bidAsk}>
            3,648.42 / 3,648.71
          </Text>
        </View>
      </View>

      <View style={styles.timeframeBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeframeContent}
        >
          {timeframes.map((timeframe, index) => (
            <TouchableOpacity
              key={timeframe}
              style={[
                styles.timeframe,
                index === 2 && styles.timeframeActive,
              ]}
            >
              <Text
                style={[
                  styles.timeframeText,
                  index === 2 && styles.timeframeTextActive,
                ]}
              >
                {timeframe}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.chartWrapper}>
        <ChartCanvas />

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
          <Stat label="Open" value="3,630.18" />
          <Stat label="High" value="3,657.82" />
          <Stat label="Low" value="3,621.40" />
          <Stat label="Prev." value="3,630.18" />
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
