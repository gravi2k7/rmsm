import { Users } from "lucide-react";
import type { NavigationItem } from "../types";

/** Organization domain. Only "Team" is a nav-visible entry today; future
 * modules (Billing, Licensing, ...) that the UD-001.1 spec names as
 * siblings of Organization get their own section file the same way,
 * rather than being appended here or into a single growing file. */
export const ORGANIZATION_NAV_SECTION: NavigationItem[] = [
  { id: "settings-team", label: "Team", href: "/settings/team", icon: Users, permission: "organization.read" },
];
