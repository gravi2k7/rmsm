import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { mockMarkets, type MarketInstrument } from '../../types/market';

type MarketCategory = 'Watchlist' | 'Forex' | 'Indices' | 'Crypto';

const categories: MarketCategory[] = [
  'Watchlist',
  'Forex',
  'Indices',
  'Crypto',
];

const sparklineUp = [8, 13, 10, 18, 15, 24, 21, 31, 27, 38];
const sparklineDown = [34, 29, 33, 24, 27, 18, 22, 14, 17, 8];

function InstrumentBadge({ symbol }: { symbol: string }) {
  const letters =
    symbol === 'XAUUSD'
      ? 'Au'
      : symbol === 'BTCUSD'
        ? '₿'
        : symbol === 'ETHUSD'
          ? '◆'
          : symbol === 'EURUSD'
            ? '€'
            : symbol === 'GBPUSD'
              ? '£'
              : symbol === 'USDJPY'
                ? '$'
                : symbol.slice(0, 2);

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{letters}</Text>
    </View>
  );
}

function Sparkline({ positive }: { positive: boolean }) {
  const points = positive ? sparklineUp : sparklineDown;

  return (
    <View style={styles.sparkline}>
      {points.map((height, index) => (
        <View
          key={`${index}-${height}`}
          style={[
            styles.sparkBar,
            {
              height,
              transform: [
                {
                  rotate:
                    index % 2 === 0
                      ? positive
                        ? '-8deg'
                        : '8deg'
                      : positive
                        ? '8deg'
                        : '-8deg',
                },
              ],
            },
            positive
              ? styles.sparkBarPositive
              : styles.sparkBarNegative,
          ]}
        />
      ))}
    </View>
  );
}

function MarketCard({
  market,
  favorite,
}: {
  market: MarketInstrument;
  favorite: boolean;
}) {
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.marketCard}>
      <View style={styles.marketIdentity}>
        <InstrumentBadge symbol={market.symbol} />

        <View style={styles.identityText}>
          <Text style={styles.symbol}>{market.symbol}</Text>
          <Text style={styles.name}>{market.name}</Text>
        </View>
      </View>

      <Sparkline positive={market.positive} />

      <View style={styles.quote}>
        <Text style={styles.price}>{market.bid}</Text>
        <Text
          style={[
            styles.change,
            market.positive
              ? styles.positive
              : styles.negative,
          ]}
        >
          {market.changePercent}
        </Text>
      </View>

      <Text
        style={[
          styles.favorite,
          favorite && styles.favoriteActive,
        ]}
      >
        {favorite ? '★' : '☆'}
      </Text>
    </TouchableOpacity>
  );
}

export function MarketsScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuButton}>
            <Text style={styles.menuText}>☰</Text>
          </TouchableOpacity>

          <Text style={styles.brand}>RMSM</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIcon}>
            <Text style={styles.headerIconText}>⌕</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.profileButton}>
            <Text style={styles.profileIcon}>♙</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.categoryBar}>
        {categories.map((category, index) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.category,
              index === 0 && styles.categoryActive,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                index === 0 && styles.categoryTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchGlyph}>⌕</Text>

          <TextInput
            placeholder="Search markets..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>

        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>☷</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {mockMarkets.map((market, index) => (
          <MarketCard
            key={market.id}
            market={market}
            favorite={index === 3}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  header: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  menuButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuText: {
    color: colors.text,
    fontSize: 20,
  },

  brand: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginLeft: 10,
    letterSpacing: 0.5,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  headerIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerIconText: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 30,
  },

  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileIcon: {
    color: colors.text,
    fontSize: 22,
  },

  categoryBar: {
    height: 45,
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 3,
    marginBottom: spacing.md,
  },

  category: {
    flex: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  categoryActive: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
  },

  categoryText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  categoryTextActive: {
    color: colors.text,
  },

  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },

  searchContainer: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  searchGlyph: {
    color: colors.textSecondary,
    fontSize: 21,
    marginRight: 7,
  },

  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    paddingVertical: 0,
  },

  filterButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterText: {
    color: colors.text,
    fontSize: 22,
  },

  list: {
    paddingBottom: 20,
  },

  marketCard: {
    minHeight: 76,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  marketIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
  },

  badge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },

  identityText: {
    marginLeft: 9,
  },

  symbol: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  name: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 3,
  },

  sparkline: {
    width: 46,
    height: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginHorizontal: 5,
  },

  sparkBar: {
    width: 3,
    borderRadius: 3,
  },

  sparkBarPositive: {
    backgroundColor: colors.success,
  },

  sparkBarNegative: {
    backgroundColor: colors.danger,
  },

  quote: {
    width: 76,
    alignItems: 'flex-end',
  },

  price: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  change: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  positive: {
    color: colors.success,
  },

  negative: {
    color: colors.danger,
  },

  favorite: {
    width: 27,
    color: colors.textSecondary,
    fontSize: 21,
    textAlign: 'right',
    marginLeft: 3,
  },

  favoriteActive: {
    color: colors.warning,
  },
});
