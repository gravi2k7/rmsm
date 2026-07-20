import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  KeyRound,
  LineChart,
  Landmark,
  Target,
  GitPullRequestArrow,
  ArrowRightLeft,
  Wallet,
  ScrollText,
  Settings,
  Bell,
  HeartPulse,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** The permission that gates *seeing* this nav item — a UX convenience
   * (don't show a link to a page every action on which will 403), not a
   * security boundary; every page it points to still checks its own
   * data access server-side regardless of what the sidebar shows. */
  permission?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Organizations", href: "/organizations", icon: Building2, permission: "organization.read" },
  { label: "Users", href: "/users", icon: Users, permission: "users.read" },
  { label: "Roles", href: "/roles", icon: ShieldCheck, permission: "roles.read" },
  { label: "Permissions", href: "/permissions", icon: KeyRound, permission: "roles.read" },
  { label: "Strategies", href: "/strategies", icon: LineChart, permission: "strategies.read" },
  { label: "Market", href: "/market", icon: Landmark, permission: "markets.read" },
  { label: "Opportunities", href: "/opportunities", icon: Target, permission: "opportunities.read" },
  { label: "Decisions", href: "/decisions", icon: GitPullRequestArrow, permission: "decisions.read" },
  { label: "Execution", href: "/execution", icon: ArrowRightLeft, permission: "executions.read" },
  { label: "Portfolio", href: "/portfolio", icon: Wallet, permission: "portfolio.read" },
  { label: "Audit Logs", href: "/audit", icon: ScrollText, permission: "audit.read" },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Health", href: "/health", icon: HeartPulse },
  { label: "Settings", href: "/settings", icon: Settings },
];
