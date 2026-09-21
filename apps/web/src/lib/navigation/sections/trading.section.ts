import { BookMarked, LineChart, Target, Gavel, ListOrdered, Wallet } from "lucide-react";
import type { NavigationItem } from "../types";

/** Trading domain — core trading functionality. */
export const TRADING_NAV_SECTION: NavigationItem[] = [
  { id: "watchlists", label: "Watchlists", href: "/watchlists", icon: BookMarked },
  { id: "portfolio", label: "Portfolio", href: "/portfolio", icon: Wallet },
  { id: "strategies", label: "Strategies", href: "/strategies", icon: LineChart },
  { id: "opportunities", label: "Opportunities", href: "/opportunities", icon: Target },
  { id: "decisions", label: "Decisions", href: "/decisions", icon: Gavel },
  { id: "orders", label: "Orders", href: "/orders", icon: ListOrdered },
];
