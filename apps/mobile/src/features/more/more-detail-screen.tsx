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
import { radius, spacing } from '../../theme/spacing';
import { marketDataApi, organizationsApi, tradingApi } from '../../api';
import { MarketDataSocket } from '../../realtime/market-data-socket';
import type { Instrument, Quote } from '../../types/market-data';
import type {
  TradingAccount,
  TradingPosition,
  TradingTrade,
} from '../../api/trading';

import type { MoreDetailKey } from '../../navigation/navigation';

type MoreDetailScreenProps = {
  detail: MoreDetailKey;
  onBack: () => void;
};

const detailMeta: Record<
  MoreDetailKey,
  { title: string; subtitle: string; icon: string }
> = {
  account: {
    title: 'Account & Profile',
    subtitle: 'Personal details and account information',
    icon: '◎',
  },
  portfolio: {
    title: 'Portfolio',
    subtitle: 'Positions, exposure and performance',
    icon: '▣',
  },
  analytics: {
    title: 'Analytics',
    subtitle: 'Trading performance and statistics',
    icon: '◒',
  },
  'trading-settings': {
    title: 'Trading Settings',
    subtitle: 'Execution and trading preferences',
    icon: '⚙',
  },
  notifications: {
    title: 'Notifications',
    subtitle: 'Alerts and notification preferences',
    icon: '◉',
  },
  appearance: {
    title: 'Appearance',
    subtitle: 'Dark theme and display preferences',
    icon: '☾',
  },
  security: {
    title: 'Security',
    subtitle: 'Password, sessions and security controls',
    icon: '◆',
  },
  support: {
    title: 'Help & Support',
    subtitle: 'Get help with RMSM',
    icon: '?',
  },
  about: {
    title: 'About RMSM',
    subtitle: 'Version 1.0.0',
    icon: 'ⓘ',
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

  const [notifications, setNotifications] = React.useState(true);
  const [priceAlerts, setPriceAlerts] = React.useState(true);
  const [orderUpdates, setOrderUpdates] = React.useState(true);
  const [sound, setSound] = React.useState(true);
  const [confirmOrders, setConfirmOrders] = React.useState(true);
  const [darkTheme, setDarkTheme] = React.useState(true);

  const [account, setAccount] = React.useState<TradingAccount | null>(null);
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
        const organizations = await organizationsApi.list();
        const organization = organizations.items[0];

        if (!organization) {
          return;
        }

        const accounts = await tradingApi.listAccounts(organization.id);
        const selectedAccount =
          accounts.find(
            (item) => item.type === 'DEMO' && item.status === 'ACTIVE',
          ) ??
          accounts.find((item) => item.type === 'DEMO') ??
          accounts[0];

        if (!selectedAccount || cancelled) {
          return;
        }

        const [accountData, positionData, tradeData] = await Promise.all([
          tradingApi.getAccount(organization.id, selectedAccount.id),
          tradingApi.listPositions(organization.id, selectedAccount.id),
          tradingApi.listTrades(organization.id, selectedAccount.id),
        ]);

        if (cancelled) {
          return;
        }

        setAccount(accountData);
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
          setAccount(null);
          setPositions([]);
          setTrades([]);
        }
      }
    };

    void loadTradingData();

    return () => {
      cancelled = true;
    };
  }, []);

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
          <Text style={styles.headerIconText}>{meta.icon}</Text>
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.title}>{meta.title}</Text>
          <Text style={styles.subtitle}>{meta.subtitle}</Text>
        </View>
      </View>

      {detail === 'account' ? (
        <>
          <View style={styles.profileCard}>
            <View style={styles.profileCircle}>
              <Text style={styles.profileInitial}>R</Text>
            </View>

            <View style={styles.profileContent}>
              <Text style={styles.profileName}>RMSM</Text>
              <Text style={styles.profileEmail}>Demo trading account</Text>
            </View>

            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>DEMO</Text>
            </View>
          </View>

          <View style={styles.card}>
            <InfoRow
              label="Account"
              value={account?.name ?? '—'}
            />
            <InfoRow
              label="Account Type"
              value={account?.type ?? '—'}
            />
            <InfoRow
              label="Currency"
              value={account?.currency ?? '—'}
            />
            <InfoRow
              label="Balance"
              value={formatMoney(
                account ? Number(account.balance) : null,
                account?.currency ?? 'USD',
              )}
            />
            <InfoRow
              label="Status"
              value={account?.status ?? '—'}
            />
          </View>
        </>
      ) : null}

      {detail === 'portfolio' ? (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>PORTFOLIO VALUE</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(equity, account?.currency ?? 'USD')}
            </Text>
            <Text
              style={
                unrealizedPnl >= 0
                  ? styles.positive
                  : styles.negative
              }
            >
              {`${formatSignedMoney(unrealizedPnl)} unrealized`}
            </Text>
          </View>

          <View style={styles.card}>
            <InfoRow
              label="Open Positions"
              value={String(openPositions.length)}
            />
            <InfoRow
              label="Exposure"
              value={formatMoney(
                exposure,
                account?.currency ?? 'USD',
              )}
            />
            <InfoRow
              label="Used Margin"
              value={formatMoney(
                usedMargin,
                account?.currency ?? 'USD',
              )}
            />
            <InfoRow
              label="Free Margin"
              value={formatMoney(
                freeMargin,
                account?.currency ?? 'USD',
              )}
            />
          </View>
        </>
      ) : null}

      {detail === 'analytics' ? (
        <>
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
              <Text style={styles.metricLabel}>PROFIT</Text>
              <Text style={styles.metricValue}>
                {formatSignedMoney(realizedProfit)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>AVG TRADE</Text>
              <Text style={styles.metricValue}>
                {formatSignedMoney(averageTrade)}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <InfoRow
              label="Winning Trades"
              value={String(winningTrades)}
            />
            <InfoRow
              label="Losing Trades"
              value={String(losingTrades)}
            />
            <InfoRow
              label="Profit Factor"
              value={
                profitFactor === null
                  ? '—'
                  : profitFactor.toFixed(2)
              }
            />
            <InfoRow label="Max Drawdown" value="—" />
          </View>
        </>
      ) : null}

      {detail === 'trading-settings' ? (
        <View style={styles.card}>
          <SettingRow
            title="Confirm Orders"
            subtitle="Ask for confirmation before submitting"
            value={confirmOrders}
            onValueChange={setConfirmOrders}
          />
          <SettingRow
            title="Order Sounds"
            subtitle="Play sound after order activity"
            value={sound}
            onValueChange={setSound}
          />
        </View>
      ) : null}

      {detail === 'notifications' ? (
        <View style={styles.card}>
          <SettingRow
            title="Push Notifications"
            subtitle="Receive RMSM notifications"
            value={notifications}
            onValueChange={setNotifications}
          />
          <SettingRow
            title="Price Alerts"
            subtitle="Notify when watched prices move"
            value={priceAlerts}
            onValueChange={setPriceAlerts}
          />
          <SettingRow
            title="Order Updates"
            subtitle="Execution and order status alerts"
            value={orderUpdates}
            onValueChange={setOrderUpdates}
          />
        </View>
      ) : null}

      {detail === 'appearance' ? (
        <View style={styles.card}>
          <SettingRow
            title="Dark Theme"
            subtitle="Use the RMSM dark trading interface"
            value={darkTheme}
            onValueChange={setDarkTheme}
          />
          <InfoRow label="Theme" value={darkTheme ? 'Dark' : 'System'} />
          <InfoRow label="Interface" value="Glass / Trading" />
        </View>
      ) : null}

      {detail === 'security' ? (
        <View style={styles.card}>
          <InfoRow label="Session" value="Active" />
          <InfoRow label="Authentication" value="Enabled" />
          <InfoRow label="Last Activity" value="Current session" />

          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.actionRow}
            onPress={() =>
              Alert.alert(
                'Change Password',
                'Password management is not yet available in the mobile client.',
              )
            }
          >
            <Text style={styles.actionTitle}>Change Password</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.actionRow}
            onPress={() =>
              Alert.alert(
                'Manage Sessions',
                'Session management is not yet available in the mobile client.',
              )
            }
          >
            <Text style={styles.actionTitle}>Manage Sessions</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {detail === 'support' ? (
        <View style={styles.card}>
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.actionRow}
            onPress={() =>
              Alert.alert(
                'Help Center',
                'Help Center integration is not yet configured.',
              )
            }
          >
            <View>
              <Text style={styles.actionTitle}>Help Center</Text>
              <Text style={styles.actionSubtitle}>
                Guides and frequently asked questions
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.actionRow}
            onPress={() =>
              Alert.alert(
                'Contact Support',
                'Support contact integration is not yet configured.',
              )
            }
          >
            <View>
              <Text style={styles.actionTitle}>Contact Support</Text>
              <Text style={styles.actionSubtitle}>
                Get assistance with your RMSM account
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.actionRow}
            onPress={() =>
              Alert.alert(
                'Report a Problem',
                'Problem reporting is not yet configured in the mobile client.',
              )
            }
          >
            <View>
              <Text style={styles.actionTitle}>Report a Problem</Text>
              <Text style={styles.actionSubtitle}>
                Tell us about an issue
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {detail === 'about' ? (
        <>
          <View style={styles.aboutCard}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>R</Text>
            </View>
            <Text style={styles.aboutTitle}>RMSM</Text>
            <Text style={styles.aboutSubtitle}>Trading Terminal</Text>
            <Text style={styles.version}>Version 1.0.0</Text>
          </View>

          <View style={styles.card}>
            <InfoRow label="Platform" value="RMSM Mobile" />
            <InfoRow label="Environment" value="Demo" />
            <InfoRow label="Build" value="1.0.0" />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  profileCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: colors.accent,
    fontSize: 21,
    fontWeight: '800',
  },
  profileContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  profileName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  profileEmail: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  demoBadge: {
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  demoBadgeText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '800',
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
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    width: '48%',
    minHeight: 88,
    backgroundColor: colors.surfaceElevated,
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
    fontSize: 19,
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
