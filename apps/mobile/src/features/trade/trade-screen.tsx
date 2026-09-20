import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  marketDataApi,
  tradingApi,
} from '../../api';
import { MarketDataSocket } from '../../realtime/market-data-socket';
import type { Instrument } from '../../types/market-data';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { instrumentLogoData } from '../markets/instrument-logo-data';
import { useTradingAccount } from '../../account/trading-account-context';


const cryptoAliases: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  LTC: 'litecoin',
  XRP: 'ripple',
  LINK: 'chainlink',
  AVAX: 'avalanche',
  XLM: 'stellar',
  TRX: 'tron',
  SOL: 'solana',
  ADA: 'cardano',
  DOT: 'polkadot',
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

const currencyMarks: Record<
  string,
  { symbol: string; background: string }
> = {
  USD: { symbol: '$', background: '#166534' },
  EUR: { symbol: '€', background: '#1D4ED8' },
  GBP: { symbol: '£', background: '#3730A3' },
  JPY: { symbol: '¥', background: '#B91C1C' },
  CHF: { symbol: 'Fr', background: '#991B1B' },
  AUD: { symbol: 'A$', background: '#047857' },
  CAD: { symbol: 'C$', background: '#9F1239' },
  NZD: { symbol: 'NZ$', background: '#065F46' },
  CNY: { symbol: '¥', background: '#B91C1C' },
  HKD: { symbol: '$', background: '#991B1B' },
  SGD: { symbol: '$', background: '#0F766E' },
  SEK: { symbol: 'kr', background: '#1D4ED8' },
  NOK: { symbol: 'kr', background: '#991B1B' },
  ZAR: { symbol: 'R', background: '#166534' },
  TRY: { symbol: '₺', background: '#B91C1C' },
  MXN: { symbol: '$', background: '#166534' },
  PLN: { symbol: 'zł', background: '#991B1B' },
};

export function InstrumentLogo({
  symbol,
  size = 44,
}: {
  symbol: string;
  size?: number;
}) {
  const normalized = symbol
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  const base = normalized.replace(
    /(USDT|USDC|USD|AUD|EUR|GBP|JPY|CAD|CHF|NZD|SGD|HKD|CNY|SEK|NOK|ZAR|TRY|MXN|PLN)$/,
    '',
  );

  if (base === 'ETC') {
    return (
      <View
        style={[
          styles.instrumentBadge,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#328332',
            borderColor: '#328332',
          },
        ]}
      >
        <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 32 32">
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

  if (base === 'EOS') {
    return (
      <View
        style={[
          styles.instrumentBadge,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#111827',
            borderColor: '#334155',
          },
        ]}
      >
        <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 32 32">
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

  const indexMark = (() => {
    if (
      base === 'NAS100' ||
      base === 'NASDAQ100' ||
      base === 'USTEC' ||
      base === 'NDX'
    ) {
      return {
        label: 'N',
        background: '#1E5EFF',
        accent: '#FFFFFF',
      };
    }

    if (
      base === 'US30' ||
      base === 'DJ30' ||
      base === 'DJI'
    ) {
      return {
        label: 'DJ',
        background: '#1B4D8C',
        accent: '#FFFFFF',
      };
    }

    if (
      base === 'SPX500' ||
      base === 'SP500' ||
      base === 'SPX'
    ) {
      return {
        label: 'S&P',
        background: '#B22234',
        accent: '#FFFFFF',
      };
    }

    if (
      base === 'GER40' ||
      base === 'DAX40' ||
      base === 'DAX'
    ) {
      return {
        label: 'D',
        background: '#111827',
        accent: '#FFFFFF',
      };
    }

    if (
      base === 'UK100' ||
      base === 'FTSE100' ||
      base === 'FTSE'
    ) {
      return {
        label: 'FT',
        background: '#123B7A',
        accent: '#FFFFFF',
      };
    }

    if (
      base === 'JPN225' ||
      base === 'NIKKEI225' ||
      base === 'NIKKEI'
    ) {
      return {
        label: 'N',
        background: '#BC002D',
        accent: '#FFFFFF',
      };
    }

    return undefined;
  })();

  if (indexMark) {
    return (
      <View
        style={[
          styles.instrumentBadge,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: indexMark.background,
            borderColor: indexMark.background,
          },
        ]}
      >
        <Text
          style={{
            color: indexMark.accent,
            fontSize: indexMark.label.length > 2
              ? size * 0.22
              : size * 0.34,
            fontWeight: '900',
          }}
        >
          {indexMark.label}
        </Text>
      </View>
    );
  }

  const commodityMark = (() => {
    if (base === 'XAU') {
      return {
        label: 'Au',
        background: '#B8860B',
      };
    }

    if (base === 'XAG') {
      return {
        label: 'Ag',
        background: '#64748B',
      };
    }

    if (
      base === 'USOIL' ||
      base === 'WTI' ||
      base === 'XTI'
    ) {
      return {
        label: 'O',
        background: '#111827',
      };
    }

    if (
      base === 'UKOIL' ||
      base === 'BRENT' ||
      base === 'XBR'
    ) {
      return {
        label: 'B',
        background: '#334155',
      };
    }

    if (
      base === 'NATGAS' ||
      base === 'NGAS'
    ) {
      return {
        label: 'G',
        background: '#2563EB',
      };
    }

    return undefined;
  })();

  if (commodityMark) {
    return (
      <View
        style={[
          styles.instrumentBadge,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: commodityMark.background,
            borderColor: commodityMark.background,
          },
        ]}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: size * 0.32,
            fontWeight: '900',
          }}
        >
          {commodityMark.label}
        </Text>
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
          styles.instrumentBadge,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: `#${cryptoLogo.hex}`,
            borderColor: `#${cryptoLogo.hex}`,
          },
        ]}
      >
        <Svg
          width={size * 0.62}
          height={size * 0.62}
          viewBox="0 0 24 24"
        >
          <Path d={cryptoLogo.path} fill="#FFFFFF" />
        </Svg>
      </View>
    );
  }

  const fxBase = normalized.slice(0, 3);
  const currency = currencyMarks[fxBase];

  if (currency && normalized.length >= 6) {
    return (
      <View
        style={[
          styles.instrumentBadge,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: currency.background,
            borderColor: currency.background,
          },
        ]}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: currency.symbol.length > 1 ? size * 0.34 : size * 0.5,
            fontWeight: '900',
          }}
        >
          {currency.symbol}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.instrumentBadge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={styles.instrumentBadgeText}>
        {symbol.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

function getMarketDataWebSocketUrl(): string {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!apiBaseUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured');
  }

  return apiBaseUrl.replace(/^http/i, 'ws').replace(/\/$/, '') + '/market-data/ws';
}

type OrderType = 'Market' | 'Limit' | 'Stop';

export function TradeScreen({
  instrumentId,
  onBack,
  favorite,
  onToggleFavorite,
}: {
  instrumentId: string;
  onBack?: () => void;
  favorite: boolean;
  onToggleFavorite: () => void;
}) {
  const [orderType, setOrderType] = useState<OrderType>('Market');
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [liveBid, setLiveBid] = useState<string | null>(null);
  const [liveAsk, setLiveAsk] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const {
    organizationId,
    currentAccount: account,
    loading: accountLoading,
  } = useTradingAccount();

  const accountId = account?.id ?? null;
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSide, setSelectedSide] = useState<'BUY' | 'SELL'>('BUY');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [positions, setPositions] = useState<Array<{
    instrumentId: string;
    side: string;
    quantity: string | number;
    averageEntryPrice: string | number;
  }>>([]);
  const [takeProfit, setTakeProfit] = useState(false);
  const [stopLoss, setStopLoss] = useState(false);
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadInstrument = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);

        const response = await marketDataApi.getInstrument(instrumentId);

        if (!cancelled) {
          setInstrument(response);
        }
      } catch (error) {
        if (!cancelled) {
          setInstrument(null);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Failed to load instrument',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadInstrument();



  return () => {
      cancelled = true;
    };
  }, [instrumentId]);

  useEffect(() => {
    if (accountLoading || !organizationId || !accountId) {
      return;
    }

    let cancelled = false;

    const loadTradingData = async () => {
      try {
        const positionRows = await tradingApi.listPositions(
          organizationId,
          accountId,
        );

        if (!cancelled) {
          setPositions(positionRows);
        }
      } catch {
        if (!cancelled) {
          setPositions([]);
        }
      }
    };

    void loadTradingData();

    return () => {
      cancelled = true;
    };
  }, [accountLoading, organizationId, accountId]);

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
        },
        onError: (error) => {
          if (!cancelled) {
            setSocketConnected(false);
            setErrorMessage(error.message);
          }
        },
        onClosed: () => {
          if (!cancelled) {
            setSocketConnected(false);
          }
        },
      },
    );

    void socket.connect();

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, [instrumentId]);

  const bid = liveBid ?? '—';
  const ask = liveAsk ?? '—';

  const numericBid = Number(liveBid);
  const numericAsk = Number(liveAsk);

  const spread =
    Number.isFinite(numericBid) &&
    Number.isFinite(numericAsk) &&
    numericBid > 0 &&
    numericAsk > 0 &&
    numericAsk >= numericBid
      ? numericAsk - numericBid
      : null;

  const balance = Number(account?.balance ?? 0);
  const leverage = Math.max(Number(account?.leverage ?? 1), 1);

  const unrealizedPnl = positions.reduce((total, position) => {
    const quantityValue = Number(position.quantity);
    const entry = Number(position.averageEntryPrice);

    if (
      !Number.isFinite(quantityValue) ||
      !Number.isFinite(entry)
    ) {
      return total;
    }

    if (position.instrumentId !== instrumentId) {
      return total;
    }

    if (position.side === 'LONG') {
      if (!Number.isFinite(numericBid) || numericBid <= 0) {
        return total;
      }

      return total + (numericBid - entry) * quantityValue;
    }

    if (!Number.isFinite(numericAsk) || numericAsk <= 0) {
      return total;
    }

    return total + (entry - numericAsk) * quantityValue;
  }, 0);

  const usedMargin = positions.reduce((total, position) => {
    const quantityValue = Number(position.quantity);
    const entry = Number(position.averageEntryPrice);

    if (
      !Number.isFinite(quantityValue) ||
      !Number.isFinite(entry)
    ) {
      return total;
    }

    return total + (quantityValue * entry) / leverage;
  }, 0);

  const equity = balance + unrealizedPnl;
  const freeMargin = equity - usedMargin;

  const selectedPrice =
    selectedSide === 'BUY'
      ? numericAsk
      : numericBid;

  const estimatedMargin =
    Number.isFinite(selectedPrice) &&
    selectedPrice > 0
      ? (quantity * selectedPrice) / leverage
      : null;






  const decreaseQuantity = () => {
    setQuantity((value) => Math.max(0.01, Number((value - 0.01).toFixed(2))));
  };

  const increaseQuantity = () => {
    setQuantity((value) => Number((value + 0.01).toFixed(2)));
  };

  const executeOrder = async (side: 'BUY' | 'SELL') => {
    if (executing) return;

    setExecuting(true);
    setResultMessage(null);
    setErrorMessage(null);

    try {
      if (accountLoading || !organizationId || !accountId) {
        throw new Error('Trading account is not ready.');
      }

      const numericTriggerPrice = Number(triggerPrice);

      if (
        orderType !== 'Market' &&
        (!triggerPrice ||
          !Number.isFinite(numericTriggerPrice) ||
          numericTriggerPrice <= 0)
      ) {
        throw new Error('Enter a valid trigger price.');
      }

      const type =
        orderType === 'Market'
          ? 'MARKET'
          : orderType === 'Limit'
            ? 'LIMIT'
            : 'STOP';

      const numericTakeProfit = Number(takeProfitPrice);
      const numericStopLoss = Number(stopLossPrice);

      if (
        takeProfit &&
        (!takeProfitPrice ||
          !Number.isFinite(numericTakeProfit) ||
          numericTakeProfit <= 0)
      ) {
        throw new Error('Enter a valid Take Profit price.');
      }

      if (
        stopLoss &&
        (!stopLossPrice ||
          !Number.isFinite(numericStopLoss) ||
          numericStopLoss <= 0)
      ) {
        throw new Error('Enter a valid Stop Loss price.');
      }

      await tradingApi.placeOrder(
        organizationId,
        accountId,
        {
          instrumentId,
          side,
          type,
          quantity: String(quantity),
          ...(type === 'LIMIT'
            ? { limitPrice: String(numericTriggerPrice) }
            : {}),
          ...(type === 'STOP'
            ? { stopPrice: String(numericTriggerPrice) }
            : {}),
          ...(takeProfit
            ? { takeProfitPrice: String(numericTakeProfit) }
            : {}),
          ...(stopLoss
            ? { stopLossPrice: String(numericStopLoss) }
            : {}),
        },
      );

      setResultMessage(
        `${side} ${quantity} ${instrument?.symbol ?? instrumentId} ${orderType.toLowerCase()} order submitted.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Order execution failed',
      );
    } finally {
      setExecuting(false);
    }
  };

    return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>
          )}

          <View style={styles.instrumentHeader}>
            <InstrumentLogo
              symbol={instrument?.symbol ?? instrumentId}
              size={44}
            />

            <View>
              <Text style={styles.symbol}>
                {instrument?.symbol ??
                  (loading ? 'Loading...' : instrumentId.toUpperCase())}
              </Text>
              <Text style={styles.instrumentName}>
                {instrument?.name ?? 'Market instrument'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Toggle watchlist"
          style={styles.favoriteButton}
          onPress={onToggleFavorite}
        >
          <Text style={[styles.favoriteText, favorite && styles.favoriteActive]}>
            {favorite ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Live quote */}
      <View style={styles.priceHeader}>
        <View>
          <Text style={styles.priceLabel}>LIVE MARKET</Text>
          <Text style={styles.mainPrice}>{ask}</Text>
          <Text style={styles.priceStatus}>
            {socketConnected ? 'Live price' : 'Connecting...'}
          </Text>
        </View>

        <View style={styles.connectionBadge}>
          <View
            style={[
              styles.connectionDot,
              !socketConnected && styles.connectionDotOffline,
            ]}
          />
          <Text
            style={[
              styles.connectionText,
              !socketConnected && styles.connectionTextOffline,
            ]}
          >
            {socketConnected ? 'LIVE' : 'OFFLINE'}
          </Text>
        </View>
      </View>

      {/* Order type */}
      <View style={styles.orderTypeCard}>
        <View style={styles.orderTypeRow}>
          {(['Market', 'Limit', 'Stop'] as OrderType[]).map((type) => {
            const active = orderType === type;

            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.orderTypeButton,
                  active && styles.orderTypeButtonActive,
                ]}
                onPress={() => setOrderType(type)}
              >
                <Text
                  style={[
                    styles.orderTypeText,
                    active && styles.orderTypeTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {orderType !== 'Market' && (
          <View style={styles.triggerPrice}>
            <Text style={styles.fieldLabel}>
              {orderType === 'Limit' ? 'Limit Price' : 'Stop Price'}
            </Text>

            <View style={styles.priceInput}>
              <TextInput
                value={triggerPrice}
                onChangeText={(value) =>
                  setTriggerPrice(value.replace(/[^0-9.]/g, ''))
                }
                placeholder="Enter price"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={styles.priceInputText}
              />

              <Text style={styles.priceInputSuffix}>
                {instrument?.currency ?? 'USD'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Bid / Spread / Ask execution */}
      <View style={styles.executionRow}>
        <TouchableOpacity
          style={[
            styles.sellButton,
            selectedSide === 'SELL' && styles.selectedSellButton,
          ]}
          onPress={() => setSelectedSide('SELL')}
          disabled={executing}
        >
          <Text style={styles.executionLabel}>SELL</Text>
          <Text style={styles.executionPrice}>{bid}</Text>
          <Text style={styles.executionSubtext}>Bid</Text>
        </TouchableOpacity>

        <View style={styles.spreadBox}>
          <Text style={styles.spreadLabel}>Spread</Text>
          <Text style={styles.spreadValue}>
            {spread !== null ? spread.toFixed(2) : '—'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.buyButton,
            selectedSide === 'BUY' && styles.selectedBuyButton,
          ]}
          onPress={() => setSelectedSide('BUY')}
          disabled={executing}
        >
          <Text style={styles.executionLabel}>BUY</Text>
          <Text style={styles.executionPrice}>{ask}</Text>
          <Text style={styles.executionSubtext}>Ask</Text>
        </TouchableOpacity>
      </View>

      {/* Quantity */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Quantity</Text>

        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={decreaseQuantity}
          >
            <Text style={styles.quantityButtonText}>−</Text>
          </TouchableOpacity>

          <View style={styles.quantityValue}>
            <TextInput
              value={quantity.toFixed(2)}
              onChangeText={(value) => {
                const cleaned = value.replace(/[^0-9.]/g, '');
                const parts = cleaned.split('.');

                if (parts.length > 2) {
                  return;
                }

                if (cleaned === '') {
                  setQuantity(0);
                  return;
                }

                const numericValue = Number(cleaned);

                if (Number.isFinite(numericValue)) {
                  setQuantity(numericValue);
                }
              }}
              onBlur={() => {
                setQuantity((value) =>
                  Math.max(0.01, Number(value.toFixed(2))),
                );
              }}
              keyboardType="decimal-pad"
              selectTextOnFocus
              style={styles.quantityInput}
            />
            <Text style={styles.quantityUnit}>Lots</Text>
          </View>

          <TouchableOpacity
            style={styles.quantityButton}
            onPress={increaseQuantity}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickQuantityRow}>
          {[0.01, 0.1, 0.5, 1].map((value) => {
            const active = quantity === value;

            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.quickQuantity,
                  active && styles.quickQuantityActive,
                ]}
                onPress={() => setQuantity(value)}
              >
                <Text
                  style={[
                    styles.quickQuantityText,
                    active && styles.quickQuantityTextActive,
                  ]}
                >
                  {value.toFixed(2)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.notionalText}>
          ≈ {ask !== '—'
            ? Number(ask.replace(/,/g, '')) * quantity > 0
              ? `${(Number(ask.replace(/,/g, '')) * quantity).toLocaleString(
                  'en-US',
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                )} ${instrument?.currency ?? 'USD'}`
              : '—'
            : '—'} notional
        </Text>
      </View>

      {/* Position bracket */}
      <View style={styles.sectionCard}>
        <View style={styles.bracketHeader}>
          <Text style={styles.sectionTitle}>Position Bracket</Text>
          <View style={styles.bracketStatus}>
            <View style={styles.bracketStatusDot} />
            <Text style={styles.bracketStatusText}>Optional</Text>
          </View>
        </View>

        <View style={styles.protectionControl}>
          <View style={styles.protectionHeader}>
            <View style={styles.protectionTitleWrap}>
              <Text style={styles.protectionTitle}>Take Profit</Text>
              <Text style={styles.protectionHint}>
                Optional exit target
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.toggle,
                takeProfit && styles.toggleActive,
              ]}
              onPress={() => setTakeProfit((value) => !value)}
              disabled={executing}
              accessibilityRole="switch"
              accessibilityState={{ checked: takeProfit }}
            >
              <View
                style={[
                  styles.toggleKnob,
                  takeProfit && styles.toggleKnobActive,
                ]}
              />
            </TouchableOpacity>
          </View>

          {takeProfit && (
            <View style={styles.protectionInputWrap}>
              <Text style={styles.protectionInputLabel}>TP Price</Text>
              <TextInput
                value={takeProfitPrice}
                onChangeText={(value) =>
                  setTakeProfitPrice(value.replace(/[^0-9.]/g, ''))
                }
                keyboardType="decimal-pad"
                placeholder="Enter price"
                placeholderTextColor={colors.textMuted}
                selectTextOnFocus
                style={styles.protectionInput}
              />
            </View>
          )}
        </View>

        <View style={styles.protectionControl}>
          <View style={styles.protectionHeader}>
            <View style={styles.protectionTitleWrap}>
              <Text style={styles.protectionTitle}>Stop Loss</Text>
              <Text style={styles.protectionHint}>
                Optional risk limit
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.toggle,
                stopLoss && styles.toggleActive,
              ]}
              onPress={() => setStopLoss((value) => !value)}
              disabled={executing}
              accessibilityRole="switch"
              accessibilityState={{ checked: stopLoss }}
            >
              <View
                style={[
                  styles.toggleKnob,
                  stopLoss && styles.toggleKnobActive,
                ]}
              />
            </TouchableOpacity>
          </View>

          {stopLoss && (
            <View style={styles.protectionInputWrap}>
              <Text style={styles.protectionInputLabel}>SL Price</Text>
              <TextInput
                value={stopLossPrice}
                onChangeText={(value) =>
                  setStopLossPrice(value.replace(/[^0-9.]/g, ''))
                }
                keyboardType="decimal-pad"
                placeholder="Enter price"
                placeholderTextColor={colors.textMuted}
                selectTextOnFocus
                style={styles.protectionInput}
              />
            </View>
          )}
        </View>
      </View>

      {/* Primary action */}
      <View style={styles.actionCard}>
        <TouchableOpacity
          style={[
            styles.primaryBuyButton,
            selectedSide === 'SELL' && styles.primarySellButton,
          ]}
          onPress={() => void executeOrder(selectedSide)}
          disabled={executing}
        >
          <Text style={styles.primaryActionText}>
            {executing
              ? 'Submitting...'
              : `Confirm ${selectedSide} ${quantity.toFixed(2)} ${
                  instrument?.symbol ?? instrumentId
                }`}
          </Text>
        </TouchableOpacity>

        <View style={styles.executionMeta}>
          <Text style={styles.executionMetaText}>
            Est. margin:{' '}
            {estimatedMargin !== null
              ? `${account?.currency ?? 'USD'} ${estimatedMargin.toLocaleString(
                  'en-US',
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                )}`
              : '—'}
          </Text>
        </View>
      </View>

      {resultMessage && (
        <Text style={styles.resultMessage}>{resultMessage}</Text>
      )}

      {errorMessage && (
        <Text style={styles.errorMessage}>{errorMessage}</Text>
      )}

      {/* Account */}
      <View style={styles.accountCard}>
        <View style={styles.accountHeader}>
          <View>
            <Text style={styles.sectionTitle}>Account</Text>
            <Text style={styles.accountName}>RMSM Demo</Text>
          </View>

          <View style={styles.accountBadge}>
            <Text style={styles.accountBadgeText}>DEMO</Text>
          </View>
        </View>

        <View style={styles.accountMetrics}>
          <AccountMetric
            label="Balance"
            value={
              account
                ? `${account.currency} ${balance.toLocaleString(
                    'en-US',
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}`
                : '—'
            }
          />

          <AccountMetric
            label="Equity"
            value={
              account
                ? `${account.currency} ${equity.toLocaleString(
                    'en-US',
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}`
                : '—'
            }
          />

          <AccountMetric
            label="Free Margin"
            value={
              account
                ? `${account.currency} ${freeMargin.toLocaleString(
                    'en-US',
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}`
                : '—'
            }
          />
        </View>
      </View>
    </ScrollView>
  );
}

function ProtectionRow({
  label,
  value,
  enabled,
  onPress,
}: {
  label: string;
  value: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.protectionRow}>
      <View>
        <Text style={styles.protectionTitle}>{label}</Text>
        <Text style={styles.protectionValue}>
          {enabled ? value : 'Disabled'}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.toggle,
          enabled && styles.toggleActive,
        ]}
        onPress={onPress}
      >
        <View
          style={[
            styles.toggleKnob,
            enabled && styles.toggleKnobActive,
          ]}
        />
      </TouchableOpacity>
    </View>
  );
}

function AccountMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.accountMetric}>
      <Text style={styles.accountMetricLabel}>{label}</Text>
      <Text style={styles.accountMetricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  backText: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 30,
  },

  instrumentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  instrumentBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  instrumentBadgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
  },

  symbol: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },

  instrumentName: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },

  favoriteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  favoriteText: {
    color: colors.textSecondary,
    fontSize: 25,
  },

  favoriteActive: {
    color: colors.accent,
  },

  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },

  priceLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },

  mainPrice: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },

  priceStatus: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },

  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
  },

  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 5,
  },

  connectionDotOffline: {
    backgroundColor: colors.textMuted,
  },

  connectionText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '800',
  },

  connectionTextOffline: {
    color: colors.textMuted,
  },

  orderTypeCard: {
    marginBottom: spacing.sm,
  },

  orderTypeRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },

  orderTypeButton: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  orderTypeButtonActive: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
  },

  orderTypeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  orderTypeTextActive: {
    color: colors.accent,
  },

  triggerPrice: {
    marginTop: spacing.sm,
  },

  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },

  priceInput: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },

  priceInputText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
  },

  priceInputSuffix: {
    color: colors.textMuted,
    fontSize: 11,
    paddingRight: spacing.md,
  },

  executionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },

  sellButton: {
    flex: 1,
    minHeight: 78,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedBuyButton: {
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },

  selectedSellButton: {
    borderWidth: 2,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },

  spreadBox: {
    width: 52,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },

  spreadLabel: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '700',
  },

  spreadValue: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },

  buyButton: {
    flex: 1,
    minHeight: 78,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  executionLabel: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  executionPrice: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 3,
  },

  executionSubtext: {
    color: colors.textSecondary,
    fontSize: 9,
    marginTop: 3,
  },

  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },

  quantityRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },

  quantityButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityButtonText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
  },

  quantityValue: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityInput: {
    minWidth: 72,
    paddingVertical: 0,
    paddingHorizontal: spacing.xs,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },

  quantityNumber: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },

  quantityUnit: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 1,
  },

  quickQuantityRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },

  quickQuantity: {
    flex: 1,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },

  quickQuantityActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },

  quickQuantityText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },

  quickQuantityTextActive: {
    color: colors.accent,
  },

  notionalText: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: spacing.sm,
  },

  bracketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  bracketStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },

  bracketStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 5,
  },

  bracketStatusText: {
    color: colors.textMuted,
    fontSize: 9,
  },

  protectionRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  protectionTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },

  protectionValue: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 3,
  },

  toggle: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },

  toggleActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.textMuted,
  },

  toggleKnobActive: {
    backgroundColor: colors.white,
    alignSelf: 'flex-end',
  },

  actionCard: {
    marginBottom: spacing.sm,
  },

  protectionControl: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },

  protectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  protectionTitleWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },

  protectionHint: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },

  protectionInputWrap: {
    marginTop: spacing.sm,
  },

  protectionInputLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },

  protectionInput: {
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    paddingVertical: 0,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  primaryBuyButton: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primarySellButton: {
    backgroundColor: colors.danger,
  },

  primaryActionText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },

  executionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },

  executionMetaText: {
    color: colors.textMuted,
    fontSize: 10,
  },

  resultMessage: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },

  errorMessage: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },

  accountCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },

  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  accountName: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: -6,
  },

  accountBadge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  accountBadgeText: {
    color: colors.accent,
    fontSize: 8,
    fontWeight: '900',
  },

  accountMetrics: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },

  accountMetric: {
    flex: 1,
  },

  accountMetricLabel: {
    color: colors.textMuted,
    fontSize: 9,
  },

  accountMetricValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
});
