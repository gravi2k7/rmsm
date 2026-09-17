import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import type { MoreDetailKey } from '../../navigation/navigation';

type MoreItemProps = {
  icon: string;
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
        <Text style={styles.itemIconText}>{icon}</Text>
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

      <View style={styles.accountCard}>
        <View>
          <Text style={styles.accountLabel}>CURRENT ACCOUNT</Text>
          <Text style={styles.accountName}>Demo Account</Text>
        </View>

        <View style={styles.accountRight}>
          <Text style={styles.accountBalance}>$100,000.00</Text>
          <Text style={styles.accountBalanceLabel}>Balance</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>ACCOUNT</Text>

      <View style={styles.section}>
        <MoreItem
          icon="◎"
          title="Account & Profile"
          subtitle="Personal details and account information"
          onPress={() => onOpenDetail?.('account')}
        />

        <MoreItem
          icon="▣"
          title="Portfolio"
          subtitle="Positions, exposure and performance"
          onPress={() => onOpenDetail?.('portfolio')}
        />

        <MoreItem
          icon="◒"
          title="Analytics"
          subtitle="Trading performance and statistics"
          onPress={() => onOpenDetail?.('analytics')}
        />
      </View>

      <Text style={styles.sectionTitle}>PREFERENCES</Text>

      <View style={styles.section}>
        <MoreItem
          icon="⚙"
          title="Trading Settings"
          subtitle="Execution and trading preferences"
          onPress={() => onOpenDetail?.('trading-settings')}
        />

        <MoreItem
          icon="◉"
          title="Notifications"
          subtitle="Alerts and notification preferences"
          onPress={() => onOpenDetail?.('notifications')}
        />

        <MoreItem
          icon="☾"
          title="Appearance"
          subtitle="Dark theme and display preferences"
          onPress={() => onOpenDetail?.('appearance')}
        />
      </View>

      <Text style={styles.sectionTitle}>SECURITY</Text>

      <View style={styles.section}>
        <MoreItem
          icon="◆"
          title="Security"
          subtitle="Password, sessions and security controls"
          onPress={() => onOpenDetail?.('security')}
        />
      </View>

      <Text style={styles.sectionTitle}>SUPPORT</Text>

      <View style={styles.section}>
        <MoreItem
          icon="?"
          title="Help & Support"
          subtitle="Get help with RMSM"
          onPress={() => onOpenDetail?.('support')}
        />

        <MoreItem
          icon="ⓘ"
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
        <Text style={styles.signOutIcon}>↪</Text>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>RMSM • Trading Terminal</Text>
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
    marginBottom: spacing.lg,
  },

  profileCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    fontSize: 22,
    fontWeight: '800',
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },

  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
  },

  accountDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: 6,
  },

  accountBadgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },

  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
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
    fontSize: 16,
    fontWeight: '700',
  },

  accountRight: {
    alignItems: 'flex-end',
  },

  accountBalance: {
    color: colors.text,
    fontSize: 16,
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
    letterSpacing: 1.1,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },

  section: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },

  item: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  itemIconText: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: '700',
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
    marginTop: 4,
  },

  chevron: {
    color: colors.textMuted,
    fontSize: 25,
    marginLeft: spacing.sm,
  },

  dangerText: {
    color: colors.danger,
  },

  signOutButton: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  signOutIcon: {
    color: colors.danger,
    fontSize: 18,
    marginRight: spacing.sm,
  },

  signOutText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },

  footer: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 10,
    marginTop: spacing.xl,
  },
});
