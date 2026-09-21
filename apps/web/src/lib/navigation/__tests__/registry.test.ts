import { describe, expect, it } from "vitest";
import {
  NAVIGATION_REGISTRY,
  getNavigationItems,
} from "../registry";

describe("navigation registry", () => {
  it("keeps the requested main menu order", () => {
    const items = getNavigationItems({
      hasPermission: () => true,
    });

    expect(items.map((item) => item.label)).toEqual([
      "Dashboard",
      "Market Watch",
      "Status",
      "Watchlists",
      "Portfolio",
      "Strategies",
      "Opportunities",
      "Decisions",
      "Orders",
      "Analytics",
      "Notifications",
      "Team",
      "Security",
    ]);
  });

  it("keeps Dashboard on the dashboard route", () => {
    expect(NAVIGATION_REGISTRY[0]).toMatchObject({
      id: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
    });
  });

  it("keeps Status on the status route", () => {
    expect(NAVIGATION_REGISTRY[2]).toMatchObject({
      id: "status",
      label: "Status",
      href: "/status",
    });
  });

  it("keeps Portfolio in position five", () => {
    expect(NAVIGATION_REGISTRY[4]).toMatchObject({
      id: "portfolio",
      label: "Portfolio",
      href: "/portfolio",
    });
  });
});
