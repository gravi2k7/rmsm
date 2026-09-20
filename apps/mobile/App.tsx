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
import Svg, { Line, Path, Polyline, Rect } from 'react-native-svg';
import { MarketsScreen } from './src/features/markets/markets-screen';
import { ChartScreen } from './src/features/chart/chart-screen';
import { TradeScreen } from './src/features/trade/trade-screen';
import { OrdersScreen } from './src/features/orders/orders-screen';
import { MoreScreen } from './src/features/more/more-screen';
import {
  MoreDetailScreen,
} from './src/features/more/more-detail-screen';
import { LoginScreen } from './src/features/auth/login-screen';
import { AuthProvider, useAuth } from './src/auth/auth-context';
import {
  TradingAccountProvider,
} from './src/account/trading-account-context';
import type { AppTab, AppScreen, MoreDetailKey } from './src/navigation/navigation';

const tabs: AppTab[] = ['Markets', 'Chart', 'Trade', 'Orders', 'More'];

function AuthenticatedApp() {
  const { status, logout } = useAuth();

  const [screen, setScreen] = useState<AppScreen>({
    type: 'tab',
    tab: 'Markets',
  });

  const [selectedInstrumentId, setSelectedInstrumentId] = useState<
    string | null
  >(null);

  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleFavorite = (instrumentId: string) => {
    setFavorites((current) => {
      const next = new Set(current);

      if (next.has(instrumentId)) {
        next.delete(instrumentId);
      } else {
        next.add(instrumentId);
      }

      return next;
    });
  };

  const openTab = (tab: AppTab) => {
    setScreen({
      type: 'tab',
      tab,
    });
  };

  const openChart = (instrumentId: string) => {
    setSelectedInstrumentId(instrumentId);

    setScreen({
      type: 'chart',
      instrumentId,
    });
  };

  const openTrade = (instrumentId: string) => {
    setSelectedInstrumentId(instrumentId);

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
        : screen.type === 'trade'
          ? 'Trade'
          : 'More';

  const renderScreen = () => {
    switch (screen.type) {
      case 'tab':
        switch (screen.tab) {
          case 'Markets':
            return <MarketsScreen
              onOpenChart={openChart}
              onOpenMore={() => openTab('More')}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />;

          case 'Chart':
            return selectedInstrumentId ? (
              <ChartScreen
                instrumentId={selectedInstrumentId}
                onOpenTrade={openTrade}
                favorite={favorites.has(selectedInstrumentId)}
                onToggleFavorite={() =>
                  toggleFavorite(selectedInstrumentId)
                }
              />
            ) : (
              <MarketsScreen
              onOpenChart={openChart}
              onOpenMore={() => openTab('More')}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
            );

          case 'Trade':
            return selectedInstrumentId ? (
              <TradeScreen
                instrumentId={selectedInstrumentId}
                favorite={favorites.has(selectedInstrumentId)}
                onToggleFavorite={() =>
                  toggleFavorite(selectedInstrumentId)
                }
              />
            ) : (
              <MarketsScreen
              onOpenChart={openChart}
              onOpenMore={() => openTab('More')}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
            );

          case 'Orders':
            return <OrdersScreen onOpenChart={openChart} />;

          case 'More':
            return (
              <MoreScreen
                onOpenDetail={openMoreDetail}
                onSignOut={logout}
              />
            );
        }

      case 'chart':
        return (
          <ChartScreen
            instrumentId={screen.instrumentId}
            onBack={() => openTab('Markets')}
            onOpenTrade={openTrade}
            favorite={favorites.has(screen.instrumentId)}
            onToggleFavorite={() => toggleFavorite(screen.instrumentId)}
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
            favorite={favorites.has(screen.instrumentId)}
            onToggleFavorite={() => toggleFavorite(screen.instrumentId)}
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

  if (status === "loading") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingTitle}>RMSM</Text>
          <Text style={styles.loadingText}>Restoring session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === "unauthenticated") {
    return <LoginScreen />;
  }

  return (
    <TradingAccountProvider>
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
              accessibilityRole="button"
              accessibilityLabel={tab}
            >
              <View
                style={[
                  styles.navIconWrap,
                  active && styles.navIconWrapActive,
                ]}
              >
                <NavigationIcon tab={tab} active={active} />
              </View>

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
    </TradingAccountProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flex: 1,
    paddingHorizontal: 0,
  },

  bottomNav: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 4,
  },

  navItem: {
    flex: 1,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },

  navIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
  },

  navIconWrapActive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    shadowOpacity: 0,
    elevation: 0,
  },

  navIcon: {
    color: colors.textMuted,
    fontSize: 17,
    fontWeight: '700',
  },

  navIconActive: {
    color: colors.accent,
  },

  navText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },

  navTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 1,
  },

  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
  },
});



function NavigationIcon({
  tab,
  active,
}: {
  tab: string;
  active: boolean;
}) {
  const stroke = active ? colors.accent : colors.textMuted;
  const strokeWidth = active ? 2.4 : 2.1;

  if (tab === 'Markets') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Rect x="4" y="12" width="3.5" height="8" rx="1" fill={stroke} />
        <Rect x="10.25" y="8" width="3.5" height="12" rx="1" fill={stroke} />
        <Rect x="16.5" y="4" width="3.5" height="16" rx="1" fill={stroke} />
        <Line
          x1="3"
          y1="21"
          x2="21"
          y2="21"
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (tab === 'Chart') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Polyline
          points="3,17 8,12 11,14 16,7 21,9"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M16 7h4v4"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (tab === 'Trade') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Line
          x1="8"
          y1="4"
          x2="8"
          y2="20"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Path
          d="M4.5 7.5L8 4l3.5 3.5"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Line
          x1="16"
          y1="20"
          x2="16"
          y2="4"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Path
          d="M12.5 16.5L16 20l3.5-3.5"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (tab === 'Orders') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Rect
          x="5"
          y="3"
          width="14"
          height="18"
          rx="2"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <Line
          x1="8"
          y1="8"
          x2="16"
          y2="8"
          stroke={stroke}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <Line
          x1="8"
          y1="12"
          x2="16"
          y2="12"
          stroke={stroke}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <Line
          x1="8"
          y1="16"
          x2="13"
          y2="16"
          stroke={stroke}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Line
        x1="4"
        y1="7"
        x2="20"
        y2="7"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Line
        x1="4"
        y1="17"
        x2="20"
        y2="17"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function AppWithAuth() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default AppWithAuth;
