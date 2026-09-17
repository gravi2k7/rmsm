import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

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
            <InfoRow label="Account" value="Demo Account" />
            <InfoRow label="Account Type" value="Demo" />
            <InfoRow label="Currency" value="USD" />
            <InfoRow label="Balance" value="$100,000.00" />
            <InfoRow label="Status" value="Active" />
          </View>
        </>
      ) : null}

      {detail === 'portfolio' ? (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>PORTFOLIO VALUE</Text>
            <Text style={styles.summaryValue}>$100,482.35</Text>
            <Text style={styles.positive}>+$482.35 · +0.48%</Text>
          </View>

          <View style={styles.card}>
            <InfoRow label="Open Positions" value="2" />
            <InfoRow label="Exposure" value="$54,218.40" />
            <InfoRow label="Used Margin" value="$4,120.00" />
            <InfoRow label="Free Margin" value="$96,362.35" />
          </View>
        </>
      ) : null}

      {detail === 'analytics' ? (
        <>
          <View style={styles.metricGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>TRADES</Text>
              <Text style={styles.metricValue}>24</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>WIN RATE</Text>
              <Text style={styles.metricValue}>62.5%</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>PROFIT</Text>
              <Text style={styles.metricValue}>+$1,842</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>AVG TRADE</Text>
              <Text style={styles.metricValue}>+$76.75</Text>
            </View>
          </View>

          <View style={styles.card}>
            <InfoRow label="Winning Trades" value="15" />
            <InfoRow label="Losing Trades" value="9" />
            <InfoRow label="Profit Factor" value="1.74" />
            <InfoRow label="Max Drawdown" value="2.1%" />
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
          >
            <Text style={styles.actionTitle}>Change Password</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.actionRow}
          >
            <Text style={styles.actionTitle}>Manage Sessions</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {detail === 'support' ? (
        <View style={styles.card}>
          <TouchableOpacity activeOpacity={0.75} style={styles.actionRow}>
            <View>
              <Text style={styles.actionTitle}>Help Center</Text>
              <Text style={styles.actionSubtitle}>
                Guides and frequently asked questions
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.75} style={styles.actionRow}>
            <View>
              <Text style={styles.actionTitle}>Contact Support</Text>
              <Text style={styles.actionSubtitle}>
                Get assistance with your RMSM account
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.75} style={styles.actionRow}>
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
