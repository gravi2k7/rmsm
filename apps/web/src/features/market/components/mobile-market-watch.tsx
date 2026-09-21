"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Search,
  SlidersHorizontal,
  Star,
  Menu,
  UserCircle,
  TrendingUp,
  BarChart3,
  ArrowDownUp,
  ClipboardList,
  MoreHorizontal,
} from "lucide-react";

import { cn } from "@rmsm/ui";
import type { AssetClass, Instrument, Quote } from "../types";
import { toNumber } from "../types";
import { useWatchlistStore } from "@/features/watchlists/store";

export interface MobileMarketWatchRow {
  instrument: Instrument;
  quote: Quote | undefined;
}

type Category = AssetClass | "ALL";

interface MobileMarketWatchProps {
  rows: MobileMarketWatchRow[];
  category: Category;
  onCategoryChange: (category: Category) => void;
  search: string;
  onSearchChange: (value: string) => void;
  favoritesOnly: boolean;
  onFavoritesOnlyChange: (value: boolean) => void;
  isLoading: boolean;
}

const CATEGORIES: { label: string; value: Category }[] = [
  { label: "Watchlist", value: "ALL" },
  { label: "Forex", value: "FOREX" },
  { label: "Indices", value: "INDEX" },
  { label: "Commodities", value: "COMMODITY" },
  { label: "Crypto", value: "CRYPTO" },
  { label: "Stocks", value: "EQUITY" },
];

const SPARKLINE_POINTS = 24;

function formatPrice(value: number | null) {
  if (value === null) return "—";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 5,
  }).format(value);
}

function getMovement(current: number | null, previous: number | null): "UP" | "DOWN" | "UNCHANGED" {
  if (current === null || previous === null || current === previous) {
    return "UNCHANGED";
  }

  return current > previous ? "UP" : "DOWN";
}

function Sparkline({
  values,
  movement,
}: {
  values: number[];
  movement: "UP" | "DOWN" | "UNCHANGED";
}) {
  if (values.length < 2) {
    return <div className="h-8 w-16 rounded-md bg-white/[0.02]" aria-hidden="true" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 72;
      const y = 27 - ((value - min) / range) * 23;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const stroke = movement === "DOWN" ? "rgb(248 113 113)" : "rgb(45 212 191)";

  return (
    <svg viewBox="0 0 72 30" className="h-8 w-[72px] shrink-0 overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="rmsm-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function InstrumentAvatar({ instrument }: { instrument: Instrument }) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
        "border border-white/[0.12]",
        "bg-gradient-to-br from-white/[0.14] to-white/[0.04]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]",
      )}
    >
      <span className="text-[10px] font-bold tracking-tight text-white/90">
        {instrument.symbol.slice(0, 3)}
      </span>
    </div>
  );
}

function MarketCard({ row, sparkline }: { row: MobileMarketWatchRow; sparkline: number[] }) {
  const favorites = useWatchlistStore((state) => state.favoriteInstrumentIds);
  const toggleFavorite = useWatchlistStore((state) => state.toggleFavorite);

  const { instrument, quote } = row;

  const last = toNumber(quote?.lastPrice);
  const bid = toNumber(quote?.bidPrice);
  const ask = toNumber(quote?.askPrice);

  const previous = sparkline.length > 1 ? (sparkline[sparkline.length - 2] ?? null) : null;

  const movement = getMovement(last, previous);

  const isFavorite = favorites.includes(instrument.id);

  /*
   * We don't currently receive a day-change percentage in MarketWatchRow.
   * Until that data is available, the mobile card deliberately avoids
   * inventing a percentage.
   */
  const changeClass =
    movement === "DOWN" ? "text-red-300" : movement === "UP" ? "text-emerald-300" : "text-white/70";

  return (
    <Link
      href={`/trading?instrument=${instrument.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-[18px]",
        "border border-cyan-100/[0.10]",
        "bg-[linear-gradient(135deg,rgba(255,255,255,0.065),rgba(255,255,255,0.025))]",
        "backdrop-blur-2xl",
        "shadow-[0_14px_34px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08)]",
        "transition-all duration-200 ease-out",
        "active:scale-[0.985]",
        "hover:border-cyan-200/[0.18] hover:bg-white/[0.075]",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />

      <div className="flex min-h-[78px] items-center gap-3 px-3.5 py-3">
        <InstrumentAvatar instrument={instrument} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[14px] font-semibold tracking-tight text-white/95">
              {instrument.symbol}
            </span>

            {instrument.status === "ACTIVE" && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            )}
          </div>

          <div className="mt-0.5 truncate text-[11px] text-white/45">{instrument.name}</div>

          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-[0.12em] text-white/25">
              {instrument.assetClass}
            </span>

            {bid !== null && ask !== null && (
              <span className="text-[9px] text-white/30">
                • {Math.abs(ask - bid).toFixed(2)} spread
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Sparkline values={sparkline} movement={movement} />

          <div className="min-w-[72px] text-right">
            <div
              className={cn("text-[14px] font-semibold tabular-nums tracking-tight", changeClass)}
            >
              {formatPrice(last)}
            </div>

            <div className="mt-0.5 flex items-center justify-end gap-1">
              <span className={cn("text-[10px] font-medium", changeClass)}>
                {movement === "UP" ? "▲ LIVE" : movement === "DOWN" ? "▼ LIVE" : "● LIVE"}
              </span>
            </div>
          </div>

          <button
            type="button"
            aria-label={
              isFavorite
                ? `Remove ${instrument.symbol} from favorites`
                : `Add ${instrument.symbol} to favorites`
            }
            aria-pressed={isFavorite}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleFavorite(instrument.id);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-white/35 transition-all hover:border-white/[0.12] hover:bg-white/[0.07] hover:text-white/80"
          >
            <Star
              className={cn("h-[17px] w-[17px]", isFavorite && "fill-amber-300 text-amber-300")}
              aria-hidden="true"
            />
          </button>

          <ChevronRight
            className="h-4 w-4 text-white/25 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  );
}

function LoadingCard() {
  return (
    <div className="h-[78px] animate-pulse rounded-[18px] border border-white/[0.08] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" />
  );
}

export function MobileMarketWatch({
  rows,
  category,
  onCategoryChange,
  search,
  onSearchChange,
  favoritesOnly,
  onFavoritesOnlyChange,
  isLoading,
}: MobileMarketWatchProps) {
  const [sparklineHistory, setSparklineHistory] = useState<Map<string, number[]>>(new Map());

  const previousPrices = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setSparklineHistory((current) => {
      const next = new Map(current);

      for (const row of rows) {
        const price = toNumber(row.quote?.lastPrice);

        if (price === null) continue;

        const existing = next.get(row.instrument.id) ?? [];
        const previous = previousPrices.current.get(row.instrument.id);

        if (previous === price) continue;

        next.set(row.instrument.id, [...existing, price].slice(-SPARKLINE_POINTS));

        previousPrices.current.set(row.instrument.id, price);
      }

      return next;
    });
  }, [rows]);

  const displayCategories = useMemo(() => CATEGORIES, []);

  return (
    <div className="md:hidden">
      <div className="min-h-screen bg-[radial-gradient(circle_at_50%_-10%,rgba(34,211,238,0.13),transparent_34%),radial-gradient(circle_at_100%_35%,rgba(59,130,246,0.07),transparent_30%),linear-gradient(180deg,#060b16_0%,#09111f_52%,#050a13_100%)] px-3 pb-24 pt-3">
        {/* Glass header */}
        <header className="sticky top-0 z-20 mb-3 rounded-[20px] border border-cyan-100/[0.10] bg-slate-950/60 px-3 py-3 shadow-[0_14px_38px_rgba(0,0,0,0.28),0_0_30px_rgba(34,211,238,0.05),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-white/75"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="text-center">
              <div className="text-[17px] font-bold tracking-tight text-white">RMSM</div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-white/35">
                Market Watch
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Search markets"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-white/75"
              >
                <Search className="h-[18px] w-[18px]" />
              </button>

              <button
                type="button"
                aria-label="Account"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-white/75"
              >
                <UserCircle className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </header>

        {/* Categories */}
        <div className="scrollbar-none -mx-1 mb-3 overflow-x-auto px-1 pb-1">
          <div className="flex min-w-max gap-1 rounded-2xl border border-white/[0.09] bg-white/[0.035] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl">
            {displayCategories.map((item) => {
              const active = item.value === category || (item.value === "ALL" && favoritesOnly);

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    if (item.value === "ALL") {
                      onFavoritesOnlyChange(true);
                      onCategoryChange("ALL");
                    } else {
                      onFavoritesOnlyChange(false);
                      onCategoryChange(item.value);
                    }
                  }}
                  className={cn(
                    "rounded-xl px-4 py-2 text-[12px] font-medium transition-all duration-200",
                    active
                      ? "border border-cyan-300/25 bg-cyan-300/[0.10] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_18px_rgba(34,211,238,0.08)]"
                      : "border border-transparent text-white/45 hover:text-white/75",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="mb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />

            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search markets..."
              aria-label="Search markets"
              className="h-11 w-full rounded-[15px] border border-white/[0.09] bg-white/[0.04] pl-10 pr-3 text-[13px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none backdrop-blur-2xl placeholder:text-white/25 focus:border-cyan-300/30 focus:bg-white/[0.065] focus:shadow-[0_0_20px_rgba(34,211,238,0.06),inset_0_1px_0_rgba(255,255,255,0.07)]"
            />
          </div>

          <button
            type="button"
            aria-label="Market filters"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-white/[0.09] bg-white/[0.04] text-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Live indicator */}
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
              Markets
            </div>
            <div className="mt-0.5 text-[10px] text-white/25">Real-time prices</div>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-300/90">
              Live
            </span>
          </div>
        </div>

        {/* Market cards */}
        <section aria-label="Mobile market watchlist" className="space-y-2.5">
          {isLoading ? (
            Array.from({ length: 7 }).map((_, index) => <LoadingCard key={index} />)
          ) : rows.length > 0 ? (
            rows.map((row) => (
              <MarketCard
                key={row.instrument.id}
                row={row}
                sparkline={sparklineHistory.get(row.instrument.id) ?? []}
              />
            ))
          ) : (
            <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.025] px-4 py-12 text-center backdrop-blur-xl">
              <TrendingUp className="mx-auto mb-3 h-7 w-7 text-white/20" />
              <p className="text-sm text-white/55">No instruments match your filters.</p>
            </div>
          )}
        </section>

        {/* Mobile bottom navigation visual */}
        <nav
          aria-label="Mobile navigation"
          className="bg-slate-950/78 fixed inset-x-3 bottom-3 z-30 rounded-[22px] border border-cyan-100/[0.11] p-1.5 shadow-[0_20px_48px_rgba(0,0,0,0.42),0_0_30px_rgba(34,211,238,0.05),inset_0_1px_0_rgba(255,255,255,0.09)] backdrop-blur-2xl"
        >
          <div className="grid grid-cols-5 gap-1">
            {[
              {
                label: "Markets",
                icon: BarChart3,
                href: "/market",
                active: true,
              },
              {
                label: "Chart",
                icon: TrendingUp,
                href: "/trading",
                active: false,
              },
              {
                label: "Trade",
                icon: ArrowDownUp,
                href: "/trading",
                active: false,
              },
              {
                label: "Orders",
                icon: ClipboardList,
                href: "/orders",
                active: false,
              },
              {
                label: "More",
                icon: MoreHorizontal,
                href: "/dashboard",
                active: false,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex min-h-[52px] flex-col items-center justify-center rounded-[17px] transition-all duration-200",
                    item.active
                      ? "bg-cyan-300/[0.09] text-cyan-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_20px_rgba(34,211,238,0.06)]"
                      : "text-white/35 hover:bg-white/[0.04] hover:text-white/70",
                  )}
                >
                  <Icon className="mb-1 h-[17px] w-[17px]" />
                  <span className="text-[9px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
