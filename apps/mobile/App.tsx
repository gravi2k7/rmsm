import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';

import { colors } from './src/theme/colors';
import { MarketsScreen } from './src/features/markets/markets-screen';
import { ChartScreen } from './src/features/chart/chart-screen';
import { TradeScreen } from './src/features/trade/trade-screen';
import { OrdersScreen } from './src/features/orders/orders-screen';
import { MoreScreen } from './src/features/more/more-screen';

type Tab = 'Markets' | 'Chart' | 'Trade' | 'Orders' | 'More';

const tabs: Tab[] = ['Markets', 'Chart', 'Trade', 'Orders', 'More'];

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
        return <OrdersScreen />;

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
              activeOpacity={0.75}
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

  bottomNav: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  navItem: {
    flex: 1,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },

  navIndicator: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginBottom: 7,
  },

  navIndicatorActive: {
    backgroundColor: colors.accent,
  },

  navText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },

  navTextActive: {
    color: colors.accent,
    fontWeight: '800',
  },
});
