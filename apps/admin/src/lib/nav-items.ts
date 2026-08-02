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
  CreditCard,
  Receipt,
  Ticket,
  BarChart3,
  SlidersHorizontal,
  Database,
  Radio,
  Activity,
  ListTree,
  History,
  ListChecks,
  Gauge,
  AlertTriangle,
  MonitorCheck,
  Sparkles,
  BrainCircuit,
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

/** A collapsible group of nav items rendered under one heading — used
 * for "Enterprise Operations" (Admin UI Milestone A), the first section
 * with enough sub-pages to warrant grouping rather than a flat list. */
export interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
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

/** Admin UI Milestone A — Enterprise Operations. Every href/permission
 * pair below maps to a real, existing backend route; see each page's own
 * hooks for the exact endpoint. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Enterprise Operations",
    icon: CreditCard,
    items: [
      { label: "Billing Dashboard", href: "/billing/dashboard", icon: LayoutDashboard, permission: "admin.dashboard.read" },
      { label: "Subscription Plans", href: "/billing/plans", icon: CreditCard, permission: "billing.admin.manage" },
      { label: "Customer Subscriptions", href: "/billing/subscriptions", icon: Users, permission: "billing.subscription.read" },
      { label: "License Management", href: "/billing/licenses", icon: KeyRound, permission: "admin.license.manage" },
      { label: "Payments", href: "/billing/payments", icon: Receipt, permission: "billing.payment.read" },
      { label: "Coupons", href: "/billing/coupons", icon: Ticket, permission: "billing.coupon.manage" },
      { label: "Usage Analytics", href: "/billing/usage", icon: BarChart3, permission: "billing.usage.read" },
      { label: "Billing Settings", href: "/billing/settings", icon: SlidersHorizontal, permission: "admin.configuration.manage" },
    ],
  },
  {
    label: "Market Data",
    icon: Database,
    items: [
      { label: "Dashboard", href: "/market-data/dashboard", icon: LayoutDashboard, permission: "market-data.admin.manage" },
      { label: "Providers", href: "/market-data/providers", icon: Radio, permission: "market-data.admin.manage" },
      { label: "Provider Health", href: "/market-data/provider-health", icon: Activity, permission: "market-data.admin.manage" },
      { label: "Instruments", href: "/market-data/instruments", icon: ListTree, permission: "market-data.read" },
      { label: "Historical Import", href: "/market-data/historical-import", icon: History, permission: "market-data.import.trigger" },
      { label: "Import Jobs", href: "/market-data/import-jobs", icon: ListChecks, permission: "market-data.admin.manage" },
      { label: "Data Quality", href: "/market-data/quality", icon: Gauge, permission: "market-data.admin.manage" },
      { label: "Gap Detection", href: "/market-data/gap-detection", icon: AlertTriangle, permission: "market-data.admin.manage" },
      { label: "Monitoring", href: "/market-data/monitoring", icon: MonitorCheck, permission: "market-data.admin.manage" },
      { label: "Derived Data", href: "/market-data/derived-data", icon: Sparkles, permission: "market-data.admin.manage" },
      { label: "AI Readiness", href: "/market-data/ai-readiness", icon: BrainCircuit, permission: "market-data.admin.manage" },
      { label: "Settings", href: "/market-data/settings", icon: SlidersHorizontal, permission: "admin.configuration.manage" },
    ],
  },
];
