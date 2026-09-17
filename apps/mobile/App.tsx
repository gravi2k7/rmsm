import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useState } from 'react';

import { colors } from './src/theme/colors';
import { MarketsScreen } from './src/features/markets/markets-screen';
import { ChartScreen } from './src/features/chart/chart-screen';
import { TradeScreen } from './src/features/trade/trade-screen';
import { OrdersScreen } from './src/features/orders/orders-screen';
import { MoreScreen } from './src/features/more/more-screen';
import {
  MoreDetailScreen,
} from './src/features/more/more-detail-screen';
import type { AppTab, AppScreen, MoreDetailKey } from './src/navigation/navigation';

const tabs: AppTab[] = ['Markets', 'Chart', 'Trade', 'Orders', 'More'];

export default function App() {
  const [screen, setScreen] = useState<AppScreen>({
    type: 'tab',
    tab: 'Markets',
  });

  const openTab = (tab: AppTab) => {
    setScreen({
      type: 'tab',
      tab,
    });
  };

  const openChart = (instrumentId: string) => {
    setScreen({
      type: 'chart',
      instrumentId,
    });
  };

  const openTrade = (instrumentId: string) => {
    setScreen({
      type: 'trade',
      instrumentId,
    });
  };

  const openMoreDetail = (detail: MoreDetailKey) => {
    setScreen({
      type: 'more-detail',
      detail,
    });
  };

  const activeTab =
    screen.type === 'tab'
      ? screen.tab
      : screen.type === 'chart'
        ? 'Chart'
        : 'Trade';

  const renderScreen = () => {
    switch (screen.type) {
      case 'tab':
        switch (screen.tab) {
          case 'Markets':
            return <MarketsScreen onOpenChart={openChart} />;

          case 'Chart':
            return (
              <ChartScreen
                instrumentId="xauusd"
                onOpenTrade={openTrade}
              />
            );

          case 'Trade':
            return <TradeScreen instrumentId="xauusd" />;

          case 'Orders':
            return <OrdersScreen onOpenChart={openChart} />;

          case 'More':
            return <MoreScreen onOpenDetail={openMoreDetail} />;
        }

      case 'chart':
        return (
          <ChartScreen
            instrumentId={screen.instrumentId}
            onBack={() => openTab('Markets')}
            onOpenTrade={openTrade}
          />
        );

      case 'trade':
        return (
          <TradeScreen
            instrumentId={screen.instrumentId}
            onBack={() =>
              setScreen({
                type: 'chart',
                instrumentId: screen.instrumentId,
              })
            }
          />
        );

      case 'more-detail':
        return (
          <MoreDetailScreen
            detail={screen.detail}
            onBack={() => openTab('More')}
          />
        );
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
              onPress={() => openTab(tab)}
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
