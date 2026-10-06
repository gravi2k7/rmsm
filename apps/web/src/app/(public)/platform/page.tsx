"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CandlestickChart,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Gauge,
  Globe2,
  Layers3,
  Play,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

const markets = [
  ["EURUSD", "1.11848", "-0.62%", false],
  ["GBPUSD", "1.27186", "+0.14%", true],
  ["XAUUSD", "2,354.60", "+0.53%", true],
  ["NAS100", "20,124.50", "+0.73%", true],
  ["BTCUSD", "61,420.10", "+1.57%", true],
  ["USOIL", "72.14", "-0.48%", false],
] as const;

const capabilities = [
  ["Advanced Charts", "100+ indicators", CandlestickChart],
  ["AI Insights", "Real-time signals", Bot],
  ["Multi-Asset Trading", "6+ asset classes", Layers3],
  ["Broker Integration", "Multiple brokers", BriefcaseBusiness],
  ["Copy Trading", "Follow top traders", Copy],
  ["Portfolio Management", "Track performance", WalletCards],
  ["Risk Management", "Advanced tools", ShieldCheck],
  ["All-in-One Platform", "Trade, analyze, execute", Gauge],
] as const;

const assetClasses = [
  ["Forex", "75+ pairs", "from-[#168BFF] to-[#7C3AED]"],
  ["Indices", "Global indices", "from-[#8B5CF6] to-[#168BFF]"],
  ["Commodities", "Gold, Oil, OI", "from-[#00D9FF] to-[#00E5A8]"],
  ["Crypto", "50+ coins", "from-[#FF4565] to-[#8B5CF6]"],
  ["Stocks", "US & Global", "from-[#00E5A8] to-[#00D9FF]"],
  ["ETFs", "Global ETFs", "from-[#168BFF] to-[#00D9FF]"],
  ["Bonds", "Government bonds", "from-[#8B5CF6] to-[#168BFF]"],
] as const;

const brokers = ["Interactive Brokers", "OANDA", "Pepperstone", "IC Markets", "Deriv", "Binance", "Bybit", "FXCM", "Saxo"];

function Sparkline({ positive = true }: { positive?: boolean }) {
  return (
    <svg viewBox="0 0 90 30" className="h-7 w-[72px]" aria-hidden="true">
      <path
        d={positive ? "M2 23 L12 20 L20 22 L30 13 L40 17 L51 8 L61 13 L72 5 L88 8" : "M2 7 L12 10 L20 8 L30 17 L40 12 L51 21 L61 16 L72 24 L88 21"}
        fill="none"
        stroke={positive ? "#00D9FF" : "#FF4565"}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SectionTitle({ eyebrow, title, text, right }: { eyebrow: string; title: string; text?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#00D9FF]">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">{title}</h2>
        {text && <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8FA8C4]">{text}</p>}
      </div>
      {right}
    </div>
  );
}

function Terminal() {
  return (
    <div className="relative">
      <div className="absolute -inset-10 rounded-[44px] bg-gradient-to-r from-[#168BFF]/20 via-[#00D9FF]/5 to-[#7C3AED]/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-[#0B4B78] bg-[#061A32] shadow-[0_35px_100px_rgba(0,0,0,.65)]">
        <div className="flex items-center justify-between border-b border-[#0B3A63] bg-[#031225] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#00E5A8] shadow-[0_0_12px_#00E5A8]" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8FA8C4]">RMSM Markets</span>
          </div>
          <span className="rounded-md border border-[#00D9FF]/30 bg-[#00D9FF]/10 px-2 py-1 text-[9px] font-semibold text-[#00D9FF]">LIVE</span>
        </div>

        <div className="grid grid-cols-[120px_1fr] lg:grid-cols-[150px_1fr_125px]">
          <aside className="border-r border-[#0B3A63] bg-[#031225] p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-[#58718D]">Watchlist</span>
              <Search className="h-3 w-3 text-[#58718D]" />
            </div>
            <div className="space-y-1.5">
              {markets.map(([symbol, price, change, positive]) => (
                <div key={symbol} className="rounded-md border border-[#0B3A63]/60 bg-[#061A32] px-2 py-2">
                  <div className="flex justify-between">
                    <span className="text-[9px] font-semibold text-white">{symbol}</span>
                    <span className={positive ? "text-[8px] text-[#00E5A8]" : "text-[8px] text-[#FF4565]"}>{change}</span>
                  </div>
                  <span className="font-mono text-[8px] text-[#8FA8C4]">{price}</span>
                </div>
              ))}
            </div>
          </aside>

          <div className="min-w-0 bg-[#061A32] p-3">
            <div className="flex items-center justify-between border-b border-[#0B3A63] pb-2">
              <div>
                <span className="text-[10px] font-semibold text-white">EURUSD</span>
                <span className="ml-2 text-[8px] text-[#FF4565]">-0.62%</span>
              </div>
              <div className="flex gap-2 text-[7px] text-[#58718D]">
                <span className="text-[#00D9FF]">1m</span><span>5m</span><span>15m</span><span>1H</span><span>4H</span><span>1D</span>
              </div>
            </div>
            <div className="relative mt-3 h-[250px] overflow-hidden rounded-lg border border-[#0B3A63] bg-[#020817]">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(#0B3A63 1px, transparent 1px), linear-gradient(90deg, #0B3A63 1px, transparent 1px)", backgroundSize: "38px 38px" }} />
              <svg viewBox="0 0 600 250" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                <defs>
                  <linearGradient id="terminalArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#168BFF" stopOpacity=".3" />
                    <stop offset="100%" stopColor="#168BFF" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 185 L25 174 L42 182 L58 160 L77 169 L96 145 L112 154 L131 128 L150 144 L169 116 L190 133 L210 104 L230 121 L252 92 L275 111 L295 83 L316 101 L338 72 L358 93 L380 61 L402 80 L425 51 L448 72 L470 43 L495 62 L520 36 L550 51 L600 25 L600 250 L0 250 Z" fill="url(#terminalArea)" />
                <path d="M0 185 L25 174 L42 182 L58 160 L77 169 L96 145 L112 154 L131 128 L150 144 L169 116 L190 133 L210 104 L230 121 L252 92 L275 111 L295 83 L316 101 L338 72 L358 93 L380 61 L402 80 L425 51 L448 72 L470 43 L495 62 L520 36 L550 51 L600 25" fill="none" stroke="#00D9FF" strokeWidth="2.5" />
                <path d="M0 204 L40 190 L78 197 L118 168 L160 181 L202 153 L240 166 L280 126 L320 142 L360 107 L400 119 L440 83 L480 95 L520 62 L560 76 L600 51" fill="none" stroke="#8B5CF6" strokeWidth="1.6" opacity=".8" />
              </svg>
              <div className="absolute right-2 top-2 rounded border border-[#00E5A8]/20 bg-[#00E5A8]/10 px-2 py-1 text-[8px] font-semibold text-[#00E5A8]">+0.42%</div>
              <div className="absolute bottom-2 left-2 text-[7px] text-[#58718D]">AI signal · momentum rising</div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {["RSI 42.36", "MACD -0.00028", "VOL 82%"].map((x) => (
                <div key={x} className="rounded border border-[#0B3A63] bg-[#031225] px-2 py-1.5 text-center text-[7px] text-[#8FA8C4]">{x}</div>
              ))}
            </div>
          </div>

          <aside className="hidden border-l border-[#0B3A63] bg-[#031225] p-3 lg:block">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold text-white">Trade</span>
              <SlidersHorizontal className="h-3 w-3 text-[#58718D]" />
            </div>
            <div className="mt-3 rounded-lg border border-[#0B3A63] bg-[#061A32] p-2">
              <span className="text-[8px] text-[#58718D]">EURUSD</span>
              <p className="mt-1 font-mono text-sm font-semibold text-white">1.11848</p>
              <div className="mt-3 grid grid-cols-2 gap-1">
                <button className="rounded bg-[#00E5A8]/10 py-1.5 text-[8px] font-semibold text-[#00E5A8]">BUY</button>
                <button className="rounded bg-[#FF4565]/10 py-1.5 text-[8px] font-semibold text-[#FF4565]">SELL</button>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-[7px]">
              <div className="flex justify-between"><span className="text-[#58718D]">Risk</span><span className="text-white">100.00</span></div>
              <div className="h-1 rounded bg-[#0B3A63]"><div className="h-1 w-2/5 rounded bg-gradient-to-r from-[#00D9FF] to-[#7C3AED]" /></div>
              <div className="flex justify-between"><span className="text-[#58718D]">Margin</span><span className="text-white">$11.85</span></div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function PlatformPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020817] text-white">
      {/* Hero */}
      <section className="relative border-b border-[#0B3A63] bg-[#020817]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-[#168BFF]/10 blur-[150px]" />
          <div className="absolute right-0 top-10 h-[550px] w-[550px] rounded-full bg-[#7C3AED]/10 blur-[150px]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#168BFF]/70 to-transparent" />
        </div>
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-16 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0B4B78] bg-[#061A32] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-[#00D9FF]">
                <Sparkles className="h-3 w-3" /> RMSM Markets
              </div>
              <h1 className="mt-5 max-w-2xl text-5xl font-bold leading-[.98] tracking-[-.05em] text-white sm:text-6xl lg:text-[64px]">
                Global Market Intelligence
                <span className="block bg-gradient-to-r from-[#00D9FF] via-[#168BFF] to-[#8B5CF6] bg-clip-text text-transparent">for Modern Traders</span>
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-6 text-[#A8BAD0] sm:text-base">
                Trade Forex, Indices, Commodities, Crypto, Stocks and more with advanced charts, AI insights, multi-asset coverage and institutional-grade trading tools — all in one powerful platform.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/contact" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#168BFF] to-[#6435E9] px-5 py-3 text-xs font-bold text-white shadow-[0_0_30px_rgba(22,139,255,.3)]">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="#platform-terminal" className="inline-flex items-center gap-2 rounded-lg border border-[#0B4B78] bg-[#061A32] px-5 py-3 text-xs font-bold text-white hover:border-[#00D9FF]/60">
                  <Play className="h-4 w-4 text-[#00D9FF]" /> Watch Platform Tour
                </Link>
              </div>
              <div className="mt-7 grid max-w-xl grid-cols-2 gap-3 text-[10px] text-[#8FA8C4] sm:grid-cols-4">
                <span>75+ Trading Instruments</span><span>Real-time Market Data</span><span>AI-Powered Insights</span><span>Multi-Broker Integration</span>
              </div>
            </div>
            <div id="platform-terminal"><Terminal /></div>
          </div>
        </div>
      </section>

      {/* Market ticker */}
      <section className="border-b border-[#0B3A63] bg-[#031225]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 px-4 sm:grid-cols-3 lg:grid-cols-6 lg:px-8">
          {markets.map(([symbol, price, change, positive]) => (
            <div key={symbol} className="border-r border-[#0B3A63] px-4 py-3.5 first:border-l">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#0B3A63] bg-[#061A32]"><BarChart3 className="h-3.5 w-3.5 text-[#00D9FF]" /></div>
                <div><p className="text-[9px] font-bold text-white">{symbol}</p><p className="font-mono text-[8px] text-[#8FA8C4]">{price}</p></div>
                <div className="ml-auto text-right"><p className={positive ? "text-[9px] font-bold text-[#00E5A8]" : "text-[9px] font-bold text-[#FF4565]"}>{change}</p><Sparkline positive={positive} /></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Capability strip */}
      <section className="border-b border-[#0B3A63] bg-[#020817]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
          {capabilities.map(([title, subtitle, Icon]) => (
            <div key={title} className="border-r border-[#0B3A63] px-3 py-5 first:border-l">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-[#0B4B78] bg-[#061A32] text-[#00D9FF] shadow-[0_0_18px_rgba(0,217,255,.08)]"><Icon className="h-4 w-4" /></div>
              <p className="text-[10px] font-bold text-white">{title}</p><p className="mt-1 text-[8px] text-[#58718D]">{subtitle}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Professional platform */}
      <section className="border-b border-[#0B3A63] bg-[#020817] py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionTitle eyebrow="Professional Trading Platform" title="A full-featured trading terminal." text="Advanced charting, order execution, portfolio management and real-time market intelligence in one professional workspace." right={<Link href="/features" className="inline-flex items-center gap-1 text-xs font-semibold text-[#00D9FF]">Explore Features <ChevronRight className="h-4 w-4" /></Link>} />
          <div className="mt-10 overflow-hidden rounded-2xl border border-[#0B4B78] bg-[#061A32] shadow-[0_30px_80px_rgba(0,0,0,.35)]">
            <div className="flex items-center gap-1 border-b border-[#0B3A63] bg-[#031225] px-4 py-3 text-[9px]">
              {["Forex", "Indices", "Commodities", "Crypto", "Stocks", "ETFs", "Bonds"].map((x, i) => <span key={x} className={i === 0 ? "rounded-md bg-gradient-to-r from-[#168BFF] to-[#6435E9] px-3 py-1.5 font-bold text-white" : "px-3 py-1.5 text-[#8FA8C4]"}>{x}</span>)}
            </div>
            <div className="grid min-h-[470px] grid-cols-[150px_1fr] lg:grid-cols-[170px_1fr_165px]">
              <aside className="border-r border-[#0B3A63] bg-[#031225] p-3">
                <div className="flex items-center justify-between border-b border-[#0B3A63] pb-3"><span className="text-[9px] font-bold text-white">Watchlist</span><Activity className="h-3 w-3 text-[#00D9FF]" /></div>
                <div className="mt-3 space-y-2">{[...markets, ["AAPL", "178.42", "+1.26%", true], ["TSLA", "248.36", "+2.14%", true]].map(([s,p,c,up]) => <div key={s} className="rounded-md px-2 py-2 hover:bg-[#061A32]"><div className="flex justify-between text-[9px] font-semibold text-white"><span>{s}</span><span className={up ? "text-[#00E5A8]" : "text-[#FF4565]"}>{c}</span></div><span className="font-mono text-[8px] text-[#58718D]">{p}</span></div>)}</div>
              </aside>
              <div className="relative bg-[#061A32] p-4">
                <div className="flex items-center justify-between"><div><span className="text-xs font-bold text-white">EURUSD</span><span className="ml-2 text-[9px] text-[#FF4565]">-0.62%</span></div><div className="flex gap-3 text-[8px] text-[#58718D]"><span className="text-[#00D9FF]">1m</span><span>5m</span><span>15m</span><span>30m</span><span>1H</span><span>4H</span><span>1D</span><span>Indicators</span></div></div>
                <div className="mt-3 h-[300px] rounded-xl border border-[#0B3A63] bg-[#020817] p-3">
                  <div className="relative h-full overflow-hidden rounded-lg" style={{ backgroundImage: "linear-gradient(#0B3A63 1px, transparent 1px), linear-gradient(90deg, #0B3A63 1px, transparent 1px)", backgroundSize: "40px 40px" }}>
                    <svg viewBox="0 0 760 280" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                      <path d="M0 65 L35 85 L65 72 L95 105 L125 92 L155 125 L185 110 L215 145 L245 130 L275 165 L305 148 L335 180 L365 160 L395 198 L425 178 L455 215 L485 192 L515 224 L545 206 L575 236 L605 210 L635 230 L665 192 L695 208 L730 178 L760 188" fill="none" stroke="#00D9FF" strokeWidth="2" />
                      <path d="M0 90 L35 100 L65 92 L95 115 L125 105 L155 140 L185 125 L215 155 L245 145 L275 172 L305 160 L335 190 L365 175 L395 205 L425 188 L455 220 L485 202 L515 232 L545 218 L575 242 L605 220 L635 242 L665 205 L695 220 L730 192 L760 202" fill="none" stroke="#8B5CF6" strokeWidth="1.5" />
                    </svg>
                    <div className="absolute right-3 top-3 rounded border border-[#FF4565]/30 bg-[#FF4565]/10 px-2 py-1 text-[8px] text-[#FF4565]">1.11848</div>
                    <div className="absolute bottom-3 left-3 right-3 grid grid-cols-2 gap-2">
                      <div className="h-12 rounded border border-[#0B3A63] bg-[#031225]/90"><div className="mt-2 h-1 bg-[#00D9FF]/70" /></div>
                      <div className="h-12 rounded border border-[#0B3A63] bg-[#031225]/90"><div className="mt-2 h-1 w-2/3 bg-[#8B5CF6]/70" /></div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded border border-[#0B3A63] bg-[#031225] p-2"><span className="text-[8px] text-[#58718D]">RSI (14)</span><p className="text-[10px] font-bold text-[#00D9FF]">42.36</p></div><div className="rounded border border-[#0B3A63] bg-[#031225] p-2"><span className="text-[8px] text-[#58718D]">MACD</span><p className="text-[10px] font-bold text-[#FF4565]">-0.00028</p></div><div className="rounded border border-[#0B3A63] bg-[#031225] p-2"><span className="text-[8px] text-[#58718D]">Volume</span><p className="text-[10px] font-bold text-white">82%</p></div></div>
              </div>
              <aside className="hidden border-l border-[#0B3A63] bg-[#031225] p-3 lg:block">
                <div className="flex items-center justify-between"><span className="text-xs font-bold text-white">Trade</span><span className="text-[8px] text-[#58718D]">DOM</span></div>
                <p className="mt-5 text-[9px] text-[#58718D]">EURUSD / Euro US Dollar</p><p className="mt-1 text-xl font-bold text-[#00D9FF]">1.11848</p><p className="text-[9px] text-[#FF4565]">-0.62%</p>
                <div className="mt-4 grid grid-cols-2 gap-1 rounded-md border border-[#0B3A63] p-1 text-[8px]"><span className="rounded bg-[#168BFF] py-1 text-center font-bold text-white">Market</span><span className="py-1 text-center text-[#8FA8C4]">Limit</span></div>
                <div className="mt-4 space-y-2"><div className="flex justify-between text-[8px]"><span className="text-[#58718D]">Quantity</span><span className="text-white">0.01</span></div><div className="flex justify-between text-[8px]"><span className="text-[#58718D]">Stop Loss</span><span className="text-white">1.11700</span></div><div className="flex justify-between text-[8px]"><span className="text-[#58718D]">Take Profit</span><span className="text-white">1.12000</span></div></div>
                <div className="mt-4 grid grid-cols-2 gap-2"><button className="rounded bg-[#00E5A8] py-2 text-[9px] font-bold text-[#02120F]">Buy</button><button className="rounded bg-[#FF4565] py-2 text-[9px] font-bold text-white">Sell</button></div>
                <p className="mt-3 text-center text-[8px] text-[#58718D]">Margin: $11.85 · Leverage: 1:100</p>
              </aside>
            </div>
          </div>
        </div>
      </section>

      {/* Asset classes */}
      <section className="border-b border-[#0B3A63] bg-[#020817] py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionTitle eyebrow="Global Markets" title="Trade across global markets" text="One platform. Multiple asset classes. Global opportunities." right={<Link href="/markets" className="text-xs font-semibold text-[#8B5CF6]">View All Markets <ArrowRight className="ml-1 inline h-3 w-3" /></Link>} />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {assetClasses.map(([name, sub, gradient]) => <div key={name} className="group rounded-xl border border-[#0B3A63] bg-[#061A32] p-4 transition hover:-translate-y-0.5 hover:border-[#168BFF]/50"><div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} shadow-lg`}><Globe2 className="h-4 w-4 text-white" /></div><p className="text-xs font-bold text-white">{name}</p><p className="mt-1 text-[9px] text-[#58718D]">{sub}</p><Sparkline positive /></div>)}
          </div>
        </div>
      </section>

      {/* AI intelligence + opportunities */}
      <section className="border-b border-[#0B3A63] bg-[#031225] py-16">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 lg:grid-cols-2 lg:px-8">
          <div className="rounded-2xl border border-[#0B3A63] bg-[#061A32] p-6">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#168BFF] to-[#7C3AED]"><Bot className="h-5 w-5 text-white" /></div><div><p className="text-xs font-bold text-white">AI Market Intelligence</p><p className="text-[9px] text-[#58718D]">Real-time analysis, sentiment and opportunities powered by AI.</p></div></div>
            <div className="mt-7 flex items-center gap-8"><div className="flex h-36 w-36 items-center justify-center rounded-full border-[12px] border-[#168BFF]/30 border-t-[#00D9FF] border-r-[#168BFF] shadow-[0_0_35px_rgba(0,217,255,.14)]"><div className="text-center"><p className="text-3xl font-bold text-white">72</p><p className="text-[9px] font-semibold text-[#00D9FF]">BULLISH</p></div></div><div className="flex-1 space-y-4">{[["Technical","78"],["Fundamental","65"],["News","70"],["Social","60"]].map(([x,v]) => <div key={x}><div className="mb-1 flex justify-between text-[9px]"><span className="text-[#8FA8C4]">{x}</span><span className="text-white">{v}</span></div><div className="h-1.5 rounded-full bg-[#0B3A63]"><div className="h-1.5 rounded-full bg-gradient-to-r from-[#168BFF] to-[#00D9FF]" style={{width: v+"%"}} /></div></div>)}</div></div>
          </div>
          <div className="rounded-2xl border border-[#0B3A63] bg-[#061A32] p-6">
            <div className="flex items-center justify-between"><div><p className="text-xs font-bold text-white">Top Market Opportunities</p><p className="mt-1 text-[9px] text-[#58718D]">AI-ranked opportunities across markets.</p></div><Link href="/markets" className="text-[9px] font-semibold text-[#8B5CF6]">View All →</Link></div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["EURUSD","82%","Bullish"],["XAUUSD","76%","Bullish"],["NAS100","84%","Resistance test"],["BTCUSD","79%","Momentum expansion"]].map(([s,v,label]) => <div key={s} className="rounded-xl border border-[#0B3A63] bg-[#031225] p-3"><div className="flex items-center justify-between"><span className="text-[9px] font-bold text-white">{s}</span><TrendingUp className="h-3 w-3 text-[#00E5A8]" /></div><p className="mt-5 text-xl font-bold text-[#00D9FF]">{v}</p><p className="mt-1 text-[8px] text-[#58718D]">{label}</p><Sparkline positive /></div>)}</div>
          </div>
        </div>
      </section>

      {/* Brokers + copy trading */}
      <section className="border-b border-[#0B3A63] bg-[#020817] py-16">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 lg:grid-cols-2 lg:px-8">
          <div className="rounded-2xl border border-[#0B3A63] bg-[#061A32] p-6">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#031225] text-[#00D9FF]"><BriefcaseBusiness className="h-5 w-5" /></div><div><p className="text-xs font-bold text-white">Connect Your Broker</p><p className="text-[9px] text-[#58718D]">Trade directly through your preferred broker.</p></div></div>
            <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">{brokers.map((b) => <div key={b} className="rounded-lg border border-[#0B3A63] bg-[#031225] px-2 py-3 text-center text-[8px] text-[#8FA8C4]"><span className="text-[#00D9FF]">●</span> {b}</div>)}</div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-[#0B3A63] bg-[#061A32] p-6">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#7C3AED]/10 blur-3xl" />
            <div className="relative flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#168BFF] to-[#7C3AED]"><Users className="h-5 w-5 text-white" /></div><div><p className="text-xs font-bold text-white">Copy Trading (Copier) <span className="ml-1 rounded bg-[#00E5A8]/15 px-1.5 py-0.5 text-[7px] text-[#00E5A8]">NEW</span></p><p className="text-[9px] text-[#58718D]">Follow top traders or share your own strategy.</p></div></div>
            <div className="relative mt-8 grid grid-cols-3 gap-4 text-center"><div><p className="text-xl font-bold text-[#00D9FF]">2,500+</p><p className="text-[8px] text-[#58718D]">Strategy Providers</p></div><div><p className="text-xl font-bold text-white">50,000+</p><p className="text-[8px] text-[#58718D]">Active Followers</p></div><div><p className="text-xl font-bold text-[#00E5A8]">Real-time</p><p className="text-[8px] text-[#58718D]">Performance Tracking</p></div></div>
            <Link href="/features" className="relative mt-6 inline-flex rounded-lg bg-gradient-to-r from-[#168BFF] to-[#7C3AED] px-4 py-2 text-[9px] font-bold text-white">Explore Copier <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </div>
        </div>
      </section>

      {/* Why RMSM */}
      <section className="border-b border-[#0B3A63] bg-[#031225] py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionTitle eyebrow="Why RMSM" title="Why RMSM is the best trading platform?" text="Institutional-grade infrastructure, advanced intelligence and a unified trading workspace." />
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[["Institutional-Grade Infrastructure","Low latency, high uptime", BriefcaseBusiness],["Unified Multi-Broker Support","Connect and trade across multiple brokers", Layers3],["Advanced AI Intelligence","Make data-driven decisions with powerful AI tools", Sparkles],["All-in-One Workspace","Chart, trading, analytics, copier and risk management", ShieldCheck]].map(([t,d,I]) => <div key={t} className="rounded-xl border border-[#0B3A63] bg-[#061A32] p-5"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#031225] text-[#00D9FF]"><I className="h-4 w-4" /></div><p className="mt-4 text-xs font-bold text-white">{t}</p><p className="mt-2 text-[9px] leading-4 text-[#58718D]">{d}</p></div>)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-[#020817] py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_50%,rgba(22,139,255,.18),transparent_35%),radial-gradient(circle_at_25%_50%,rgba(124,58,237,.14),transparent_35%)]" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-[#0B4B78] bg-[#061A32] px-6 py-10 shadow-[0_0_70px_rgba(22,139,255,.1)] sm:px-10">
            <div className="max-w-2xl"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#00D9FF]">RMSM Markets</p><h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Ready to experience professional trading?</h2><p className="mt-3 text-sm leading-6 text-[#8FA8C4]">Join traders using RMSM for smarter analysis, better trades and consistent results.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/contact" className="inline-flex items-center rounded-lg bg-gradient-to-r from-[#168BFF] to-[#7C3AED] px-5 py-3 text-xs font-bold text-white">Start Free Trial <ArrowRight className="ml-2 h-4 w-4" /></Link><Link href="#platform-terminal" className="inline-flex items-center gap-2 rounded-lg border border-[#0B4B78] px-5 py-3 text-xs font-bold text-white"><Play className="h-4 w-4 text-[#00D9FF]" /> Watch Platform Tour</Link></div></div>
          </div>
        </div>
      </section>
    </main>
  );
}
