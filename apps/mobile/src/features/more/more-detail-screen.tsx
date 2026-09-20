import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '../../theme/colors';
import { InstrumentBadge } from '../markets/markets-screen';
import { radius, spacing } from '../../theme/spacing';
import { useTradingAccount } from '../../account/trading-account-context';
import { marketDataApi, tradingApi } from '../../api';
import { MarketDataSocket } from '../../realtime/market-data-socket';
import type { Instrument, Quote } from '../../types/market-data';
import type {
  TradingPosition,
  TradingTrade,
} from '../../api/trading';

import type { MoreDetailKey } from '../../navigation/navigation';
import { RmsmIcon, type RmsmIconName } from '../../components/rmsm-icon';
import { useAuth } from '../../auth/auth-context';

type MoreDetailScreenProps = {
  detail: MoreDetailKey;
  onBack: () => void;
};

const detailMeta: Record<
  MoreDetailKey,
  { title: string; subtitle: string; icon: RmsmIconName }
> = {
  account: {
    title: 'Account & Profile',
    subtitle: 'Personal details and account information',
    icon: 'user',
  },
  portfolio: {
    title: 'Portfolio',
    subtitle: 'Positions, exposure and performance',
    icon: 'briefcase',
  },
  analytics: {
    title: 'Analytics',
    subtitle: 'Trading performance and statistics',
    icon: 'chart',
  },
  'trading-settings': {
    title: 'Trading Settings',
    subtitle: 'Execution and trading preferences',
    icon: 'sliders',
  },
  notifications: {
    title: 'Notifications',
    subtitle: 'Alerts and notification preferences',
    icon: 'bell',
  },
  appearance: {
    title: 'Appearance',
    subtitle: 'Dark theme and display preferences',
    icon: 'moon',
  },
  security: {
    title: 'Security',
    subtitle: 'Password, sessions and security controls',
    icon: 'shield',
  },
  support: {
    title: 'Help & Support',
    subtitle: 'Get help with RMSM',
    icon: 'help',
  },
  about: {
    title: 'About RMSM',
    subtitle: 'Version 1.0.0',
    icon: 'info',
  },
};

function SettingRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: colors.border,
          true: colors.accentSoft,
        }}
        thumbColor={value ? colors.accent : colors.textMuted}
      />
    </View>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function MoreDetailScreen({
  detail,
  onBack,
}: MoreDetailScreenProps) {
  const meta = detailMeta[detail];
  const { user } = useAuth();

  const [notifications, setNotifications] = React.useState(true);
  const [priceAlerts, setPriceAlerts] = React.useState(true);
  const [orderUpdates, setOrderUpdates] = React.useState(true);
  const [sound, setSound] = React.useState(true);
  const [confirmOrders, setConfirmOrders] = React.useState(true);
  const [takeProfitEnabled, setTakeProfitEnabled] = React.useState(true);
  const [stopLossEnabled, setStopLossEnabled] = React.useState(true);
  const [defaultOrderType, setDefaultOrderType] = React.useState('Market');
  const [defaultQuantity, setDefaultQuantity] = React.useState('1.00');
  const [darkTheme, setDarkTheme] = React.useState(true);

  const {
    organizationId,
    currentAccount: account,
    loading: accountLoading,
  } = useTradingAccount();

  const [positions, setPositions] = React.useState<TradingPosition[]>([]);
  const [trades, setTrades] = React.useState<TradingTrade[]>([]);
  const [instruments, setInstruments] = React.useState<
    Record<string, Instrument>
  >({});
  const [quotes, setQuotes] = React.useState<Record<string, Quote>>({});

  React.useEffect(() => {
    let cancelled = false;

    const loadTradingData = async () => {
      try {
        if (accountLoading || !organizationId || !account || cancelled) {
          return;
        }

        const [positionData, tradeData] = await Promise.all([
          tradingApi.listPositions(organizationId, account.id),
          tradingApi.listTrades(organizationId, account.id),
        ]);

        if (cancelled) {
          return;
        }

        // Keep the global selected account as the source of truth.
        // The detail response refreshes the displayed account data below.
        setPositions(
          positionData.filter(
            (position) =>
              position.status === 'OPEN' || position.status === 'ACTIVE',
          ),
        );
        setTrades(tradeData);

        const instrumentIds = Array.from(
          new Set(
            [...positionData, ...tradeData]
              .map((item) => item.instrumentId)
              .filter(Boolean),
          ),
        );

        if (instrumentIds.length > 0) {
          const instrumentResults = await Promise.all(
            instrumentIds.map(async (instrumentId) => {
              try {
                return await marketDataApi.getInstrument(instrumentId);
              } catch {
                return null;
              }
            }),
          );

          if (!cancelled) {
            const nextInstruments: Record<string, Instrument> = {};

            instrumentResults.forEach((instrument) => {
              if (instrument) {
                nextInstruments[instrument.id] = instrument;
              }
            });

            setInstruments(nextInstruments);

            try {
              const latestQuotes =
                await marketDataApi.getLatestQuotes(instrumentIds);

              if (!cancelled) {
                const nextQuotes: Record<string, Quote> = {};

                latestQuotes.forEach((quote) => {
                  nextQuotes[quote.instrumentId] = quote;
                });

                setQuotes(nextQuotes);
              }
            } catch {
              // Live socket below remains the source for realtime quotes.
            }
          }
        }
      } catch {
        if (!cancelled) {
          setPositions([]);
          setTrades([]);
        }
      }
    };

    void loadTradingData();

    return () => {
      cancelled = true;
    };
  }, [accountLoading, organizationId, account]);

  React.useEffect(() => {
    const instrumentIds = Object.keys(instruments);

    if (instrumentIds.length === 0) {
      return;
    }

    const socket = new MarketDataSocket(
      'wss://cygnex.co/api/v1/market-data/ws',
      instrumentIds,
      {
        onQuote: (message) => {
          const quote = message.data;

          setQuotes((current) => ({
            ...current,
            [quote.instrumentId]: {
              id: `ws-${quote.instrumentId}`,
              instrumentId: quote.instrumentId,
              bidPrice: quote.bidPrice ?? null,
              askPrice: quote.askPrice ?? null,
              lastPrice: quote.lastPrice ?? null,
              bidSize: quote.bidSize ?? null,
              askSize: quote.askSize ?? null,
              eventTime: quote.eventTime,
              providerId: 'realtime',
              source: 'websocket',
            },
          }));
        },
      },
    );

    void socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [instruments]);

  const openPositions = positions;

  const unrealizedPnl = openPositions.reduce((total, position) => {
    const quote = quotes[position.instrumentId];

    if (!quote) {
      return total;
    }

    const quantity = Number(position.quantity);
    const entry = Number(position.averageEntryPrice);

    if (position.side === 'LONG') {
      const bid = Number(quote.bidPrice);
      return Number.isFinite(bid)
        ? total + (bid - entry) * quantity
        : total;
    }

    const ask = Number(quote.askPrice);
    return Number.isFinite(ask)
      ? total + (entry - ask) * quantity
      : total;
  }, 0);

  const equity = account
    ? Number(account.balance) + unrealizedPnl
    : null;

  const exposure = openPositions.reduce(
    (total, position) =>
      total +
      Number(position.quantity) * Number(position.averageEntryPrice),
    0,
  );

  const usedMargin = openPositions.reduce((total, position) => {
    const leverage = Number(account?.leverage ?? 1);

    if (!Number.isFinite(leverage) || leverage <= 0) {
      return total;
    }

    return (
      total +
      (Number(position.quantity) *
        Number(position.averageEntryPrice)) /
        leverage
    );
  }, 0);

  const freeMargin =
    equity !== null ? equity - usedMargin : null;

  const winningTrades = trades.filter(
    (trade) => Number(trade.realizedPnl ?? 0) > 0,
  ).length;

  const losingTrades = trades.filter(
    (trade) => Number(trade.realizedPnl ?? 0) < 0,
  ).length;

  const realizedProfit = trades.reduce(
    (total, trade) => total + Number(trade.realizedPnl ?? 0),
    0,
  );

  const averageTrade =
    trades.length > 0 ? realizedProfit / trades.length : 0;

  const grossProfit = trades.reduce(
    (total, trade) =>
      total +
      Math.max(0, Number(trade.realizedPnl ?? 0)),
    0,
  );

  const grossLoss = trades.reduce(
    (total, trade) =>
      total +
      Math.abs(Math.min(0, Number(trade.realizedPnl ?? 0))),
    0,
  );

  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : null;

  const formatMoney = (value: number | null, currency = 'USD') =>
    value === null
      ? '—'
      : `${currency} ${value.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

  const formatSignedMoney = (value: number) =>
    `${value >= 0 ? '+' : ''}${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const winRate =
    trades.length > 0
      ? (winningTrades / trades.length) * 100
      : null;

  const winningPnlValues = trades
    .map((trade) => Number(trade.realizedPnl ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  const losingPnlValues = trades
    .map((trade) => Number(trade.realizedPnl ?? 0))
    .filter((value) => Number.isFinite(value) && value < 0);

  const averageWin =
    winningPnlValues.length > 0
      ? winningPnlValues.reduce((total, value) => total + value, 0) /
        winningPnlValues.length
      : null;

  const averageLoss =
    losingPnlValues.length > 0
      ? losingPnlValues.reduce((total, value) => total + value, 0) /
        losingPnlValues.length
      : null;

  const chronologicalTrades = [...trades].sort((a, b) => {
    const aTime = new Date(a.closedAt ?? a.openedAt).getTime();
    const bTime = new Date(b.closedAt ?? b.openedAt).getTime();

    return aTime - bTime;
  });

  let cumulativePnl = 0;
  let peakPnl = 0;
  let maxDrawdown = 0;

  chronologicalTrades.forEach((trade) => {
    const pnl = Number(trade.realizedPnl ?? 0);

    if (!Number.isFinite(pnl)) {
      return;
    }

    cumulativePnl += pnl;
    peakPnl = Math.max(peakPnl, cumulativePnl);
    maxDrawdown = Math.max(maxDrawdown, peakPnl - cumulativePnl);
  });

  const longTrades = trades.filter((trade) => trade.side === 'BUY');
  const shortTrades = trades.filter((trade) => trade.side === 'SELL');

  const longPnl = longTrades.reduce(
    (total, trade) => total + Number(trade.realizedPnl ?? 0),
    0,
  );

  const shortPnl = shortTrades.reduce(
    (total, trade) => total + Number(trade.realizedPnl ?? 0),
    0,
  );

  const expectancy =
    trades.length > 0 ? realizedProfit / trades.length : 0;

  const recentTrades = [...trades]
    .sort((a, b) => {
      const aTime = new Date(a.closedAt ?? a.openedAt).getTime();
      const bTime = new Date(b.closedAt ?? b.openedAt).getTime();

      return bTime - aTime;
    })
    .slice(0, 5);


  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerIcon}>
          <RmsmIcon
            name={meta.icon}
            size={20}
            color={colors.accent}
          />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.title}>{meta.title}</Text>
          <Text style={styles.subtitle}>{meta.subtitle}</Text>
        </View>
      </View>

      {detail === 'account' ? (
        <>
          <Text style={styles.accountSectionTitle}>PROFILE</Text>

          <View style={styles.accountHeroCard}>
            <View style={styles.accountHeroTop}>
              <View style={styles.accountAvatar}>
                <RmsmIcon
                  name="user"
                  size={22}
                  color={colors.accent}
                />
              </View>

              <View style={styles.accountIdentity}>
                <Text style={styles.accountName}>RMSM</Text>
                <Text style={styles.accountSubtitle}>
                  Demo trading account
                </Text>
              </View>

              <View style={styles.accountDemoBadge}>
                <View style={styles.accountDemoDot} />
                <Text style={styles.accountDemoText}>DEMO</Text>
              </View>
            </View>

            <View style={styles.accountHeroDivider} />

            <View style={styles.accountBalanceRow}>
              <View style={styles.accountBalanceBlock}>
                <Text style={styles.accountBalanceLabel}>
                  ACCOUNT BALANCE
                </Text>
                <Text style={styles.accountBalanceValue}>
                  {formatMoney(
                    account ? Number(account.balance) : null,
                    account?.currency ?? 'USD',
                  )}
                </Text>
              </View>

              <View style={styles.accountStatusBlock}>
                <View style={styles.accountStatusDot} />
                <View>
                  <Text style={styles.accountStatusLabel}>
                    STATUS
                  </Text>
                  <Text style={styles.accountStatusValue}>
                    {account?.status ?? '—'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.accountSectionTitle}>
            ACCOUNT DETAILS
          </Text>

          <View style={styles.accountDetailsCard}>
            <View style={styles.accountDetailRow}>
              <View style={styles.accountDetailIcon}>
                <RmsmIcon
                  name="briefcase"
                  size={16}
                  color={colors.accent}
                />
              </View>
              <View style={styles.accountDetailContent}>
                <Text style={styles.accountDetailLabel}>
                  Account
                </Text>
                <Text style={styles.accountDetailValue}>
                  {account?.name ?? '—'}
                </Text>
              </View>
            </View>

            <View style={styles.accountDetailDivider} />

            <View style={styles.accountDetailRow}>
              <View style={styles.accountDetailIcon}>
                <RmsmIcon
                  name="chart"
                  size={16}
                  color={colors.accent}
                />
              </View>
              <View style={styles.accountDetailContent}>
                <Text style={styles.accountDetailLabel}>
                  Account Type
                </Text>
                <Text style={styles.accountDetailValue}>
                  {account?.type ?? '—'}
                </Text>
              </View>
            </View>

            <View style={styles.accountDetailDivider} />

            <View style={styles.accountDetailRow}>
              <View style={styles.accountDetailIcon}>
                <RmsmIcon
                  name="wallet"
                  size={16}
                  color={colors.accent}
                />
              </View>
              <View style={styles.accountDetailContent}>
                <Text style={styles.accountDetailLabel}>
                  Currency
                </Text>
                <Text style={styles.accountDetailValue}>
                  {account?.currency ?? '—'}
                </Text>
              </View>
            </View>

            <View style={styles.accountDetailDivider} />

            <View style={styles.accountDetailRow}>
              <View style={styles.accountDetailIcon}>
                <RmsmIcon
                  name="info"
                  size={16}
                  color={colors.accent}
                />
              </View>
              <View style={styles.accountDetailContent}>
                <Text style={styles.accountDetailLabel}>
                  Account Status
                </Text>
                <Text
                  style={[
                    styles.accountDetailValue,
                    styles.accountActiveValue,
                  ]}
                >
                  {account?.status ?? '—'}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.accountSectionTitle}>
            USER PROFILE
          </Text>

          <View style={styles.accountDetailsCard}>
            <View style={styles.accountDetailRow}>
              <View style={styles.accountDetailIcon}>
                <RmsmIcon
                  name="user"
                  size={16}
                  color={colors.accent}
                />
              </View>

              <View style={styles.accountDetailContent}>
                <Text style={styles.accountDetailLabel}>
                  Email
                </Text>
                <Text
                  style={styles.accountDetailValue}
                  numberOfLines={1}
                >
                  {user?.email ?? '—'}
                </Text>
              </View>
            </View>

            <View style={styles.accountDetailDivider} />

            <View style={styles.accountDetailRow}>
              <View style={styles.accountDetailIcon}>
                <RmsmIcon
                  name="shield"
                  size={16}
                  color={colors.accent}
                />
              </View>

              <View style={styles.accountDetailContent}>
                <Text style={styles.accountDetailLabel}>
                  Roles
                </Text>
                <Text style={styles.accountDetailValue}>
                  {user?.roles?.length
                    ? user.roles.join(', ')
                    : '—'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.accountProfileNote}>
            <RmsmIcon
              name="info"
              size={15}
              color={colors.textMuted}
            />
            <Text style={styles.accountProfileNoteText}>
              Profile details are provided by your authenticated RMSM
              account. Profile editing is not currently available in
              the mobile client.
            </Text>
          </View>
        </>
      ) : null}

      {detail === 'portfolio' ? (
        <>
          <Text style={styles.portfolioSectionTitle}>PORTFOLIO</Text>

          <View style={styles.portfolioHeroCard}>
            <View style={styles.portfolioHeroHeader}>
              <View>
                <Text style={styles.portfolioHeroLabel}>EQUITY</Text>
                <Text style={styles.portfolioHeroValue}>
                  {formatMoney(
                    equity,
                    account?.currency ?? 'USD',
                  )}
                </Text>
              </View>

              <View
                style={[
                  styles.portfolioDirection,
                  unrealizedPnl >= 0
                    ? styles.portfolioDirectionPositive
                    : styles.portfolioDirectionNegative,
                ]}
              >
                <Text
                  style={
                    unrealizedPnl >= 0
                      ? styles.portfolioArrowPositive
                      : styles.portfolioArrowNegative
                  }
                >
                  {unrealizedPnl >= 0 ? '↑' : '↓'}
                </Text>
              </View>
            </View>

            <View style={styles.portfolioHeroDivider} />

            <View style={styles.portfolioPnlRow}>
              <Text style={styles.portfolioPnlLabel}>
                UNREALIZED P&L
              </Text>
              <Text
                style={
                  unrealizedPnl >= 0
                    ? styles.portfolioPnlPositive
                    : styles.portfolioPnlNegative
                }
              >
                {formatSignedMoney(unrealizedPnl)}
              </Text>
            </View>
          </View>

          <View style={styles.portfolioMetricGrid}>
            <View style={styles.portfolioMetricCard}>
              <Text style={styles.portfolioMetricLabel}>
                BALANCE
              </Text>
              <Text style={styles.portfolioMetricValue}>
                {formatMoney(
                  account ? Number(account.balance) : null,
                  account?.currency ?? 'USD',
                )}
              </Text>
            </View>

            <View style={styles.portfolioMetricCard}>
              <Text style={styles.portfolioMetricLabel}>
                EXPOSURE
              </Text>
              <Text style={styles.portfolioMetricValue}>
                {formatMoney(
                  exposure,
                  account?.currency ?? 'USD',
                )}
              </Text>
            </View>

            <View style={styles.portfolioMetricCard}>
              <Text style={styles.portfolioMetricLabel}>
                USED MARGIN
              </Text>
              <Text style={styles.portfolioMetricValue}>
                {formatMoney(
                  usedMargin,
                  account?.currency ?? 'USD',
                )}
              </Text>
            </View>

            <View style={styles.portfolioMetricCard}>
              <Text style={styles.portfolioMetricLabel}>
                FREE MARGIN
              </Text>
              <Text style={styles.portfolioMetricValue}>
                {formatMoney(
                  freeMargin,
                  account?.currency ?? 'USD',
                )}
              </Text>
            </View>
          </View>

          <Text style={styles.portfolioSectionTitle}>
            OPEN POSITIONS
          </Text>

          {openPositions.length === 0 ? (
            <View style={styles.portfolioEmptyCard}>
              <View style={styles.portfolioEmptyIcon}>
                <Text style={styles.portfolioEmptyIconText}>—</Text>
              </View>
              <Text style={styles.portfolioEmptyTitle}>
                NO OPEN POSITIONS
              </Text>
              <Text style={styles.portfolioEmptySubtitle}>
                Your portfolio currently has no active positions.
              </Text>
            </View>
          ) : (
            openPositions.map((position) => {
              const instrument = instruments[position.instrumentId];
              const quote = quotes[position.instrumentId];

              const quantity = Number(position.quantity);
              const entry = Number(position.averageEntryPrice);

              const currentPrice =
                position.side === 'LONG'
                  ? Number(quote?.bidPrice)
                  : Number(quote?.askPrice);

              const positionPnl =
                Number.isFinite(currentPrice) &&
                Number.isFinite(entry) &&
                Number.isFinite(quantity)
                  ? position.side === 'LONG'
                    ? (currentPrice - entry) * quantity
                    : (entry - currentPrice) * quantity
                  : 0;

              const symbol =
                instrument?.symbol ??
                instrument?.name ??
                position.instrumentId;

              return (
                <View
                  key={position.id}
                  style={styles.positionCard}
                >
                  <View style={styles.positionHeader}>
                    <View style={styles.positionInstrument}>
                      <InstrumentBadge symbol={String(symbol)} />

                      <View style={styles.positionInstrumentText}>
                        <Text style={styles.positionSymbol}>
                          {symbol}
                        </Text>
                        <Text style={styles.positionQuantity}>
                          Qty {position.quantity}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.positionSideBadge,
                        position.side === 'LONG'
                          ? styles.positionSideLong
                          : styles.positionSideShort,
                      ]}
                    >
                      <Text
                        style={
                          position.side === 'LONG'
                            ? styles.positionSideLongText
                            : styles.positionSideShortText
                        }
                      >
                        {position.side}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.positionDivider} />

                  <View style={styles.positionPriceGrid}>
                    <View>
                      <Text style={styles.positionLabel}>ENTRY</Text>
                      <Text style={styles.positionValue}>
                        {Number.isFinite(entry)
                          ? entry.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 5,
                            })
                          : '—'}
                      </Text>
                    </View>

                    <View style={styles.positionPriceRight}>
                      <Text style={styles.positionLabel}>
                        CURRENT
                      </Text>
                      <Text style={styles.positionValue}>
                        {Number.isFinite(currentPrice)
                          ? currentPrice.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 5,
                            })
                          : '—'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.positionPnlRow}>
                    <Text style={styles.positionPnlLabel}>
                      UNREALIZED P&L
                    </Text>
                    <Text
                      style={
                        positionPnl >= 0
                          ? styles.portfolioPnlPositive
                          : styles.portfolioPnlNegative
                      }
                    >
                      {formatSignedMoney(positionPnl)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </>
      ) : null}

      {detail === 'analytics' ? (
        <>
          <Text style={styles.analyticsSectionTitle}>PERFORMANCE</Text>

          <View style={styles.performanceCard}>
            <View style={styles.performanceHeader}>
              <View style={styles.analyticsHeroContent}>
                <Text style={styles.performanceLabel}>REALIZED P&L</Text>
                <Text
                  style={[
                    styles.performanceValue,
                    realizedProfit >= 0
                      ? styles.positive
                      : styles.negative,
                  ]}
                >
                  {formatSignedMoney(realizedProfit)}
                </Text>
                <Text style={styles.analyticsHeroCaption}>
                  Closed trade performance
                </Text>
              </View>

              <View
                style={[
                  styles.performanceDirection,
                  realizedProfit >= 0
                    ? styles.performanceDirectionPositive
                    : styles.performanceDirectionNegative,
                ]}
              >
                <Text
                  style={
                    realizedProfit >= 0
                      ? styles.performanceArrowPositive
                      : styles.performanceArrowNegative
                  }
                >
                  {realizedProfit >= 0 ? '↑' : '↓'}
                </Text>
              </View>
            </View>

            <View style={styles.performanceDivider} />

            <View style={styles.performanceStats}>
              <View>
                <Text style={styles.performanceStatLabel}>TRADES</Text>
                <Text style={styles.performanceStatValue}>
                  {String(trades.length)}
                </Text>
              </View>

              <View style={styles.performanceStatDivider} />

              <View>
                <Text style={styles.performanceStatLabel}>WIN RATE</Text>
                <Text style={styles.performanceStatValue}>
                  {winRate === null
                    ? '—'
                    : `${winRate.toFixed(1)}%`}
                </Text>
              </View>

              <View style={styles.performanceStatDivider} />

              <View>
                <Text style={styles.performanceStatLabel}>DRAWDOWN</Text>
                <Text style={styles.performanceStatValue}>
                  {formatSignedMoney(-maxDrawdown)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.analyticsSectionTitle}>
            KEY METRICS
          </Text>

          <View style={styles.metricGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>TRADES</Text>
              <Text style={styles.metricValue}>
                {String(trades.length)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>WIN RATE</Text>
              <Text style={styles.metricValue}>
                {winRate === null
                  ? '—'
                  : `${winRate.toFixed(1)}%`}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>PROFIT FACTOR</Text>
              <Text style={styles.metricValue}>
                {profitFactor === null
                  ? '—'
                  : profitFactor.toFixed(2)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>EXPECTANCY</Text>
              <Text
                style={[
                  styles.metricValue,
                  expectancy >= 0
                    ? styles.positive
                    : styles.negative,
                ]}
              >
                {formatSignedMoney(expectancy)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>AVG WIN</Text>
              <Text style={[styles.metricValue, styles.positive]}>
                {averageWin === null
                  ? '—'
                  : formatSignedMoney(averageWin)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>AVG LOSS</Text>
              <Text style={[styles.metricValue, styles.negative]}>
                {averageLoss === null
                  ? '—'
                  : formatSignedMoney(averageLoss)}
              </Text>
            </View>
          </View>

          <Text style={styles.analyticsSectionTitle}>
            TRADE OUTCOMES
          </Text>

          <View style={styles.analyticsBreakdownCard}>
            <View style={styles.analyticsBreakdownRow}>
              <View style={styles.analyticsBreakdownIdentity}>
                <View
                  style={[
                    styles.analyticsBreakdownDot,
                    styles.analyticsBreakdownDotPositive,
                  ]}
                />
                <View>
                  <Text style={styles.analyticsBreakdownTitle}>
                    Winning Trades
                  </Text>
                  <Text style={styles.analyticsBreakdownSubtitle}>
                    Profitable closed trades
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.analyticsBreakdownValue,
                  styles.positive,
                ]}
              >
                {String(winningTrades)}
              </Text>
            </View>

            <View style={styles.analyticsBreakdownDivider} />

            <View style={styles.analyticsBreakdownRow}>
              <View style={styles.analyticsBreakdownIdentity}>
                <View
                  style={[
                    styles.analyticsBreakdownDot,
                    styles.analyticsBreakdownDotNegative,
                  ]}
                />
                <View>
                  <Text style={styles.analyticsBreakdownTitle}>
                    Losing Trades
                  </Text>
                  <Text style={styles.analyticsBreakdownSubtitle}>
                    Unprofitable closed trades
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.analyticsBreakdownValue,
                  styles.negative,
                ]}
              >
                {String(losingTrades)}
              </Text>
            </View>

            <View style={styles.analyticsBreakdownDivider} />

            <View style={styles.analyticsBreakdownRow}>
              <View style={styles.analyticsBreakdownIdentity}>
                <View
                  style={[
                    styles.analyticsBreakdownDot,
                    styles.analyticsBreakdownDotNeutral,
                  ]}
                />
                <View>
                  <Text style={styles.analyticsBreakdownTitle}>
                    Max Drawdown
                  </Text>
                  <Text style={styles.analyticsBreakdownSubtitle}>
                    Peak-to-trough realized P&L
                  </Text>
                </View>
              </View>

              <Text style={styles.analyticsBreakdownValue}>
                {formatSignedMoney(-maxDrawdown)}
              </Text>
            </View>
          </View>

          <Text style={styles.analyticsSectionTitle}>
            TRADE DIRECTION
          </Text>

          <View style={styles.directionCard}>
            <View style={styles.directionColumn}>
              <Text style={styles.directionLabel}>LONG / BUY</Text>
              <Text style={styles.directionCount}>
                {String(longTrades.length)}
              </Text>
              <Text
                style={[
                  styles.directionPnl,
                  longPnl >= 0
                    ? styles.positive
                    : styles.negative,
                ]}
              >
                {formatSignedMoney(longPnl)}
              </Text>
            </View>

            <View style={styles.directionDivider} />

            <View style={styles.directionColumn}>
              <Text style={styles.directionLabel}>SHORT / SELL</Text>
              <Text style={styles.directionCount}>
                {String(shortTrades.length)}
              </Text>
              <Text
                style={[
                  styles.directionPnl,
                  shortPnl >= 0
                    ? styles.positive
                    : styles.negative,
                ]}
              >
                {formatSignedMoney(shortPnl)}
              </Text>
            </View>
          </View>

          <Text style={styles.analyticsSectionTitle}>
            RECENT TRADES
          </Text>

          <View style={styles.analyticsRecentCard}>
            {recentTrades.length === 0 ? (
              <View style={styles.analyticsRecentEmpty}>
                <Text style={styles.analyticsRecentEmptyTitle}>
                  NO CLOSED TRADES
                </Text>
                <Text style={styles.analyticsRecentEmptySubtitle}>
                  Completed trades will appear here.
                </Text>
              </View>
            ) : (
              recentTrades.map((trade, index) => {
                const tradePnl = Number(trade.realizedPnl ?? 0);
                const tradeInstrument =
                  instruments[trade.instrumentId];

                const tradeSymbol =
                  tradeInstrument?.symbol ??
                  tradeInstrument?.name ??
                  trade.instrumentId;

                const tradeDate = new Date(
                  trade.closedAt ?? trade.openedAt,
                );

                const tradeDateLabel = Number.isNaN(
                  tradeDate.getTime(),
                )
                  ? '—'
                  : tradeDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    });

                return (
                  <View key={trade.id}>
                    <View style={styles.recentTradeRow}>
                      <View style={styles.recentTradeIdentity}>
                        <View
                          style={[
                            styles.recentTradeSide,
                            trade.side === 'BUY'
                              ? styles.recentTradeSideBuy
                              : styles.recentTradeSideSell,
                          ]}
                        >
                          <Text
                            style={[
                              styles.recentTradeSideText,
                              trade.side === 'BUY'
                                ? styles.recentTradeSideTextBuy
                                : styles.recentTradeSideTextSell,
                            ]}
                          >
                            {trade.side === 'BUY' ? 'B' : 'S'}
                          </Text>
                        </View>

                        <View style={styles.recentTradeText}>
                          <Text style={styles.recentTradeSymbol}>
                            {tradeSymbol}
                          </Text>
                          <Text style={styles.recentTradeMeta}>
                            {tradeDateLabel} · Qty {trade.quantity}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={[
                          styles.recentTradePnl,
                          tradePnl >= 0
                            ? styles.positive
                            : styles.negative,
                        ]}
                      >
                        {formatSignedMoney(tradePnl)}
                      </Text>
                    </View>

                    {index < recentTrades.length - 1 ? (
                      <View style={styles.analyticsRecentDivider} />
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        </>
      ) : null}

      {detail === 'trading-settings' ? (
        <>
          <Text style={styles.tradingSettingsSectionTitle}>
            ORDER EXECUTION
          </Text>

          <View style={styles.tradingSettingsCard}>
            <SettingRow
              title="Confirm Orders"
              subtitle="Ask for confirmation before submitting"
              value={confirmOrders}
              onValueChange={setConfirmOrders}
            />
            <View style={styles.tradingSettingsDivider} />
            <SettingRow
              title="Order Sounds"
              subtitle="Play sound after order activity"
              value={sound}
              onValueChange={setSound}
            />
          </View>

          <Text style={styles.tradingSettingsSectionTitle}>
            PROTECTION
          </Text>

          <View style={styles.tradingSettingsCard}>
            <SettingRow
              title="Take Profit"
              subtitle="Enable TP controls on the Trade screen"
              value={takeProfitEnabled}
              onValueChange={setTakeProfitEnabled}
            />
            <View style={styles.tradingSettingsDivider} />
            <SettingRow
              title="Stop Loss"
              subtitle="Enable SL controls on the Trade screen"
              value={stopLossEnabled}
              onValueChange={setStopLossEnabled}
            />
          </View>

          <Text style={styles.tradingSettingsSectionTitle}>
            ORDER DEFAULTS
          </Text>

          <View style={styles.tradingSettingsCard}>
            <View style={styles.tradingSettingsValueRow}>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Default Order Type</Text>
                <Text style={styles.rowSubtitle}>
                  Initial order type on the Trade screen
                </Text>
              </View>

              <View style={styles.tradingSettingsValueBadge}>
                <Text style={styles.tradingSettingsValueText}>
                  {defaultOrderType}
                </Text>
              </View>
            </View>

            <View style={styles.tradingSettingsDivider} />

            <View style={styles.tradingSettingsValueRow}>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Default Quantity</Text>
                <Text style={styles.rowSubtitle}>
                  Initial quantity on the Trade screen
                </Text>
              </View>

              <View style={styles.tradingSettingsValueBadge}>
                <Text style={styles.tradingSettingsValueText}>
                  {defaultQuantity}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.tradingSettingsNote}>
            <RmsmIcon
              name="info"
              size={15}
              color={colors.textMuted}
            />
            <Text style={styles.tradingSettingsNoteText}>
              Trading preferences are currently stored for this session.
              They do not change server-side execution rules.
            </Text>
          </View>
        </>
      ) : null}

      {detail === 'notifications' ? (
        <>
          <Text style={styles.notificationSectionTitle}>GENERAL</Text>

          <View style={styles.notificationCard}>
            <SettingRow
              title="Push Notifications"
              subtitle="Receive RMSM notifications"
              value={notifications}
              onValueChange={setNotifications}
            />
            <View style={styles.notificationDivider} />
            <SettingRow
              title="Price Alerts"
              subtitle="Notify when watched prices move"
              value={priceAlerts}
              onValueChange={setPriceAlerts}
            />
            <View style={styles.notificationDivider} />
            <SettingRow
              title="Order Updates"
              subtitle="Execution and order status alerts"
              value={orderUpdates}
              onValueChange={setOrderUpdates}
            />
          </View>

          <Text style={styles.notificationSectionTitle}>
            NOTIFICATION TYPES
          </Text>

          <View style={styles.notificationCard}>
            <SettingRow
              title="Trade Executions"
              subtitle="Filled and completed orders"
              value={orderUpdates}
              onValueChange={setOrderUpdates}
            />
            <View style={styles.notificationDivider} />
            <SettingRow
              title="Position Updates"
              subtitle="Position opened or closed"
              value={notifications}
              onValueChange={setNotifications}
            />
            <View style={styles.notificationDivider} />
            <SettingRow
              title="Price Movement"
              subtitle="Important changes in watched prices"
              value={priceAlerts}
              onValueChange={setPriceAlerts}
            />
          </View>

          <View style={styles.notificationInfo}>
            <RmsmIcon
              name="bell"
              size={15}
              color={colors.textMuted}
            />
            <Text style={styles.notificationInfoText}>
              Notification preferences are currently stored for this
              session. Push delivery will become active when the
              corresponding notification service is connected.
            </Text>
          </View>
        </>
      ) : null}

      {detail === 'appearance' ? (
        <>
          <Text style={styles.appearanceSectionTitle}>THEME</Text>

          <View style={styles.appearanceCard}>
            <SettingRow
              title="Dark Theme"
              subtitle="Use the RMSM dark trading interface"
              value={darkTheme}
              onValueChange={setDarkTheme}
            />
          </View>

          <Text style={styles.appearanceSectionTitle}>DISPLAY</Text>

          <View style={styles.appearanceCard}>
            <InfoRow
              label="Theme"
              value={darkTheme ? 'Dark' : 'System'}
            />
            <View style={styles.appearanceDivider} />
            <InfoRow
              label="Interface"
              value="Trading Terminal"
            />
            <View style={styles.appearanceDivider} />
            <InfoRow
              label="Accent"
              value="RMSM Emerald"
            />
          </View>

          <View style={styles.appearanceInfo}>
            <RmsmIcon
              name="moon"
              size={15}
              color={colors.textMuted}
            />
            <Text style={styles.appearanceInfoText}>
              RMSM uses a dark-first trading interface optimized for
              charts, quotes and order workflows.
            </Text>
          </View>
        </>
      ) : null}

      {detail === 'security' ? (
        <>
          <Text style={styles.securitySectionTitle}>SECURITY STATUS</Text>

          <View style={styles.securityStatusCard}>
            <View style={styles.securityStatusIcon}>
              <RmsmIcon
                name="shield"
                size={21}
                color={colors.accent}
              />
            </View>

            <View style={styles.securityStatusContent}>
              <Text style={styles.securityStatusTitle}>
                Account security is active
              </Text>
              <Text style={styles.securityStatusSubtitle}>
                Your current RMSM session is authenticated.
              </Text>
            </View>

            <View style={styles.securityActiveBadge}>
              <View style={styles.securityActiveDot} />
              <Text style={styles.securityActiveText}>ACTIVE</Text>
            </View>
          </View>

          <Text style={styles.securitySectionTitle}>
            ACCOUNT SECURITY
          </Text>

          <View style={styles.securityCard}>
            <View style={styles.securityRow}>
              <View style={styles.securityRowIcon}>
                <RmsmIcon
                  name="user"
                  size={17}
                  color={colors.accent}
                />
              </View>

              <View style={styles.securityRowContent}>
                <Text style={styles.securityRowTitle}>Session</Text>
                <Text style={styles.securityRowSubtitle}>
                  Current session
                </Text>
              </View>

              <View style={styles.securityStateBadge}>
                <Text style={styles.securityStateText}>ACTIVE</Text>
              </View>
            </View>

            <View style={styles.securityDivider} />

            <View style={styles.securityRow}>
              <View style={styles.securityRowIcon}>
                <RmsmIcon
                  name="shield"
                  size={17}
                  color={colors.accent}
                />
              </View>

              <View style={styles.securityRowContent}>
                <Text style={styles.securityRowTitle}>
                  Authentication
                </Text>
                <Text style={styles.securityRowSubtitle}>
                  Account authentication
                </Text>
              </View>

              <View style={styles.securityStateBadge}>
                <Text style={styles.securityStateText}>ENABLED</Text>
              </View>
            </View>

            <View style={styles.securityDivider} />

            <View style={styles.securityRow}>
              <View style={styles.securityRowIcon}>
                <RmsmIcon
                  name="info"
                  size={17}
                  color={colors.textSecondary}
                />
              </View>

              <View style={styles.securityRowContent}>
                <Text style={styles.securityRowTitle}>
                  Last Activity
                </Text>
                <Text style={styles.securityRowSubtitle}>
                  Current session
                </Text>
              </View>

              <Text style={styles.securityActivityValue}>
                CURRENT
              </Text>
            </View>
          </View>

          <Text style={styles.securitySectionTitle}>
            PASSWORD & ACCESS
          </Text>

          <View style={styles.securityCard}>
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.securityActionRow}
              onPress={() =>
                Alert.alert(
                  'Change Password',
                  'Password management is not yet available in the mobile client.',
                )
              }
            >
              <View style={styles.securityActionIcon}>
                <RmsmIcon
                  name="shield"
                  size={17}
                  color={colors.accent}
                />
              </View>

              <View style={styles.securityActionContent}>
                <Text style={styles.securityActionTitle}>
                  Change Password
                </Text>
                <Text style={styles.securityActionSubtitle}>
                  Update your account password
                </Text>
              </View>

              <View style={styles.securityUnavailableBadge}>
                <Text style={styles.securityUnavailableText}>
                  UNAVAILABLE
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.securityDivider} />

            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.securityActionRow}
              onPress={() =>
                Alert.alert(
                  'Manage Sessions',
                  'Session management is not yet available in the mobile client.',
                )
              }
            >
              <View style={styles.securityActionIcon}>
                <RmsmIcon
                  name="user"
                  size={17}
                  color={colors.accent}
                />
              </View>

              <View style={styles.securityActionContent}>
                <Text style={styles.securityActionTitle}>
                  Manage Sessions
                </Text>
                <Text style={styles.securityActionSubtitle}>
                  Review active account sessions
                </Text>
              </View>

              <View style={styles.securityUnavailableBadge}>
                <Text style={styles.securityUnavailableText}>
                  UNAVAILABLE
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.securityNote}>
            <RmsmIcon
              name="info"
              size={15}
              color={colors.textMuted}
            />
            <Text style={styles.securityNoteText}>
              Password and session management will become available when
              the corresponding account security services are connected.
            </Text>
          </View>
        </>
      ) : null}

      {detail === 'support' ? (
        <>
          <Text style={styles.supportSectionTitle}>
            SUPPORT
          </Text>

          <View style={styles.supportCard}>
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.supportActionRow}
              onPress={() =>
                Alert.alert(
                  'Help Center',
                  'Help Center integration is not yet configured.',
                )
              }
            >
              <View style={styles.supportActionIcon}>
                <RmsmIcon
                  name="help"
                  size={17}
                  color={colors.accent}
                />
              </View>

              <View style={styles.supportActionContent}>
                <Text style={styles.supportActionTitle}>
                  Help Center
                </Text>
                <Text style={styles.supportActionSubtitle}>
                  Guides and frequently asked questions
                </Text>
              </View>

              <View style={styles.supportUnavailableBadge}>
                <Text style={styles.supportUnavailableText}>
                  UNAVAILABLE
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.supportDivider} />

            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.supportActionRow}
              onPress={() =>
                Alert.alert(
                  'Contact Support',
                  'Support contact integration is not yet configured.',
                )
              }
            >
              <View style={styles.supportActionIcon}>
                <RmsmIcon
                  name="user"
                  size={17}
                  color={colors.accent}
                />
              </View>

              <View style={styles.supportActionContent}>
                <Text style={styles.supportActionTitle}>
                  Contact Support
                </Text>
                <Text style={styles.supportActionSubtitle}>
                  Get assistance with your RMSM account
                </Text>
              </View>

              <View style={styles.supportUnavailableBadge}>
                <Text style={styles.supportUnavailableText}>
                  UNAVAILABLE
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.supportDivider} />

            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.supportActionRow}
              onPress={() =>
                Alert.alert(
                  'Report a Problem',
                  'Problem reporting is not yet configured in the mobile client.',
                )
              }
            >
              <View style={styles.supportActionIcon}>
                <RmsmIcon
                  name="info"
                  size={17}
                  color={colors.accent}
                />
              </View>

              <View style={styles.supportActionContent}>
                <Text style={styles.supportActionTitle}>
                  Report a Problem
                </Text>
                <Text style={styles.supportActionSubtitle}>
                  Tell us about an issue
                </Text>
              </View>

              <View style={styles.supportUnavailableBadge}>
                <Text style={styles.supportUnavailableText}>
                  UNAVAILABLE
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.supportSectionTitle}>
            QUICK HELP
          </Text>

          <View style={styles.supportCard}>
            <View style={styles.supportInfoRow}>
              <View style={styles.supportInfoIcon}>
                <RmsmIcon
                  name="chart"
                  size={16}
                  color={colors.accent}
                />
              </View>

              <View style={styles.supportInfoContent}>
                <Text style={styles.supportInfoTitle}>
                  Trading & Orders
                </Text>
                <Text style={styles.supportInfoSubtitle}>
                  Use Trade to submit orders and Orders to review
                  positions, pending orders and trade history.
                </Text>
              </View>
            </View>

            <View style={styles.supportDivider} />

            <View style={styles.supportInfoRow}>
              <View style={styles.supportInfoIcon}>
                <RmsmIcon
                  name="info"
                  size={16}
                  color={colors.accent}
                />
              </View>

              <View style={styles.supportInfoContent}>
                <Text style={styles.supportInfoTitle}>
                  Market Data
                </Text>
                <Text style={styles.supportInfoSubtitle}>
                  Markets and Chart show available instruments,
                  quotes and market history.
                </Text>
              </View>
            </View>

            <View style={styles.supportDivider} />

            <View style={styles.supportInfoRow}>
              <View style={styles.supportInfoIcon}>
                <RmsmIcon
                  name="shield"
                  size={16}
                  color={colors.accent}
                />
              </View>

              <View style={styles.supportInfoContent}>
                <Text style={styles.supportInfoTitle}>
                  Account & Security
                </Text>
                <Text style={styles.supportInfoSubtitle}>
                  Account information is read from your authenticated
                  RMSM session.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.supportNote}>
            <RmsmIcon
              name="info"
              size={15}
              color={colors.textMuted}
            />
            <Text style={styles.supportNoteText}>
              Help Center, support contact and problem reporting
              integrations are not currently connected to the mobile
              client.
            </Text>
          </View>
        </>
      ) : null}

      {detail === 'about' ? (
        <>
          <Text style={styles.aboutSectionTitle}>
            ABOUT RMSM
          </Text>

          <View style={styles.aboutHeroCard}>
            <View style={styles.aboutLogoCircle}>
              <Text style={styles.aboutLogoText}>R</Text>
            </View>

            <View style={styles.aboutHeroContent}>
              <Text style={styles.aboutHeroTitle}>
                RMSM
              </Text>
              <Text style={styles.aboutHeroSubtitle}>
                Trading Terminal
              </Text>
              <View style={styles.aboutVersionBadge}>
                <Text style={styles.aboutVersionText}>
                  VERSION 1.0.0
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.aboutSectionTitle}>
            APPLICATION
          </Text>

          <View style={styles.aboutDetailsCard}>
            <View style={styles.aboutDetailRow}>
              <View style={styles.aboutDetailIcon}>
                <RmsmIcon
                  name="info"
                  size={16}
                  color={colors.accent}
                />
              </View>

              <View style={styles.aboutDetailContent}>
                <Text style={styles.aboutDetailLabel}>
                  Platform
                </Text>
                <Text style={styles.aboutDetailValue}>
                  RMSM Mobile
                </Text>
              </View>
            </View>

            <View style={styles.aboutDetailRow}>
              <View style={styles.aboutDetailIcon}>
                <RmsmIcon
                  name="shield"
                  size={16}
                  color={colors.accent}
                />
              </View>

              <View style={styles.aboutDetailContent}>
                <Text style={styles.aboutDetailLabel}>
                  Build
                </Text>
                <Text style={styles.aboutDetailValue}>
                  1.0.0
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.aboutSectionTitle}>
            RMSM MOBILE
          </Text>

          <View style={styles.aboutDetailsCard}>
            <View style={styles.aboutInfoRow}>
              <View style={styles.aboutInfoIcon}>
                <RmsmIcon
                  name="chart"
                  size={16}
                  color={colors.accent}
                />
              </View>

              <View style={styles.aboutInfoContent}>
                <Text style={styles.aboutInfoTitle}>
                  Trading Terminal
                </Text>
                <Text style={styles.aboutInfoSubtitle}>
                  Mobile interface for markets, charts, trading,
                  orders and account activity.
                </Text>
              </View>
            </View>

            <View style={styles.aboutDivider} />

            <View style={styles.aboutInfoRow}>
              <View style={styles.aboutInfoIcon}>
                <RmsmIcon
                  name="briefcase"
                  size={16}
                  color={colors.accent}
                />
              </View>

              <View style={styles.aboutInfoContent}>
                <Text style={styles.aboutInfoTitle}>
                  Account & Portfolio
                </Text>
                <Text style={styles.aboutInfoSubtitle}>
                  View account information, portfolio exposure,
                  positions and trading performance.
                </Text>
              </View>
            </View>

            <View style={styles.aboutDivider} />

            <View style={styles.aboutInfoRow}>
              <View style={styles.aboutInfoIcon}>
                <RmsmIcon
                  name="shield"
                  size={16}
                  color={colors.accent}
                />
              </View>

              <View style={styles.aboutInfoContent}>
                <Text style={styles.aboutInfoTitle}>
                  Authenticated Access
                </Text>
                <Text style={styles.aboutInfoSubtitle}>
                  RMSM Mobile uses the authenticated RMSM session
                  for account access and protected application data.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.aboutNote}>
            <RmsmIcon
              name="info"
              size={15}
              color={colors.textMuted}
            />
            <Text style={styles.aboutNoteText}>
              RMSM Mobile is currently connected to the demo
              trading environment.
            </Text>
          </View>
        </>
      ) : null}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  aboutSectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  aboutHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  aboutLogoCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutLogoText: {
    color: colors.accent,
    fontSize: 25,
    fontWeight: '900',
  },
  aboutHeroContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  aboutHeroTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  aboutHeroSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  aboutVersionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    marginTop: spacing.sm,
  },
  aboutVersionText: {
    color: colors.accent,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  aboutDetailsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  aboutDetailRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
  },
  aboutDetailIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  aboutDetailContent: {
    flex: 1,
  },
  aboutDetailLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  aboutDetailValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  aboutDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  aboutInfoRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
  },
  aboutInfoIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  aboutInfoContent: {
    flex: 1,
  },
  aboutInfoTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  aboutInfoSubtitle: {
    color: colors.textSecondary,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },
  aboutNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.md,
  },
  aboutNoteText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 14,
    marginLeft: spacing.sm,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  backText: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 32,
    marginTop: -2,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '800',
  },
  headerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  securitySectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 7,
    marginLeft: 3,
  },
  securityStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  securityStatusIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityStatusContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  securityStatusTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  securityStatusSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  securityActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: spacing.sm,
  },
  securityActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 5,
  },
  securityActiveText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  securityCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  securityRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  securityRowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityRowContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  securityRowTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  securityRowSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  securityStateBadge: {
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  securityStateText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  securityActivityValue: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  securityDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 62,
  },
  securityActionRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  securityActionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityActionContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  securityActionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  securityActionSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  supportSectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  supportCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  supportActionRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportActionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  supportActionContent: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  supportActionTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  supportActionSubtitle: {
    color: colors.textSecondary,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },
  supportUnavailableBadge: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  supportUnavailableText: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  supportDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  supportInfoRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportInfoIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  supportInfoContent: {
    flex: 1,
  },
  supportInfoTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  supportInfoSubtitle: {
    color: colors.textSecondary,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },
  supportNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.md,
  },
  supportNoteText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 14,
    marginLeft: spacing.sm,
  },

  securityUnavailableBadge: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  securityUnavailableText: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  securityChevron: {
    color: colors.textSecondary,
    fontSize: 24,
    fontWeight: '300',
    marginLeft: spacing.sm,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.sm,
    marginTop: 1,
  },
  securityNoteText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
    marginLeft: spacing.sm,
  },
  accountSectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 7,
    marginLeft: 3,
  },
  accountHeroCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  accountHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountIdentity: {
    flex: 1,
    marginLeft: spacing.md,
  },
  accountProfileNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.md,
  },
  accountProfileNoteText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 14,
    marginLeft: spacing.sm,
  },
  accountName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  accountSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  accountDemoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  accountDemoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 5,
  },
  accountDemoText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  accountHeroDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  accountBalanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  accountBalanceBlock: {
    flex: 1,
  },
  accountBalanceLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  accountBalanceValue: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 5,
  },
  accountStatusBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  accountStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  accountStatusLabel: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  accountStatusValue: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  accountDetailsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  accountDetailRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  accountDetailIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountDetailContent: {
    flex: 1,
    marginLeft: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountDetailLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  accountDetailValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  accountActiveValue: {
    color: colors.success,
  },
  accountDetailDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 62,
  },
  detailSectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 7,
    marginLeft: 3,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  summaryCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 7,
  },
  positive: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 5,
  },
  negative: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 5,
  },
  infoRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  infoValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowContent: {
    flex: 1,
    paddingRight: spacing.lg,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  portfolioSectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 7,
    marginLeft: 3,
  },
  portfolioHeroCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  portfolioHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  portfolioHeroLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  portfolioHeroValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 5,
  },
  portfolioDirection: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  portfolioDirectionPositive: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  portfolioDirectionNegative: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  portfolioArrowPositive: {
    color: colors.success,
    fontSize: 20,
    fontWeight: '800',
  },
  portfolioArrowNegative: {
    color: colors.danger,
    fontSize: 20,
    fontWeight: '800',
  },
  portfolioHeroDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  portfolioPnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  portfolioPnlLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  portfolioPnlPositive: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '800',
  },
  portfolioPnlNegative: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  portfolioMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  portfolioMetricCard: {
    width: '48%',
    minHeight: 78,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  portfolioMetricLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  portfolioMetricValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 9,
  },
  positionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  positionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  positionInstrument: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  positionInstrumentText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  positionSymbol: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  positionQuantity: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 3,
  },
  positionSideBadge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  positionSideLong: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  positionSideShort: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  positionSideLongText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  positionSideShortText: {
    color: colors.danger,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  positionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  positionPriceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  positionPriceRight: {
    alignItems: 'flex-end',
  },
  positionLabel: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  positionValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  positionPnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  positionPnlLabel: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  portfolioEmptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  portfolioEmptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioEmptyIconText: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '700',
  },
  portfolioEmptyTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
  },
  portfolioEmptySubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 5,
  },
  appearanceSectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  appearanceCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  appearanceDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  appearanceInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.md,
  },
  appearanceInfoText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 14,
    marginLeft: spacing.sm,
  },
  notificationSectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  notificationCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  notificationDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.md,
  },
  notificationInfoText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 14,
    marginLeft: spacing.sm,
  },
  tradingSettingsSectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  tradingSettingsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  tradingSettingsDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  tradingSettingsValueRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tradingSettingsValueBadge: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  tradingSettingsValueText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  tradingSettingsNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.md,
  },
  tradingSettingsNoteText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 14,
    marginLeft: spacing.sm,
  },
  analyticsHeroContent: {
    flex: 1,
  },
  analyticsHeroCaption: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 5,
  },
  analyticsBreakdownCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  analyticsBreakdownRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  analyticsBreakdownIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  analyticsBreakdownDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  analyticsBreakdownDotPositive: {
    backgroundColor: colors.success,
  },
  analyticsBreakdownDotNegative: {
    backgroundColor: colors.danger,
  },
  analyticsBreakdownDotNeutral: {
    backgroundColor: colors.textMuted,
  },
  analyticsBreakdownTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  analyticsBreakdownSubtitle: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 3,
  },
  analyticsBreakdownValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  analyticsBreakdownDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  directionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
  },
  directionColumn: {
    flex: 1,
  },
  directionDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  directionLabel: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  directionCount: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 7,
  },
  directionPnl: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  analyticsRecentCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  analyticsRecentEmpty: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  analyticsRecentEmptyTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  analyticsRecentEmptySubtitle: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 5,
  },
  recentTradeRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentTradeIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentTradeSide: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  recentTradeSideBuy: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  recentTradeSideSell: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  recentTradeSideText: {
    fontSize: 10,
    fontWeight: '900',
  },
  recentTradeSideTextBuy: {
    color: colors.success,
  },
  recentTradeSideTextSell: {
    color: colors.danger,
  },
  recentTradeText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  recentTradeSymbol: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  recentTradeMeta: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 3,
  },
  recentTradePnl: {
    fontSize: 12,
    fontWeight: '800',
  },
  analyticsRecentDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  analyticsSectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 7,
    marginLeft: 3,
  },
  performanceCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  performanceLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  performanceValue: {
    fontSize: 27,
    fontWeight: '800',
    marginTop: 5,
  },
  performanceDirection: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  performanceDirectionPositive: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  performanceDirectionNegative: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  performanceArrowPositive: {
    color: colors.success,
    fontSize: 20,
    fontWeight: '800',
  },
  performanceArrowNegative: {
    color: colors.danger,
    fontSize: 20,
    fontWeight: '800',
  },
  performanceDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  performanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  performanceStatLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  performanceStatValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  performanceStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    width: '48%',
    minHeight: 82,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  metricValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  actionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  actionSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 24,
  },
  aboutCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    marginBottom: spacing.lg,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: colors.accent,
    fontSize: 30,
    fontWeight: '900',
  },
  aboutTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: spacing.md,
  },
  aboutSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  version: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.md,
  },
});
