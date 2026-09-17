import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useState } from 'react';

import { colors } from './src/theme/colors';

type Tab = 'Markets' | 'Chart' | 'Trade' | 'Orders' | 'More';

const tabs: Tab[] = ['Markets', 'Chart', 'Trade', 'Orders', 'More'];

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>RMSM</Text>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.statusDot} />
    </View>
  );
}

import { MarketsScreen } from './src/features/markets/markets-screen';
import { ChartScreen } from './src/features/chart/chart-screen';
import { TradeScreen } from './src/features/trade/trade-screen';
import { OrdersScreen as NativeOrdersScreen } from './src/features/orders/orders-screen';
import { MoreScreen } from './src/features/more/more-screen';

function TradeRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.tradeRow}>
      <Text style={styles.tradeRowLabel}>{label}</Text>
      <Text style={styles.tradeRowValue}>{value}</Text>
    </View>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Markets');

  const renderScreen = () => {
    switch (activeTab) {
      case 'Markets':
        return <MarketsScreen />;
      case 'Chart':
        return <ChartScreen />;
      case 'Trade':
        return <TradeScreen />;
      case 'Orders':
        return <NativeOrdersScreen />;
      case 'More':
        return <MoreScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.content}>{renderScreen()}</View>

      <View style={styles.bottomNav}>
        {tabs.map((tab) => {
          const active = tab === activeTab;

          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={styles.navItem}
            >
              <View
                style={[
                  styles.navIndicator,
                  active && styles.navIndicatorActive,
                ]}
              />

              <Text
                style={[
                  styles.navText,
                  active && styles.navTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  header: {
    height: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brand: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },

  title: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '700',
    marginTop: 2,
  },

  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 9,
    backgroundColor: colors.success,
  },

  searchBox: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 14,
  },

  searchIcon: {
    color: colors.textSecondary,
    fontSize: 22,
    marginRight: 8,
  },

  searchText: {
    color: colors.textMuted,
    fontSize: 14,
  },

  scrollContent: {
    paddingBottom: 24,
  },

  marketCard: {
    minHeight: 76,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  marketLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  instrumentIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  instrumentIconText: {
    color: colors.accent,
    fontWeight: '800',
  },

  symbol: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  instrumentName: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },

  marketRight: {
    alignItems: 'flex-end',
  },

  price: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  change: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },

  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },

  chartPriceBlock: {
    alignItems: 'flex-end',
  },

  chartPrice: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
  },

  positiveText: {
    color: colors.success,
    fontSize: 12,
    marginTop: 3,
  },

  timeframes: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    marginTop: 10,
  },

  timeframe: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },

  timeframeActive: {
    backgroundColor: colors.accentSoft,
  },

  timeframeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  timeframeTextActive: {
    color: colors.accent,
  },

  chartArea: {
    flex: 1,
    minHeight: 360,
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  chartGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '45%',
    height: 1,
    backgroundColor: colors.border,
  },

  chartGridLineTwo: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '65%',
    height: 1,
    backgroundColor: colors.border,
  },

  chartPlaceholder: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '700',
  },

  chartSubtext: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 7,
  },

  tradeInstrument: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  tradeMarketPrice: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },

  sideSelector: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  sideButton: {
    flex: 1,
    minHeight: 105,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    justifyContent: 'center',
  },

  buyButton: {
    backgroundColor: colors.successSoft,
    borderColor: '#195D43',
  },

  buyButtonActive: {
    borderColor: colors.success,
  },

  sellButton: {
    backgroundColor: colors.dangerSoft,
    borderColor: '#67262C',
  },

  sellButtonActive: {
    borderColor: colors.danger,
  },

  sideLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  sidePrice: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 7,
  },

  sideHint: {
    color: colors.textSecondary,
    fontSize: 9,
    marginTop: 3,
  },

  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 12,
    paddingHorizontal: 14,
  },

  tradeRowLabel: {
    color: colors.textSecondary,
    fontSize: 10,
  },

  tradeRowValue: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
  },

  tradeRow: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  rowLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },

  rowValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },

  executeButton: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },

  executeText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },

  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
  },

  segment: {
    flex: 1,
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: 9,
    fontSize: 12,
  },

  segmentActive: {
    flex: 1,
    textAlign: 'center',
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
    paddingVertical: 9,
    fontSize: 12,
    fontWeight: '700',
  },

  positionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },

  positionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  profit: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '800',
  },

  positionDetails: {
    marginTop: 10,
  },

  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  avatarText: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '800',
  },

  profileName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  profileSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },

  menuItem: {
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  menuText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },

  chevron: {
    color: colors.textMuted,
    fontSize: 25,
  },

  bottomNav: {
    height: 70,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },

  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 70,
  },

  navIndicator: {
    width: 22,
    height: 3,
    borderRadius: 3,
    backgroundColor: 'transparent',
    marginBottom: 7,
  },

  navIndicatorActive: {
    backgroundColor: colors.accent,
  },

  navText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },

  navTextActive: {
    color: colors.accent,
  },
});
