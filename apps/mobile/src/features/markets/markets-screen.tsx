import React from 'react';

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Polyline } from 'react-native-svg';

import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { marketDataApi } from '../../api';
import { MarketDataSocket } from '../../realtime/market-data-socket';
import type { Candle, Instrument, Quote } from '../../types/market-data';
import { instrumentLogoData } from './instrument-logo-data';

type MarketCategory = 'Watchlist' | 'Forex' | 'Indices' | 'Commodity' | 'Crypto';

const categories: MarketCategory[] = [
  'Watchlist',
  'Forex',
  'Indices',
  'Commodity',
  'Crypto',
];

export function InstrumentBadge({ symbol }: { symbol: string }) {
  const normalized = symbol.toUpperCase();

  const base = normalized.replace(
    /(USD|AUD|EUR|GBP|JPY|CAD|CHF|NZD|SGD|HKD|CNY|SEK|NOK|ZAR|TRY|MXN|PLN)$/,
    '',
  );

  const cryptoAliases: Record<string, string> = {
    BTC: 'bitcoin',
    BCH: 'bitcoincash',
    ETH: 'ethereum',
    ETC: 'ethereumclassic',
    DOGE: 'dogecoin',
    DOT: 'polkadot',
    EOS: 'eos',
    LTC: 'litecoin',
    XRP: 'ripple',
    LINK: 'chainlink',
    AVAX: 'avalanche',
    XLM: 'stellar',
    TRX: 'tron',
    SOL: 'solana',
    ADA: 'cardano',
    ATOM: 'cosmos',
    ALGO: 'algorand',
    FIL: 'filecoin',
    NEAR: 'near',
    SUI: 'sui',
    TON: 'ton',
    UNI: 'uniswap',
    AAVE: 'aave',
    MKR: 'maker',
    DAI: 'dai',
    USDT: 'tether',
    BNB: 'binance',
    SHIB: 'shibainu',
    XMR: 'monero',
    XTZ: 'tezos',
    VET: 'vechain',
    ICP: 'internetcomputer',
    APT: 'aptos',
    ARB: 'arbitrum',
    OP: 'optimism',
  };

  // Ethereum Classic — local SVG mark.
  if (base === 'ETC') {
    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: '#328332',
            borderColor: '#328332',
            shadowOpacity: 0,
            elevation: 0,
          },
        ]}
      >
        <Svg width={31} height={31} viewBox="0 0 32 32">
          <Path
            d="M16 2L7 16l9 5 9-5L16 2z"
            fill="#FFFFFF"
          />
          <Path
            d="M7 18l9 12 9-12-9 5-9-5z"
            fill="rgba(255,255,255,0.72)"
          />
          <Path
            d="M16 2v19l9-5L16 2z"
            fill="rgba(255,255,255,0.55)"
          />
        </Svg>
      </View>
    );
  }

  // EOS — local SVG mark.
  if (base === 'EOS') {
    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: '#111827',
            borderColor: '#334155',
            shadowOpacity: 0,
            elevation: 0,
          },
        ]}
      >
        <Svg width={32} height={32} viewBox="0 0 32 32">
          <Path
            d="M10 25L16 5l6 20-6 3-6-3z"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <Path
            d="M12.5 16h7M11 20h10"
            stroke="rgba(255,255,255,0.72)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </Svg>
      </View>
    );
  }

  const cryptoKey = cryptoAliases[base];
  const cryptoLogo = cryptoKey
    ? instrumentLogoData[cryptoKey]
    : undefined;

  if (cryptoLogo) {
    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: `#${cryptoLogo.hex}`,
            borderColor: `#${cryptoLogo.hex}`,
            shadowOpacity: 0,
            elevation: 0,
          },
        ]}
      >
        <Svg width={31} height={31} viewBox="0 0 24 24">
          <Path d={cryptoLogo.path} fill="#FFFFFF" />
        </Svg>
      </View>
    );
  }

  /*
   * ============================================================
   * INDICES
   * ============================================================
   */

  const indexMarks: Record<
    string,
    { mark: string; sub?: string; background: string }
  > = {
    NAS100: {
      mark: 'N',
      sub: 'NASDAQ',
      background: '#2563EB',
    },
    US100: {
      mark: 'N',
      sub: 'NASDAQ',
      background: '#2563EB',
    },
    USTEC: {
      mark: 'N',
      sub: 'NASDAQ',
      background: '#2563EB',
    },

    SPX500: {
      mark: 'S&P',
      sub: '500',
      background: '#DC2626',
    },
    SP500: {
      mark: 'S&P',
      sub: '500',
      background: '#DC2626',
    },
    US500: {
      mark: 'S&P',
      sub: '500',
      background: '#DC2626',
    },

    US30: {
      mark: 'DJ',
      sub: '30',
      background: '#7C3AED',
    },
    DJ30: {
      mark: 'DJ',
      sub: '30',
      background: '#7C3AED',
    },
    DOW: {
      mark: 'DJ',
      sub: '30',
      background: '#7C3AED',
    },

    GER40: {
      mark: 'DAX',
      background: '#111827',
    },
    DAX40: {
      mark: 'DAX',
      background: '#111827',
    },

    UK100: {
      mark: 'FT',
      sub: '100',
      background: '#1D4ED8',
    },
    FTSE100: {
      mark: 'FT',
      sub: '100',
      background: '#1D4ED8',
    },

    JPN225: {
      mark: 'N',
      sub: '225',
      background: '#DC2626',
    },
    JP225: {
      mark: 'N',
      sub: '225',
      background: '#DC2626',
    },

    HK50: {
      mark: 'HK',
      sub: '50',
      background: '#B91C1C',
    },

    AUS200: {
      mark: 'ASX',
      sub: '200',
      background: '#047857',
    },
  };

  const index = indexMarks[normalized];

  if (index) {
    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: index.background,
            borderColor: index.background,
            shadowOpacity: 0,
            elevation: 0,
          },
        ]}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: index.mark.length > 2 ? 14 : 21,
            fontWeight: '900',
            letterSpacing: -0.5,
          }}
        >
          {index.mark}
        </Text>

        {index.sub ? (
          <Text
            style={{
              color: 'rgba(255,255,255,0.82)',
              fontSize: 8,
              fontWeight: '800',
              marginTop: -1,
            }}
          >
            {index.sub}
          </Text>
        ) : null}
      </View>
    );
  }

  /*
   * ============================================================
   * COMMODITIES
   * ============================================================
   */

  const commodityMarks: Record<
    string,
    { mark: string; sub?: string; background: string }
  > = {
    XAUUSD: {
      mark: 'Au',
      sub: 'GOLD',
      background: '#B7791F',
    },
    GOLD: {
      mark: 'Au',
      sub: 'GOLD',
      background: '#B7791F',
    },

    XAGUSD: {
      mark: 'Ag',
      sub: 'SILVER',
      background: '#64748B',
    },
    SILVER: {
      mark: 'Ag',
      sub: 'SILVER',
      background: '#64748B',
    },

    USOIL: {
      mark: 'WTI',
      sub: 'OIL',
      background: '#1F2937',
    },
    WTI: {
      mark: 'WTI',
      sub: 'OIL',
      background: '#1F2937',
    },
    XTIUSD: {
      mark: 'WTI',
      sub: 'OIL',
      background: '#1F2937',
    },

    UKOIL: {
      mark: 'BR',
      sub: 'BRENT',
      background: '#334155',
    },
    BRENT: {
      mark: 'BR',
      sub: 'BRENT',
      background: '#334155',
    },
    XBRUSD: {
      mark: 'BR',
      sub: 'BRENT',
      background: '#334155',
    },

    NGAS: {
      mark: 'NG',
      sub: 'GAS',
      background: '#0369A1',
    },
    NATGAS: {
      mark: 'NG',
      sub: 'GAS',
      background: '#0369A1',
    },
    XNGUSD: {
      mark: 'NG',
      sub: 'GAS',
      background: '#0369A1',
    },

    XCUUSD: {
      mark: 'Cu',
      sub: 'COPPER',
      background: '#9A3412',
    },
    COPPER: {
      mark: 'Cu',
      sub: 'COPPER',
      background: '#9A3412',
    },

    XPTUSD: {
      mark: 'Pt',
      sub: 'PLAT',
      background: '#475569',
    },
    PLATINUM: {
      mark: 'Pt',
      sub: 'PLAT',
      background: '#475569',
    },

    XPDUSD: {
      mark: 'Pd',
      sub: 'PALL',
      background: '#374151',
    },
    PALLADIUM: {
      mark: 'Pd',
      sub: 'PALL',
      background: '#374151',
    },
  };

  const commodity = commodityMarks[normalized];

  if (commodity) {
    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: commodity.background,
            borderColor: commodity.background,
            shadowOpacity: 0,
            elevation: 0,
          },
        ]}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: commodity.mark.length > 2 ? 14 : 20,
            fontWeight: '900',
            letterSpacing: -0.5,
          }}
        >
          {commodity.mark}
        </Text>

        {commodity.sub ? (
          <Text
            style={{
              color: 'rgba(255,255,255,0.82)',
              fontSize: 7,
              fontWeight: '800',
              marginTop: -1,
            }}
          >
            {commodity.sub}
          </Text>
        ) : null}
      </View>
    );
  }

  /*
   * ============================================================
   * CURRENCIES
   * ============================================================
   */

  const currencyMarks: Record<
    string,
    { symbol: string; code: string; background: string }
  > = {
    USD: { symbol: '$', code: 'USD', background: '#166534' },
    EUR: { symbol: '€', code: 'EUR', background: '#1D4ED8' },
    GBP: { symbol: '£', code: 'GBP', background: '#3730A3' },
    JPY: { symbol: '¥', code: 'JPY', background: '#B91C1C' },
    CHF: { symbol: 'Fr', code: 'CHF', background: '#991B1B' },
    AUD: { symbol: 'A$', code: 'AUD', background: '#047857' },
    CAD: { symbol: 'C$', code: 'CAD', background: '#9F1239' },
    NZD: { symbol: 'NZ$', code: 'NZD', background: '#065F46' },
    CNY: { symbol: '¥', code: 'CNY', background: '#B91C1C' },
    HKD: { symbol: '$', code: 'HKD', background: '#991B1B' },
    SGD: { symbol: '$', code: 'SGD', background: '#0F766E' },
    SEK: { symbol: 'kr', code: 'SEK', background: '#1D4ED8' },
    NOK: { symbol: 'kr', code: 'NOK', background: '#991B1B' },
    ZAR: { symbol: 'R', code: 'ZAR', background: '#166534' },
    TRY: { symbol: '₺', code: 'TRY', background: '#B91C1C' },
    MXN: { symbol: '$', code: 'MXN', background: '#166534' },
    PLN: { symbol: 'zł', code: 'PLN', background: '#991B1B' },
  };

  /*
   * For FX pairs use the BASE currency as the primary logo.
   *
   * EURUSD -> EUR / €
   * GBPUSD -> GBP / £
   * USDJPY -> USD / $
   * EURGBP -> EUR / €
   * GBPJPY -> GBP / £
   */
  const fxBase = normalized.slice(0, 3);
  const currency = currencyMarks[fxBase];

  if (currency && normalized.length >= 6) {
    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: currency.background,
            borderColor: currency.background,
            shadowOpacity: 0,
            elevation: 0,
          },
        ]}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: currency.symbol.length > 1 ? 17 : 24,
            fontWeight: '900',
            lineHeight: 25,
          }}
        >
          {currency.symbol}
        </Text>

        <Text
          style={{
            color: 'rgba(255,255,255,0.82)',
            fontSize: 7,
            fontWeight: '800',
            letterSpacing: 0.4,
          }}
        >
          {currency.code}
        </Text>
      </View>
    );
  }

  /*
   * Generic fallback.
   * Never use a dark shadow or elevated card.
   */
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
          shadowOpacity: 0,
          elevation: 0,
        },
      ]}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 15,
          fontWeight: '900',
        }}
      >
        {normalized.slice(0, 4)}
      </Text>
    </View>
  );
}

function MarketSparkline({
  candles,
  livePrice,
}: {
  candles: Candle[];
  livePrice?: string | null;
}) {
  const points = React.useMemo(() => {
    const closes = candles
      .slice()
      .sort(
        (a, b) =>
          new Date(a.eventTime).getTime() -
          new Date(b.eventTime).getTime(),
      )
      .map((candle) => Number(candle.close))
      .filter(Number.isFinite);

    const live = livePrice ? Number(livePrice) : NaN;

    if (Number.isFinite(live)) {
      if (
        closes.length === 0 ||
        closes[closes.length - 1] !== live
      ) {
        closes.push(live);
      }
    }

    if (closes.length < 2) {
      return '';
    }

    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range =
      max - min ||
      Math.max(Math.abs(max) * 0.000001, 1);

    const width = 48;
    const height = 30;
    const paddingX = 1;
    const paddingY = 3;

    return closes
      .map((price, index) => {
        const x =
          paddingX +
          (index / Math.max(closes.length - 1, 1)) *
            (width - paddingX * 2);

        const y =
          height -
          paddingY -
          ((price - min) / range) *
            (height - paddingY * 2);

        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [candles, livePrice]);

  return (
    <View pointerEvents="none" style={styles.sparkline}>
      {points ? (
        <Svg
          width="48"
          height="30"
          viewBox="0 0 48 30"
        >
          <Polyline
            points={points}
            fill="none"
            stroke={colors.success}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : (
        <View style={styles.sparklinePlaceholder} />
      )}
    </View>
  );
}

function MarketCard({
  market,
  quote,
  candles,
  favorite,
  onPress,
  onToggleFavorite,
}: {
  market: Instrument;
  quote?: Quote;
  candles: Candle[];
  favorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <View style={styles.marketCard}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={styles.marketMain}
      >
        <View style={styles.marketIdentity}>
          <InstrumentBadge symbol={market.symbol} />

          <View style={styles.identityText}>
            <Text style={styles.symbol}>{market.symbol}</Text>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={styles.name}
            >
              {market.name}
            </Text>
          </View>
        </View>

        <MarketSparkline
          candles={candles}
          livePrice={quote?.lastPrice ?? quote?.bidPrice}
        />

        <View style={styles.quote}>
          <Text style={styles.price}>
            {quote?.lastPrice ?? quote?.bidPrice ?? '—'}
          </Text>

          <Text style={styles.change}>
            {quote?.bidPrice && quote?.askPrice
              ? `B ${quote.bidPrice} / A ${quote.askPrice}`
              : '—'}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={
          favorite
            ? `Remove ${market.symbol} from watchlist`
            : `Add ${market.symbol} to watchlist`
        }
        onPress={onToggleFavorite}
        style={styles.favoriteButton}
      >
        <Text
          style={[
            styles.favorite,
            favorite && styles.favoriteActive,
          ]}
        >
          {favorite ? '★' : '☆'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function MarketsScreen({
  onOpenChart,
  onOpenMore,
  favorites,
  onToggleFavorite,
}: {
  onOpenChart?: (instrumentId: string) => void;
  onOpenMore?: () => void;
  favorites: Set<string>;
  onToggleFavorite: (instrumentId: string) => void;
}) {
  const [markets, setMarkets] = React.useState<Instrument[]>([]);
  const [quotes, setQuotes] = React.useState<Record<string, Quote>>({});
  const [candles, setCandles] = React.useState<Record<string, Candle[]>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const searchInputRef = React.useRef<TextInput>(null);

  const [selectedCategory, setSelectedCategory] =
    React.useState<MarketCategory>('Watchlist');
  const [searchQuery, setSearchQuery] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;

    const loadMarkets = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await marketDataApi.listInstruments({
          status: 'ACTIVE',
          page: 1,
          pageSize: 100,
        });

        if (!cancelled) {
          setMarkets(response.data);

          if (response.data.length > 0) {
            const latestQuotes = await marketDataApi.getLatestQuotes(
              response.data.map((market) => market.id),
            );

            if (!cancelled) {
              setQuotes(
                latestQuotes.reduce<Record<string, Quote>>(
                  (result, quote) => {
                    result[quote.instrumentId] = quote;
                    return result;
                  },
                  {},
                ),
              );
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load markets',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadMarkets();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (markets.length === 0) {
      return;
    }

    let cancelled = false;

    const instrumentIds = markets.map((market) => market.id);

    const apiUrl = process.env.EXPO_PUBLIC_API_URL;

    if (!apiUrl) {
      setError('EXPO_PUBLIC_API_URL is not configured');
      return;
    }

    const websocketUrl = apiUrl
      .replace(/^http:/, 'ws:')
      .replace(/^https:/, 'wss:');

    const socket = new MarketDataSocket(
      `${websocketUrl}/market-data/ws`,
      instrumentIds,
      {
        onQuote: (message) => {
          if (cancelled) {
            return;
          }

          const quote = message.data;

          setQuotes((current) => ({
            ...current,
            [quote.instrumentId]: {
              id: [
                quote.instrumentId,
                quote.eventTime,
              ].join(':'),
              instrumentId: quote.instrumentId,
              bidPrice: quote.bidPrice ?? null,
              askPrice: quote.askPrice ?? null,
              lastPrice: quote.lastPrice ?? null,
              bidSize: quote.bidSize ?? null,
              askSize: quote.askSize ?? null,
              eventTime: quote.eventTime,
              providerId: 'stream',
              source: 'websocket',
            },
          }));
        },

        onError: () => {
          if (!cancelled) {
            setError('Market-data WebSocket connection error');
          }
        },
      },
    );

    void socket.connect();

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, [markets]);

  const filteredMarkets = React.useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return markets.filter((market) => {
      const matchesCategory =
        selectedCategory === 'Watchlist'
          ? favorites.has(market.id)
          : selectedCategory === 'Forex'
            ? market.assetClass === 'FOREX'
            : selectedCategory === 'Indices'
              ? market.assetClass === 'INDEX'
              : selectedCategory === 'Commodity'
                ? market.assetClass === 'COMMODITY'
                : market.assetClass === 'CRYPTO';

      if (!matchesCategory) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        market.symbol.toLowerCase().includes(normalizedSearch) ||
        market.name.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [favorites, markets, searchQuery, selectedCategory]);

  React.useEffect(() => {
    if (filteredMarkets.length === 0) {
      return;
    }

    let cancelled = false;

    const loadSparklines = async () => {
      const missingMarkets = filteredMarkets.filter(
        (market) =>
          !Object.prototype.hasOwnProperty.call(
            candles,
            market.id,
          ),
      );

      if (missingMarkets.length === 0) {
        return;
      }

      const to = new Date();
      const from = new Date(
        to.getTime() - 5 * 60 * 60 * 1000,
      );

      const results: Array<{
        instrumentId: string;
        candles: Candle[];
      }> = [];

      // Load candle history in small batches so the mobile screen
      // does not burst the API rate limiter when many markets are visible.
      const batchSize = 2;

      for (
        let index = 0;
        index < missingMarkets.length;
        index += batchSize
      ) {
        const batch = missingMarkets.slice(index, index + batchSize);

        const batchResults = await Promise.all(
          batch.map(async (market) => {
            try {
              const result = await marketDataApi.getCandles({
                instrumentId: market.id,
                interval: 'FIVE_MINUTES',
                from: from.toISOString(),
                to: to.toISOString(),
                limit: 60,
              });

              return {
                instrumentId: market.id,
                candles: result,
              };
            } catch {
              return {
                instrumentId: market.id,
                candles: [],
              };
            }
          }),
        );

        results.push(...batchResults);

        // Small gap between batches to avoid a request burst.
        if (index + batchSize < missingMarkets.length) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        if (cancelled) {
          return;
        }
      }

      if (cancelled) {
        return;
      }

      setCandles((current) => {
        const next = { ...current };

        for (const result of results) {
          next[result.instrumentId] = result.candles;
        }

        return next;
      });
    };

    void loadSparklines();

    return () => {
      cancelled = true;
    };
  }, [candles, filteredMarkets]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            style={styles.menuButton}
            onPress={() => onOpenMore?.()}
          >
            <Text style={styles.menuText}>☰</Text>
          </TouchableOpacity>

          <Text style={styles.brand}>RMSM</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Search markets"
            style={styles.headerIcon}
            onPress={() => searchInputRef.current?.focus()}
          >
            <Text style={styles.headerIconText}>⌕</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open account"
            style={styles.profileButton}
            onPress={() => onOpenMore?.()}
          >
            <Text style={styles.profileIcon}>♙</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.categoryBar}>
        {categories.map((category) => {
          const active = selectedCategory === category;

          return (
            <TouchableOpacity
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[
                styles.category,
                active && styles.categoryActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  active && styles.categoryTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchGlyph}>⌕</Text>

          <TextInput
            placeholder="Search markets..."
            placeholderTextColor={colors.textMuted}
            ref={searchInputRef}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Filter markets"
          style={styles.filterButton}
          onPress={() =>
            setSelectedCategory((current) => {
              const index = categories.indexOf(current);
              return categories[(index + 1) % categories.length];
            })
          }
        >
          <Text style={styles.filterText}>☷</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {loading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator />
            <Text style={styles.stateText}>Loading markets...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : markets.length === 0 ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>
              No active markets found.
            </Text>
          </View>
        ) : (
          filteredMarkets.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              quote={quotes[market.id]}
              candles={candles[market.id] ?? []}
              favorite={favorites.has(market.id)}
              onPress={() => onOpenChart?.(market.id)}
              onToggleFavorite={() => onToggleFavorite(market.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },

  stateText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },

  screen: {
    flex: 1,
    paddingHorizontal: 16,
  },

  header: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuText: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
  },

  brand: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginLeft: 11,
    letterSpacing: 0.6,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerIconText: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 30,
  },

  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileIcon: {
    color: colors.text,
    fontSize: 21,
  },

  categoryBar: {
    height: 46,
    flexDirection: 'row',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 4,
    marginBottom: 12,
  },

  category: {
    flex: 1,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  categoryActive: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
  },

  categoryText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  categoryTextActive: {
    color: colors.text,
    fontWeight: '700',
  },

  searchRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 13,
  },

  searchContainer: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  searchGlyph: {
    color: colors.textSecondary,
    fontSize: 21,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    paddingVertical: 0,
  },

  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },

  list: {
    paddingTop: 0,
    paddingBottom: 28,
  },

  marketCard: {
    minHeight: 82,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 9,
    paddingLeft: 12,
    paddingRight: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },

  marketMain: {
    flex: 1,
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },

  marketIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    flexShrink: 1,
  },

  badgeBitcoin: {
    backgroundColor: '#F7931A',
    borderColor: 'rgba(247, 147, 26, 0.5)',
  },

  badgeBitcoinCash: {
    backgroundColor: '#2AAE7A',
    borderColor: 'rgba(51, 192, 141, 0.45)',
  },

  badgeEthereum: {
    backgroundColor: '#627EEA',
    borderColor: 'rgba(147, 164, 255, 0.45)',
  },

  badgeSolana: {
    backgroundColor: '#050509',
    borderColor: '#23344A',
  },

  badgeCardano: {
    backgroundColor: '#2563EB',
    borderColor: 'rgba(96, 165, 250, 0.45)',
  },

  badgeDogecoin: {
    backgroundColor: '#C9A227',
    borderColor: 'rgba(255, 230, 130, 0.45)',
  },

  badgeGold: {
    backgroundColor: '#F5A623',
    borderColor: 'rgba(245, 166, 35, 0.45)',
  },

  badgeNasdaq: {
    backgroundColor: '#F4F7FB',
    borderColor: colors.border,
  },

  badgeSp: {
    backgroundColor: '#EF4444',
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },

  badgeEuro: {
    backgroundColor: '#1D4ED8',
    borderColor: 'rgba(96, 165, 250, 0.45)',
  },

  badgePound: {
    backgroundColor: '#2563EB',
    borderColor: 'rgba(96, 165, 250, 0.45)',
  },

  badgeYen: {
    backgroundColor: '#F4F7FB',
    borderColor: colors.border,
  },

  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeLogoBitcoin: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '900',
  },

  badgeLogoDogecoin: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '900',
  },

  badgeLogoNasdaq: {
    color: '#1677C8',
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
  },

  badgeLogoSp: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  badgeLogoCurrency: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },

  badgeLogoYen: {
    color: '#EF4444',
    fontSize: 29,
    fontWeight: '800',
  },

  badgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },

  identityText: {
    marginLeft: 11,
  },

  symbol: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  name: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
    maxWidth: 130,
  },

  quote: {
    width: 106,
    alignItems: 'flex-end',
    paddingRight: 2,
  },

  sparkline: {
    width: 52,
    height: 34,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
    opacity: 0.95,
  },

  sparklinePlaceholder: {
    width: 48,
    height: 1,
    opacity: 0,
  },

  price: {

    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.1,
    textAlign: 'right',
  },

  change: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 5,
  },

  positive: {
    color: colors.success,
  },

  negative: {
    color: colors.danger,
  },

  favoriteButton: {
    width: 40,
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },

  favorite: {
    color: colors.textMuted,
    fontSize: 21,
    textAlign: 'center',
  },

  favoriteActive: {
    color: colors.warning,
  },
});
