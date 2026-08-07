"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCommandPaletteStore } from "@/lib/command-palette-store";
import {
  LayoutDashboard,
  TrendingUp,
  BookMarked,
  LineChart,
  Target,
  Gavel,
  ListOrdered,
  Wallet,
  BarChart3,
  Bell,
  UserCircle,
  Settings,
  ShieldCheck,
  Search,
} from "lucide-react";
import { Dialog, DialogContent, Input } from "@rmsm/ui";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useInstruments } from "@/features/market/hooks/use-market-data";

interface StaticCommand {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  keywords?: string;
}

const STATIC_COMMANDS: StaticCommand[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Market Watch", href: "/market", icon: TrendingUp },
  { label: "Watchlists", href: "/watchlists", icon: BookMarked },
  { label: "Strategies", href: "/strategies", icon: LineChart, keywords: "strategy center builder" },
  { label: "Opportunities", href: "/opportunities", icon: Target, keywords: "opportunity feed" },
  { label: "Decisions", href: "/decisions", icon: Gavel, keywords: "decision center" },
  { label: "Orders", href: "/orders", icon: ListOrdered, keywords: "order management" },
  { label: "Portfolio", href: "/portfolio", icon: Wallet, keywords: "positions holdings" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, keywords: "performance charts" },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Profile", href: "/settings/profile", icon: UserCircle },
  { label: "Preferences", href: "/settings/preferences", icon: Settings },
  { label: "Security", href: "/settings/security", icon: ShieldCheck, keywords: "2fa password sessions" },
];

/**
 * Cmd/Ctrl+K opens this from anywhere in the authenticated app (wired in
 * the protected layout). Every result navigates to a real route — static
 * pages match by label/keyword, and typing 3+ characters also live-
 * searches real instruments via the existing market-data endpoint, the
 * same one Market Watch itself uses.
 */
export function CommandPalette() {
  const router = useRouter();
  // Open/closed state now lives in a shared store instead of local
  // `useState` — this is the only behavioral change from before. It lets
  // `Topnav`'s new visible Search button open the same palette the
  // Ctrl/Cmd+K shortcut below already did; the shortcut itself, the
  // Escape-to-close behavior, and every result/query behavior below are
  // unchanged.
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        useCommandPaletteStore.getState().toggle();
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const instrumentsQuery = useInstruments({ query: debouncedQuery, pageSize: 5, enabled: debouncedQuery.length >= 2 });
  const instrumentResults = debouncedQuery.length >= 2 ? (instrumentsQuery.data?.data ?? []) : [];

  const matchedCommands = STATIC_COMMANDS.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.label.toLowerCase().includes(q) || c.keywords?.toLowerCase().includes(q);
  });

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, symbols…"
            className="border-0 shadow-none focus-visible:ring-0"
            aria-label="Command palette search"
          />
          <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {matchedCommands.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Pages</p>
              {matchedCommands.map((c) => (
                <button
                  key={c.href}
                  type="button"
                  onClick={() => go(c.href)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                >
                  <c.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {instrumentResults.length > 0 && (
            <div>
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Instruments</p>
              {instrumentResults.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => go(`/market/${i.id}`)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="font-medium">{i.symbol}</span>
                  <span className="text-xs text-muted-foreground">{i.name}</span>
                </button>
              ))}
            </div>
          )}

          {matchedCommands.length === 0 && instrumentResults.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">No results.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
