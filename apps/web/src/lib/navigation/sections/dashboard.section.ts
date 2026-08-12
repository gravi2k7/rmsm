import { LayoutDashboard } from "lucide-react";
import type { NavigationItem } from "../types";

/** Dashboard domain — home/overview. One of the future modules this
 * registry is built to host alongside (Organization, Billing, Market
 * Data, Broker, AI, Reports, Settings, ...) without growing a single file. */
export const DASHBOARD_NAV_SECTION: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
];
