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

type OrderType = 'Market' | 'Limit' | 'Stop';

export function TradeScreen({
  instrumentId = 'xauusd',
  onBack,
}: {
  instrumentId?: string;
  onBack?: () => void;
}) {
  const [orderType, setOrderType] = useState<OrderType>('Market');

  const instrument =
    instrumentId === 'xauusd'
      ? {
          symbol: 'XAUUSD',
          name: 'Gold Spot',
          bid: '3,648.42',
          ask: '3,648.71',
        }
      : {
          symbol: instrumentId.toUpperCase(),
          name: instrumentId.toUpperCase(),
          bid: '—',
          ask: '—',
        };
  const [quantity, setQuantity] = useState(1);
  const [takeProfit, setTakeProfit] = useState(false);
  const [stopLoss, setStopLoss] = useState(false);

  const increaseQuantity = () => {
    setQuantity((value) => Number((value + 0.01).toFixed(2)));
  };

  const decreaseQuantity = () => {
    setQuantity((value) =>
      Number(Math.max(0.01, value - 0.01).toFixed(2)),
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
            >
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>
          )}

          <View>
            <Text style={styles.title}>Trade</Text>
            <Text style={styles.subtitle}>Place your order</Text>
          </View>
        </View>

        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <View style={styles.instrumentCard}>
        <View style={styles.instrumentLeft}>
          <View style={styles.goldBadge}>
            <Text style={styles.goldBadgeText}>Au</Text>
          </View>

          <View>
            <Text style={styles.symbol}>{instrument.symbol}</Text>
            <Text style={styles.instrumentName}>{instrument.name}</Text>
          </View>
        </View>

        <View style={styles.favoriteButton}>
          <Text style={styles.favoriteText}>☆</Text>
        </View>
      </View>

      <View style={styles.quoteCard}>
        <Quote
          label="BID"
          value={instrument.bid}
          secondary="SELL"
          negative
        />

        <View style={styles.quoteDivider} />

        <Quote
          label="ASK"
          value={instrument.ask}
          secondary="BUY"
          positive
        />
      </View>

      <View style={styles.orderTypeCard}>
        <Text style={styles.sectionTitle}>Order Type</Text>

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
            <Text style={styles.fieldLabel}>Trigger Price</Text>
            <View style={styles.priceInput}>
              <Text style={styles.priceInputText}>3,648.00</Text>
              <Text style={styles.priceInputSuffix}>USD</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Order Details</Text>

        <Text style={styles.fieldLabel}>Quantity</Text>

        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={decreaseQuantity}
          >
            <Text style={styles.quantityButtonText}>−</Text>
          </TouchableOpacity>

          <View style={styles.quantityValue}>
            <Text style={styles.quantityNumber}>
              {quantity.toFixed(2)}
            </Text>
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
          {[0.01, 0.1, 0.5, 1].map((value) => (
            <TouchableOpacity
              key={value}
              style={styles.quickQuantity}
              onPress={() => setQuantity(value)}
            >
              <Text style={styles.quickQuantityText}>
                {value.toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, styles.protectionLabel]}>
          Protection
        </Text>

        <ProtectionRow
          label="Take Profit"
          value="3,700.00"
          enabled={takeProfit}
          onPress={() => setTakeProfit((value) => !value)}
        />

        <ProtectionRow
          label="Stop Loss"
          value="3,600.00"
          enabled={stopLoss}
          onPress={() => setStopLoss((value) => !value)}
        />
      </View>

      <View style={styles.accountCard}>
        <Text style={styles.sectionTitle}>Account</Text>

        <AccountRow label="Balance" value="$10,000.00" />
        <AccountRow label="Available Margin" value="$9,820.00" />
        <AccountRow label="Required Margin" value="$180.00" />
      </View>

      <View style={styles.executionCard}>
        <Text style={styles.executionHint}>
          Market order executes at the current live price.
        </Text>

        <View style={styles.executionRow}>
          <TouchableOpacity style={styles.sellButton}>
            <Text style={styles.executionLabel}>SELL</Text>
            <Text style={styles.executionPrice}>{instrument.bid}</Text>
            <Text style={styles.executionSubtext}>
              Bid • {quantity.toFixed(2)} Lots
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buyButton}>
            <Text style={styles.executionLabel}>BUY</Text>
            <Text style={styles.executionPrice}>{instrument.ask}</Text>
            <Text style={styles.executionSubtext}>
              Ask • {quantity.toFixed(2)} Lots
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function Quote({
  label,
  value,
  secondary,
  positive,
  negative,
}: {
  label: string;
  value: string;
  secondary: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <View style={styles.quote}>
      <Text style={styles.quoteLabel}>{label}</Text>

      <Text style={styles.quoteValue}>{value}</Text>

      <Text
        style={[
          styles.quoteAction,
          positive && styles.quoteBuy,
          negative && styles.quoteSell,
        ]}
      >
        {secondary}
      </Text>
    </View>
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

function AccountRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.accountRow}>
      <Text style={styles.accountLabel}>{label}</Text>
      <Text style={styles.accountValue}>{value}</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
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
    marginRight: 10,
  },

  backText: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 30,
  },

  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: colors.success,
    marginRight: 5,
  },

  liveText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '800',
  },

  instrumentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  instrumentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  goldBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  goldBadgeText: {
    color: colors.warning,
    fontSize: 17,
    fontWeight: '800',
  },

  symbol: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  instrumentName: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 3,
  },

  favoriteButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  favoriteText: {
    color: colors.textSecondary,
    fontSize: 24,
  },

  quoteCard: {
    flexDirection: 'row',
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  quote: {
    flex: 1,
    alignItems: 'center',
  },

  quoteDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },

  quoteLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },

  quoteValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },

  quoteAction: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },

  quoteBuy: {
    color: colors.success,
  },

  quoteSell: {
    color: colors.danger,
  },

  orderTypeCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: spacing.md,
  },

  orderTypeRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 3,
  },

  orderTypeButton: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },

  orderTypeButtonActive: {
    backgroundColor: colors.accentSoft,
  },

  orderTypeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },

  orderTypeTextActive: {
    color: colors.accent,
  },

  triggerPrice: {
    marginTop: spacing.md,
  },

  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 7,
  },

  priceInput: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },

  priceInputText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  priceInputSuffix: {
    color: colors.textMuted,
    fontSize: 9,
  },

  formCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  quantityButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityButtonText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '500',
  },

  quantityValue: {
    alignItems: 'center',
  },

  quantityNumber: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },

  quantityUnit: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 2,
  },

  quickQuantityRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: spacing.sm,
  },

  quickQuantity: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },

  quickQuantityText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
  },

  protectionLabel: {
    marginTop: spacing.lg,
  },

  protectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  protectionTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },

  protectionValue: {
    color: colors.textSecondary,
    fontSize: 9,
    marginTop: 3,
  },

  toggle: {
    width: 42,
    height: 23,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },

  toggleActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },

  toggleKnob: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.textMuted,
  },

  toggleKnobActive: {
    backgroundColor: colors.accent,
    alignSelf: 'flex-end',
  },

  accountCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  accountLabel: {
    color: colors.textSecondary,
    fontSize: 10,
  },

  accountValue: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
  },

  executionCard: {
    marginTop: spacing.md,
  },

  executionHint: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 9,
    marginBottom: spacing.sm,
  },

  executionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  sellButton: {
    flex: 1,
    minHeight: 86,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buyButton: {
    flex: 1,
    minHeight: 86,
    borderRadius: radius.lg,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  executionLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  executionPrice: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 3,
  },

  executionSubtext: {
    color: colors.textSecondary,
    fontSize: 8,
    marginTop: 3,
  },
});
