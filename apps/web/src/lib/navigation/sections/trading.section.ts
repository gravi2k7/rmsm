import { TrendingUp, BookMarked, LineChart, Target, Gavel, ListOrdered, Wallet } from "lucide-react";
import type { NavigationItem } from "../types";

/** Trading domain — the existing core dashboard functionality. Order and
 * content are unchanged from the original flat `NAV_ITEMS` array. */
export const TRADING_NAV_SECTION: NavigationItem[] = [
  { id: "market", label: "Market Watch", href: "/market", icon: TrendingUp },
  { id: "watchlists", label: "Watchlists", href: "/watchlists", icon: BookMarked },
  { id: "strategies", label: "Strategies", href: "/strategies", icon: LineChart },
  { id: "opportunities", label: "Opportunities", href: "/opportunities", icon: Target },
  { id: "decisions", label: "Decisions", href: "/decisions", icon: Gavel },
  { id: "orders", label: "Orders", href: "/orders", icon: ListOrdered },
  { id: "portfolio", label: "Portfolio", href: "/portfolio", icon: Wallet },
];
