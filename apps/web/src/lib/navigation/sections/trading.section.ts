import { Wallet, BarChart3 } from "lucide-react";
import type { NavigationItem } from "../types";

export const TRADING_NAV_SECTION: NavigationItem[] = [
  { id: "portfolio", label: "Portfolio", href: "/portfolio", icon: Wallet },
  { id: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3 },
];
