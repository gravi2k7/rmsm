import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, LineChart, ShieldCheck, TrendingUp, BookMarked, Target, Gavel, ListOrdered, Wallet, BarChart3, Bell } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** The permission that gates *seeing* this nav item — a UX convenience,
   * not a security boundary; every page it points to still checks its own
   * data access server-side regardless of what the sidebar shows. */
  permission?: string;
}

/** Phase 4C is now feature-complete across all planned batches. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Market Watch", href: "/market", icon: TrendingUp },
  { label: "Watchlists", href: "/watchlists", icon: BookMarked },
  { label: "Strategies", href: "/strategies", icon: LineChart },
  { label: "Opportunities", href: "/opportunities", icon: Target },
  { label: "Decisions", href: "/decisions", icon: Gavel },
  { label: "Orders", href: "/orders", icon: ListOrdered },
  { label: "Portfolio", href: "/portfolio", icon: Wallet },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Security", href: "/settings/security", icon: ShieldCheck },
];
