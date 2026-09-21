import { LayoutDashboard, TrendingUp } from "lucide-react";
import type { NavigationItem } from "../types";

export const DASHBOARD_NAV_SECTION: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "market", label: "Market Watch", href: "/market", icon: TrendingUp },
  { id: "status", label: "Status", href: "/status", icon: LayoutDashboard },
];
