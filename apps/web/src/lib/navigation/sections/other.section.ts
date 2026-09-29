import { Bell, ShieldCheck, Users } from "lucide-react";
import type { NavigationItem } from "../types";

export const OTHER_NAV_SECTION: NavigationItem[] = [
  {
    id: "notifications",
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
  {
    id: "settings-team",
    label: "Team",
    href: "/settingsteam",
    icon: Users,
    permission: "organization.read",
  },
  {
    id: "settings-security",
    label: "Security",
    href: "/settings/security",
    icon: ShieldCheck,
  },
];
