import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, LineChart, ShieldCheck, TrendingUp, BookMarked, Target, Gavel, ListOrdered } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** The permission that gates *seeing* this nav item — a UX convenience,
   * not a security boundary; every page it points to still checks its own
   * data access server-side regardless of what the sidebar shows. */
  permission?: string;
}

/**
 * Phase 4C is being built module by module. Analytics and Notifications
 * each add their own entry here when that module's own milestone lands.
 * Wiring a link to a page that doesn't exist yet is exactly the kind of
 * dead button Phase 4B's own honesty convention rules out.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Market Watch", href: "/market", icon: TrendingUp },
  { label: "Watchlists", href: "/watchlists", icon: BookMarked },
  { label: "Strategies", href: "/strategies", icon: LineChart },
  { label: "Opportunities", href: "/opportunities", icon: Target },
  { label: "Decisions", href: "/decisions", icon: Gavel },
  { label: "Orders", href: "/orders", icon: ListOrdered },
  { label: "Security", href: "/settings/security", icon: ShieldCheck },
];
