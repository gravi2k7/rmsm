import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '../../theme/colors';
import { RmsmIcon, type RmsmIconName } from '../../components/rmsm-icon';
import { radius, spacing } from '../../theme/spacing';
import { useTradingAccount } from '../../account/trading-account-context';
import type { MoreDetailKey } from '../../navigation/navigation';

type MoreItemProps = {
  icon: RmsmIconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
};

function MoreItem({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
}: MoreItemProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={styles.item}
    >
      <View style={styles.itemIcon}>
        <RmsmIcon
          name={icon}
          size={19}
          color={danger ? colors.danger : colors.accent}
        />
      </View>

      <View style={styles.itemContent}>
        <Text
          style={[
            styles.itemTitle,
            danger && styles.dangerText,
          ]}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text style={styles.itemSubtitle}>{subtitle}</Text>
        ) : null}
      </View>

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export function MoreScreen({
  onOpenDetail,
  onSignOut,
}: {
  onOpenDetail?: (detail: MoreDetailKey) => void;
  onSignOut?: () => Promise<void> | void;
}) {
  const {
    accounts,
    currentAccount: account,
    loading: accountLoading,
    selectAccount,
  } = useTradingAccount();

  const [accountPickerVisible, setAccountPickerVisible] =
    React.useState(false);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.profileCircle}>
          <Text style={styles.profileInitial}>R</Text>
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.title}>RMSM</Text>
          <Text style={styles.subtitle}>Trading Account</Text>
        </View>

        <View style={styles.accountBadge}>
          <View style={styles.accountDot} />
          <Text style={styles.accountBadgeText}>DEMO</Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.accountCard}
        onPress={() => setAccountPickerVisible(true)}
      >
        <View style={styles.accountCardIcon}>
          <RmsmIcon name="wallet" size={20} color={colors.accent} />
        </View>

        <View style={styles.accountCardMain}>
          <Text style={styles.accountLabel}>CURRENT ACCOUNT</Text>
          <Text style={styles.accountName}>
            {account?.name ?? (accountLoading ? 'Loading...' : 'Trading Account')}
          </Text>
          <Text style={styles.accountSwitcherHint}>
            {accounts.length > 1
              ? `${accounts.length} trading accounts • Tap to switch`
              : 'Tap to view account'}
          </Text>
        </View>

        <View style={styles.accountRight}>
          <Text style={styles.accountBalance}>
            {account
              ? `${account.currency} ${Number(account.balance).toLocaleString(
                  'en-US',
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                )}`
              : '—'}
          </Text>
          <Text style={styles.accountBalanceLabel}>Balance</Text>
        </View>

        <Text style={styles.accountChevron}>›</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>ACCOUNT</Text>

      <View style={styles.section}>
        <MoreItem
          icon="user"
          title="Account & Profile"
          subtitle="Personal details and account information"
          onPress={() => onOpenDetail?.('account')}
        />

        <MoreItem
          icon="briefcase"
          title="Portfolio"
          subtitle="Positions, exposure and performance"
          onPress={() => onOpenDetail?.('portfolio')}
        />

        <MoreItem
          icon="chart"
          title="Analytics"
          subtitle="Trading performance and statistics"
          onPress={() => onOpenDetail?.('analytics')}
        />
      </View>

      <Text style={styles.sectionTitle}>PREFERENCES</Text>

      <View style={styles.section}>
        <MoreItem
          icon="sliders"
          title="Trading Settings"
          subtitle="Execution and trading preferences"
          onPress={() => onOpenDetail?.('trading-settings')}
        />

        <MoreItem
          icon="bell"
          title="Notifications"
          subtitle="Alerts and notification preferences"
          onPress={() => onOpenDetail?.('notifications')}
        />

        <MoreItem
          icon="moon"
          title="Appearance"
          subtitle="Dark theme and display preferences"
          onPress={() => onOpenDetail?.('appearance')}
        />
      </View>

      <Text style={styles.sectionTitle}>SECURITY</Text>

      <View style={styles.section}>
        <MoreItem
          icon="shield"
          title="Security"
          subtitle="Password, sessions and security controls"
          onPress={() => onOpenDetail?.('security')}
        />
      </View>

      <Text style={styles.sectionTitle}>SUPPORT</Text>

      <View style={styles.section}>
        <MoreItem
          icon="help"
          title="Help & Support"
          subtitle="Get help with RMSM"
          onPress={() => onOpenDetail?.('support')}
        />

        <MoreItem
          icon="info"
          title="About RMSM"
          subtitle="Version 1.0.0"
          onPress={() => onOpenDetail?.('about')}
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.signOutButton}
        onPress={() => void onSignOut?.()}
      >
        <RmsmIcon name="logout" size={19} color={colors.danger} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>RMSM • Trading Terminal</Text>

      <Modal
        visible={accountPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAccountPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.accountPicker}>
            <View style={styles.pickerHeader}>
              <View>
                <Text style={styles.pickerTitle}>Trading Accounts</Text>
                <Text style={styles.pickerSubtitle}>
                  Select the account used for trading
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setAccountPickerVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.accountList}
            >
              {accounts.map((item) => {
                const selected = item.id === account?.id;

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    style={[
                      styles.accountOption,
                      selected && styles.accountOptionSelected,
                    ]}
                    onPress={() => {
                      void selectAccount(item.id).then(() => {
                        setAccountPickerVisible(false);
                      });
                    }}
                  >
                    <View style={styles.accountOptionMain}>
                      <Text style={styles.accountOptionName}>
                        {item.name}
                      </Text>

                      <Text style={styles.accountOptionMeta}>
                        {item.type} • {item.status}
                      </Text>
                    </View>

                    <View style={styles.accountOptionRight}>
                      <Text style={styles.accountOptionBalance}>
                        {item.currency}{' '}
                        {Number(item.balance).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>

                      {selected ? (
                        <Text style={styles.selectedMark}>✓</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {accounts.length === 0 && (
                <Text style={styles.noAccountsText}>
                  No trading accounts available.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingTop: spacing.md,
    paddingBottom: 32,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  profileCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileInitial: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '800',
  },

  headerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },

  title: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: 0.1,
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },

  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
  },

  accountDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 6,
  },

  accountBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },

  accountLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },

  accountName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  accountRight: {
    alignItems: 'flex-end',
  },

  accountBalance: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },

  accountBalanceLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 3,
  },

  sectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 7,
    marginLeft: 3,
  },

  section: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },

  item: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  itemContent: {
    flex: 1,
  },

  itemTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  itemSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },

  chevron: {
    color: colors.textMuted,
    fontSize: 22,
    fontWeight: '400',
    marginLeft: spacing.sm,
  },

  dangerText: {
    color: colors.danger,
  },

  signOutButton: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  signOutText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },

  accountCardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  accountCardMain: {
    flex: 1,
  },

  accountSwitcherHint: {
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 10,
  },

  accountChevron: {
    marginLeft: spacing.sm,
    color: colors.textSecondary,
    fontSize: 26,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },

  accountPicker: {
    maxHeight: '78%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
  },

  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  pickerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },

  pickerSubtitle: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 12,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  closeButtonText: {
    color: colors.textSecondary,
    fontSize: 24,
  },

  accountList: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },

  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  accountOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },

  accountOptionMain: {
    flex: 1,
  },

  accountOptionName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  accountOptionMeta: {
    marginTop: 5,
    color: colors.textSecondary,
    fontSize: 11,
  },

  accountOptionRight: {
    alignItems: 'flex-end',
    marginLeft: spacing.md,
  },

  accountOptionBalance: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  selectedMark: {
    marginTop: 5,
    color: colors.accent,
    fontSize: 16,
    fontWeight: '900',
  },

  noAccountsText: {
    paddingVertical: spacing.xl,
    textAlign: 'center',
    color: colors.textSecondary,
  },

  footer: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 10,
    marginTop: spacing.xl,
  },
});
