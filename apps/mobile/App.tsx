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
import { LoginScreen } from './src/features/auth/login-screen';
import { AuthProvider, useAuth } from './src/auth/auth-context';
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
        : 'Trade';

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


function AppWithAuth() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default AppWithAuth;
