"use client";

import {
  BarChart3,
  CandlestickChart,
  MoreHorizontal,
  ArrowLeftRight,
  ClipboardList,
} from "lucide-react";

import { cn } from "@rmsm/ui";

export type TradingMobileTab = "markets" | "chart" | "trade" | "orders" | "more";

interface TradingMobileShellProps {
  activeTab: TradingMobileTab;
  onTabChange: (tab: TradingMobileTab) => void;
  children: React.ReactNode;
}

const tabs: Array<{
  id: TradingMobileTab;
  label: string;
  icon: typeof BarChart3;
}> = [
  {
    id: "markets",
    label: "Markets",
    icon: BarChart3,
  },
  {
    id: "chart",
    label: "Chart",
    icon: CandlestickChart,
  },
  {
    id: "trade",
    label: "Trade",
    icon: ArrowLeftRight,
  },
  {
    id: "orders",
    label: "Orders",
    icon: ClipboardList,
  },
  {
    id: "more",
    label: "More",
    icon: MoreHorizontal,
  },
];

export function TradingMobileShell({ activeTab, onTabChange, children }: TradingMobileShellProps) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-transparent">
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>

      <nav
        aria-label="Trading navigation"
        className="bg-[#07111f]/88 shrink-0 border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.24)] backdrop-blur-2xl"
      >
        <div className="grid h-[68px] grid-cols-5 px-1 pb-[env(safe-area-inset-bottom)]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "mx-0.5 my-1 flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl",
                  "border border-transparent text-[10px] font-medium transition-all duration-200",
                  "active:scale-[0.97]",
                  active
                    ? "border-cyan-300/20 bg-cyan-400/10 text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_20px_rgba(34,211,238,0.08)]"
                    : "text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-100",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all",
                    active && "text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.45)]",
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
