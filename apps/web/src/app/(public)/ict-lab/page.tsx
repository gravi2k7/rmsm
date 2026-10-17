"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Crosshair,
  Layers3,
  ShieldCheck,
  Target,
  Waves,
} from "lucide-react";

type Phase = {
  id: string;
  number: string;
  title: string;
  summary: string;
  checks: string[];
};

const phases: Phase[] = [
  {
    id: "context",
    number: "01",
    title: "Higher-timeframe context",
    summary: "Define directional context and the likely draw on liquidity before looking for an entry.",
    checks: [
      "Mark the daily and 4H dealing range",
      "Identify premium or discount relative to the range",
      "Mark previous-day high and low",
      "Set a clear bullish, bearish, or neutral bias",
    ],
  },
  {
    id: "liquidity",
    number: "02",
    title: "Liquidity map",
    summary: "Map external and internal liquidity that price could seek or raid.",
    checks: [
      "Mark overnight and session highs/lows",
      "Mark equal highs and equal lows",
      "Identify buy-side and sell-side liquidity",
      "Choose the liquidity level relevant to the current session",
    ],
  },
  {
    id: "timing",
    number: "03",
    title: "Time and setup",
    summary: "Wait for price to reach a meaningful level during a defined trading window.",
    checks: [
      "Confirm the selected session window",
      "Wait for a liquidity sweep or clear rejection",
      "Check scheduled high-impact news before entry",
      "Avoid chasing price after an extended move",
    ],
  },
  {
    id: "confirmation",
    number: "04",
    title: "Confirmation and entry",
    summary: "Require evidence of a shift in order flow before selecting an entry zone.",
    checks: [
      "Confirm displacement away from the swept level",
      "Confirm market structure shift (MSS)",
      "Mark the FVG or IFVG used for entry",
      "Define entry trigger and invalidation before placing an order",
    ],
  },
  {
    id: "risk",
    number: "05",
    title: "Risk and trade management",
    summary: "Calculate risk first; targets must be based on structure, not a promised outcome.",
    checks: [
      "Set stop beyond the setup invalidation point",
      "Calculate position size from the fixed risk limit",
      "Set a logical target at opposing liquidity or a planned R multiple",
      "Record the trade and follow the daily loss limit",
    ],
  },
];

const models = [
  {
    name: "Liquidity Sweep + MSS + FVG",
    type: "Core model",
    description: "A liquidity raid followed by displacement and a structure shift; use a retracement into a defined FVG as the entry area.",
    requirements: ["Liquidity target identified", "Sweep confirmed", "Displacement + MSS", "FVG entry and invalidation"],
  },
  {
    name: "IFVG Reversal",
    type: "Advanced model",
    description: "A previously respected fair value gap fails and is reclaimed from the opposite side. Require clear context and a confirmed close through the gap.",
    requirements: ["Original FVG marked", "Gap invalidation confirmed", "Opposite-side reclaim", "Target and stop defined"],
  },
  {
    name: "OTE Retracement",
    type: "Confluence model",
    description: "Use a defined impulse leg and Fibonacci retracement zone as confluence, not as a standalone signal.",
    requirements: ["Impulse leg selected consistently", "Premium/discount context", "Retracement zone overlaps POI", "Independent entry confirmation"],
  },
  {
    name: "Silver Bullet / Kill Zone",
    type: "Time-based model",
    description: "A time-window framework that still requires a valid liquidity narrative and price-action confirmation.",
    requirements: ["Session window verified in exchange time", "Liquidity objective identified", "Displacement and FVG/IFVG", "No entry without full confirmation"],
  },
];

const sessionWindows = [
  { name: "London", note: "Use a timezone-aware session setting", detail: "Typical ICT window: 02:00–05:00 New York time" },
  { name: "New York AM", note: "Primary US index focus", detail: "Typical ICT window: 08:30–11:00 New York time" },
  { name: "New York PM", note: "Optional; apply only if your tested model uses it", detail: "Define and validate your own window" },
];

export default function IctStrategyLabPage() {
  const [instrument, setInstrument] = useState("MNQ");
  const [timeframe, setTimeframe] = useState("1m");
  const [phaseId, setPhaseId] = useState("context");
  const [modelName, setModelName] = useState(models[0].name);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [session, setSession] = useState("New York AM");
  const [bias, setBias] = useState("Neutral");

  const phase = phases.find((item) => item.id === phaseId) ?? phases[0];
  const model = models.find((item) => item.name === modelName) ?? models[0];
  const progress = useMemo(() => {
    const keys = phases.flatMap((item) => item.checks.map((check) => `${item.id}:${check}`));
    const complete = keys.filter((key) => checked[key]).length;
    return { complete, total: keys.length, percent: Math.round((complete / keys.length) * 100) };
  }, [checked]);

  function toggleCheck(key: string) {
    setChecked((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <main className="min-h-screen bg-[#050B16] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-2 text-xs text-[#8293AE]">
          <span>RMSM</span><ChevronRight className="h-3 w-3" /><span>Strategy Intelligence</span><ChevronRight className="h-3 w-3" /><span className="text-[#42D9F5]">ICT Strategy Lab</span>
        </div>

        <section className="relative overflow-hidden rounded-3xl border border-[#1B3654] bg-gradient-to-br from-[#0B1E35] via-[#091629] to-[#10112B] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#168BFF]/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#36D7F2]/25 bg-[#36D7F2]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#57DDF4]">
                <Activity className="h-3.5 w-3.5" /> Strategy workspace · Educational / research mode
              </div>
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">ICT Strategy Lab</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#A6B8D0] sm:text-base">
                Structure the complete ICT workflow—from higher-timeframe context and liquidity mapping to entry confirmation, invalidation, and trade review. No live market feed or execution is connected in this prototype.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-[#9BAFC8]"><span>Checklist completion</span><span>{progress.complete}/{progress.total}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#168BFF] to-[#38DDF2] transition-all" style={{ width: `${progress.percent}%` }} /></div>
              <div className="mt-3 text-2xl font-semibold">{progress.percent}%</div>
              <p className="mt-1 text-xs text-[#8093AE]">Complete the rules before treating a setup as qualified.</p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#1B304B] bg-[#0A1424] p-4">
            <label className="text-xs text-[#8DA1BD]" htmlFor="instrument">Instrument</label>
            <select id="instrument" value={instrument} onChange={(event) => setInstrument(event.target.value)} className="mt-2 w-full rounded-lg border border-[#243B58] bg-[#07101E] px-3 py-2.5 text-sm outline-none focus:border-[#39D7F2]">
              <option value="MNQ">MNQ · Micro Nasdaq</option><option value="NQ">NQ · Nasdaq</option><option value="ES">ES · E-mini S&P 500</option><option value="MES">MES · Micro S&P 500</option><option value="EURUSD">EURUSD · Forex</option><option value="XAUUSD">XAUUSD · Gold</option>
            </select>
          </div>
          <div className="rounded-2xl border border-[#1B304B] bg-[#0A1424] p-4">
            <label className="text-xs text-[#8DA1BD]" htmlFor="timeframe">Execution timeframe</label>
            <select id="timeframe" value={timeframe} onChange={(event) => setTimeframe(event.target.value)} className="mt-2 w-full rounded-lg border border-[#243B58] bg-[#07101E] px-3 py-2.5 text-sm outline-none focus:border-[#39D7F2]">
              <option value="1m">1 minute</option><option value="2m">2 minutes</option><option value="3m">3 minutes</option><option value="5m">5 minutes</option><option value="15m">15 minutes</option>
            </select>
          </div>
          <div className="rounded-2xl border border-[#1B304B] bg-[#0A1424] p-4">
            <label className="text-xs text-[#8DA1BD]" htmlFor="session">Session template</label>
            <select id="session" value={session} onChange={(event) => setSession(event.target.value)} className="mt-2 w-full rounded-lg border border-[#243B58] bg-[#07101E] px-3 py-2.5 text-sm outline-none focus:border-[#39D7F2]">
              {sessionWindows.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </div>
          <div className="rounded-2xl border border-[#1B304B] bg-[#0A1424] p-4">
            <label className="text-xs text-[#8DA1BD]" htmlFor="bias">Working bias</label>
            <select id="bias" value={bias} onChange={(event) => setBias(event.target.value)} className="mt-2 w-full rounded-lg border border-[#243B58] bg-[#07101E] px-3 py-2.5 text-sm outline-none focus:border-[#39D7F2]">
              <option>Neutral</option><option>Bullish</option><option>Bearish</option>
            </select>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-2xl border border-[#1B304B] bg-[#0A1424] p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2"><Layers3 className="h-4 w-4 text-[#42D9F5]" /><h2 className="font-semibold">ICT workflow</h2></div>
            <div className="space-y-2">
              {phases.map((item) => {
                const active = item.id === phaseId;
                const done = item.checks.every((check) => checked[`${item.id}:${check}`]);
                return <button key={item.id} onClick={() => setPhaseId(item.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${active ? "border-[#39D7F2]/60 bg-[#12304A]" : "border-[#1B304B] bg-[#07101E] hover:border-[#31516F]"}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${done ? "bg-emerald-400/15 text-emerald-300" : active ? "bg-[#39D7F2]/15 text-[#54DFF4]" : "bg-white/5 text-[#7F92AD]"}`}>{done ? <Check className="h-4 w-4" /> : item.number}</span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{item.title}</span><span className="mt-1 block text-xs text-[#8195B0]">{item.checks.filter((check) => checked[`${item.id}:${check}`]).length}/{item.checks.length} rules completed</span></span>
                  <ChevronRight className="h-4 w-4 text-[#7186A2]" />
                </button>;
              })}
            </div>
            <div className="mt-5 rounded-xl border border-[#1B304B] bg-[#07101E] p-4">
              <div className="flex items-center gap-2 text-sm font-medium"><Clock3 className="h-4 w-4 text-[#42D9F5]" />Session reference</div>
              <p className="mt-2 text-sm text-white">{sessionWindows.find((item) => item.name === session)?.detail}</p>
              <p className="mt-1 text-xs leading-5 text-[#8296B1]">{sessionWindows.find((item) => item.name === session)?.note}. Confirm daylight-saving changes and exchange time before use.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#1B304B] bg-[#0A1424] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#42D9F5]">Phase {phase.number}</p><h2 className="mt-2 text-2xl font-bold">{phase.title}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#91A6C1]">{phase.summary}</p></div>
              <span className="rounded-lg border border-[#243B58] bg-[#07101E] px-3 py-2 text-xs text-[#9EB1C9]">{instrument} · {timeframe}</span>
            </div>
            <div className="mt-6 space-y-3">
              {phase.checks.map((check, index) => {
                const key = `${phase.id}:${check}`;
                return <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#1B304B] bg-[#07101E] p-4 hover:border-[#31516F]">
                  <input type="checkbox" checked={Boolean(checked[key])} onChange={() => toggleCheck(key)} className="mt-0.5 h-4 w-4 accent-cyan-400" />
                  <span className="flex-1 text-sm leading-6 text-[#D6E1EF]">{check}</span>
                  {checked[key] && <Check className="h-4 w-4 shrink-0 text-emerald-300" />}
                </label>;
              })}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {phases.map((item) => <button key={item.id} onClick={() => setPhaseId(item.id)} className={`rounded-lg px-3 py-2 text-xs font-medium ${phaseId === item.id ? "bg-[#39D7F2] text-[#03101D]" : "border border-[#243B58] text-[#9BAFC8] hover:bg-white/5"}`}>{item.number}</button>)}
              <button onClick={() => setPhaseId(phases[(phases.findIndex((item) => item.id === phaseId) + 1) % phases.length].id)} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-[#243B58] px-3 py-2 text-xs font-medium text-white hover:bg-white/5">Next phase <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#42D9F5]">Strategy library</p><h2 className="mt-2 text-2xl font-bold">ICT models and entry frameworks</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#91A6C1]">Choose a model to view its rule outline. These are configurable research templates, not verified signals or a claim that any model is profitable.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            {models.map((item) => <button key={item.name} onClick={() => setModelName(item.name)} className={`rounded-2xl border p-5 text-left transition ${modelName === item.name ? "border-[#39D7F2]/60 bg-[#0D2035]" : "border-[#1B304B] bg-[#0A1424] hover:border-[#31516F]"}`}>
              <div className="flex items-center justify-between gap-3"><span className="text-base font-semibold">{item.name}</span><span className="shrink-0 rounded-full border border-[#243B58] px-2.5 py-1 text-[10px] text-[#8FA6C2]">{item.type}</span></div>
              <p className="mt-3 text-sm leading-6 text-[#91A6C1]">{item.description}</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-[#42D9F5]">View rule outline <ArrowRight className="h-3.5 w-3.5" /></div>
            </button>)}
          </div>
          <div className="mt-4 rounded-2xl border border-[#244260] bg-[#0B1A2D] p-5">
            <div className="flex items-start gap-3"><Crosshair className="mt-0.5 h-5 w-5 shrink-0 text-[#42D9F5]" /><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{model.name}</h3><span className="text-xs text-[#8197B3]">{model.type}</span></div><p className="mt-2 text-sm leading-6 text-[#9CB0C9]">{model.description}</p><ul className="mt-4 grid gap-2 sm:grid-cols-2">{model.requirements.map((requirement) => <li key={requirement} className="flex items-center gap-2 text-sm text-[#D5E0EE]"><Check className="h-4 w-4 text-emerald-300" />{requirement}</li>)}</ul></div></div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#1B304B] bg-[#0A1424] p-5"><Waves className="h-5 w-5 text-[#42D9F5]" /><h3 className="mt-3 font-semibold">Core concepts</h3><p className="mt-2 text-sm leading-6 text-[#8FA5C0]">Liquidity, dealing ranges, premium/discount, displacement, MSS, FVG, IFVG, order blocks, breakers, mitigation, OTE, SMT divergence, and Power of Three.</p></div>
          <div className="rounded-2xl border border-[#1B304B] bg-[#0A1424] p-5"><Target className="h-5 w-5 text-[#42D9F5]" /><h3 className="mt-3 font-semibold">Targets and invalidation</h3><p className="mt-2 text-sm leading-6 text-[#8FA5C0]">Plan the opposing liquidity objective, define invalidation before entry, and record whether the actual price action satisfied each rule.</p></div>
          <div className="rounded-2xl border border-[#1B304B] bg-[#0A1424] p-5"><ShieldCheck className="h-5 w-5 text-[#42D9F5]" /><h3 className="mt-3 font-semibold">Risk discipline</h3><p className="mt-2 text-sm leading-6 text-[#8FA5C0]">Position size must follow stop distance and the chosen risk cap. Include commissions, slippage, and daily loss limits in any backtest.</p></div>
        </section>

        <section className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-5">
          <div className="flex gap-3"><BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" /><div><h2 className="font-semibold text-amber-100">Important implementation boundary</h2><p className="mt-2 text-sm leading-6 text-[#B7C0CF]">This first UI slice is a manual checklist and strategy reference. It does not yet calculate ICT signals from candles, access live market data, run historical backtests, or place trades. Those require separately specified data contracts and tested domain logic. Do not treat the selected bias or checklist as a trade recommendation.</p></div></div>
        </section>
      </div>
    </main>
  );
}
