import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

type OrdersTab = 'Positions' | 'Orders';

const positions = [
  {
    id: 'position-1',
    symbol: 'XAUUSD',
    name: 'Gold Spot',
    side: 'BUY',
    quantity: '1.00',
    entry: '3,606.24',
    current: '3,648.42',
    pnl: '+$42.18',
    positive: true,
  },
  {
    id: 'position-2',
    symbol: 'NAS100',
    name: 'Nasdaq 100',
    side: 'SELL',
    quantity: '0.50',
    entry: '24,860.00',
    current: '24,812.50',
    pnl: '+$23.75',
    positive: true,
  },
];

const pendingOrders = [
  {
    id: 'order-1',
    symbol: 'XAUUSD',
    name: 'Gold Spot',
    side: 'BUY',
    type: 'LIMIT',
    quantity: '1.00',
    trigger: '3,620.00',
    status: 'PENDING',
  },
  {
    id: 'order-2',
    symbol: 'NAS100',
    name: 'Nasdaq 100',
    side: 'SELL',
    type: 'STOP',
    quantity: '0.50',
    trigger: '24,700.00',
    status: 'PENDING',
  },
];

export function OrdersScreen() {
  const [tab, setTab] = useState<OrdersTab>('Positions');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Orders</Text>
          <Text style={styles.subtitle}>
            Manage positions and pending orders
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshButton}>
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>

      <AccountSummary />

      <View style={styles.tabs}>
        {(['Positions', 'Orders'] as OrdersTab[]).map((value) => {
          const active = tab === value;

          return (
            <TouchableOpacity
              key={value}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(value)}
            >
              <Text
                style={[
                  styles.tabText,
                  active && styles.tabTextActive,
                ]}
              >
                {value}
              </Text>

              <View
                style={[
                  styles.count,
                  active && styles.countActive,
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    active && styles.countTextActive,
                  ]}
                >
                  {value === 'Positions'
                    ? positions.length
                    : pendingOrders.length}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'Positions' ? (
        <View style={styles.list}>
          {positions.map((position) => (
            <PositionCard
              key={position.id}
              position={position}
            />
          ))}
        </View>
      ) : (
        <View style={styles.list}>
          {pendingOrders.map((order) => (
            <PendingOrderCard
              key={order.id}
              order={order}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function AccountSummary() {
  return (
    <View style={styles.accountCard}>
      <View style={styles.accountHeader}>
        <Text style={styles.accountTitle}>Demo Account</Text>

        <View style={styles.accountBadge}>
          <Text style={styles.accountBadgeText}>DEMO</Text>
        </View>
      </View>

      <View style={styles.accountMainRow}>
        <View>
          <Text style={styles.accountLabel}>Equity</Text>
          <Text style={styles.equity}>$10,065.93</Text>
        </View>

        <View style={styles.accountPnl}>
          <Text style={styles.accountLabel}>Unrealized P&L</Text>
          <Text style={styles.totalProfit}>+$65.93</Text>
        </View>
      </View>

      <View style={styles.accountDetails}>
        <AccountMetric
          label="Balance"
          value="$10,000.00"
        />
        <AccountMetric
          label="Margin"
          value="$180.00"
        />
        <AccountMetric
          label="Free Margin"
          value="$9,885.93"
        />
      </View>
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
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function PositionCard({
  position,
}: {
  position: (typeof positions)[number];
}) {
  return (
    <View style={styles.positionCard}>
      <View style={styles.cardHeader}>
        <View style={styles.instrumentRow}>
          <View style={styles.instrumentBadge}>
            <Text style={styles.instrumentBadgeText}>
              {position.symbol === 'XAUUSD' ? 'Au' : 'N'}
            </Text>
          </View>

          <View>
            <View style={styles.symbolRow}>
              <Text style={styles.symbol}>
                {position.symbol}
              </Text>

              <View
                style={[
                  styles.sideBadge,
                  position.side === 'BUY'
                    ? styles.buyBadge
                    : styles.sellBadge,
                ]}
              >
                <Text
                  style={[
                    styles.sideText,
                    position.side === 'BUY'
                      ? styles.buyText
                      : styles.sellText,
                  ]}
                >
                  {position.side}
                </Text>
              </View>
            </View>

            <Text style={styles.instrumentName}>
              {position.name}
            </Text>
          </View>
        </View>

        <View style={styles.pnlContainer}>
          <Text
            style={[
              styles.pnl,
              position.positive
                ? styles.positive
                : styles.negative,
            ]}
          >
            {position.pnl}
          </Text>
          <Text style={styles.pnlLabel}>Unrealized</Text>
        </View>
      </View>

      <View style={styles.detailsGrid}>
        <Detail label="Quantity" value={position.quantity} />
        <Detail label="Entry" value={position.entry} />
        <Detail label="Current" value={position.current} />
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.detailsButton}>
          <Text style={styles.detailsButtonText}>
            Details
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Close Position</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PendingOrderCard({
  order,
}: {
  order: (typeof pendingOrders)[number];
}) {
  const buy = order.side === 'BUY';

  return (
    <View style={styles.positionCard}>
      <View style={styles.cardHeader}>
        <View style={styles.instrumentRow}>
          <View style={styles.instrumentBadge}>
            <Text style={styles.instrumentBadgeText}>
              {order.symbol === 'XAUUSD' ? 'Au' : 'N'}
            </Text>
          </View>

          <View>
            <View style={styles.symbolRow}>
              <Text style={styles.symbol}>
                {order.symbol}
              </Text>

              <View
                style={[
                  styles.sideBadge,
                  buy ? styles.buyBadge : styles.sellBadge,
                ]}
              >
                <Text
                  style={[
                    styles.sideText,
                    buy ? styles.buyText : styles.sellText,
                  ]}
                >
                  {order.side}
                </Text>
              </View>
            </View>

            <Text style={styles.instrumentName}>
              {order.name}
            </Text>
          </View>
        </View>

        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>{order.status}</Text>
        </View>
      </View>

      <View style={styles.orderTypeRow}>
        <View style={styles.orderTypeBadge}>
          <Text style={styles.orderTypeText}>{order.type}</Text>
        </View>

        <Text style={styles.orderQuantity}>
          {order.quantity} Lots
        </Text>
      </View>

      <View style={styles.triggerCard}>
        <Text style={styles.triggerLabel}>Trigger Price</Text>
        <Text style={styles.triggerValue}>{order.trigger}</Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.detailsButton}>
          <Text style={styles.detailsButtonText}>
            Edit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>
            Cancel Order
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  content: {
    paddingBottom: spacing.xxl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },

  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 3,
  },

  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  refreshText: {
    color: colors.textSecondary,
    fontSize: 22,
  },

  accountCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  accountTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },

  accountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },

  accountBadgeText: {
    color: colors.accent,
    fontSize: 8,
    fontWeight: '800',
  },

  accountMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },

  accountPnl: {
    alignItems: 'flex-end',
  },

  accountLabel: {
    color: colors.textMuted,
    fontSize: 8,
  },

  equity: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 3,
  },

  totalProfit: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 5,
  },

  accountDetails: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },

  accountMetric: {
    flex: 1,
  },

  metricLabel: {
    color: colors.textMuted,
    fontSize: 8,
  },

  metricValue: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },

  tabs: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },

  tab: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  tabActive: {
    backgroundColor: colors.accentSoft,
  },

  tabText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },

  tabTextActive: {
    color: colors.accent,
  },

  count: {
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countActive: {
    backgroundColor: colors.accent,
  },

  countText: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
  },

  countTextActive: {
    color: colors.black,
  },

  list: {
    gap: spacing.md,
    marginTop: spacing.md,
  },

  positionCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  instrumentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  instrumentBadge: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  instrumentBadgeText: {
    color: colors.warning,
    fontSize: 15,
    fontWeight: '800',
  },

  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  symbol: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  instrumentName: {
    color: colors.textSecondary,
    fontSize: 9,
    marginTop: 3,
  },

  sideBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  buyBadge: {
    backgroundColor: colors.successSoft,
  },

  sellBadge: {
    backgroundColor: colors.dangerSoft,
  },

  sideText: {
    fontSize: 7,
    fontWeight: '900',
  },

  buyText: {
    color: colors.success,
  },

  sellText: {
    color: colors.danger,
  },

  pnlContainer: {
    alignItems: 'flex-end',
  },

  pnl: {
    fontSize: 14,
    fontWeight: '900',
  },

  positive: {
    color: colors.success,
  },

  negative: {
    color: colors.danger,
  },

  pnlLabel: {
    color: colors.textMuted,
    fontSize: 8,
    marginTop: 3,
  },

  detailsGrid: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  detail: {
    flex: 1,
  },

  detailLabel: {
    color: colors.textMuted,
    fontSize: 8,
  },

  detailValue: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },

  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  detailsButton: {
    flex: 1,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailsButtonText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },

  closeButton: {
    flex: 1.5,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
  },

  pendingBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.warningSoft,
  },

  pendingText: {
    color: colors.warning,
    fontSize: 7,
    fontWeight: '900',
  },

  orderTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },

  orderTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
  },

  orderTypeText: {
    color: colors.accent,
    fontSize: 8,
    fontWeight: '800',
  },

  orderQuantity: {
    color: colors.textSecondary,
    fontSize: 9,
  },

  triggerCard: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },

  triggerLabel: {
    color: colors.textMuted,
    fontSize: 8,
  },

  triggerValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },

  cancelButton: {
    flex: 1.5,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButtonText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
  },
});
