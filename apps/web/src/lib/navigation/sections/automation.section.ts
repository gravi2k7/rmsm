import { Copy, LineChart } from "lucide-react";
import type { NavigationItem } from "../types";

export const AUTOMATION_NAV_SECTION: NavigationItem[] = [
  {
    id: "strategies",
    label: "Strategies",
    href: "/strategies",
    icon: LineChart,
  },
  {
    id: "copier",
    label: "Copier",
    href: "/copier",
    icon: Copy,
  },
];
