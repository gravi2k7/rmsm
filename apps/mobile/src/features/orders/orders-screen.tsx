import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  marketDataApi,
  organizationsApi,
  tradingApi,
} from "../../api";
import type {
  TradingAccount,
  TradingOrder,
  TradingPosition,
} from "../../api/trading";
import { MarketDataSocket } from "../../realtime/market-data-socket";
import type { Instrument, Quote } from "../../types/market-data";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";

type OrdersTab = "Positions" | "Orders";

type OrdersScreenProps = {
  onOpenChart?: (instrumentId: string) => void;
};

type EnrichedPosition = TradingPosition & {
  instrument?: Instrument;
  currentPrice?: number;
  unrealizedPnl: number;
};

type EnrichedOrder = TradingOrder & {
  instrument?: Instrument;
};

function getMarketDataWebSocketUrl(): string {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!apiBaseUrl) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  }

  return `${apiBaseUrl.replace(/^http/, "ws")}/market-data/ws`;
}

function number(value: string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number, digits = 2): string {
  const sign = value >= 0 ? "" : "-";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  });
}

function formatQuantity(value: string): string {
  const parsed = number(value);

  return parsed.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function isOpenPosition(position: TradingPosition): boolean {
  return position.status === "OPEN" || position.status === "ACTIVE";
}

function isPendingOrder(order: TradingOrder): boolean {
  return (
    order.status === "PENDING" ||
    order.status === "NEW" ||
    order.status === "OPEN"
  );
}

function calculateUnrealizedPnl(
  position: TradingPosition,
  quote?: Quote,
): number {
  if (!quote) {
    return 0;
  }

  const quantity = number(position.quantity);
  const entry = number(position.averageEntryPrice);

  if (position.side === "LONG") {
    const bid = number(quote.bidPrice);

    if (!bid) {
      return 0;
    }

    return (bid - entry) * quantity;
  }

  const ask = number(quote.askPrice);

  if (!ask) {
    return 0;
  }

  return (entry - ask) * quantity;
}

export function OrdersScreen({
  onOpenChart,
}: OrdersScreenProps) {
  const [tab, setTab] = useState<OrdersTab>("Positions");

  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [account, setAccount] = useState<TradingAccount | null>(null);
  const [positions, setPositions] = useState<TradingPosition[]>([]);
  const [orders, setOrders] = useState<TradingOrder[]>([]);
  const [instruments, setInstruments] = useState<Record<string, Instrument>>(
    {},
  );
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editTriggerPrice, setEditTriggerPrice] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const loadTradingData = useCallback(async () => {
    const organizations = await organizationsApi.list();

    const organization = organizations.items[0];

    if (!organization) {
      throw new Error("No active organization is available.");
    }

    setOrganizationId(organization.id);

    const accounts = await tradingApi.listAccounts(organization.id);

    const selectedAccount =
      accounts.find(
        (item) => item.type === "DEMO" && item.status === "ACTIVE",
      ) ??
      accounts.find((item) => item.type === "DEMO") ??
      accounts[0];

    if (!selectedAccount) {
      throw new Error("No trading account is available.");
    }

    setAccount(selectedAccount);

    const [accountDetail, positionRows, orderRows] = await Promise.all([
      tradingApi.getAccount(organization.id, selectedAccount.id),
      tradingApi.listPositions(organization.id, selectedAccount.id),
      tradingApi.listOrders(organization.id, selectedAccount.id),
    ]);

    setAccount(accountDetail);
    setPositions(positionRows.filter(isOpenPosition));
    setOrders(orderRows.filter(isPendingOrder));

    const instrumentIds = Array.from(
      new Set([
        ...positionRows.map((position) => position.instrumentId),
        ...orderRows.map((order) => order.instrumentId),
      ]),
    );

    if (instrumentIds.length === 0) {
      setInstruments({});
      setQuotes({});
      return;
    }

    const instrumentResults = await Promise.all(
      instrumentIds.map(async (instrumentId) => {
        try {
          return await marketDataApi.getInstrument(instrumentId);
        } catch {
          return null;
        }
      }),
    );

    const instrumentMap: Record<string, Instrument> = {};

    instrumentResults.forEach((instrument) => {
      if (instrument) {
        instrumentMap[instrument.id] = instrument;
      }
    });

    setInstruments(instrumentMap);

    const latestQuotes = await marketDataApi.getLatestQuotes(instrumentIds);
    const quoteMap: Record<string, Quote> = {};

    latestQuotes.forEach((quote) => {
      quoteMap[quote.instrumentId] = quote;
    });

    setQuotes(quoteMap);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setErrorMessage(null);
      await loadTradingData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load trading data.",
      );
    }
  }, [loadTradingData]);

  useEffect(() => {
    let cancelled = false;

    const initialLoad = async () => {
      try {
        await refresh();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void initialLoad();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    if (!organizationId || !account || positions.length === 0) {
      return;
    }

    const instrumentIds = Array.from(
      new Set(positions.map((position) => position.instrumentId)),
    );

    let socket: MarketDataSocket | null = null;

    socket = new MarketDataSocket(
      getMarketDataWebSocketUrl(),
      instrumentIds,
      {
        onConnected: () => {
          setSocketConnected(true);
        },
        onQuote: (message) => {
          const quote = message.data;

          const normalizedQuote: Quote = {
            id: `ws-${quote.instrumentId}`,
            instrumentId: quote.instrumentId,
            bidPrice: quote.bidPrice ?? null,
            askPrice: quote.askPrice ?? null,
            lastPrice: quote.lastPrice ?? null,
            bidSize: quote.bidSize ?? null,
            askSize: quote.askSize ?? null,
            eventTime: quote.eventTime,
            providerId: "realtime",
            source: "websocket",
          };

          setQuotes((current) => ({
            ...current,
            [normalizedQuote.instrumentId]: normalizedQuote,
          }));
        },
        onClosed: () => {
          setSocketConnected(false);
        },
        onError: () => {
          setSocketConnected(false);
        },
      },
    );

    void socket.connect();

    return () => {
      socket?.disconnect();
    };
  }, [organizationId, account, positions]);

  const enrichedPositions = useMemo<EnrichedPosition[]>(
    () =>
      positions.map((position) => {
        const quote = quotes[position.instrumentId];

        const currentPrice =
          position.side === "LONG"
            ? number(quote?.bidPrice)
            : number(quote?.askPrice);

        return {
          ...position,
          instrument: instruments[position.instrumentId],
          currentPrice: currentPrice || undefined,
          unrealizedPnl: calculateUnrealizedPnl(position, quote),
        };
      }),
    [positions, instruments, quotes],
  );

  const enrichedOrders = useMemo<EnrichedOrder[]>(
    () =>
      orders.map((order) => ({
        ...order,
        instrument: instruments[order.instrumentId],
      })),
    [orders, instruments],
  );

  const unrealizedPnl = useMemo(
    () =>
      enrichedPositions.reduce(
        (total, position) => total + position.unrealizedPnl,
        0,
      ),
    [enrichedPositions],
  );

  const balance = number(account?.balance);
  const leverage = Math.max(number(account?.leverage), 1);

  const usedMargin = useMemo(
    () =>
      enrichedPositions.reduce(
        (total, position) =>
          total +
          (number(position.quantity) *
            number(position.averageEntryPrice)) /
            leverage,
        0,
      ),
    [enrichedPositions, leverage],
  );

  const equity = balance + unrealizedPnl;
  const freeMargin = equity - usedMargin;

  const closePosition = async (position: TradingPosition) => {
    if (!organizationId || !account) {
      return;
    }

    try {
      setActionId(position.id);
      setErrorMessage(null);

      await tradingApi.closePosition(
        organizationId,
        account.id,
        position.id,
      );

      await refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to close position.",
      );
    } finally {
      setActionId(null);
    }
  };

  const cancelOrder = async (order: TradingOrder) => {
    if (!organizationId || !account) {
      return;
    }

    try {
      setActionId(order.id);
      setErrorMessage(null);

      await tradingApi.cancelOrder(
        organizationId,
        account.id,
        order.id,
      );

      await refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to cancel order.",
      );
    } finally {
      setActionId(null);
    }
  };

  const updatePendingOrder = async (order: TradingOrder) => {
    if (!organizationId || !account) {
      return;
    }

    const numericTrigger = Number(editTriggerPrice);

    if (
      !editTriggerPrice.trim() ||
      !Number.isFinite(numericTrigger) ||
      numericTrigger <= 0
    ) {
      setErrorMessage("Enter a valid trigger price.");
      return;
    }

    try {
      setActionId(order.id);
      setErrorMessage(null);

      await tradingApi.updatePendingOrder(
        organizationId,
        account.id,
        order.id,
        order.type === "LIMIT"
          ? { limitPrice: String(numericTrigger) }
          : { stopPrice: String(numericTrigger) },
      );

      setEditingOrderId(null);
      setEditTriggerPrice("");
      await refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update pending order.",
      );
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Loading trading account...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            try {
              await refresh();
            } finally {
              setRefreshing(false);
            }
          }}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Orders</Text>
          <Text style={styles.accountName}>
            {account?.name ?? "Trading Account"}
          </Text>
        </View>

        <View
          style={[
            styles.connection,
            socketConnected
              ? styles.connectionLive
              : styles.connectionOffline,
          ]}
        >
          <View
            style={[
              styles.connectionDot,
              socketConnected
                ? styles.connectionDotLive
                : styles.connectionDotOffline,
            ]}
          />
          <Text style={styles.connectionText}>
            {socketConnected ? "LIVE" : "OFFLINE"}
          </Text>
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={() => void refresh()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <SummaryItem label="Equity" value={formatMoney(equity)} />
          <SummaryItem label="Balance" value={formatMoney(balance)} />
        </View>

        <View style={styles.summaryRow}>
          <SummaryItem
            label="Unrealized P&L"
            value={formatMoney(unrealizedPnl)}
            valueStyle={unrealizedPnl >= 0 ? styles.profit : styles.loss}
          />
          <SummaryItem label="Used Margin" value={formatMoney(usedMargin)} />
        </View>

        <View style={styles.summaryRow}>
          <SummaryItem
            label="Free Margin"
            value={formatMoney(freeMargin)}
            valueStyle={freeMargin >= 0 ? styles.profit : styles.loss}
          />
          <SummaryItem label="Leverage" value={`${leverage}:1`} />
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "Positions" && styles.tabActive]}
          onPress={() => setTab("Positions")}
        >
          <Text
            style={[
              styles.tabText,
              tab === "Positions" && styles.tabTextActive,
            ]}
          >
            Positions ({enrichedPositions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === "Orders" && styles.tabActive]}
          onPress={() => setTab("Orders")}
        >
          <Text
            style={[
              styles.tabText,
              tab === "Orders" && styles.tabTextActive,
            ]}
          >
            Orders ({enrichedOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "Positions" ? (
        enrichedPositions.length === 0 ? (
          <EmptyState text="No open positions." />
        ) : (
          enrichedPositions.map((position) => (
            <View key={position.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.symbol}>
                    {position.instrument?.symbol ??
                      position.instrumentId}
                  </Text>
                  <Text style={styles.instrumentName}>
                    {position.instrument?.name ?? "Position"}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.side,
                    position.side === "LONG"
                      ? styles.buy
                      : styles.sell,
                  ]}
                >
                  {position.side}
                </Text>
              </View>

              <View style={styles.detailsGrid}>
                <Detail label="Quantity" value={formatQuantity(position.quantity)} />
                <Detail
                  label="Entry"
                  value={formatPrice(number(position.averageEntryPrice))}
                />
                <Detail
                  label="Current"
                  value={formatPrice(position.currentPrice)}
                />
                <Detail
                  label="P&L"
                  value={formatMoney(position.unrealizedPnl)}
                  valueStyle={
                    position.unrealizedPnl >= 0
                      ? styles.profit
                      : styles.loss
                  }
                />
              </View>

              {onOpenChart ? (
                <TouchableOpacity
                  style={styles.secondaryActionButton}
                  onPress={() => onOpenChart(position.instrumentId)}
                >
                  <Text style={styles.secondaryActionText}>OPEN CHART</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.actionButton}
                disabled={actionId === position.id}
                onPress={() => void closePosition(position)}
              >
                {actionId === position.id ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.actionText}>CLOSE POSITION</Text>
                )}
              </TouchableOpacity>
            </View>
          ))
        )
      ) : enrichedOrders.length === 0 ? (
        <EmptyState text="No pending orders." />
      ) : (
        enrichedOrders.map((order) => {
          const trigger =
            order.type === "LIMIT"
              ? order.limitPrice
              : order.stopPrice ?? order.limitPrice;

          return (
            <View key={order.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.symbol}>
                    {order.instrument?.symbol ?? order.instrumentId}
                  </Text>
                  <Text style={styles.instrumentName}>
                    {order.instrument?.name ?? "Pending Order"}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.side,
                    order.side === "BUY" ? styles.buy : styles.sell,
                  ]}
                >
                  {order.side}
                </Text>
              </View>

              <View style={styles.detailsGrid}>
                <Detail label="Type" value={order.type} />
                <Detail
                  label="Quantity"
                  value={formatQuantity(order.quantity)}
                />
                <Detail
                  label="Trigger"
                  value={formatPrice(number(trigger))}
                />
                <Detail label="Status" value={order.status} />
              </View>

              {editingOrderId === order.id ? (
                <View style={styles.editTriggerRow}>
                  <TextInput
                    value={editTriggerPrice}
                    onChangeText={setEditTriggerPrice}
                    keyboardType="decimal-pad"
                    placeholder="Trigger price"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.triggerInput}
                    editable={actionId !== order.id}
                  />

                  <TouchableOpacity
                    style={styles.saveButton}
                    disabled={actionId === order.id}
                    onPress={() => void updatePendingOrder(order)}
                  >
                    {actionId === order.id ? (
                      <ActivityIndicator />
                    ) : (
                      <Text style={styles.saveText}>SAVE</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelEditButton}
                    disabled={actionId === order.id}
                    onPress={() => {
                      setEditingOrderId(null);
                      setEditTriggerPrice("");
                    }}
                  >
                    <Text style={styles.cancelEditText}>CANCEL</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.secondaryActionButton}
                  disabled={actionId === order.id}
                  onPress={() => {
                    setEditingOrderId(order.id);
                    setEditTriggerPrice(
                      order.type === "LIMIT"
                        ? order.limitPrice ?? ""
                        : order.stopPrice ?? order.limitPrice ?? "",
                    );
                  }}
                >
                  <Text style={styles.secondaryActionText}>
                    EDIT TRIGGER
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.cancelButton}
                disabled={actionId === order.id}
                onPress={() => void cancelOrder(order)}
              >
                {actionId === order.id ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.cancelText}>CANCEL ORDER</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function SummaryItem({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function Detail({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  accountName: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },
  connection: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  connectionLive: {
    backgroundColor: colors.successSoft,
  },
  connectionOffline: {
    backgroundColor: colors.surface,
  },
  connectionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  connectionDotLive: {
    backgroundColor: colors.success,
  },
  connectionDotOffline: {
    backgroundColor: colors.textSecondary,
  },
  connectionText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  errorCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  retryText: {
    marginTop: spacing.sm,
    color: colors.accent,
    fontWeight: "700",
  },
  summaryCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  profit: {
    color: colors.success,
  },
  loss: {
    color: colors.danger,
  },
  tabs: {
    flexDirection: "row",
    marginBottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: 3,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.background,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  symbol: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  instrumentName: {
    marginTop: 3,
    fontSize: 12,
    color: colors.textSecondary,
  },
  side: {
    fontSize: 12,
    fontWeight: "800",
  },
  buy: {
    color: colors.success,
  },
  sell: {
    color: colors.danger,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.md,
  },
  detail: {
    width: "50%",
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  actionText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "800",
  },
  secondaryActionButton: {
    marginTop: spacing.sm,
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  editTriggerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  triggerInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  saveButton: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success,
  },
  saveText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.background,
  },
  cancelEditButton: {
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelEditText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  cancelText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "800",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
