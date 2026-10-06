"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, ChevronDown, Play, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { buildMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/public/json-ld";

export const metadata = buildMetadata({
  title: "Platform",
  path: "/platform",
  description:
    "RMSM is an AI-powered investment and trading platform for modern markets.",
  keywords: ["trading platform", "AI trading platform", "market intelligence", "RMSM"],
});

const markets = [
  ["EURUSD", "1.11848", "-0.62%", false],
  ["GBPUSD", "1.27186", "+0.14%", true],
  ["XAUUSD", "2,354.60", "+0.53%", true],
  ["NAS100", "20,124.50", "+0.73%", true],
  ["BTCUSD", "61,420.10", "+1.57%", true],
  ["USOIL", "72.14", "-0.48%", false],
] as const;

const features = [
  ["Advanced Charts", "Institutional-grade charting"],
  ["AI Insights", "Actionable market intelligence"],
  ["Multi-Asset Trading", "One workspace, every market"],
  ["Broker Integration", "Connect your execution stack"],
  ["Copy Trading", "Follow proven strategies"],
  ["Portfolio Management", "Manage exposure centrally"],
  ["Risk Management", "Control risk in real time"],
  ["All-in-One Platform", "One operating layer"],
];

function Sparkline({ positive = true }: { positive?: boolean }) {
  return (
    <svg viewBox="0 0 90 30" className="h-7 w-[90px]" aria-hidden="true">
      <path
        d={positive ? "M2 24 L12 21 L22 23 L32 15 L42 18 L52 10 L62 13 L72 6 L88 8" : "M2 7 L12 10 L22 8 L32 16 L42 12 L52 20 L62 16 L72 23 L88 21"}
        fill="none"
        stroke={positive ? "#00D9FF" : "#FF4565"}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MarketTicker() {
  return (
    <section className="border-y border-[#0B3A63] bg-[#031225]">
      <div className="mx-auto max-w-7xl overflow-x-auto px-4 lg:px-8">
        <div className="flex min-w-max">
          {markets.map(([symbol, price, change, positive]) => (
            <div key={symbol} className="flex min-w-[190px] items-center gap-4 border-r border-[#0B3A63] px-5 py-4 first:border-l">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#0B3A63] bg-[#061A32]">
                <BarChart3 className="h-4 w-4 text-[#00D9FF]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{symbol}</p>
                <p className="mt-0.5 font-mono text-xs text-[#8FA8C4]">{price}</p>
              </div>
              <div className="ml-auto text-right">
                <p className={positive ? "text-xs font-semibold text-[#00E5A8]" : "text-xs font-semibold text-[#FF4565]"}>{change}</p>
                <Sparkline positive={positive} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function PlatformPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020817] text-[#F8FAFC]">
      <JsonLd
        data={webPageJsonLd({
          title: "Platform",
          description: "RMSM is an AI-powered investment and trading platform for modern markets.",
          path: "/platform",
        })}
      />

      {/* PHASE 1 — reference-matched hero */}
      <section className="relative isolate border-b border-[#0B3A63] bg-[#020817]">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-[8%] top-[-18%] h-[520px] w-[520px] rounded-full bg-[#168BFF]/10 blur-[130px]" />
          <div className="absolute right-[4%] top-[12%] h-[420px] w-[420px] rounded-full bg-[#7C3AED]/10 blur-[120px]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00D9FF]/40 to-transparent" />
        </div>

        <div className="mx-auto max-w-7xl px-6 pb-14 pt-16 lg:px-8 lg:pb-20 lg:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0B3A63] bg-[#061A32]/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8FA8C4]">
                <Sparkles className="h-3.5 w-3.5 text-[#00D9FF]" />
                RMSM Markets
              </div>

              <h1 className="mt-6 text-5xl font-bold leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
                Global Market Intelligence
                <span className="block bg-gradient-to-r from-[#00D9FF] via-[#168BFF] to-[#8B5CF6] bg-clip-text text-transparent">
                  for Modern Traders
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-[#8FA8C4] sm:text-lg">
                Trade Forex, Indices, Commodities, Crypto, Stocks and more with
                advanced charts, AI insights, multi-asset coverage and
                institutional-grade trading tools — all in one powerful platform.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#168BFF] to-[#7C3AED] px-5 py-3 text-sm font-semibold text-white shadow-[0_0_32px_rgba(22,139,255,0.22)] transition hover:shadow-[0_0_42px_rgba(22,139,255,0.35)]"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="#platform-terminal"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#0B3A63] bg-[#061A32]/80 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#168BFF]/60 hover:bg-[#081F3A]"
                >
                  <Play className="h-4 w-4 text-[#00D9FF]" />
                  Watch Platform Tour
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-5 text-xs text-[#6F8BA8]">
                <span>Real-time markets</span>
                <span>AI-powered intelligence</span>
                <span>Multi-asset execution</span>
              </div>
            </div>

            {/* Reference-style trading terminal */}
            <div id="platform-terminal" className="relative">
              <div className="absolute -inset-8 rounded-[40px] bg-gradient-to-br from-[#168BFF]/10 via-transparent to-[#7C3AED]/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl border border-[#0B3A63] bg-[#061A32] shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
                <div className="flex items-center justify-between border-b border-[#0B3A63] bg-[#031225] px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#00E5A8] shadow-[0_0_10px_#00E5A8]" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8FA8C4]">RMSM Trading Terminal</span>
                  </div>
                  <span className="rounded-md border border-[#00D9FF]/20 bg-[#00D9FF]/5 px-2 py-1 text-[9px] font-semibold text-[#00D9FF]">LIVE</span>
                </div>

                <div className="grid min-h-[390px] grid-cols-[145px_1fr_145px]">
                  <aside className="border-r border-[#0B3A63] bg-[#031225]/70 p-3">
                    <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#58718D]">Watchlist</p>
                    <div className="space-y-1.5">
                      {markets.map(([symbol, price, change, positive]) => (
                        <div key={symbol} className="rounded-lg border border-transparent px-2 py-2 hover:border-[#0B3A63] hover:bg-[#061A32]">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-white">{symbol}</span>
                            {positive ? <TrendingUp className="h-3 w-3 text-[#00E5A8]" /> : <TrendingDown className="h-3 w-3 text-[#FF4565]" />}
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="font-mono text-[9px] text-[#8FA8C4]">{price}</span>
                            <span className={positive ? "text-[8px] text-[#00E5A8]" : "text-[8px] text-[#FF4565]"}>{change}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </aside>

                  <div className="relative overflow-hidden bg-[#061A32] p-4">
                    <div className="flex items-center justify-between border-b border-[#0B3A63] pb-3">
                      <div>
                        <span className="text-[11px] font-semibold text-white">EURUSD</span>
                        <span className="ml-2 text-[9px] text-[#00E5A8]">+0.42%</span>
                      </div>
                      <div className="flex gap-3 text-[8px] text-[#58718D]">
                        <span>1m</span><span className="text-[#00D9FF]">5m</span><span>15m</span><span>1H</span><span>4H</span><span>1D</span>
                      </div>
                    </div>

                    <div className="relative mt-4 h-[245px] overflow-hidden rounded-xl border border-[#0B3A63] bg-[#031225]">
                      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(#0B3A63 1px, transparent 1px), linear-gradient(90deg, #0B3A63 1px, transparent 1px)", backgroundSize: "42px 42px" }} />
                      <svg viewBox="0 0 520 245" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                        <defs>
                          <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#168BFF" stopOpacity=".22" />
                            <stop offset="100%" stopColor="#168BFF" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0 185 C35 165, 45 180, 75 155 S115 175, 145 135 S185 150, 220 118 S260 130, 290 95 S335 115, 365 72 S405 92, 440 50 S480 75, 520 30 L520 245 L0 245 Z" fill="url(#area)" />
                        <path d="M0 185 C35 165, 45 180, 75 155 S115 175, 145 135 S185 150, 220 118 S260 130, 290 95 S335 115, 365 72 S405 92, 440 50 S480 75, 520 30" fill="none" stroke="#00D9FF" strokeWidth="2.5" />
                      </svg>
                      <div className="absolute right-3 top-3 rounded-md border border-[#00E5A8]/20 bg-[#00E5A8]/10 px-2 py-1 text-[9px] font-semibold text-[#00E5A8]">Bullish</div>
                      <div className="absolute bottom-3 left-3 text-[8px] text-[#58718D]">AI signal · Technical momentum rising</div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {["RSI 68.4", "MACD +0.004", "Vol 82%"].map((x) => (
                        <div key={x} className="rounded-lg border border-[#0B3A63] bg-[#031225] px-2 py-2 text-center text-[8px] text-[#8FA8C4]">{x}</div>
                      ))}
                    </div>
                  </div>

                  <aside className="border-l border-[#0B3A63] bg-[#031225]/70 p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#58718D]">Trade</p>
                    <div className="mt-4 rounded-xl border border-[#0B3A63] bg-[#061A32] p-3">
                      <p className="text-[9px] text-[#58718D]">EURUSD</p>
                      <p className="mt-1 font-mono text-lg font-semibold text-white">1.11848</p>
                      <div className="mt-3 grid grid-cols-2 gap-1.5">
                        <button className="rounded-md bg-[#00E5A8]/10 py-2 text-[9px] font-semibold text-[#00E5A8]">BUY</button>
                        <button className="rounded-md bg-[#FF4565]/10 py-2 text-[9px] font-semibold text-[#FF4565]">SELL</button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-[8px]"><span className="text-[#58718D]">Risk</span><span className="text-[#8FA8C4]">0.50%</span></div>
                      <div className="h-1 rounded-full bg-[#0B3A63]"><div className="h-1 w-1/2 rounded-full bg-gradient-to-r from-[#00D9FF] to-[#7C3AED]" /></div>
                      <div className="flex justify-between text-[8px]"><span className="text-[#58718D]">Margin</span><span className="text-[#8FA8C4]">24.8%</span></div>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketTicker />

      {/* Reference-style compact capability strip */}
      <section className="border-b border-[#0B3A63] bg-[#020817]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 px-4 sm:grid-cols-4 lg:grid-cols-8 lg:px-8">
          {features.map(([title, subtitle]) => (
            <div key={title} className="group border-r border-[#0B3A63] px-4 py-6 first:border-l hover:bg-[#061A32]/70">
              <div className="mb-3 h-1 w-8 rounded-full bg-gradient-to-r from-[#00D9FF] to-[#7C3AED] opacity-60 transition group-hover:w-12 group-hover:opacity-100" />
              <h3 className="text-xs font-semibold text-white">{title}</h3>
              <p className="mt-1 text-[10px] leading-4 text-[#58718D]">{subtitle}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Placeholder boundary for phase 2 — deliberately dark and reference-consistent */}
      <section className="bg-[#020817] py-24">
        <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00D9FF]">Professional Trading Platform</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">One platform. Every trading decision.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#8FA8C4]">
            The core terminal, AI intelligence, portfolio tools and institutional workflows will continue below in the same reference-matched visual system.
          </p>
        </div>
      </section>
    </main>
  );
}
